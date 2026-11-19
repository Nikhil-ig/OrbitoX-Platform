# ADR 0004: Database Isolation per Deployable Service

## Status
Accepted

## Context
RestaurantOS is an independent runtime product with its own operational requirements, custom domain challenges, and fast-moving domain schemas (tables, floors, orders, kitchen tasks). Coupling its persistence with the core platform control plane would create single-point failures, risky shared migrations, and cross-domain data leakage.

## Decision
Each deployable service owns its own database:
1. **Platform Control Plane** (`apps/platform`) owns `apps/platform/prisma/schema.prisma` and platform migrations (`apps/platform/prisma/migrations/`).
2. **RestaurantOS API** (`services/restaurant-api`) owns `services/restaurant-api/prisma/schema.prisma` and RestaurantOS migrations (`services/restaurant-api/prisma/migrations/`).
3. **Prisma Client Isolation**:
   - `services/restaurant-api/prisma/schema.prisma` configures an isolated generator output:
     ```prisma
     generator client {
       provider = "prisma-client-js"
       output   = "../generated/prisma"
     }
     ```
   - This ensures the RestaurantOS Prisma client is generated locally to `services/restaurant-api/generated/prisma` and never collides with or clobbers the root `@prisma/client` used by the platform app.
4. **Inter-Service Communication**:
   - All cross-service operations (tenant provisioning, suspension, status queries, data rights exports/erasures) happen strictly over HTTP via `@orbitox-io/bridge` signed requests.

## Consequences
- **Positive**: Complete fault domain isolation; platform outages do not crash restaurant order execution, and restaurant database migrations can be deployed independently.
- **Positive**: Strict compile-time and runtime data boundary between control plane and downstream verticals.
- **Negative**: Requires inter-service bridge APIs for operations like tenant lifecycle provisioning.

