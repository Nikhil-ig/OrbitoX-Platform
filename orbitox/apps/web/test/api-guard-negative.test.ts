import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../app/api/v1/_lib/api-guard';
import { isIpAllowed, resolveClientIp } from '../app/api/v1/_lib/ip-guard';
import { PlatformRepository, PlatformKeyEngine } from '@orbitox-io/plugin-engine';
import { createInternalAuthToken } from '../app/api/v1/_lib/auth-pipeline';
import { GET as getPatients, POST as createPatient } from '../app/api/hospital/patients/route';
import { POST as provisionProject } from '../app/api/v1/admin/projects/route';
import { PATCH as updateProject } from '../app/api/v1/admin/projects/[projectId]/route';
import { POST as updateProjectUsage } from '../app/api/v1/admin/projects/[projectId]/usage/route';
import { hospitalStore } from '../app/api/hospital/_store';

describe('Phase 1 & 1.5 Security, Unified Auth & Licensed Customer Test Suite', () => {
  const TEST_ADMIN_TOKEN = 'test_admin_token_super_secret_32_chars_minimum';
  let suiteDataDir: string;
  let previousAdminToken: string | undefined;
  let previousServerPepper: string | undefined;
  let validAdminKeySecret: string;
  let validCustomerKeySecret: string;
  let revokedKeySecret: string;
  let restaurantPosKeySecret: string;
  let restaurantPosProjectId: string;

  beforeEach(async () => {
    previousAdminToken = process.env.ORBITOX_ADMIN_TOKEN;
    previousServerPepper = process.env.ORBITOX_SERVER_PEPPER;
    process.env.ORBITOX_ADMIN_TOKEN = TEST_ADMIN_TOKEN;
    process.env.ORBITOX_SERVER_PEPPER = 'test_pepper_32_characters_minimum_len';
    suiteDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-api-guard-'));
    PlatformRepository.resetForTesting();
    PlatformRepository.setDataDir(suiteDataDir);
    PlatformRepository.setPersistenceEnabled(true);
    PlatformRepository.initialize();

    // 1. Create a platform admin organization & project
    const adminOrg = PlatformRepository.createOrganization({
      name: 'Platform Admin Org',
      slug: 'platform-admin',
      billingEmail: 'admin@orbitox.io',
    });

    const adminProjRes = PlatformRepository.createProject({
      name: 'Platform Project',
      slug: 'platform',
      organizationId: adminOrg.id,
      businessModel: 'O2O2B2B2C',
      planTier: 'enterprise',
      technicalLead: 'Admin Lead',
      contactEmail: 'admin@orbitox.io',
      enabledServices: ['platform', 'admin', 'system'],
    });

    const adminKeyRes = PlatformRepository.createApiKey({
      name: 'Admin Machine Key',
      environmentId: adminProjRes.environments[0]!.id,
      projectId: adminProjRes.project.id,
      capabilities: ['admin', 'platform.read', 'platform.write'],
      createdBy: 'test_suite',
    });
    validAdminKeySecret = adminKeyRes.rawSecret;

    // 2. Create customer project (CRM only)
    const customerProjRes = PlatformRepository.createProject({
      name: 'Omega Tenant Project',
      slug: 'tenant-omega',
      organizationId: adminOrg.id,
      businessModel: 'B2B',
      planTier: 'pro',
      plan: 'pro',
      technicalLead: 'Omega Lead',
      contactEmail: 'admin@omega.test',
      enabledServices: ['crm'],
      apiCallQuota: 5000000,
    });

    const customerKeyRes = PlatformRepository.createApiKey({
      name: 'Omega Customer Key',
      environmentId: customerProjRes.environments[0]!.id,
      projectId: customerProjRes.project.id,
      capabilities: ['crm:read', 'crm:write'],
      tenantScope: ['tenant-omega'],
      createdBy: 'test_suite',
    });
    validCustomerKeySecret = customerKeyRes.rawSecret;

    // 3. Create revoked key
    const revokedKeyRes = PlatformRepository.createApiKey({
      name: 'Revoked Key',
      environmentId: customerProjRes.environments[0]!.id,
      projectId: customerProjRes.project.id,
      capabilities: ['crm:read'],
      createdBy: 'test_suite',
    });
    revokedKeySecret = revokedKeyRes.rawSecret;
    PlatformRepository.setKeyStatus(revokedKeyRes.keyRecord.id, 'REVOKED');

    // 4. Create suspended project
    const suspendedProjRes = PlatformRepository.createProject({
      name: 'Suspended Project',
      slug: 'tenant-suspended',
      organizationId: adminOrg.id,
      businessModel: 'B2B',
      planTier: 'starter',
      technicalLead: 'Suspended Lead',
      contactEmail: 'admin@suspended.test',
      enabledServices: ['crm'],
      status: 'SUSPENDED',
    });

    // 5. Create empty services project (unentitled)
    PlatformRepository.createProject({
      name: 'Empty Services Project',
      slug: 'tenant-empty',
      organizationId: adminOrg.id,
      businessModel: 'B2B',
      planTier: 'starter',
      technicalLead: 'Empty Lead',
      contactEmail: 'admin@empty.test',
      enabledServices: [],
    });

    // 6. Create over-quota project
    PlatformRepository.createProject({
      name: 'Over Quota Project',
      slug: 'tenant-quota',
      organizationId: adminOrg.id,
      businessModel: 'B2B',
      planTier: 'starter',
      plan: 'starter',
      technicalLead: 'Quota Lead',
      contactEmail: 'admin@quota.test',
      enabledServices: ['crm'],
      apiCallQuota: 100,
    });
    PlatformRepository.updateProject('tenant-quota', { monthlyApiCalls: 100 });

    // 7. Create Restaurant + POS licensed project
    const restPosRes = PlatformRepository.createProject({
      name: 'Bistro 360',
      slug: 'bistro360',
      organizationId: adminOrg.id,
      businessModel: 'O2O',
      planTier: 'growth',
      plan: 'growth',
      technicalLead: 'Chef Chef',
      contactEmail: 'chef@bistro360.com',
      enabledServices: ['restaurant', 'pos'],
      apiCallQuota: 10000,
    });
    restaurantPosProjectId = restPosRes.project.id;

    const restPosKey = PlatformRepository.createApiKey({
      name: 'Bistro API Key',
      environmentId: restPosRes.environments[0]!.id,
      projectId: restPosRes.project.id,
      capabilities: ['restaurant:order', 'pos:terminal'],
      tenantScope: ['bistro360'],
      createdBy: 'test_suite',
    });
    restaurantPosKeySecret = restPosKey.rawSecret;
  });

  afterEach(() => {
    PlatformRepository.resetForTesting();
    PlatformRepository.setDataDir('');
    fs.rmSync(suiteDataDir, { recursive: true, force: true });
    if (previousAdminToken === undefined) delete process.env.ORBITOX_ADMIN_TOKEN;
    else process.env.ORBITOX_ADMIN_TOKEN = previousAdminToken;
    if (previousServerPepper === undefined) delete process.env.ORBITOX_SERVER_PEPPER;
    else process.env.ORBITOX_SERVER_PEPPER = previousServerPepper;
  });

  const dummyHandler = async (req: NextRequest, ctx: any) => {
    return NextResponse.json({ success: true, tenantId: ctx.tenantId, keyId: ctx.keyId });
  };

  it('1. Mandatory Auth: rejects request with no credentials with 401', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts');
    const res = await handler(req);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  it('Hospital patient reads and writes reject anonymous requests', async () => {
    const read = await getPatients(new NextRequest('http://localhost:3000/api/hospital/patients'));
    const write = await createPatient(new NextRequest('http://localhost:3000/api/hospital/patients', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Anonymous Patient' }),
    }));

    assert.equal(read.status, 401);
    assert.equal(write.status, 401);
  });

  it('2. Query Parameter Auth: ignores and rejects apiKey in query string with 401', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest(`http://localhost:3000/api/v1/crm/contacts?apiKey=${validCustomerKeySecret}`);
    const res = await handler(req);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  it('3. Invalid Secret: rejects fabricated or wrong API key with 401', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': 'orb_live_fakekeythatneverexisted1234567890' },
    });
    const res = await handler(req);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'INVALID_CREDENTIALS');
  });

  it('4. Prefix Matching Elimination: rejects key prefix only with 401', async () => {
    const prefixOnly = validCustomerKeySecret.slice(0, 14);
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': prefixOnly },
    });
    const res = await handler(req);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'INVALID_CREDENTIALS');
  });

  it('5. Revoked Credential: rejects revoked/disabled key with 403 KEY_DISABLED', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': revokedKeySecret },
    });
    const res = await handler(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'KEY_DISABLED');
  });

  it('rejects an expired persisted API key', async () => {
    const project = PlatformRepository.getProject('tenant-omega')!;
    const environment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
    const expired = PlatformRepository.createApiKey({
      name: 'Expired Key',
      environmentId: environment.id,
      projectId: project.id,
      capabilities: ['crm:read'],
      createdBy: 'test_suite',
      expiresInDays: -1,
    });
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const response = await handler(new NextRequest('http://localhost:3000/api/v1/crm/leads', {
      headers: { 'x-api-key': expired.rawSecret },
    }));

    assert.equal(response.status, 403);
    assert.equal((await response.json()).error?.code, 'KEY_EXPIRED');
  });

  it('6. Missing Required Scopes: rejects authenticated key lacking declared scopes with 403', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'crm',
        serviceName: 'CRM Admin Service',
        requiredScopes: ['crm:super_admin', 'billing:write'],
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/crm/admin', {
      headers: { 'x-api-key': validCustomerKeySecret },
    });
    const res = await handler(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'INSUFFICIENT_SCOPES');
  });

  it('7. Scope Checks Fail Closed: unauthenticated request to scoped route returns 401', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'platform',
        serviceName: 'Platform Scoped Service',
        requiredScopes: ['admin'],
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/platform/protected');
    const res = await handler(req);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  it('8. Platform Admin Route Isolation: customer key rejected on platform-admin route with 403', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'platform',
        serviceName: 'Platform Keys Service',
        routeClass: 'platform-admin',
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/admin/api-keys', {
      headers: { 'x-api-key': validCustomerKeySecret },
    });
    const res = await handler(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'FORBIDDEN');
  });

  it('9. Tenant Isolation: rejects spoofed x-tenant-id mismatching key tenant with 403', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: {
        'x-api-key': validCustomerKeySecret,
        'x-tenant-id': 'tenant_impersonated_victim',
      },
    });
    const res = await handler(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'TENANT_SCOPE_VIOLATION');
  });

  it('10. Suspended Project Gate: rejects requests for suspended project with 403', async () => {
    const suspendedProj = PlatformRepository.getProject('tenant-suspended');
    const suspendedKey = PlatformRepository.createApiKey({
      name: 'Suspended Machine Key',
      environmentId: 'env_suspended',
      projectId: suspendedProj!.id,
      capabilities: ['crm:read'],
      createdBy: 'test_suite',
    });

    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': suspendedKey.rawSecret },
    });
    const res = await handler(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'PROJECT_SUSPENDED');
  });

  it('11. Plugin Entitlement Gate Fails Closed: unentitled plugin rejected with 403', async () => {
    const emptyProj = PlatformRepository.getProject('tenant-empty');
    const emptyKey = PlatformRepository.createApiKey({
      name: 'Empty Key',
      environmentId: 'env_empty',
      projectId: emptyProj!.id,
      capabilities: ['crm:read'],
      createdBy: 'test_suite',
    });

    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': emptyKey.rawSecret },
    });
    const res = await handler(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'PLUGIN_NOT_ENTITLED');
  });

  it('12. Quota Gate Fails Closed: over-quota project returns 429', async () => {
    const quotaProj = PlatformRepository.getProject('tenant-quota');
    const quotaKey = PlatformRepository.createApiKey({
      name: 'Quota Key',
      environmentId: 'env_quota',
      projectId: quotaProj!.id,
      capabilities: ['crm:read'],
      createdBy: 'test_suite',
    });

    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': quotaKey.rawSecret },
    });
    const res = await handler(req);

    assert.equal(res.status, 429);
    const body = await res.json();
    assert.equal(body.error?.code, 'TENANT_QUOTA_EXCEEDED');
  });

  it('13. CIDR & IP Allowlist: denies unauthorized IP and rejects spoofed x-forwarded-for', async () => {
    const allowlist = ['198.51.100.0/24'];
    const req = new NextRequest('http://localhost:3000/api/v1/test', {
      headers: {
        'x-forwarded-for': '198.51.100.1',
      },
    });

    const resolvedIp = resolveClientIp(req.headers);
    assert.notEqual(resolvedIp, '198.51.100.1');

    assert.equal(isIpAllowed('203.0.113.5', allowlist), false);
    assert.equal(isIpAllowed('198.51.100.42', allowlist), true);
    assert.equal(isIpAllowed('2001:db8:abcd::1', ['2001:db8:abcd::/48']), true);
    assert.equal(isIpAllowed('2001:db8:ffff::1', ['2001:db8:abcd::/48']), false);
  });

  it('14. Public Allowlist: strictly allows /api/v1/openapi.json and /api/health without credentials', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'docs',
        serviceName: 'Public Documentation',
        routeClass: 'public',
        allowPublic: true,
      },
      dummyHandler
    );
    const allowedReq = new NextRequest('http://localhost:3000/api/v1/openapi.json');
    const allowedRes = await handler(allowedReq);
    assert.equal(allowedRes.status, 200);

    const blockedReq = new NextRequest('http://localhost:3000/api/v1/secret-data');
    const blockedRes = await handler(blockedReq);
    assert.equal(blockedRes.status, 401);
  });

  it('15. Key Sanitization: never returns rawKey, rawSecret or authVerifier', () => {
    const keys = PlatformRepository.listApiKeys();
    assert.ok(keys.length > 0);
    for (const key of keys) {
      assert.equal((key as any).rawKey, undefined, 'rawKey must be undefined');
      assert.equal((key as any).rawSecret, undefined, 'rawSecret must be undefined');
      assert.ok(key.secretFingerprint, 'secretFingerprint should be present');
      assert.ok(key.keyPrefix, 'keyPrefix should be present');
    }
  });

  it('16. Valid Request: accepts authentic credentials with matching scopes and tenant', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'crm',
        serviceName: 'CRM Service',
        requiredScopes: ['crm:read'],
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: {
        'x-api-key': validCustomerKeySecret,
      },
    });
    const res = await handler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.tenantId, 'tenant-omega');
  });

  // ─────────────────────────────────────────────────────────────
  // PHASE 1.5 NEW TESTS: UNIFIED AUTH & LICENSED-CUSTOMER PATH
  // ─────────────────────────────────────────────────────────────

  it('17. Admin Bearer Token on Management APIs: valid admin Bearer token succeeds', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'platform',
        serviceName: 'Platform Projects Service',
        routeClass: 'platform-admin',
        requiredScopes: ['admin'],
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/platform/projects', {
      headers: {
        authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
      },
    });
    const res = await handler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  it('18. Admin Basic Auth on Management APIs: valid admin Basic auth succeeds', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'platform',
        serviceName: 'Platform Projects Service',
        routeClass: 'platform-admin',
      },
      dummyHandler
    );
    const basicCred = Buffer.from(`admin:${TEST_ADMIN_TOKEN}`).toString('base64');
    const req = new NextRequest('http://localhost:3000/api/v1/platform/projects', {
      headers: {
        authorization: `Basic ${basicCred}`,
      },
    });
    const res = await handler(req);
    assert.equal(res.status, 200);
  });

  it('19. Dummy Session Header Rejection: arbitrary session header is rejected with 401', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'platform',
        serviceName: 'Platform Projects Service',
        routeClass: 'platform-admin',
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/platform/projects', {
      headers: {
        'x-admin-session': 'attacker_fake_session_token_12345',
        'x-orbitox-session': 'attacker_fake_session',
      },
    });
    const res = await handler(req);
    assert.equal(res.status, 401);
  });

  it('20. Client-Forged Principal Header Rejection: client-injected x-orbitox-principal is rejected without internal HMAC', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'platform',
        serviceName: 'Platform Projects Service',
        routeClass: 'platform-admin',
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/platform/projects', {
      headers: {
        'x-orbitox-principal': 'admin',
        'x-orbitox-internal-sig': 'forged_fake_signature_abc',
        'x-orbitox-internal-ts': Date.now().toString(),
      },
    });
    const res = await handler(req);
    assert.equal(res.status, 401);
  });

  it('21. Valid Middleware Forwarded Principal: succeeds with authentic internal HMAC signature', async () => {
    const { signature, timestamp } = await createInternalAuthToken('admin');
    const handler = withApiGuard(
      {
        serviceId: 'platform',
        serviceName: 'Platform Projects Service',
        routeClass: 'platform-admin',
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/platform/projects', {
      headers: {
        'x-orbitox-principal': 'admin',
        'x-orbitox-internal-sig': signature,
        'x-orbitox-internal-ts': timestamp,
      },
    });
    const res = await handler(req);
    assert.equal(res.status, 200);
  });

  it('22. Customer Key + Admin Token Combination: both headers can be provided without collision', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'crm',
        serviceName: 'CRM Service',
        routeClass: 'customer',
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: {
        authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
        'x-api-key': validCustomerKeySecret,
      },
    });
    const res = await handler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.tenantId, 'tenant-omega');
  });

  it('23. Admin Token Calling Customer Route Lacking Project: returns 403 PROJECT_NOT_FOUND', async () => {
    const handler = withApiGuard(
      {
        serviceId: 'crm',
        serviceName: 'CRM Service',
        routeClass: 'customer',
      },
      dummyHandler
    );
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: {
        authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
      },
    });
    const res = await handler(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'PROJECT_NOT_FOUND');
  });

  it('24. Licensed-Customer Path End-to-End: Restaurant + POS entitled key succeeds on restaurant & pos, but denied on commerce & hms', async () => {
    const restHandler = withApiGuard({ serviceId: 'restaurant', serviceName: 'Restaurant Service' }, dummyHandler);
    const posHandler = withApiGuard({ serviceId: 'pos', serviceName: 'POS Service' }, dummyHandler);
    const commerceHandler = withApiGuard({ serviceId: 'commerce', serviceName: 'Commerce Service' }, dummyHandler);
    const hmsHandler = withApiGuard({ serviceId: 'hms', serviceName: 'Hospitality Service' }, dummyHandler);

    // 1. Restaurant succeeds
    const restReq = new NextRequest('http://localhost:3000/api/v1/restaurant/menu', {
      headers: { 'x-api-key': restaurantPosKeySecret },
    });
    const restRes = await restHandler(restReq);
    assert.equal(restRes.status, 200);

    // 2. POS succeeds
    const posReq = new NextRequest('http://localhost:3000/api/v1/pos/terminals', {
      headers: { 'x-api-key': restaurantPosKeySecret },
    });
    const posRes = await posHandler(posReq);
    assert.equal(posRes.status, 200);

    // 3. Commerce is denied fail-closed (not entitled)
    const commReq = new NextRequest('http://localhost:3000/api/v1/commerce/products', {
      headers: { 'x-api-key': restaurantPosKeySecret },
    });
    const commRes = await commerceHandler(commReq);
    assert.equal(commRes.status, 403);
    const commBody = await commRes.json();
    assert.equal(commBody.error?.code, 'PLUGIN_NOT_ENTITLED');

    // 4. HMS is denied fail-closed (not entitled)
    const hmsReq = new NextRequest('http://localhost:3000/api/v1/hms/patients', {
      headers: { 'x-api-key': restaurantPosKeySecret },
    });
    const hmsRes = await hmsHandler(hmsReq);
    assert.equal(hmsRes.status, 403);
    const hmsBody = await hmsRes.json();
    assert.equal(hmsBody.error?.code, 'PLUGIN_NOT_ENTITLED');
  });

  it('25. Dynamic Project Mutation: suspending project or changing entitlements takes immediate effect on next request', async () => {
    const restHandler = withApiGuard({ serviceId: 'restaurant', serviceName: 'Restaurant Service' }, dummyHandler);

    // Suspend project
    PlatformRepository.updateProject(restaurantPosProjectId, { status: 'SUSPENDED' });

    const req1 = new NextRequest('http://localhost:3000/api/v1/restaurant/menu', {
      headers: { 'x-api-key': restaurantPosKeySecret },
    });
    const res1 = await restHandler(req1);
    assert.equal(res1.status, 403);
    const body1 = await res1.json();
    assert.equal(body1.error?.code, 'PROJECT_SUSPENDED');

    // Reactivate project and remove restaurant entitlement
    PlatformRepository.updateProject(restaurantPosProjectId, { status: 'ACTIVE', enabledServices: ['pos'] });

    const req2 = new NextRequest('http://localhost:3000/api/v1/restaurant/menu', {
      headers: { 'x-api-key': restaurantPosKeySecret },
    });
    const res2 = await restHandler(req2);
    assert.equal(res2.status, 403);
    const body2 = await res2.json();
    assert.equal(body2.error?.code, 'PLUGIN_NOT_ENTITLED');

    // Re-grant restaurant entitlement
    PlatformRepository.updateProject(restaurantPosProjectId, { enabledServices: ['restaurant', 'pos'] });
    const req3 = new NextRequest('http://localhost:3000/api/v1/restaurant/menu', {
      headers: { 'x-api-key': restaurantPosKeySecret },
    });
    const res3 = await restHandler(req3);
    assert.equal(res3.status, 200);
  });

  it('project provisioning issues a persistent repository key that survives reinitialization', async () => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-provisioning-'));
    PlatformRepository.saveImmediate();
    PlatformRepository.resetForTesting();
    PlatformRepository.setDataDir(testDataDir);
    PlatformRepository.initialize();

    try {
      const response = await provisionProject(new NextRequest('http://localhost:3000/api/v1/admin/projects', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Durable Provisioned Customer',
          enabledServices: ['crm'],
          contactEmail: 'durable@example.test',
        }),
      }));

      assert.equal(response.status, 201);
      const responseBody = await response.json();
      const issuedSecret = responseBody.data.apiKey.rawKey;
      const projectId = responseBody.data.project.id;
      const projectSlug = responseBody.data.project.slug;
      PlatformRepository.saveImmediate();
      PlatformRepository.resetForTesting();
      PlatformRepository.initialize();

      const persistedKey = PlatformRepository.findKeyByRawSecret(issuedSecret);
      assert.equal(persistedKey?.projectId, projectId);
      assert.deepEqual(persistedKey?.tenantScope, [projectSlug]);
      assert.ok(persistedKey?.environmentId);
      assert.equal(PlatformRepository.getProject(projectId)?.slug, projectSlug);
    } finally {
      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(suiteDataDir);
      PlatformRepository.initialize();
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  it('reserves quota once under parallel load and releases failed handler calls', async () => {
    const organizationId = PlatformRepository.listOrganizations()[0]!.id;
    const project = PlatformRepository.createProject({
      name: `Atomic Quota ${Date.now()}`,
      organizationId,
      businessModel: 'B2B',
      planTier: 'starter',
      technicalLead: 'Quota Test',
      contactEmail: 'quota@example.test',
      enabledServices: ['crm'],
      apiCallQuota: 10,
    }).project;
    const productionEnvironment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
    const key = PlatformRepository.createApiKey({
      name: 'Atomic Quota Test Key',
      environmentId: productionEnvironment.id,
      projectId: project.id,
      capabilities: ['crm:read'],
      tenantScope: [project.slug],
      createdBy: 'test_suite',
    });
    const handler = withApiGuard(
      { serviceId: 'crm', serviceName: 'CRM Service' },
      async () => NextResponse.json({ success: true })
    );

    const responses = await Promise.all(Array.from({ length: 50 }, () => handler(new NextRequest(
      'http://localhost:3000/api/v1/crm/leads',
      { headers: { 'x-api-key': key.rawSecret } }
    ))));

    assert.equal(responses.filter((response) => response.status === 200).length, 10);
    assert.equal(PlatformRepository.getProject(project.id)?.monthlyApiCalls, 10);

    const failingProject = PlatformRepository.createProject({
      name: `Failed Call Quota ${Date.now()}`,
      organizationId,
      businessModel: 'B2B',
      planTier: 'starter',
      technicalLead: 'Quota Test',
      contactEmail: 'quota-failure@example.test',
      enabledServices: ['crm'],
      apiCallQuota: 1,
    }).project;
    const failingEnvironment = PlatformRepository.listEnvironments(failingProject.id).find((item) => item.isProduction)!;
    const failingKey = PlatformRepository.createApiKey({
      name: 'Failed Call Test Key',
      environmentId: failingEnvironment.id,
      projectId: failingProject.id,
      capabilities: ['crm:read'],
      tenantScope: [failingProject.slug],
      createdBy: 'test_suite',
    });
    const environmentCallsBeforeFailure = PlatformRepository.getQuotaPolicy(failingEnvironment.id)?.monthlyCallsUsed || 0;
    const failOnce = withApiGuard(
      { serviceId: 'crm', serviceName: 'CRM Service' },
      async () => NextResponse.json({ success: false }, { status: 503 })
    );
    const failure = await failOnce(new NextRequest('http://localhost:3000/api/v1/crm/leads', {
      headers: { 'x-api-key': failingKey.rawSecret },
    }));

    assert.equal(failure.status, 503);
    assert.equal(PlatformRepository.getProject(failingProject.id)?.monthlyApiCalls, 0);
    assert.equal(
      PlatformRepository.getQuotaPolicy(failingEnvironment.id)?.monthlyCallsUsed || 0,
      environmentCallsBeforeFailure
    );
  });

  it('isolates hospital fallback data by authenticated tenant', async () => {
    const organizationId = PlatformRepository.listOrganizations()[0]!.id;
    const makeHospitalCredential = (name: string) => {
      const project = PlatformRepository.createProject({
        name: `${name} ${Date.now()}`,
        organizationId,
        businessModel: 'B2B',
        planTier: 'starter',
        technicalLead: 'Tenant Isolation Test',
        contactEmail: `${name.toLowerCase()}@example.test`,
        enabledServices: ['hms'],
      }).project;
      const environment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
      const key = PlatformRepository.createApiKey({
        name: `${name} Key`,
        environmentId: environment.id,
        projectId: project.id,
        capabilities: ['hms:read', 'hms:write'],
        tenantScope: [project.slug],
        createdBy: 'test_suite',
      });
      return { project, rawSecret: key.rawSecret };
    };
    const firstTenant = makeHospitalCredential('Hospital Alpha');
    const secondTenant = makeHospitalCredential('Hospital Beta');
    const handler = withApiGuard(
      { serviceId: 'hms', serviceName: 'Hospital API' },
      async () => NextResponse.json({ data: hospitalStore.addPatient({ name: 'Alpha-only Patient' }) })
    );

    await handler(new NextRequest('http://localhost:3000/api/v1/hms/patients', {
      method: 'POST',
      headers: { 'x-api-key': firstTenant.rawSecret },
    }));
    const secondResponse = await withApiGuard(
      { serviceId: 'hms', serviceName: 'Hospital API' },
      async () => NextResponse.json({ data: hospitalStore.getPatients() })
    )(new NextRequest('http://localhost:3000/api/v1/hms/patients', {
      headers: { 'x-api-key': secondTenant.rawSecret },
    }));

    assert.equal(secondResponse.status, 200);
    const patients = (await secondResponse.json()).data;
    assert.equal(patients.some((patient: any) => patient.name === 'Alpha-only Patient'), false);
  });

  it('denies hospital writes to a read-only customer key', async () => {
    const organizationId = PlatformRepository.listOrganizations()[0]!.id;
    const project = PlatformRepository.createProject({
      name: `Read Only Hospital ${Date.now()}`,
      organizationId,
      businessModel: 'B2B',
      planTier: 'starter',
      technicalLead: 'Capability Test',
      contactEmail: 'readonly@example.test',
      enabledServices: ['hms'],
    }).project;
    const environment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
    const key = PlatformRepository.createApiKey({
      name: 'Read Only Hospital Key',
      environmentId: environment.id,
      projectId: project.id,
      capabilities: ['hms:read'],
      tenantScope: [project.slug],
      createdBy: 'test_suite',
    });

    const response = await createPatient(new NextRequest('http://localhost:3000/api/hospital/patients', {
      method: 'POST',
      headers: { 'x-api-key': key.rawSecret, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Read-only key must not write' }),
    }));

    assert.equal(response.status, 403);
    assert.equal((await response.json()).error?.code, 'INSUFFICIENT_SCOPES');
  });

  it('rejects ignored usage updates and audits the explicit admin reset action', async () => {
    const project = PlatformRepository.getProject(restaurantPosProjectId)!;
    PlatformRepository.updateProject(project.id, { monthlyApiCalls: 7 });
    const usageBeforeUpdateAttempt = PlatformRepository.getProject(project.id)?.monthlyApiCalls;
    const headers = {
      authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
      'content-type': 'application/json',
    };
    const unsupportedUpdate = await updateProject(new NextRequest(
      `http://localhost:3000/api/v1/admin/projects/${project.id}`,
      { method: 'PATCH', headers, body: JSON.stringify({ monthlyApiCalls: 0 }) }
    ));
    assert.equal(unsupportedUpdate.status, 400);
    assert.equal(PlatformRepository.getProject(project.id)?.monthlyApiCalls, usageBeforeUpdateAttempt);

    const resetResponse = await updateProjectUsage(new NextRequest(
      `http://localhost:3000/api/v1/admin/projects/${project.id}/usage`,
      { method: 'POST', headers, body: JSON.stringify({ action: 'reset' }) }
    ));
    assert.equal(resetResponse.status, 200);
    assert.equal(PlatformRepository.getProject(project.id)?.monthlyApiCalls, 0);
    assert.ok(PlatformRepository.listAuditEvents({ projectId: project.id }).some((entry) =>
      entry.action === 'project.usage.reset' && entry.metadata?.previousValue === 7 && entry.metadata?.newValue === 0
    ));
  });
});
