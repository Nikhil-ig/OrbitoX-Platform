import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../app/api/v1/_lib/api-guard';
import { isIpAllowed, resolveClientIp } from '../app/api/v1/_lib/ip-guard';
import { PlatformRepository, PlatformKeyEngine } from '@orbitox-io/plugin-engine';
import { createInternalAuthToken } from '../app/api/v1/_lib/auth-pipeline';

describe('Phase 1 & 1.5 Security, Unified Auth & Licensed Customer Test Suite', () => {
  const TEST_ADMIN_TOKEN = 'test_admin_token_super_secret_32_chars_minimum';
  let validAdminKeySecret: string;
  let validCustomerKeySecret: string;
  let revokedKeySecret: string;
  let restaurantPosKeySecret: string;
  let restaurantPosProjectId: string;

  before(async () => {
    process.env.ORBITOX_ADMIN_TOKEN = TEST_ADMIN_TOKEN;
    process.env.ORBITOX_SERVER_PEPPER = 'test_pepper_32_characters_minimum_len';
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
      slug: 'tenant_omega',
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
      tenantScope: ['tenant_omega'],
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
      slug: 'tenant_suspended',
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
      slug: 'tenant_empty',
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
      slug: 'tenant_quota',
      organizationId: adminOrg.id,
      businessModel: 'B2B',
      planTier: 'starter',
      plan: 'starter',
      technicalLead: 'Quota Lead',
      contactEmail: 'admin@quota.test',
      enabledServices: ['crm'],
      apiCallQuota: 100,
    });
    PlatformRepository.updateProject('tenant_quota', { monthlyApiCalls: 100 });

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
    const suspendedProj = PlatformRepository.getProject('tenant_suspended');
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
    const emptyProj = PlatformRepository.getProject('tenant_empty');
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
    const quotaProj = PlatformRepository.getProject('tenant_quota');
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
    assert.equal(body.tenantId, 'tenant_omega');
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
    assert.equal(body.tenantId, 'tenant_omega');
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
});
