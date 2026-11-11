# ADR 0001: Single-VPS Staging Environment for Pre-Production Verification

## Status
Accepted

## Context
Deploying full multi-region AWS ECS clusters and RDS instances for staging creates significant cost overhead during development stages. However, pre-production validation requires real Linux environments, real PostgreSQL 16 databases, real network isolation between services, Caddy reverse proxies with TLS, and real cron workers.

## Decision
We provision a single hardened VPS instance for the staging environment:
1. Docker Compose runs all staging services on the VPS:
   - `apps/platform` (Next.js operator console, customer dashboard, HospitalOS).
   - `services/restaurant-api` (RestaurantOS API).
   - Dedicated PostgreSQL containers with isolated databases.
   - Background workers (email outbox, grace sweep, data rights).
   - Caddy reverse proxy providing automatic TLS and custom domain challenge resolution.
2. Deployment is triggered via a dedicated manual GitHub Actions workflow (`.github/workflows/deploy-staging.yml`).
3. Production remains on AWS (Terraform in `infra/terraform/aws/`).

## Consequences
- **Positive**: Substantially reduced infrastructure cost while maintaining high fidelity with production container configurations.
- **Positive**: Verifies inter-service HTTP bridge communication, TLS termination, and real multi-tenant databases.
- **Negative**: Vertical scaling limit of a single VPS; not intended for high-concurrency production workloads.
