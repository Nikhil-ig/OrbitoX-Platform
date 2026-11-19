import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  requireOperatorAuthorization,
  listTenants,
  getTenantDetail,
  suspendTenant,
  resumeTenant,
  updateTenantCustomDomain,
  IN_MEMORY_TENANTS,
} from '../../src/server/tenants/tenants-service';
import type { OperatorSessionContext } from '../../src/server/accounts/account-service';

// Save original database environment variables
const initialDbUrl = process.env.DATABASE_URL;
const initialAppDbUrl = process.env.APP_DATABASE_URL;

const mockOperator: OperatorSessionContext = {
  id: 'sess_test_123',
  operatorId: 'op_test_123',
  email: 'operator@orbitox.io',
  role: 'PLATFORM_OWNER',
  csrfTokenHash: 'mock_hash',
  reauthenticatedAt: new Date(),
};

describe('Tenants Service Unit Tests (Step C2, Rule 4.11 MCP-ready)', () => {
  beforeEach(() => {
    // Explicitly ensure in-memory unit tests run with no database configured (B-4 requirement 4)
    delete process.env.DATABASE_URL;
    delete process.env.APP_DATABASE_URL;
  });
  it('enforces operator authorization', () => {
    assert.throws(
      () => requireOperatorAuthorization(null),
      /OPERATOR_UNAUTHORIZED/,
      'Must reject null operator context'
    );

    assert.throws(
      () => requireOperatorAuthorization({} as any),
      /OPERATOR_UNAUTHORIZED/,
      'Must reject operator context without operatorId'
    );

    assert.doesNotThrow(() => requireOperatorAuthorization(mockOperator));
  });

  it('lists tenants with pagination and filtering', async () => {
    const result = await listTenants({ limit: 10, page: 1 }, mockOperator);
    assert.ok(result);
    assert.ok(Array.isArray(result.items));
    assert.equal(typeof result.total, 'number');
    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 10);
    assert.ok(result.totalPages >= 1);

    if (result.items.length > 0 && result.items[0]) {
      const first = result.items[0];
      assert.ok(first.id, 'Expected tenant to have id');
      assert.ok(first.slug, 'Expected tenant to have slug');
      assert.ok(first.name, 'Expected tenant to have name');
      assert.ok(typeof first.monthlyApiCalls === 'number');
      assert.ok(typeof first.apiCallQuota === 'number');
    }
  });

  it('filters tenants by status', async () => {
    const activeResult = await listTenants({ status: 'ACTIVE' }, mockOperator);
    assert.ok(activeResult);
    for (const item of activeResult.items) {
      assert.equal(item.status, 'ACTIVE');
    }
  });

  it('returns null for non-existent tenant detail', async () => {
    const detail = await getTenantDetail('non_existent_tenant_99999', mockOperator);
    assert.equal(detail, null);
  });

  it('retrieves detailed tenant configuration and topology', async () => {
    const list = await listTenants({ limit: 1 }, mockOperator);
    if (list.items.length > 0 && list.items[0]) {
      const targetId = list.items[0].id;
      const detail = await getTenantDetail(targetId, mockOperator);
      assert.ok(detail);
      assert.equal(detail.id, targetId);
      assert.ok(detail.topology);
      assert.ok(detail.topology.databaseEngine.includes('PostgreSQL 16'));
      assert.ok(detail.topology.isolationModel.includes('RLS'));
      assert.ok(detail.quotas);
      assert.ok(Array.isArray(detail.domains));
      assert.ok(Array.isArray(detail.plugins));
      assert.ok(Array.isArray(detail.recentAuditEvents));
    }
  });

  // B-2 Blocker Verification: Audit feed strict isolation between tenants
  it('B-2: strictly scopes audit events to the tenant and never leaks cross-tenant events', async () => {
    const tenantA = 'proj_oasis_blr';
    const tenantB = 'proj_rest_mumbai';

    // Suspend both tenants with distinct audited reasons
    await suspendTenant(tenantA, { reason: 'Audit event unique to Tenant A' }, mockOperator);
    await suspendTenant(tenantB, { reason: 'Audit event unique to Tenant B' }, mockOperator);

    // Fetch detail for Tenant A
    const detailA = await getTenantDetail(tenantA, mockOperator);
    assert.ok(detailA);
    const reasonsA = detailA.recentAuditEvents.map((e) => e.reason || '');
    assert.ok(
      reasonsA.some((r) => r.includes('Tenant A')),
      'Tenant A detail must contain its own audit event'
    );
    assert.equal(
      reasonsA.some((r) => r.includes('Tenant B')),
      false,
      'Tenant A detail MUST NOT contain any audit events belonging to Tenant B'
    );

    // Fetch detail for Tenant B
    const detailB = await getTenantDetail(tenantB, mockOperator);
    assert.ok(detailB);
    const reasonsB = detailB.recentAuditEvents.map((e) => e.reason || '');
    assert.ok(
      reasonsB.some((r) => r.includes('Tenant B')),
      'Tenant B detail must contain its own audit event'
    );
    assert.equal(
      reasonsB.some((r) => r.includes('Tenant A')),
      false,
      'Tenant B detail MUST NOT contain any audit events belonging to Tenant A'
    );

    // Restore active state
    await resumeTenant(tenantA, { reason: 'Restoring Tenant A' }, mockOperator);
    await resumeTenant(tenantB, { reason: 'Restoring Tenant B' }, mockOperator);
  });

  // B-3 Blocker Verification: Server-side minimum reason length enforcement
  it('B-3: rejects suspension on the server when reason is fewer than 5 characters', async () => {
    // Empty reason
    await assert.rejects(
      async () => {
        await suspendTenant('proj_oasis_blr', { reason: '' }, mockOperator);
      },
      /SUSPEND_REASON_MIN_LENGTH/,
      'Server must reject empty reason'
    );

    // 1-character reason
    await assert.rejects(
      async () => {
        await suspendTenant('proj_oasis_blr', { reason: 'x' }, mockOperator);
      },
      /SUSPEND_REASON_MIN_LENGTH/,
      'Server must reject 1-character reason'
    );

    // 4-character reason
    await assert.rejects(
      async () => {
        await suspendTenant('proj_oasis_blr', { reason: 'stop' }, mockOperator);
      },
      /SUSPEND_REASON_MIN_LENGTH/,
      'Server must reject reasons shorter than 5 characters'
    );
  });

  // B-3 Blocker Verification: Server-side step-up re-authentication requirement
  it('B-3: enforces server-side operator step-up re-authentication within 5 minutes', async () => {
    // Operator with null reauthenticatedAt
    const unauthenticatedOperator: OperatorSessionContext = {
      ...mockOperator,
      reauthenticatedAt: null,
    };

    await assert.rejects(
      async () => {
        await suspendTenant('proj_oasis_blr', { reason: 'Valid audited reason' }, unauthenticatedOperator);
      },
      /STEP_UP_REAUTH_REQUIRED/,
      'Must reject operator without step-up reauthentication'
    );

    // Operator with expired reauthentication (> 5 minutes ago)
    const expiredOperator: OperatorSessionContext = {
      ...mockOperator,
      reauthenticatedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
    };

    await assert.rejects(
      async () => {
        await suspendTenant('proj_oasis_blr', { reason: 'Valid audited reason' }, expiredOperator);
      },
      /STEP_UP_REAUTH_REQUIRED/,
      'Must reject operator whose step-up reauthentication expired (> 5 min)'
    );

    // Operator with fresh reauthentication (< 5 minutes ago) succeeds
    const freshOperator: OperatorSessionContext = {
      ...mockOperator,
      reauthenticatedAt: new Date(),
    };

    const res = await suspendTenant('proj_oasis_blr', { reason: 'Valid audited reason' }, freshOperator);
    assert.equal(res.success, true);
    assert.equal(res.status, 'SUSPENDED');

    // Clean up
    await resumeTenant('proj_oasis_blr', { reason: 'Clean up test' }, freshOperator);
  });

  it('suspends and resumes tenant lifecycle safely with valid reason and step-up auth', async () => {
    const list = await listTenants({ limit: 1 }, mockOperator);
    if (list.items.length > 0 && list.items[0]) {
      const target = list.items[0];
      const suspendResult = await suspendTenant(
        target.id,
        { reason: 'Audit compliance review' },
        mockOperator
      );
      assert.equal(suspendResult.success, true);
      assert.equal(suspendResult.status, 'SUSPENDED');

      const resumedResult = await resumeTenant(
        target.id,
        { reason: 'Audit completed' },
        mockOperator
      );
      assert.equal(resumedResult.success, true);
      assert.equal(resumedResult.status, 'ACTIVE');
    }
  });

  it('updates custom domain for tenant', async () => {
    const list = await listTenants({ limit: 1 }, mockOperator);
    if (list.items.length > 0 && list.items[0]) {
      const target = list.items[0];
      const domainResult = await updateTenantCustomDomain(
        target.id,
        { customDomain: 'custom.test-portal.orbitox.io' },
        mockOperator
      );
      assert.equal(domainResult.success, true);
      assert.equal(domainResult.customDomain, 'custom.test-portal.orbitox.io');
    }
  });
});

