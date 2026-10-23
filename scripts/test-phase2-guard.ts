/**
 * OrbitoX Phase 2 Automated Security Regression Test Suite
 *
 * Verifies all 10 requirements of Phase 2:
 * 1. Default-deny: Unauthenticated protected routes return 401
 * 2. Spoofed/invalid keys return 401
 * 3. Header-only credentials: Query param (?apiKey=) rejected with 401
 * 4. Scopes: Mandatory when declared; wildcard '*' permitted ONLY for isRoot: true
 * 5. Multi-tenant anti-spoofing: tenantScope mismatch returns 403 TENANT_SCOPE_VIOLATION
 * 6. Public route invariant: scopes: [], never ['*']
 * 7. Key lifecycle: Revocation is immediately effective; grace window honored
 * 8. Root key IP allowlist: Unauthorized IP returns 403 IP_FORBIDDEN
 * 9. Timing equalization side-channel resistance over 1,000 iterations
 * 10. Edge middleware default-deny defense
 */

import { NextRequest } from 'next/server';
import {
  withApiGuard,
  createNewApiKey,
  registerApiKey,
  revokeKey,
  rotateKey,
  clearKeystore,
  setServerPepper,
  authenticateCredential,
} from '../orbitox/apps/web/app/api/v1/_lib/guard';
import { middleware } from '../orbitox/apps/web/middleware';

