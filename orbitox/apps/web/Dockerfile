# syntax=docker/dockerfile:1.7
# OrbitoX Control Plane (apps/web) - multi-stage production image.
# Build from the monorepo root:  docker build -f apps/web/Dockerfile -t orbitox/control-plane .

ARG NODE_VERSION=22

# ---- 1. deps: install workspace dependencies (cached until a manifest changes) ----
# Debian-slim (glibc), not alpine (musl): native deps (bcrypt) ship separate musl/glibc
# prebuilt binaries resolved via libc detection at require time, which is a known source
# of "works everywhere except alpine" failures in minimal musl containers. slim avoids it.
FROM node:${NODE_VERSION}-slim AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.prod.json ./
COPY apps/web/package.json apps/web/
COPY packages ./packages
COPY plugins ./plugins
COPY tools ./tools
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---- 2. build: compile workspace packages, then the Next.js app ----
FROM deps AS build
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec turbo run build --filter=web...

# ---- 3. runtime: only the standalone server bundle, running as non-root ----
FROM node:${NODE_VERSION}-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3005 \
    HOSTNAME=0.0.0.0 \
    ORBITOX_DATA_DIR=/data
WORKDIR /app
RUN groupadd --system orbitox && useradd --system --gid orbitox orbitox \
    && mkdir -p /data && chown orbitox:orbitox /data
COPY --from=build --chown=orbitox:orbitox /repo/apps/web/.next/standalone ./
COPY --from=build --chown=orbitox:orbitox /repo/apps/web/.next/static ./apps/web/.next/static
USER orbitox
VOLUME ["/data"]
EXPOSE 3005
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3005/api/health || exit 1
CMD ["node", "apps/web/server.js"]
