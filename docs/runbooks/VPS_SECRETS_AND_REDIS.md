# 🪐 OrbitoX Platform — VPS Secrets & Redis Hardening Runbook (GC-04)

> **Infrastructure Environment:** Self-managed Ubuntu 24.04 LTS VPS  
> **Classification:** Security Baseline & Cryptographic Standards  
> **Key Focus:** Redis Security, Zero-Host-Port Exposure, Secret Generation & Injection  

---

## 1. Overview & Security Baseline

During the Gate C Stage 0 audit, several critical credential and infrastructure risks were identified in legacy configurations:
1. **Hardcoded Credentials**: The password `redispass123` was hardcoded in multiple Compose manifests and documentation files.
2. **Exposed Host Ports**: Redis port `6379:6379` was mapped directly to `0.0.0.0` on the host, exposing unencrypted cache traffic and pub/sub channels to external scanning.
3. **Plaintext CLI Password Passing**: Healthchecks used `redis-cli -a <password>`, which exposes passwords in the process table (`ps aux`) to any unprivileged user on the host.

Under Gate C Revision 1.0, these risks are remediated with the following mandatory security controls:
- **Zero Host Port Exposure**: The Redis container does NOT bind to any host network interface. It is attached strictly to internal Docker bridge networks (`orbitox_platform_net`, `orbitox_ros_net`).
- **Cryptographic Password Generation**: Redis passwords must be at least 256 bits (64 hex characters) generated via `openssl rand -hex 32`.
- **`REDISCLI_AUTH` Environment Injection**: Healthchecks and maintenance commands inject credentials via the `REDISCLI_AUTH` environment variable, avoiding process table exposure.
- **Resource Bounds**: Redis is configured with `maxmemory 384mb` and `volatile-lru` eviction policy to guarantee that runaway caching never causes an Out-Of-Memory (OOM) crash on the 8 GB VPS.

---

## 2. Cryptographic Secret Generation Workflow

On the self-managed VPS, execute the following script to generate high-entropy secrets for all services:

```bash
#!/usr/bin/env bash
# /opt/orbitox/scripts/ops/generate-vps-secrets.sh
set -euo pipefail

ENV_FILE="/opt/orbitox/infra/docker/.env"

if [[ -f "$ENV_FILE" ]]; then
  echo "⚠️  Existing .env file detected at ${ENV_FILE}."
  read -p "Overwrite with new secrets? (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

cat <<EOF > "$ENV_FILE"
# ─────────────────────────────────────────────────────────────────────────────
# 🪐 OrbitoX VPS Staging Environment Configuration
# Generated on: $(date -u '+%Y-%m-%d %H:%M:%SZ')
# Permissions: 0600 (chmod 600 .env)
# ─────────────────────────────────────────────────────────────────────────────

# Ingress Configuration
STAGING_DOMAIN=staging.orbitox.io
RESTAURANT_DOMAIN=ros.staging.orbitox.io

# PostgreSQL Superuser Passwords
PLATFORM_POSTGRES_SUPERUSER_PASSWORD=$(openssl rand -hex 24)
ROS_POSTGRES_SUPERUSER_PASSWORD=$(openssl rand -hex 24)

# Platform Role Passwords (matching vps-enable-roles.sql)
PLATFORM_MIGRATOR_PASSWORD=$(openssl rand -hex 24)
ORBITOX_RUNTIME_PASSWORD=$(openssl rand -hex 24)
ORBITOX_MAINTENANCE_PASSWORD=$(openssl rand -hex 24)
ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD=$(openssl rand -hex 24)
HMS_AUDIT_READER_PASSWORD=$(openssl rand -hex 24)
ORBITOX_OUTBOX_RELAY_PASSWORD=$(openssl rand -hex 24)

# RestaurantOS Database Password (for restaurantos_app)
ROS_DATABASE_PASSWORD=$(openssl rand -hex 24)

# Shared Cache & Pub/Sub (Redis 7)
REDIS_PASSWORD=$(openssl rand -hex 32)

# Platform Cryptographic Master Secrets
ORBITOX_ADMIN_TOKEN=$(openssl rand -hex 32)
ORBITOX_RUNTIME_TOKEN=$(openssl rand -hex 32)
ORBITOX_CONTROL_SECRET=$(openssl rand -hex 32)
ORBITOX_GUEST_SECRET=$(openssl rand -hex 32)
ORBITOX_SERVER_PEPPER=$(openssl rand -hex 32)
ORBITOX_PHI_KEYRING=$(openssl rand -base64 32)
RESTAURANTOS_PLATFORM_TOKEN=$(openssl rand -hex 32)
LOG_LEVEL=info
EOF

chmod 600 "$ENV_FILE"
echo "✅ Secrets generated and secured at ${ENV_FILE} (mode 0600)."
```

