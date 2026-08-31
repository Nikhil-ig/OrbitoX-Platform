import { createMultiTenantEngine, getActiveTenant } from './tenant-engine';

describe('MultiTenantEngine & Custom Domain Router', () => {
  it('should resolve static custom domain mapping', async () => {
    const engine = createMultiTenantEngine({
      domains: {
        'portal.apollohospitals.com': {
          tenantId: 'tenant_apollo',
          name: 'Apollo Hospitals',
        },
      },
    });

    const tenant = await engine.resolve('portal.apollohospitals.com');
    expect(tenant).toBeDefined();
    expect(tenant?.tenantId).toBe('tenant_apollo');
    expect(tenant?.name).toBe('Apollo Hospitals');
  });

  it('should automatically resolve wildcards and subdomains', async () => {
    const engine = createMultiTenantEngine({
      wildcardRootDomain: 'orbito.com',
    });

    const tenant = await engine.resolve('maxhealth.orbito.com:443');
    expect(tenant).toBeDefined();
    expect(tenant?.tenantId).toBe('tenant_maxhealth');
    expect(tenant?.subdomain).toBe('maxhealth');
  });

  it('should support dynamic async database lookup functions', async () => {
    const mockDb = {
      'custom-client.com': { tenantId: 'tenant_dynamic_99', name: 'Dynamic Client Corp' },
    };

    const engine = createMultiTenantEngine({
      resolveTenant: async (host) => mockDb[host as keyof typeof mockDb] || null,
    });

    const tenant = await engine.resolve('custom-client.com');
    expect(tenant).toBeDefined();
    expect(tenant?.tenantId).toBe('tenant_dynamic_99');
    expect(tenant?.name).toBe('Dynamic Client Corp');
  });

  it('should isolate tenant apps and propagate context via AsyncLocalStorage', async () => {
    const mockCrmPlugin = {
      id: 'crm',
      createLead: (data: any) => ({ ...data, id: 'lead_1' }),
    };

    const engine = createMultiTenantEngine({
      domains: {
        'fortis.orbito.com': { tenantId: 'tenant_fortis', name: 'Fortis Health' },
      },
      plugins: [mockCrmPlugin],
    });

    await engine.runWithTenant('fortis.orbito.com', async (session) => {
      expect(session.tenant.tenantId).toBe('tenant_fortis');
      expect(session.app.crm).toBeDefined();

      // Verify AsyncLocalStorage retrieval
      const activeSession = getActiveTenant();
      expect(activeSession).toBeDefined();
      expect(activeSession?.tenant.tenantId).toBe('tenant_fortis');
    });
  });

  it('should provide a 1-line Express middleware', async () => {
    const engine = createMultiTenantEngine({
      wildcardRootDomain: 'orbito.com',
    });

    const middleware = engine.middleware();
    const req: any = { headers: { host: 'demo.orbito.com' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.tenant).toBeDefined();
    expect(req.tenant.tenantId).toBe('tenant_demo');
    expect(req.app).toBeDefined();
  });
});
