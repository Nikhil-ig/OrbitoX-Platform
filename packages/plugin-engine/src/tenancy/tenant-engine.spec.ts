import { createMultiTenantEngine, getActiveTenant } from './tenant-engine';

describe('MultiTenantEngine & Smart Custom Domain Router', () => {
  it('should resolve static custom domain mapping', async () => {
    const engine = createMultiTenantEngine({
      domains: {
        'portal.apollohospitals.com': {
          tenantId: 'tenant_apollo',
          name: 'Apollo Hospitals',
          tier: 'enterprise',
          features: ['ai_diagnostics', 'telehealth'],
        },
      },
    });

    const tenant = await engine.resolve('portal.apollohospitals.com');
    expect(tenant).toBeDefined();
    expect(tenant?.tenantId).toBe('tenant_apollo');
    expect(tenant?.name).toBe('Apollo Hospitals');
    expect(tenant?.tier).toBe('enterprise');
  });

  it('should utilize fast in-memory TTL caching and invalidate correctly', async () => {
    let dbLookupCount = 0;
    const engine = createMultiTenantEngine({
      cacheTtlMs: 5000,
      resolveTenant: async (host) => {
        dbLookupCount++;
        return { tenantId: `tenant_${host}`, name: `Tenant for ${host}` };
      },
    });

    // 1st call -> Cache Miss (hits DB resolver)
    const t1 = await engine.resolve('client1.com');
    expect(t1?.tenantId).toBe('tenant_client1.com');
    expect(dbLookupCount).toBe(1);

    // 2nd call -> Cache Hit (instant, no DB hit!)
    const t2 = await engine.resolve('client1.com');
    expect(t2?.tenantId).toBe('tenant_client1.com');
    expect(dbLookupCount).toBe(1); // Still 1!

    // Invalidate Cache
    engine.invalidateCache('client1.com');

    // 3rd call -> Cache Miss again (hits DB resolver)
    const t3 = await engine.resolve('client1.com');
    expect(t3?.tenantId).toBe('tenant_client1.com');
    expect(dbLookupCount).toBe(2);
  });

  it('should evaluate feature entitlements and tier ranks', async () => {
    const engine = createMultiTenantEngine({
      domains: {
        'apollo.orbito.com': {
          tenantId: 'apollo',
          tier: 'enterprise',
          features: ['ai_diagnostics'],
        },
        'starter.orbito.com': {
          tenantId: 'starter',
          tier: 'starter',
          features: ['basic_crm'],
        },
      },
    });

    await engine.runWithTenant('apollo.orbito.com', async (session) => {
      expect(session.hasFeature('ai_diagnostics')).toBe(true);
      expect(session.hasFeature('unlicensed_feature')).toBe(false);
      expect(session.isTier('starter')).toBe(true);
      expect(session.isTier('enterprise')).toBe(true);

      // Data Scoper
      const scopedPayload = session.scopeData({ name: 'Lead 1', email: 'test@apollo.com' });
      expect(scopedPayload.tenantId).toBe('apollo');
      expect(scopedPayload.name).toBe('Lead 1');
    });

    await engine.runWithTenant('starter.orbito.com', async (session) => {
      expect(session.hasFeature('ai_diagnostics')).toBe(false);
      expect(session.isTier('enterprise')).toBe(false);
      expect(session.isTier('starter')).toBe(true);
    });
  });

  it('should block suspended tenant domains from execution', async () => {
    const engine = createMultiTenantEngine({
      domains: {
        'suspended.orbito.com': {
          tenantId: 'suspended_id',
          name: 'Suspended Hospital',
          status: 'SUSPENDED',
        },
      },
    });

    await expect(
      engine.runWithTenant('suspended.orbito.com', async () => {})
    ).rejects.toThrow('SUSPENDED');
  });

  it('should provide feature guard and tier guard HTTP middleware', async () => {
    const engine = createMultiTenantEngine({
      domains: {
        'apollo.orbito.com': {
          tenantId: 'apollo',
          tier: 'enterprise',
          features: ['ai_diagnostics'],
        },
      },
    });

    const featureGuard = engine.requireFeature('ai_diagnostics');
    const tierGuard = engine.requireTier('enterprise');

    const appMiddleware = engine.middleware();
    const req: any = { headers: { host: 'apollo.orbito.com' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await appMiddleware(req, res, next);
    expect(req.tenantSession).toBeDefined();

    // Feature guard pass
    const nextFeature = jest.fn();
    featureGuard(req, res, nextFeature);
    expect(nextFeature).toHaveBeenCalled();

    // Tier guard pass
    const nextTier = jest.fn();
    tierGuard(req, res, nextTier);
    expect(nextTier).toHaveBeenCalled();
  });
});
