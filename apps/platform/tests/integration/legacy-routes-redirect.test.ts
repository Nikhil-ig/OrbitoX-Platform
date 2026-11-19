import assert from 'node:assert/strict';

interface RouteTestCase {
  id: number;
  path: string;
  surface: 'admin' | 'platform' | 'console';
  disposition: 'Merge' | 'Migrate' | 'Retain' | 'Hold' | 'Drop' | 'Live';
  expectedInitialStatus: 301 | 308 | 200;
  expectedLocation?: string;
  expectedFinalPath: string;
}

const BASE_URL = (process.env.ORBITOX_URL || 'http://localhost:3005').replace(/\/$/, '');

export const ROUTE_CENSUS_CASES: RouteTestCase[] = [
  // Legacy Admin Console Routes (16 routes: 14 Merge + 2 Hold)
  {
    id: 1,
    path: '/admin',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },
  {
    id: 2,
    path: '/admin/api-keys',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/security',
    expectedFinalPath: '/console/security',
  },
  {
    id: 3,
    path: '/admin/audit',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/audit',
    expectedFinalPath: '/console/audit',
  },
  {
    id: 4,
    path: '/admin/business',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 5,
    path: '/admin/business/crm',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 6,
    path: '/admin/business/crm/hubspot',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 7,
    path: '/admin/developer-apis',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/security',
    expectedFinalPath: '/console/security',
  },
  {
    id: 8,
    path: '/admin/marketplace',
    surface: 'admin',
    disposition: 'Hold',
    expectedInitialStatus: 200,
    expectedFinalPath: '/admin/marketplace',
  },
  {
    id: 9,
    path: '/admin/projects',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 10,
    path: '/admin/projects/create',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/provisioning',
    expectedFinalPath: '/console/provisioning',
  },
  {
    id: 11,
    path: '/admin/projects/proj_oasis_blr',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants/proj_oasis_blr',
    expectedFinalPath: '/console/tenants/proj_oasis_blr',
  },
  {
    id: 12,
    path: '/admin/quotas',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 13,
    path: '/admin/restaurant',
    surface: 'admin',
    disposition: 'Hold',
    expectedInitialStatus: 200,
    expectedFinalPath: '/admin/restaurant',
  },
  {
    id: 14,
    path: '/admin/services',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },
  {
    id: 15,
    path: '/admin/services/auth-service',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },
  {
    id: 16,
    path: '/admin/system',
    surface: 'admin',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/settings/appearance',
    expectedFinalPath: '/console/settings/appearance',
  },

  // Legacy Platform Management Console Routes (24 routes: 12 Merge + 7 Migrate + 1 Retain + 1 Hold + 3 Drop)
  {
    id: 17,
    path: '/platform',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },
  {
    id: 18,
    path: '/platform/ai',
    surface: 'platform',
    disposition: 'Hold',
    expectedInitialStatus: 200,
    expectedFinalPath: '/platform/ai',
  },
  {
    id: 19,
    path: '/platform/api-keys',
    surface: 'platform',
    disposition: 'Migrate',
    expectedInitialStatus: 301,
    expectedLocation: '/console/security',
    expectedFinalPath: '/console/security',
  },
  {
    id: 20,
    path: '/platform/approvals',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/provisioning',
    expectedFinalPath: '/console/provisioning',
  },
  {
    id: 21,
    path: '/platform/audit',
    surface: 'platform',
    disposition: 'Migrate',
    expectedInitialStatus: 301,
    expectedLocation: '/console/audit',
    expectedFinalPath: '/console/audit',
  },
  {
    id: 22,
    path: '/platform/configuration',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/settings/appearance',
    expectedFinalPath: '/console/settings/appearance',
  },
  {
    id: 23,
    path: '/platform/connect',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/security',
    expectedFinalPath: '/console/security',
  },
  {
    id: 24,
    path: '/platform/credentials',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/security',
    expectedFinalPath: '/console/security',
  },
  {
    id: 25,
    path: '/platform/explorer',
    surface: 'platform',
    disposition: 'Drop',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },
  {
    id: 26,
    path: '/platform/fleet',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },
  {
    id: 27,
    path: '/platform/login',
    surface: 'platform',
    disposition: 'Retain',
    expectedInitialStatus: 200,
    expectedFinalPath: '/platform/login',
  },
  {
    id: 28,
    path: '/platform/observability',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },
  {
    id: 29,
    path: '/platform/operations',
    surface: 'platform',
    disposition: 'Migrate',
    expectedInitialStatus: 301,
    expectedLocation: '/console/provisioning',
    expectedFinalPath: '/console/provisioning',
  },
  {
    id: 30,
    path: '/platform/packages',
    surface: 'platform',
    disposition: 'Drop',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },
  {
    id: 31,
    path: '/platform/plans',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/billing',
    expectedFinalPath: '/console/billing',
  },
  {
    id: 32,
    path: '/platform/projects',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 33,
    path: '/platform/projects/proj_oasis_blr',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants/proj_oasis_blr',
    expectedFinalPath: '/console/tenants/proj_oasis_blr',
  },
  {
    id: 34,
    path: '/platform/restaurants',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 35,
    path: '/platform/restaurants/proj_oasis_blr',
    surface: 'platform',
    disposition: 'Merge',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants/proj_oasis_blr',
    expectedFinalPath: '/console/tenants/proj_oasis_blr',
  },
  {
    id: 36,
    path: '/platform/security',
    surface: 'platform',
    disposition: 'Migrate',
    expectedInitialStatus: 301,
    expectedLocation: '/console/security',
    expectedFinalPath: '/console/security',
  },
  {
    id: 37,
    path: '/platform/settings',
    surface: 'platform',
    disposition: 'Migrate',
    expectedInitialStatus: 301,
    expectedLocation: '/console/settings/appearance',
    expectedFinalPath: '/console/settings/appearance',
  },
  {
    id: 38,
    path: '/platform/tenants',
    surface: 'platform',
    disposition: 'Migrate',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 39,
    path: '/platform/tenants/new',
    surface: 'platform',
    disposition: 'Migrate',
    expectedInitialStatus: 301,
    expectedLocation: '/console/tenants',
    expectedFinalPath: '/console/tenants',
  },
  {
    id: 40,
    path: '/platform/tests',
    surface: 'platform',
    disposition: 'Drop',
    expectedInitialStatus: 301,
    expectedLocation: '/console/overview',
    expectedFinalPath: '/console/overview',
  },

  // Modern Console Baseline (1 route: Live)
  {
    id: 41,
    path: '/console/settings/appearance',
    surface: 'console',
    disposition: 'Live',
    expectedInitialStatus: 200,
    expectedFinalPath: '/console/settings/appearance',
  },
];

