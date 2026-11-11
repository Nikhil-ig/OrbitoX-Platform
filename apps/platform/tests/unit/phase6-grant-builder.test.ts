import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { fetchGrantForService, grantStatusForInstallation } from '@/app/api/_lib/route-auth';
import { platformRepository } from '@/lib/platform-repository';

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
    const isPrisma = process.env.ORBITOX_PLATFORM_REPOSITORY === 'prisma';

    const testCases = [
      { planId: `unknown-${id}`, expectedPattern: /PluginInstallation_planId_fkey/ },
      { planId: 'starter', expectedPattern: /PluginInstallation_planId_fkey/ },
      {
        planId: 'restaurant-starter',
        expectedPattern: /Plan restaurant-starter belongs to plugin @orbitox\/restaurant, not installation plugin @orbitox\/hms/,
      },
    ];

    for (const [index, { planId, expectedPattern }] of testCases.entries()) {
      const tenantId = `org/org_${id}/project/project_${id}_${index}/environment/environment_${id}`;

      if (isPrisma) {
        await assert.rejects(
          platformRepository.provisionPluginInstallation({
            tenantId,
            runtimeTenantId: tenantId,
            pluginId: '@orbitox/hms',
            status: 'ACTIVE',
            planId,
          }),
          (err: any) => {
            const errString = String(err?.message || err || '');
            return expectedPattern.test(errString);
          },
        );
      } else {
        await platformRepository.provisionPluginInstallation({
          tenantId,
          runtimeTenantId: tenantId,
          pluginId: '@orbitox/hms',
          status: 'ACTIVE',
          planId,
        });
      }

      assert.equal(await fetchGrantForService(tenantId, '@orbitox/hms'), null);
    }
  });
});
