import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../app/api/v1/_lib/api-guard';
import { isIpAllowed, resolveClientIp } from '../app/api/v1/_lib/ip-guard';
import { PlatformKeyEngine } from '@orbitox-io/plugin-engine';

describe('Phase 1 Security & API Guard Negative Test Suite', () => {
  let validAdminKeySecret: string;
  let validAdminKeyId: string;
  let validCustomerKeySecret: string;
  let validCustomerKeyId: string;
  let revokedKeySecret: string;
  let revokedKeyId: string;

  before(() => {
    // Generate valid keys through PlatformKeyEngine
    const adminKey = PlatformKeyEngine.generateKey('production');
    validAdminKeySecret = adminKey.rawSecret;
    validAdminKeyId = adminKey.keyId;

    const customerKey = PlatformKeyEngine.generateKey('production');
    validCustomerKeySecret = customerKey.rawSecret;
    validCustomerKeyId = customerKey.keyId;

    const revokedKey = PlatformKeyEngine.generateKey('production');
    revokedKeySecret = revokedKey.rawSecret;
    revokedKeyId = revokedKey.keyId;

    // Register them into PlatformApiState
    PlatformApiState.apiKeys.push({
      id: adminKey.keyId,
      name: 'Test Admin Key',
      keyPrefix: adminKey.keyPrefix,
      secretFingerprint: adminKey.secretFingerprint,
      authVerifier: adminKey.authVerifier,
      maskedDisplay: adminKey.maskedDisplay,
      projectId: 'proj_platform',
      tenantId: 'system',
      status: 'active',
      scopes: ['admin', 'platform.read', 'platform.write'],
      environment: 'production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    PlatformApiState.apiKeys.push({
      id: customerKey.keyId,
      name: 'Test Customer Key',
      keyPrefix: customerKey.keyPrefix,
      secretFingerprint: customerKey.secretFingerprint,
      authVerifier: customerKey.authVerifier,
      maskedDisplay: customerKey.maskedDisplay,
      projectId: 'proj_customer_omega',
      tenantId: 'tenant_omega',
      status: 'active',
      scopes: ['crm:read', 'crm:write'],
      environment: 'production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    PlatformApiState.apiKeys.push({
      id: revokedKey.keyId,
      name: 'Revoked Key',
      keyPrefix: revokedKey.keyPrefix,
      secretFingerprint: revokedKey.secretFingerprint,
      authVerifier: revokedKey.authVerifier,
      maskedDisplay: revokedKey.maskedDisplay,
      projectId: 'proj_revoked',
      tenantId: 'tenant_revoked',
      status: 'revoked',
      scopes: ['crm:read'],
      environment: 'production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Register matching projects
    PlatformApiState.projects.push({
      id: 'proj_customer_omega',
      name: 'Omega Tenant Project',
      slug: 'tenant_omega',
      organization: 'org_omega',
      businessModel: 'b2b',
      businessModelLabel: 'B2B',
      description: 'Test project',
      plan: 'pro',
      planLabel: 'Pro',
      status: 'active',
      monthlyApiCalls: 0,
      apiCallQuota: 5000000,
      rateLimitPerMin: 120,
      storageUsedGb: 1,
      storageQuotaGb: 100,
      enabledServices: ['crm'],
      features: [],
      contactEmail: 'admin@omega.test',
      technicalLead: 'Lead',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      recentLatencyMs: 5,
    });

    PlatformApiState.projects.push({
      id: 'proj_suspended',
      name: 'Suspended Project',
      slug: 'tenant_suspended',
      organization: 'org_suspended',
      businessModel: 'b2b',
      businessModelLabel: 'B2B',
      description: 'Suspended test project',
      plan: 'starter',
      planLabel: 'Starter',
      status: 'suspended',
      monthlyApiCalls: 0,
      apiCallQuota: 100000,
      rateLimitPerMin: 60,
      storageUsedGb: 0,
      storageQuotaGb: 10,
      enabledServices: ['crm'],
      features: [],
      contactEmail: 'admin@suspended.test',
      technicalLead: 'Lead',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      recentLatencyMs: 5,
    });

    PlatformApiState.projects.push({
      id: 'proj_empty_services',
      name: 'Empty Services Project',
      slug: 'tenant_empty',
      organization: 'org_empty',
      businessModel: 'b2b',
      businessModelLabel: 'B2B',
      description: 'Empty services project',
      plan: 'starter',
      planLabel: 'Starter',
      status: 'active',
      monthlyApiCalls: 0,
      apiCallQuota: 100000,
      rateLimitPerMin: 60,
      storageUsedGb: 0,
      storageQuotaGb: 10,
      enabledServices: [], // Fail closed: empty services must deny
      features: [],
      contactEmail: 'admin@empty.test',
      technicalLead: 'Lead',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      recentLatencyMs: 5,
    });

    PlatformApiState.projects.push({
      id: 'proj_over_quota',
      name: 'Over Quota Project',
      slug: 'tenant_quota',
      organization: 'org_quota',
      businessModel: 'b2b',
      businessModelLabel: 'B2B',
      description: 'Over quota test project',
      plan: 'starter',
      planLabel: 'Starter',
      status: 'active',
      monthlyApiCalls: 5000,
      apiCallQuota: 5000, // Quota exhausted (consumed >= limit)
      rateLimitPerMin: 60,
      storageUsedGb: 0,
      storageQuotaGb: 10,
      enabledServices: ['crm'],
      features: [],
      contactEmail: 'admin@quota.test',
      technicalLead: 'Lead',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      recentLatencyMs: 5,
    });
  });

  const dummyHandler = async (req: NextRequest, ctx: any) => {
    return NextResponse.json({ success: true, tenantId: ctx.tenantId, keyId: ctx.keyId });
  };

  it('1. Mandatory Auth: rejects request with no credentials with 401', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts');
    const res = await handler(req, { params: Promise.resolve({}) });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  it('2. Query Parameter Auth: ignores and rejects apiKey in query string with 401', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest(`http://localhost:3000/api/v1/crm/contacts?apiKey=${validCustomerKeySecret}`);
    const res = await handler(req, { params: Promise.resolve({}) });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  it('3. Invalid Secret: rejects fabricated or wrong API key with 401', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': 'orb_live_fakekeythatneverexisted1234567890' },
    });
    const res = await handler(req, { params: Promise.resolve({}) });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'INVALID_CREDENTIALS');
  });

  it('4. Prefix Matching Elimination: rejects key prefix only with 401', async () => {
    const prefixOnly = validCustomerKeySecret.slice(0, 14); // Only the prefix "orb_live_..."
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': prefixOnly },
    });
    const res = await handler(req, { params: Promise.resolve({}) });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error?.code, 'INVALID_CREDENTIALS');
  });

  it('5. Revoked Credential: rejects revoked/disabled key with 403 KEY_DISABLED', async () => {
    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': revokedKeySecret },
    });
    const res = await handler(req, { params: Promise.resolve({}) });

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
    const res = await handler(req, { params: Promise.resolve({}) });

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
    const res = await handler(req, { params: Promise.resolve({}) });

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
    const res = await handler(req, { params: Promise.resolve({}) });

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
    const res = await handler(req, { params: Promise.resolve({}) });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'TENANT_SCOPE_VIOLATION');
  });

  it('10. Suspended Project Gate: rejects requests for suspended project with 403', async () => {
    // Generate key for suspended project
    const suspendedKey = PlatformKeyEngine.generateKey('production');
    PlatformApiState.apiKeys.push({
      id: suspendedKey.keyId,
      name: 'Suspended Key',
      keyPrefix: suspendedKey.keyPrefix,
      secretFingerprint: suspendedKey.secretFingerprint,
      authVerifier: suspendedKey.authVerifier,
      maskedDisplay: suspendedKey.maskedDisplay,
      projectId: 'proj_suspended',
      tenantId: 'tenant_suspended',
      status: 'active',
      scopes: ['crm:read'],
      environment: 'production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': suspendedKey.rawSecret },
    });
    const res = await handler(req, { params: Promise.resolve({}) });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'PROJECT_SUSPENDED');
  });

  it('11. Plugin Entitlement Gate Fails Closed: unentitled plugin / empty services rejected with 403', async () => {
    // Generate key for empty services project
    const emptyKey = PlatformKeyEngine.generateKey('production');
    PlatformApiState.apiKeys.push({
      id: emptyKey.keyId,
      name: 'Empty Services Key',
      keyPrefix: emptyKey.keyPrefix,
      secretFingerprint: emptyKey.secretFingerprint,
      authVerifier: emptyKey.authVerifier,
      maskedDisplay: emptyKey.maskedDisplay,
      projectId: 'proj_empty_services',
      tenantId: 'tenant_empty',
      status: 'active',
      scopes: ['crm:read'],
      environment: 'production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': emptyKey.rawSecret },
    });
    const res = await handler(req, { params: Promise.resolve({}) });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'PLUGIN_NOT_ENTITLED');
  });

  it('12. Quota Gate Fails Closed: over-quota project returns 429', async () => {
    const quotaKey = PlatformKeyEngine.generateKey('production');
    PlatformApiState.apiKeys.push({
      id: quotaKey.keyId,
      name: 'Quota Key',
      keyPrefix: quotaKey.keyPrefix,
      secretFingerprint: quotaKey.secretFingerprint,
      authVerifier: quotaKey.authVerifier,
      maskedDisplay: quotaKey.maskedDisplay,
      projectId: 'proj_over_quota',
      tenantId: 'tenant_quota',
      status: 'active',
      scopes: ['crm:read'],
      environment: 'production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const handler = withApiGuard({ serviceId: 'crm', serviceName: 'CRM Service' }, dummyHandler);
    const req = new NextRequest('http://localhost:3000/api/v1/crm/contacts', {
      headers: { 'x-api-key': quotaKey.rawSecret },
    });
    const res = await handler(req, { params: Promise.resolve({}) });

    assert.equal(res.status, 429);
    const body = await res.json();
    assert.equal(body.error?.code, 'TENANT_QUOTA_EXCEEDED');
  });

  it('13. CIDR & IP Allowlist: denies unauthorized IP and rejects spoofed x-forwarded-for', async () => {
    // Single allowed CIDR subnet: 198.51.100.0/24
    const allowlist = ['198.51.100.0/24'];

    // Client connects from untrusted IP 203.0.113.5 with spoofed header claiming 198.51.100.1
    const req = new NextRequest('http://localhost:3000/api/v1/test', {
      headers: {
        'x-forwarded-for': '198.51.100.1',
      },
    });

    const resolvedIp = resolveClientIp(req);
    // Without trusted proxy configured, client cannot spoof IP via x-forwarded-for
    assert.notEqual(resolvedIp, '198.51.100.1');

    // Untrusted IP must be rejected by isIpAllowed
    assert.equal(isIpAllowed('203.0.113.5', allowlist), false);
    // Legitimate IP within subnet is accepted
    assert.equal(isIpAllowed('198.51.100.42', allowlist), true);
    // IPv6 CIDR subnet matching
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
    // Path on public allowlist
    const allowedReq = new NextRequest('http://localhost:3000/api/v1/openapi.json');
    const allowedRes = await handler(allowedReq, { params: Promise.resolve({}) });
    assert.equal(allowedRes.status, 200);

    // Path NOT on public allowlist, even if allowPublic is attempted
    const blockedReq = new NextRequest('http://localhost:3000/api/v1/secret-data');
    const blockedRes = await handler(blockedReq, { params: Promise.resolve({}) });
    assert.equal(blockedRes.status, 401);
  });

  it('15. Key Sanitization: never returns rawKey or authVerifier in getApiKeys', () => {
    const keys = PlatformApiState.getApiKeys();
    assert.ok(keys.length > 0);
    for (const key of keys) {
      assert.equal((key as any).rawKey, undefined, 'rawKey must be undefined');
      assert.equal((key as any).rawSecret, undefined, 'rawSecret must be undefined');
      assert.equal((key as any).authVerifier, undefined, 'authVerifier must be undefined');
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
    const res = await handler(req, { params: Promise.resolve({}) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.tenantId, 'tenant_omega');
  });
});
