import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requireOperatorAuthorization,
  listTenants,
  getTenantDetail,
  suspendTenant,
  resumeTenant,
  updateTenantCustomDomain,
} from '../../src/server/tenants/tenants-service';
import type { OperatorSessionContext } from '../../src/server/accounts/account-service';

const mockOperator: OperatorSessionContext = {
  id: 'sess_test_123',
  operatorId: 'op_test_123',
  email: 'operator@orbitox.io',
  role: 'PLATFORM_OWNER',
  csrfTokenHash: 'mock_hash',
  reauthenticatedAt: new Date(),
};

describe('Tenants Service Unit Tests (Step C2, Rule 4.11 MCP-ready)', () => {
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

  it('requires a mandatory reason when suspending a tenant', async () => {
    await assert.rejects(
      async () => {
        await suspendTenant('tenant_any', { reason: '' }, mockOperator);
      },
      /SUSPEND_REASON_REQUIRED/
    );
  });

  it('suspends and resumes tenant lifecycle safely', async () => {
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