---

## 3. Redis Container Hardening & Configuration

In `infra/docker/docker-compose.staging.yml`, Redis is defined with full hardening:

```yaml
  redis:
    image: redis:7-alpine
    container_name: orbitox_staging_redis
    restart: unless-stopped
    command: >
      sh -c 'redis-server
      --requirepass "$$REDIS_PASSWORD"
      --appendonly yes
      --maxmemory 384mb
      --maxmemory-policy volatile-lru'
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD:?set REDIS_PASSWORD in .env}
    volumes:
      - redis_staging_data:/data
    networks:
      - orbitox_platform_net
      - orbitox_ros_net
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
    healthcheck:
      test: ['CMD-SHELL', 'REDISCLI_AUTH="$$REDIS_PASSWORD" redis-cli ping | grep PONG']
      interval: 5s
      timeout: 5s
      retries: 5
```

### Key Security Features:
1. **Double Dollar Sign `$$REDIS_PASSWORD`**: Escaped for Docker Compose so that the variable evaluates inside the container shell rather than interpolating into host-level process args.
2. **`REDISCLI_AUTH` in Healthcheck**: Completely avoids passing `-a <password>` on the command line, preventing password exposure in `docker top` and `/proc/<pid>/cmdline`.
3. **No Published Ports (`ports:`)**: Redis is completely inaccessible from the host's public IP address (`0.0.0.0`) or localhost loopback (`127.0.0.1`). Only containers inside `orbitox_platform_net` and `orbitox_ros_net` can reach it.
4. **Memory Guard (`--maxmemory 384mb`)**: Leaves ample room within the 512M container limit for Redis buffer overhead.

---

## 4. Maintenance & CLI Operations

To interact with Redis for debugging on the VPS without exposing ports or passwords:

```bash
# Connect using interactive container execution with REDISCLI_AUTH
docker exec -it orbitox_staging_redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli'
```

Within the Redis CLI:
```text
127.0.0.1:6379> PING
PONG
127.0.0.1:6379> INFO memory
# Memory
used_memory_human:1.24M
maxmemory_human:384.00M
127.0.0.1:6379> DBSIZE
(integer) 42
```

---

## 5. Secret Boundaries & Host Access Controls

To ensure defense-in-depth on the Ubuntu 24.04 VPS, operators must observe these access control boundaries:

### 5.1 Host File vs Container Environment vs Docker Secrets
1. **Protected Host `.env` (`/opt/orbitox/infra/docker/.env`)**:
   - Ownership must be `root:root` with permissions `0600` (`chmod 600`).
   - Contains master passwords and cryptographic seeds; NEVER committed to Git.
2. **Container Environment Variables (`environment:`)**:
   - Injected by Docker Compose into container environments at startup.
   - > [!WARNING]
     > Any user with permissions to execute `docker inspect <container_id>` can view the container's environment variables (`Config.Env`).
     > Therefore, access to the Docker daemon (`/var/run/docker.sock`) is strictly equivalent to root access on the host.
3. **File-Backed Secrets**:
   - For database superuser and application passwords, scripts support `/run/secrets/*` files mounted into containers.
4. **Process Table & Log Safety**:
   - Passwords must NEVER be passed as positional arguments to CLI utilities (e.g. `psql -W`, `redis-cli -a`).
   - Applications and scripts must redact database URLs in logs (`safe_target` regex sanitization).

### 5.2 Restricting Docker Daemon Access
Only trusted system administrators should belong to the `docker` group on the VPS:
```bash
# Verify users in docker group
getent group docker

# Ensure docker socket is owned by root:docker with 0660
ls -l /var/run/docker.sock
# Expected: srw-rw---- 1 root docker 0 ... /var/run/docker.sock
```