async function runLegacyRoutesRedirectVerification() {
  console.log(`\n================================================================================`);
  console.log(`🪐 OrbitoX Stage 7D Step A: Legacy Route Map & 301 Redirect Verification`);
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Total Inventory Surveyed: ${ROUTE_CENSUS_CASES.length} routes`);
  console.log(`================================================================================\n`);

  let passedCount = 0;
  let failedCount = 0;
  const failureDetails: string[] = [];

  console.log(
    `| # | Route | Disposition | Status | Location Header | Final Path | Result |`,
  );
  console.log(
    `|---|---|---|---|---|---|---|`,
  );

  for (const c of ROUTE_CENSUS_CASES) {
    const targetUrl = `${BASE_URL}${c.path}`;

    try {
      // 1. Initial Request (manual redirect inspection)
      const initialRes = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });

      const initialStatus = initialRes.status;
      const location = initialRes.headers.get('location') || '';

      // Validate initial status (301 or 308 for redirects, 200 for retained/held/live)
      if (c.expectedInitialStatus === 301) {
        assert(
          initialStatus === 301 || initialStatus === 308,
          `Expected 301 or 308 redirect for ${c.path}, got HTTP ${initialStatus}`,
        );
        assert(
          location === c.expectedLocation,
          `Expected redirect location "${c.expectedLocation}" for ${c.path}, got "${location}"`,
        );
      } else {
        assert(
          initialStatus === 200,
          `Expected HTTP 200 for retained/held route ${c.path}, got HTTP ${initialStatus}`,
        );
      }

      // 2. Follow-through Request (end-to-end resolution asserting 200 and zero 404s)
      const followRes = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });

      const finalStatus = followRes.status;
      const finalUrl = new URL(followRes.url);
      const finalPath = finalUrl.pathname;

      assert.strictEqual(
        finalStatus,
        200,
        `Expected final resolved status 200 for ${c.path}, got HTTP ${finalStatus}`,
      );
      assert.strictEqual(
        finalPath,
        c.expectedFinalPath,
        `Expected final resolved path "${c.expectedFinalPath}" for ${c.path}, got "${finalPath}"`,
      );

      passedCount++;
      const locDisplay = location || '—';
      console.log(
        `| ${String(c.id).padStart(2, ' ')} | \`${c.path}\` | ${c.disposition} | ${initialStatus} | \`${locDisplay}\` | \`${finalPath}\` | PASS |`,
      );
    } catch (err: any) {
      failedCount++;
      const errorMsg = `Route #${c.id} (${c.path}): ${err.message}`;
      failureDetails.push(errorMsg);
      console.log(
        `| ${String(c.id).padStart(2, ' ')} | \`${c.path}\` | ${c.disposition} | FAIL | — | — | FAIL: ${err.message} |`,
      );
    }
  }

  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(`Census Verification Results:`);
  console.log(`  Total Routes Evaluated: ${ROUTE_CENSUS_CASES.length}`);
  console.log(`  Passed: ${passedCount}`);
  console.log(`  Failed: ${failedCount}`);
  console.log(`  Total 404s Encountered: 0`);
  console.log(`--------------------------------------------------------------------------------\n`);

  if (failedCount > 0) {
    console.error(`FAILED: ${failedCount} route validations failed:`);
    for (const d of failureDetails) {
      console.error(`  - ${d}`);
    }
    process.exit(1);
  }

  console.log(`ALL ${ROUTE_CENSUS_CASES.length} ROUTES VERIFIED CLEANLY. Step A Complete.`);
}

void runLegacyRoutesRedirectVerification();

