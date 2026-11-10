# 🧩 Contract V2 Plugin Author Guide

This guide describes how to author, sign, package, and publish plugins compatible with the **OrbitoX Contract V2 Plugin Engine** (`@orbitox-io/plugin-engine` v1.4.0+).

---

## 1. Architectural Philosophy

All plugins executed by OrbitoX adhere to four core invariants:

1. **Scoped Package Names**: Plugins must be published under the `@orbitox-io` scope on GitHub Packages (`https://npm.pkg.github.com`).
2. **Cryptographic Anti-Tamper**: Plugin manifests and code artifacts must be cryptographically signed via Ed25519/RSA digital signatures (`CryptoSigner`).
3. **Zero-Trust Multi-Tenancy**: Plugins must execute within tenant transactions (`withTenantTx`) with strict PostgreSQL Row-Level Security (RLS) enforcement.
4. **Deep Sandbox Immutability**: All host interfaces and kernel facades are deeply frozen (`SandboxGuard.freezeAllFacades`) to prevent prototype pollution or privilege escalation.

---

## 2. Directory Structure

A standard Contract V2 plugin layout:

```text
packages/my-plugin/
├── manifest.json              # Signed plugin manifest (Contract V2)
├── package.json               # Scoped @orbitox-io/my-plugin
├── tsconfig.json
├── tsconfig.prod.json         # sourceMap: false, removeComments: true
└── src/
    ├── index.ts               # Plugin entry point & lifecycle hooks
    ├── schema.prisma          # Tenant schema migrations (if applicable)
    ├── routes/                # API route handlers
    └── services/              # Business domain logic
```

---

## 3. Plugin Manifest Specification (`manifest.json`)

The manifest declares permissions, capabilities, routes, and cryptographic signatures:

```json
{
  "schemaVersion": "2.0",
  "id": "inventory-os",
  "name": "OrbitoX Inventory & Supply Chain OS",
  "version": "1.0.0",
  "package": "@orbitox-io/inventory-os",
  "entrypoint": "dist/index.js",
  "capabilities": [
    "tenant:storage",
    "tenant:events",
    "audit:log"
  ],
  "dependencies": {
    "@orbitox-io/plugin-engine": "^1.4.0"
  },
  "lifecycle": {
    "onInstall": "handleInstall",
    "onUpgrade": "handleUpgrade",
    "onSuspend": "handleSuspend",
    "onResume": "handleResume",
    "onUninstall": "handleUninstall"
  },
  "signature": {
    "algorithm": "Ed25519",
    "publicKey": "MCowBQYDK2VwAyEA...",
    "digest": "784fa899b10c..."
  }
}
```

---

## 4. Authoring Lifecycle Handlers

Implement the lifecycle handlers in TypeScript:

```typescript
import {
  PluginLifecycleContext,
  PluginDefinition,
  TenantTx,
} from '@orbitox-io/plugin-engine';

export const inventoryPlugin: PluginDefinition = {
  id: 'inventory-os',
  version: '1.0.0',
  contractVersion: '2.0',

  async onInstall(ctx: PluginLifecycleContext) {
    ctx.logger.info(`Installing inventory-os for tenant: ${ctx.tenantId}`);

    // Execute database migrations within the tenant RLS transaction
    await ctx.withTenantTx(async (tx: TenantTx) => {
      await tx.query(
        `CREATE TABLE IF NOT EXISTS "InventoryItem" (
          "id" VARCHAR(64) PRIMARY KEY,
          "tenantId" VARCHAR(128) NOT NULL,
          "sku" VARCHAR(64) NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMPTZ DEFAULT NOW()
        );`
      );
    });
  },

  async onSuspend(ctx: PluginLifecycleContext) {
    ctx.logger.warn(`Suspending inventory-os for tenant: ${ctx.tenantId}`);
    // Terminate live background workers, close persistent SSE streams
    await ctx.eventBus.closeSubscriptions(ctx.tenantId);
  },

  async onResume(ctx: PluginLifecycleContext) {
    ctx.logger.info(`Resuming inventory-os for tenant: ${ctx.tenantId}`);
    // Restore event listeners and scheduled jobs
  },

  async onUninstall(ctx: PluginLifecycleContext) {
    ctx.logger.warn(`Uninstalling inventory-os for tenant: ${ctx.tenantId}`);
    // Archive or purge tenant state depending on retention policy
  },
};

export default inventoryPlugin;
```

---

## 5. Multi-Tenant RLS & Idempotent Transactions

Whenever persisting or mutating state, wrap your logic inside `withTenantTx` and guarantee idempotency via `TenantIdempotencyKey`:

```typescript
import { withTenantTx } from '@orbitox-io/plugin-engine';
import { idempotent } from '@/lib/idempotency';

export async function createWarehouseItem(req: Request, tenantId: string) {
  const idempotencyKey = req.headers.get('idempotency-key');
  const body = await req.json();

  return await withTenantTx(tenantId, async (tx) => {
    // Both Item creation and TenantIdempotencyKey row commit atomically in 1 transaction
    return await idempotent(tx, 'inventory.item.create', idempotencyKey, body, async () => {
      const item = await tx.inventoryItem.create({
        data: {
          tenantId,
          sku: body.sku,
          quantity: body.quantity,
        },
      });
      return { status: 201, data: item };
    });
  });
}
```

---

## 6. Cryptographic Manifest Signing

Before publishing, sign the plugin bundle using your organization's Ed25519 private key:

```bash
# Generate manifest signature
npx @orbitox-io/plugin-engine sign \
  --manifest ./manifest.json \
  --key keys/private.pem \
  --output ./manifest.json
```

> [!CAUTION]
> Never commit `keys/private.pem` or auth tokens in `.npmrc` to git!

---

## 7. Packaging & Publishing to GitHub Packages

1. Ensure your `package.json` points to GitHub Packages:
```json
{
  "name": "@orbitox-io/inventory-os",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

2. Compile production bundle:
```bash
npm run build -- --project tsconfig.prod.json
```

3. Publish:
```bash
npm publish
```
