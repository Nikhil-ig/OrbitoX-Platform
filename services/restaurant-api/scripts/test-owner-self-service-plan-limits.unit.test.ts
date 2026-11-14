import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SEED_PLANS } from '@orbitox-io/plugin-engine';
import { getRestaurantPlanQuotaLimit } from '../src/shared/owner-self-service';

describe('RestaurantOS catalogue plan limits', () => {
  const starter = SEED_PLANS.find((plan) => plan.planId === 'restaurant-starter');
  const pro = SEED_PLANS.find((plan) => plan.planId === 'restaurant-pro');

  it('uses the starter plan quotas from the catalogue', () => {
    assert.equal(getRestaurantPlanQuotaLimit(starter, 'TABLES'), 15);
    assert.equal(getRestaurantPlanQuotaLimit(starter, 'ORDERS'), 1_000);
  });

  it('uses the Pro plan quotas from the catalogue', () => {
    assert.equal(getRestaurantPlanQuotaLimit(pro, 'TABLES'), 200);
    assert.equal(getRestaurantPlanQuotaLimit(pro, 'ORDERS'), 10_000);
  });

  it('has no configured limit when a plan or resource quota is absent', () => {
    assert.equal(getRestaurantPlanQuotaLimit(undefined, 'TABLES'), undefined);
    assert.equal(getRestaurantPlanQuotaLimit(starter, 'MENU_ITEMS'), undefined);
  });
});
