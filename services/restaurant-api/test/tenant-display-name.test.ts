import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTenantDisplayName, withTenantContext } from '../packages/domain/tenancy';
import { renderShell } from '../packages/ui/shell';
import { renderTableQrStand } from '../packages/ui/pages/tables';
import { renderOnboardingWorkspace } from '../packages/ui/pages/onboarding';
import { renderDeveloperInspector } from '../packages/ui/pages/inspector';
import { DEFAULT_BRANCHES, DEFAULT_FLOORS } from '../packages/domain';

const TEST_TABLE: any = {
  id: 'tbl_1',
  number: 'T-1',
  capacity: 4,
  status: 'AVAILABLE',
  section: 'Main',
  branchId: 'branch_main',
  floorId: 'floor_main',
  locator: 'loc_test_1',
};

const TEST_ONBOARDING: any = {
  tenantId: 'tenant_test',
  percentComplete: 0,
  completedSteps: 0,
  totalSteps: 6,
  isFullyOnboarded: false,
  steps: {
    CLAIM_INVITE: false,
    SET_PIN: false,
    BRANDING_CONFIGURED: false,
    MENU_CUSTOMIZED: false,
    TABLES_REVIEWED: false,
    PAYMENTS_CONNECTED: false,
  },
};

describe('Multi-tenant restaurant display name resolution & neutral fallbacks', () => {
  it('resolves brand name > explicit tenant name > ALS tenant name > neutral Restaurant', () => {
    assert.equal(resolveTenantDisplayName({ restaurantName: 'Bella Trattoria' }, 'Bella Group'), 'Bella Trattoria');
    assert.equal(resolveTenantDisplayName({ restaurantName: '  ' }, 'Bella Group'), 'Bella Group');
    assert.equal(resolveTenantDisplayName(undefined, undefined), 'Restaurant');
    assert.equal(resolveTenantDisplayName(undefined, 'Signed Bridge Tenant'), 'Restaurant');
    assert.equal(resolveTenantDisplayName(undefined, 'Platform Superuser'), 'Restaurant');
    assert.equal(resolveTenantDisplayName(undefined, 'Pending Restaurant'), 'Restaurant');

    const fromAls = withTenantContext(
      {
        tenantId: 'tenant_als',
        tenantSlug: 'als-kitchen',
        tenantName: 'ALS Heritage Kitchen',
      },
      () => resolveTenantDisplayName({})
    );
    assert.equal(fromAls, 'ALS Heritage Kitchen');
  });

  it('renderShell uses tenant name and falls back to neutral Restaurant instead of demo branding', () => {
    const neutralHtml = renderShell('<div>ok</div>', {
      title: 'Overview',
      activeNav: 'overview',
      branches: DEFAULT_BRANCHES,
      floors: DEFAULT_FLOORS,
    });
    assert.ok(neutralHtml.includes('Restaurant'), 'Expected neutral Restaurant label');
    assert.ok(!neutralHtml.includes('OrbitoX Bistro'), 'Must not leak demo fallback OrbitoX Bistro');

    const alsHtml = withTenantContext(
      {
        tenantId: 'tenant_saffron',
        tenantSlug: 'saffron',
        tenantName: 'Saffron Courtyard',
      },
      () =>
        renderShell('<div>ok</div>', {
          title: 'Overview',
          activeNav: 'overview',
          branches: DEFAULT_BRANCHES,
          floors: DEFAULT_FLOORS,
        })
    ) as string;
    assert.ok(alsHtml.includes('Saffron Courtyard'));
    assert.ok(!alsHtml.includes('OrbitoX Bistro'));
  });

  it('renderTableQrStand uses brand or tenant name and falls back to neutral Restaurant', () => {
    const neutralQr = renderTableQrStand(TEST_TABLE, undefined, 'Main Dining');
    assert.ok(neutralQr.includes('<title>Restaurant · Table T-1 QR Stand</title>'));
    assert.ok(!neutralQr.includes('OrbitoX Bistro'));

    const tenantQr = renderTableQrStand(TEST_TABLE, {}, 'Patio', 'Verandah Kitchen');
    assert.ok(tenantQr.includes('<title>Verandah Kitchen · Table T-1 QR Stand</title>'));
    assert.ok(!tenantQr.includes('OrbitoX Bistro'));
  });

  it('renderOnboardingWorkspace uses brand or tenant name and falls back to neutral Restaurant', () => {
    const neutralOnboarding = renderOnboardingWorkspace(TEST_ONBOARDING, undefined, 'Main');
    assert.ok(neutralOnboarding.includes('>Restaurant</div>'));
    assert.ok(neutralOnboarding.includes('>R</div>'));
    assert.ok(!neutralOnboarding.includes('OrbitoX Bistro'));

    const tenantOnboarding = renderOnboardingWorkspace(TEST_ONBOARDING, {}, 'Main', 'Kaveri Spice');
    assert.ok(tenantOnboarding.includes('>Kaveri Spice</div>'));
    assert.ok(tenantOnboarding.includes('>K</div>'));
    assert.ok(!tenantOnboarding.includes('OrbitoX Bistro'));
  });

  it('renderDeveloperInspector uses tenant/brand name and falls back to neutral Restaurant', () => {
    const mockContext: any = {
      branchId: 'b1',
      branchName: 'Main',
      floorId: 'f1',
      floorName: 'Ground',
      serviceName: 'DINNER',
    };
    const mockStoreData: any = {
      events: [],
      tables: [TEST_TABLE],
      orders: [],
      revisions: 1,
    };

    const neutralInspector = renderDeveloperInspector(mockContext, mockStoreData);
    assert.ok(neutralInspector.includes('>Restaurant<'));
    assert.ok(!neutralInspector.includes('OrbitoX Bistro'));

    const tenantInspector = renderDeveloperInspector(mockContext, mockStoreData, 'Malabar Coast');
    assert.ok(tenantInspector.includes('>Malabar Coast<'));
    assert.ok(!tenantInspector.includes('OrbitoX Bistro'));
  });
});
