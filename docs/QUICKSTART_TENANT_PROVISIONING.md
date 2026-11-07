# ⚡ 2-Minute Quickstart: Tenant Provisioning & Composition

Provision a secure, multi-tenant SaaS workspace in OrbitoX with cryptographic isolation and pre-installed enterprise plugins in under two minutes.

---

## 1. Prerequisites

- Platform Control Plane running (`http://127.0.0.1:3005` locally or `https://api.orbitox.io`)
- A Platform Customer or Root API Key (e.g. `orb_live_...`)

---

## 2. Option A: Using `@orbitox-io/cli`

Install and invoke the CLI directly:

```bash
# Provision a hospital tenant with 1 command
npx @orbitox-io/cli tenants provision \
  --name "St. Jude Medical" \
  --slug "st-jude-clinic" \
  --plugins "hospital-os" \
  --api-key "$ORBITOX_API_KEY" \
  --wait
```

### CLI Output:
```text
🛰️ Provisioning St. Jude Medical...
✅ Tenant created: org/cmvzh.../project/st-jude-clinic/environment/production
🔑 Customer API Key: orb_live_••••••••••••••••••••••••••••••••
   Prefix: orb_live_
   Note: API keys are masked in terminal logs.
```

To suspend or resume:
```bash
# Suspend tenant
npx @orbitox-io/cli tenants suspend org/cmvzh.../project/st-jude-clinic/environment/production --api-key "$ORBITOX_API_KEY"

# Resume tenant
npx @orbitox-io/cli tenants resume org/cmvzh.../project/st-jude-clinic/environment/production --api-key "$ORBITOX_API_KEY"
```

---

## 3. Option B: Using `@orbitox-io/sdk` (TypeScript / JavaScript)

Install the SDK:
```bash
npm install @orbitox-io/sdk
```

Provision and interact with the tenant:
```typescript
import { createOrbitoXClient } from '@orbitox-io/sdk';

const client = createOrbitoXClient({
  baseUrl: 'http://127.0.0.1:3005',
  apiKey: process.env.ORBITOX_API_KEY!,
});

async function main() {
  // 1. Provision tenant asynchronously with automatic polling until ACTIVE
  const tenant = await client.tenants.create(
    {
      name: 'Metro General Hospital',
      slug: 'metro-gen-hosp',
      environment: 'production',
      plugins: [{ id: 'hospital-os', plan: 'growth' }],
    },
    { waitUntilReady: true, timeoutMs: 60000 }
  );

  console.log(`✅ Tenant Active: ${tenant.tenantId}`);
  console.log(`🔑 Scoped API Key: ${tenant.apiKey.secret}`);

  // 2. Interact with provisioned HospitalOS via typed SDK helper
  const patient = await client.hospital.patients.create({
    tenantId: tenant.tenantId,
    apiKey: tenant.apiKey.secret,
    data: {
      firstName: 'Alice',
      lastName: 'Smith',
      gender: 'female',
      dateOfBirth: '1985-04-12',
      medicalRecordNumber: 'MRN-88204',
      phone: '+1-555-0199',
    },
  });

  console.log(`🏥 Created Patient ID: ${patient.id}`);

  // 3. Suspend and Resume
  await client.tenants.suspend(tenant.tenantId);
  console.log('🔒 Tenant suspended (writes return 403 SERVICE_SUSPENDED)');

  await client.tenants.resume(tenant.tenantId);
  console.log('🔓 Tenant resumed');
}

main().catch(console.error);
```

---

## 4. Option C: Using Raw `curl` (HTTP REST)

### Step 1: Dispatch Provisioning Request (Async 202 Accepted)
```bash
curl -i -X POST http://127.0.0.1:3005/api/v1/tenants \
  -H "Authorization: Bearer $ORBITOX_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bistro Deluxe",
    "slug": "bistro-deluxe",
    "environment": "production",
    "plugins": ["restaurant-os"]
  }'
```

**HTTP 202 Accepted Response:**
```json
{
  "operationId": "op_98ab42c940",
  "tenantId": "org/cmvzh.../project/bistro-deluxe/environment/production",
  "status": "PROVISIONING",
  "apiKey": {
    "id": "key_41b9c...",
    "prefix": "orb_live_",
    "secret": "orb_live_••••••••••••••••••••••••••••••••"
  }
}
```

### Step 2: Poll Operation Progress
```bash
curl -X GET http://127.0.0.1:3005/api/v1/operations/op_98ab42c940 \
  -H "Authorization: Bearer $ORBITOX_API_KEY"
```

Once `status === "ACTIVE"`, all plugins, schemas, RLS boundaries, and SLA gates are fully active.

---

## 5. Security & SLA Guarantees

| Guarantee | SLA / Invariant |
|-----------|-----------------|
| **Provisioning SLA** | Under 60 seconds (measured P99: ~450ms) |
| **Suspend / Resume SLA** | Enforced under 5,000ms (measured P99: ~120ms) |
| **Idempotency** | Duplicate `Idempotency-Key` headers return cached responses atomically |
| **Distributed Lease** | Fail-safe lease timeout (default 30s) prevents split-brain execution across servers |
