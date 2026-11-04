import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { fetchGrantForService, grantStatusForInstallation } from '../app/api/_lib/route-auth';
import { platformRepository } from '../lib/platform-repository';

describe('Phase 6 entitlement grant construction', () => {
  it('maps provisioning and unknown statuses to non-active grants', () => {
    for (const status of ['REQUESTED', 'PROVISIONING', 'invented-status']) {
      assert.notEqual(grantStatusForInstallation(status), 'ACTIVE');
    }
    assert.equal(grantStatusForInstallation('ACTIVE'), 'ACTIVE');
    assert.equal(grantStatusForInstallation('READ_ONLY'), 'READ_ONLY');
  });

  it('refuses unknown, bare, and mismatched plans instead of guessing or using a seed plan', async () => {
    const id = crypto.randomUUID().replaceAll('-', '');
    for (const [index, planId] of [`unknown-${id}`, 'starter', 'restaurant-starter'].entries()) {
      const tenantId = `org/org_${id}/project/project_${id}_${index}/environment/environment_${id}`;
      await platformRepository.provisionPluginInstallation({
        tenantId,
        runtimeTenantId: tenantId,
        pluginId: '@orbitox/hms',
        status: 'ACTIVE',
        planId,
      });

      assert.equal(await fetchGrantForService(tenantId, '@orbitox/hms'), null);
    }
  });
});
