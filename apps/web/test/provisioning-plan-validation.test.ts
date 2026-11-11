import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SEED_PLANS } from '@orbitox-io/plugin-engine';
import {
  ProvisioningSaga,
  ProvisioningValidationError,
  validateProvisioningPlugins,
} from '../lib/tenant-provisioning/provisioning-saga';

describe('Tenant provisioning catalogue plan validation', () => {
  const listPlans = async (pluginId: string) =>
    SEED_PLANS.filter((plan) => plan.pluginId === pluginId);

  it('rejects a missing plan before provisioning', async () => {
    await assert.rejects(
      validateProvisioningPlugins([{ id: 'restaurant-os' }], listPlans),
      ProvisioningValidationError,
    );
    await assert.rejects(
      new ProvisioningSaga().startProvisioning({
        organizationId: 'must-not-be-looked-up',
        name: 'Missing Plan Test',
        slug: 'missing-plan-test',
        plugins: [{ id: 'restaurant-os', plan: 'starter' }],
      }),
      ProvisioningValidationError,
    );
  });

  it('rejects bare, unknown, and wrong-plugin plans', async () => {
    const invalidPlans: Array<[string, string]> = [
      ['restaurant-os', 'starter'],
      ['restaurant-os', 'growth'],
      ['hospital-os', 'restaurant-starter'],
    ];
    for (const [id, plan] of invalidPlans) {
      await assert.rejects(
        validateProvisioningPlugins([{ id, plan }], listPlans),
        ProvisioningValidationError,
      );
    }
  });

  it('accepts an exact active catalogue plan and preserves its full ID', async () => {
    const [plugin] = await validateProvisioningPlugins(
      [{ id: 'restaurant-os', plan: 'restaurant-starter' }],
      listPlans,
    );
    assert.ok(plugin);

    assert.equal(plugin.plan, 'restaurant-starter');
    assert.equal(plugin.planTier, 'starter');
  });
});