const PEPPER = 'phase2-test-pepper-vector-must-be-at-least-32-chars-long';
setServerPepper(PEPPER);

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName} — ${detail}`);
  }
}

async function runTests() {
  console.log('\n================================================================================');
  console.log('🛡️  ORBITOX PHASE 2 SECURITY REGRESSION TEST SUITE');
  console.log('================================================================================\n');

  clearKeystore();

  // Seed test keys
  const standardKey = createNewApiKey({
    name: 'Standard Developer Key',
    environment: 'production',
    scopes: ['hms.patients.read'],
    tenantScope: ['hospital-alpha'],
    isRoot: false,
    rateLimitPerMin: 1000,
  });

  const rootKey = createNewApiKey({
    name: 'Root Operator Key',
    environment: 'production',
    scopes: ['*'],
    ipAllowlist: ['127.0.0.1', '::1', '10.0.0.0/8'],
    tenantScope: ['*'],
    isRoot: true,
    rateLimitPerMin: 5000,
  });

  const spoofedWildcardKey = createNewApiKey({
    name: 'Sneaky Non-Root Key Attempting Wildcard',
    environment: 'production',
    scopes: ['*'],
    isRoot: false, // NOT root!
    tenantScope: ['tenant-x'],
  });

  console.log('--- TEST GROUP 1: Default-Deny & Authentication Enforcement ---');

  // Test 1: Unauthenticated request to protected endpoint -> 401
  const protectedEndpoint = withApiGuard(
    { serviceId: 'test-service' },
    async (req, ctx) => Response.json({ success: true, tenant: ctx.tenantId })
  );

  const reqNoAuth = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
  });
  const resNoAuth = await protectedEndpoint(reqNoAuth);
  const jsonNoAuth = await resNoAuth.json();
  assert(resNoAuth.status === 401, 'Unauthenticated request receives 401', `Got status ${resNoAuth.status}`);
  assert(jsonNoAuth.error?.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED', `Got ${jsonNoAuth.error?.code}`);
  assert(resNoAuth.headers.get('x-content-type-options') === 'nosniff', 'Has X-Content-Type-Options: nosniff header');

  // Test 2: Spoofed key (orb_live_root_anything) -> 401
  const reqSpoofed = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: { 'x-api-key': 'orb_live_root_anything_fake_secret_1234567890' },
  });
  const resSpoofed = await protectedEndpoint(reqSpoofed);
  assert(resSpoofed.status === 401, 'Spoofed key format receives 401', `Got ${resSpoofed.status}`);

  // Test 3: Query parameter ?apiKey= is ignored/rejected -> 401
  const reqQueryParam = new NextRequest(`http://localhost:3005/api/v1/hms/patients?apiKey=${standardKey.rawKey}`, {
    method: 'GET',
  });
  const resQueryParam = await protectedEndpoint(reqQueryParam);
  assert(resQueryParam.status === 401, 'Query parameter (?apiKey=) is strictly rejected with 401', `Got ${resQueryParam.status}`);

  console.log('\n--- TEST GROUP 2: Authorization & Scope Enforcement ---');

  // Test 4: Endpoint requiring hms.patients.read with matching key -> 200
  const scopedEndpoint = withApiGuard(
    {
      serviceId: 'hms',
      requiredScopes: ['hms.patients.read'],
    },
    async (req, ctx) => Response.json({ success: true, scopes: ctx.scopes })
  );

  const reqValidAuth = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: { Authorization: `Bearer ${standardKey.rawKey}` },
  });
  const resValidAuth = await scopedEndpoint(reqValidAuth);
  assert(resValidAuth.status === 200, 'Valid key with required scope receives 200', `Got ${resValidAuth.status}`);

  // Test 5: Endpoint requiring write scope with read-only key -> 403
  const writeEndpoint = withApiGuard(
    {
      serviceId: 'hms',
      requiredScopes: ['hms.patients.write'],
    },
    async (req, ctx) => Response.json({ success: true })
  );

  const resMissingScope = await writeEndpoint(reqValidAuth);
  const jsonMissingScope = await resMissingScope.json();
  assert(resMissingScope.status === 403, 'Missing required scope receives 403', `Got ${resMissingScope.status}`);
  assert(jsonMissingScope.error?.code === 'INSUFFICIENT_SCOPES', 'Error code is INSUFFICIENT_SCOPES', `Got ${jsonMissingScope.error?.code}`);

  // Test 6: Non-root key claiming wildcard '*' does NOT bypass scope check -> 403
  const reqNonRootWildcard = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: { 'x-api-key': spoofedWildcardKey.rawKey },
  });
  const resNonRootWildcard = await writeEndpoint(reqNonRootWildcard);
  assert(resNonRootWildcard.status === 403, 'Non-root key cannot use wildcard * to bypass scopes', `Got ${resNonRootWildcard.status}`);

  console.log('\n--- TEST GROUP 3: Public Route Invariants ---');

  // Test 7: Public route without credentials receives 200 and scopes: []
  let capturedScopes: string[] = ['sentinel'];
  const publicEndpoint = withApiGuard(
    {
      public: true,
      serviceId: 'public-test',
    },
    async (req, ctx) => {
      capturedScopes = ctx.scopes;
      return Response.json({ success: true });
    }
  );

  const reqPublic = new NextRequest('http://localhost:3005/api/v1/openapi.json', { method: 'GET' });
  const resPublic = await publicEndpoint(reqPublic);
  assert(resPublic.status === 200, 'Public route accessible unauthenticated', `Got ${resPublic.status}`);
  assert(
    Array.isArray(capturedScopes) && capturedScopes.length === 0,
    'Public caller receives scopes: [], never wildcard [*]',
    `Scopes were ${JSON.stringify(capturedScopes)}`
  );

  console.log('\n--- TEST GROUP 4: Multi-Tenant Anti-Spoofing ---');

  // Test 8: Tenant spoofing attempt -> 403 TENANT_SCOPE_VIOLATION
  const reqSpoofTenant = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${standardKey.rawKey}`,
      'x-tenant-id': 'unauthorized-target-tenant',
    },
  });
  const resSpoofTenant = await scopedEndpoint(reqSpoofTenant);
  const jsonSpoofTenant = await resSpoofTenant.json();
  assert(resSpoofTenant.status === 403, 'Tenant spoofing attempt receives 403', `Got ${resSpoofTenant.status}`);
  assert(jsonSpoofTenant.error?.code === 'TENANT_SCOPE_VIOLATION', 'Error code is TENANT_SCOPE_VIOLATION', `Got ${jsonSpoofTenant.error?.code}`);

  // Test 9: Valid tenant within scope -> 200
  const reqValidTenant = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${standardKey.rawKey}`,
      'x-tenant-id': 'hospital-alpha',
    },
  });
  const resValidTenant = await scopedEndpoint(reqValidTenant);
  assert(resValidTenant.status === 200, 'Authorized tenant in scope receives 200', `Got ${resValidTenant.status}`);

  console.log('\n--- TEST GROUP 5: Root Key Security & IP Allowlisting ---');

  // Test 10: Root key from allowed IP (127.0.0.1) -> 200
  const reqRootAllowedIp = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${rootKey.rawKey}`,
      'x-forwarded-for': '127.0.0.1',
    },
  });
  const resRootAllowedIp = await writeEndpoint(reqRootAllowedIp);
  assert(resRootAllowedIp.status === 200, 'Root key from allowed IP passes with wildcard *', `Got ${resRootAllowedIp.status}`);

  // Test 11: Root key from unauthorized IP -> 403 IP_FORBIDDEN
  const reqRootForbiddenIp = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${rootKey.rawKey}`,
      'x-forwarded-for': '203.0.113.195',
    },
  });
  const resRootForbiddenIp = await writeEndpoint(reqRootForbiddenIp);
  const jsonRootForbiddenIp = await resRootForbiddenIp.json();
  assert(resRootForbiddenIp.status === 403, 'Root key from unauthorized IP receives 403', `Got ${resRootForbiddenIp.status}`);
  assert(jsonRootForbiddenIp.error?.code === 'IP_FORBIDDEN', 'Error code is IP_FORBIDDEN', `Got ${jsonRootForbiddenIp.error?.code}`);

  console.log('\n--- TEST GROUP 6: Key Lifecycle, Grace Period & Revocation ---');

  // Test 12: Revoked key is immediately rejected -> 401 KEY_REVOKED
  revokeKey(standardKey.record.keyId);
  const resRevoked = await scopedEndpoint(reqValidAuth);
  const jsonRevoked = await resRevoked.json();
  assert(resRevoked.status === 401, 'Revoked key receives 401', `Got ${resRevoked.status}`);
  assert(jsonRevoked.error?.code === 'KEY_REVOKED', 'Error code is KEY_REVOKED', `Got ${jsonRevoked.error?.code}`);

  // Test 13: Key rotation with grace period
  const keyToRotate = createNewApiKey({
    name: 'Rotation Candidate Key',
    scopes: ['hms.patients.read'],
    tenantScope: ['hospital-alpha'],
  });

  const rotated = rotateKey(keyToRotate.record.keyId, 24); // 24h grace window
  assert(Boolean(rotated), 'Key rotated successfully');

  // Old key during grace window -> 200
  const reqOldInGrace = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: { Authorization: `Bearer ${keyToRotate.rawKey}` },
  });
  const resOldInGrace = await scopedEndpoint(reqOldInGrace);
  assert(resOldInGrace.status === 200, 'Old key within grace window authenticates successfully', `Got ${resOldInGrace.status}`);

  // New key -> 200
  const reqNewKey = new NextRequest('http://localhost:3005/api/v1/hms/patients', {
    method: 'GET',
    headers: { Authorization: `Bearer ${rotated!.rawKey}` },
  });
  const resNewKey = await scopedEndpoint(reqNewKey);
  assert(resNewKey.status === 200, 'New active key authenticates successfully', `Got ${resNewKey.status}`);

  console.log('\n--- TEST GROUP 7: Edge Middleware Upfront Defense ---');

  // Test 14: Protected route missing auth header rejected by middleware -> 401
  const reqMwProtected = new NextRequest('http://localhost:3005/api/v1/school/students');
  const resMwProtected = middleware(reqMwProtected);
  assert(resMwProtected.status === 401, 'Edge middleware rejects unauthenticated /api/v1 call with 401', `Got ${resMwProtected.status}`);

  // Test 15: Public allowlisted route passes through middleware -> next() (200 / undefined status)
  const reqMwOpenApi = new NextRequest('http://localhost:3005/api/v1/openapi.json');
  const resMwOpenApi = middleware(reqMwOpenApi);
  assert(resMwOpenApi.status === 200 || !resMwOpenApi.status, 'Edge middleware passes allowlisted /api/v1/openapi.json', `Got status ${resMwOpenApi.status}`);

  const reqMwHealth = new NextRequest('http://localhost:3005/api/v1/health');
  const resMwHealth = middleware(reqMwHealth);
  assert(resMwHealth.status === 200 || !resMwHealth.status, 'Edge middleware passes allowlisted /api/v1/health', `Got status ${resMwHealth.status}`);

  console.log('\n--- TEST GROUP 8: Timing Side-Channel Resistance (1,000 Iterations) ---');

  const testKeyForTiming = createNewApiKey({
    name: 'Timing Benchmark Key',
    scopes: ['benchmark'],
  });

  const validKeyIdWrongSecret = `orb_live_${testKeyForTiming.record.keyId}_${'x'.repeat(43)}`;
  const unknownKeyId = `orb_live_k_nonexistent999_${'y'.repeat(43)}`;

  const ITERATIONS = 1000;
  const dummyReq1 = new NextRequest('http://localhost:3005/bench', {
    headers: { 'x-api-key': unknownKeyId },
  });
  const dummyReq2 = new NextRequest('http://localhost:3005/bench', {
    headers: { 'x-api-key': validKeyIdWrongSecret },
  });

  // Warmup
  for (let i = 0; i < 50; i++) {
    await authenticateCredential(dummyReq1, '127.0.0.1');
    await authenticateCredential(dummyReq2, '127.0.0.1');
  }

  const startUnknown = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await authenticateCredential(dummyReq1, '127.0.0.1');
  }
  const timeUnknown = (performance.now() - startUnknown) / ITERATIONS;

  const startWrongSecret = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await authenticateCredential(dummyReq2, '127.0.0.1');
  }
  const timeWrongSecret = (performance.now() - startWrongSecret) / ITERATIONS;

  const diffMs = Math.abs(timeUnknown - timeWrongSecret);
  console.log(`   Mean duration unknown keyId:       ${timeUnknown.toFixed(5)} ms`);
  console.log(`   Mean duration wrong secret:        ${timeWrongSecret.toFixed(5)} ms`);
  console.log(`   Delta (mean difference):           ${diffMs.toFixed(5)} ms`);

  // Side-channel threshold: mean difference must be sub-millisecond (< 0.1 ms in local tests)
  assert(diffMs < 0.1, `Constant-time verification side-channel delta < 0.1ms (was ${diffMs.toFixed(5)} ms)`);

  console.log('\n================================================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