describe('Database Error Handling & Strict Non-Fallback Invariants (B-4)', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://orbitox_test:testpass@127.0.0.1:5432/orbitox_phase2';
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.APP_DATABASE_URL;
  });

  it('a database error during plugin suspension returns an error, and the tenant is not reported as suspended', async () => {
    let projectStatus = 'ACTIVE';
    const mockRepo = {
      getProject: async (id: string) => ({
        id: 'proj_oasis_blr',
        slug: 'oasis-blr',
        name: 'Oasis Cafe Bangalore',
        status: projectStatus,
        organizationId: 'org_oasis',
      }),
      listPluginInstallations: async (projectId: string) => [
        { pluginId: '@orbitox/hospital', tenantId: projectId, status: 'ACTIVE' },
      ],
      updateProject: async (id: string, updates: any) => {
        if (updates.status) projectStatus = updates.status;
        return { id, ...updates };
      },
      updatePluginInstallationStatus: async () => {
        throw new Error('PG_PLUGIN_UPDATE_ERROR: Deadlock detected updating plugin installations');
      },
      recordPlatformAdminAudit: async () => 'audit_123',
    };

    await assert.rejects(
      async () => {
        await suspendTenant(
          'proj_oasis_blr',
          { reason: 'Database error test reason' },
          mockOperator,
          { repository: mockRepo as any }
        );
      },
      /PG_PLUGIN_UPDATE_ERROR/,
      'Must re-throw the database error without falling back to in-memory'
    );

    // Verify rollback: projectStatus must be rolled back to ACTIVE, NOT reported as SUSPENDED
    assert.equal(projectStatus, 'ACTIVE', 'Tenant status must be rolled back to ACTIVE on plugin DB failure');
  });

  it('the audit write failing fails the action', async () => {
    let projectStatus = 'ACTIVE';
    let pluginStatus = 'ACTIVE';
    const mockRepo = {
      getProject: async (id: string) => ({
        id: 'proj_oasis_blr',
        slug: 'oasis-blr',
        name: 'Oasis Cafe Bangalore',
        status: projectStatus,
        organizationId: 'org_oasis',
      }),
      listPluginInstallations: async (projectId: string) => [
        { pluginId: '@orbitox/hospital', tenantId: projectId, status: pluginStatus },
      ],
      updateProject: async (id: string, updates: any) => {
        if (updates.status) projectStatus = updates.status;
        return { id, ...updates };
      },
      updatePluginInstallationStatus: async (tId: string, pId: string, status: string) => {
        pluginStatus = status;
      },
      recordPlatformAdminAudit: async () => {
        throw new Error('AUDIT_STORE_UNAVAILABLE: Connection refused to platform-admin audit database');
      },
    };

    await assert.rejects(
      async () => {
        await suspendTenant(
          'proj_oasis_blr',
          { reason: 'Audit failure test reason' },
          mockOperator,
          { repository: mockRepo as any }
        );
      },
      /AUDIT_STORE_UNAVAILABLE/,
      'Audit store failure must fail the suspension action'
    );

    // Verify project and plugin are rolled back
    assert.equal(projectStatus, 'ACTIVE', 'Tenant status must be rolled back to ACTIVE on audit write failure');
    assert.equal(pluginStatus, 'ACTIVE', 'Plugin status must be rolled back to ACTIVE on audit write failure');
  });

  it('suspending a seeded demo ID while a database is configured does not succeed without a database write', async () => {
    // Database returns null for seeded demo ID
    const mockRepo = {
      getProject: async () => null,
      updateProject: async () => {
        throw new Error('SHOULD_NOT_BE_CALLED');
      },
    };

    // Ensure demo tenant in-memory object is initially ACTIVE
    const seeded = IN_MEMORY_TENANTS.find((t) => t.id === 'proj_oasis_blr');
    if (seeded) seeded.status = 'ACTIVE';

    await assert.rejects(
      async () => {
        await suspendTenant(
          'proj_oasis_blr',
          { reason: 'Demo ID without DB write test' },
          mockOperator,
          { repository: mockRepo as any }
        );
      },
      /TENANT_NOT_FOUND/,
      'Must reject with TENANT_NOT_FOUND instead of falling back to in-memory demo tenant'
    );

    // In-memory demo tenant must NOT have been mutated
    if (seeded) {
      assert.equal(seeded.status, 'ACTIVE', 'In-memory demo tenant must not be mutated when database is configured');
    }
  });
});

// Restore environment in after hook if original variables were set
after(() => {
  if (initialDbUrl) process.env.DATABASE_URL = initialDbUrl;
  if (initialAppDbUrl) process.env.APP_DATABASE_URL = initialAppDbUrl;
});
