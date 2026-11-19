# RestaurantOS — Decoupled Runtime Architecture

## 1. Role in Ecosystem
RestaurantOS is an **independent runtime product** that executes outside the OrbitoX Platform application.

- **OrbitoX Platform (`:3005`)**: Authoritative Control Plane (governs projects, plugins, APIs, plans, revisions, commands, and security).
- **RestaurantOS (`:4010`)**: Runtime Product Plane (executes Diner Mobile PWA, KDS routing, and spatial floor operations).

## 2. Directory Layout
```
projects/external-os/restaurant-os/
├── apps/
│   ├── web/                     # Diner PWA, Touch KDS, Spatial Floor Canvas
│   └── api/                     # restaurant.* HTTP & SSE endpoints
├── packages/
│   ├── domain/                  # Catalog, Money, Order, Task state machines
│   ├── runtime/                 # Control Bridge & SDK integration
│   ├── ui/                      # Design tokens & 52px+ touch targets
│   ├── config/                  # Runtime configuration contracts
│   └── integrations/            # Thermal printers & payment adapters
├── prisma/                      # Local PostgreSQL schema
├── .orbitox/                    # orbitox.project.json manifest copy
├── orbitox.project.json         # Primary root manifest
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.json
```

## 3. Communication Contract
RestaurantOS connects to the Control Plane using `@orbitox/external-runtime-sdk`:
1. **Registration**: Posts runtime port, PID, memory, and declared APIs.
2. **Signed Config**: Obtains HMAC-SHA256 desired-state configuration.
3. **Heartbeat & Telemetry**: Sends periodic health status and reports active revision.
4. **Command Execution**: Polls authorized commands (e.g. `rotate_qr_locator`, `run_health_check`).
5. **Reconciliation**: When desired revision > applied revision, reconciles state and acknowledges.
