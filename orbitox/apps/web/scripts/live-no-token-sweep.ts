import { spawn, ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';

const PORT = 3680;
const serverScript = path.resolve(__dirname, '../.next/standalone/apps/web/server.js');

// Throwaway secrets generated at runtime - NEVER printed or logged
const env: NodeJS.ProcessEnv = {
  ...process.env,
  PORT: String(PORT),
  HOSTNAME: '127.0.0.1',
  NODE_ENV: 'production' as const,
  ORBITOX_ADMIN_TOKEN: crypto.randomBytes(32).toString('hex'),
  ORBITOX_RUNTIME_TOKEN: crypto.randomBytes(32).toString('hex'),
  ORBITOX_CONTROL_SECRET: crypto.randomBytes(32).toString('hex'),
  ORBITOX_GUEST_SECRET: crypto.randomBytes(32).toString('hex'),
  ORBITOX_SERVER_PEPPER: crypto.randomBytes(32).toString('hex'),
  DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2',
  APP_DATABASE_URL: process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2',
  PLATFORM_AUDIT_DATABASE_URL: process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2',
};

async function run() {
  const child: ChildProcess = spawn(process.execPath, [serverScript], {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stderr?.on('data', (d: Buffer | string) => {
    // Only capture unexpected server startup crashes
  });

  // Wait for server readiness via public health check
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 20000) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!ready) {
    child.kill('SIGKILL');
    throw new Error('Standalone server failed to become ready on port ' + PORT);
  }

  // Paths to test without any authorization token
  const paths: Array<{ category: string; path: string; expected: string }> = [
    // 1. Control Plane Root & Overview
    { category: 'Overview / Root', path: '/', expected: '401' },
    { category: 'Automations', path: '/automations', expected: '401' },

    // 2. Admin Control Plane Pages
    { category: 'Admin', path: '/admin', expected: '401' },
    { category: 'Admin', path: '/admin/api-keys', expected: '401' },
    { category: 'Admin', path: '/admin/audit', expected: '401' },
    { category: 'Admin', path: '/admin/business', expected: '401' },
    { category: 'Admin', path: '/admin/business/ecommerce', expected: '401' },
    { category: 'Admin', path: '/admin/business/ecommerce/shopify', expected: '401' },
    { category: 'Admin', path: '/admin/developer-apis', expected: '401' },
    { category: 'Admin', path: '/admin/marketplace', expected: '401' },
    { category: 'Admin', path: '/admin/projects', expected: '401' },
    { category: 'Admin', path: '/admin/projects/create', expected: '401' },
    { category: 'Admin', path: '/admin/projects/proj-123', expected: '401' },
    { category: 'Admin', path: '/admin/quotas', expected: '401' },
    { category: 'Admin', path: '/admin/restaurant', expected: '401' },
    { category: 'Admin', path: '/admin/services', expected: '401' },
    { category: 'Admin', path: '/admin/services/crm', expected: '401' },
    { category: 'Admin', path: '/admin/system', expected: '401' },

    // 3. Platform Control Plane Pages
    { category: 'Platform', path: '/platform', expected: '401' },
    { category: 'Platform', path: '/platform/ai', expected: '401' },
    { category: 'Platform', path: '/platform/api-keys', expected: '401' },
    { category: 'Platform', path: '/platform/approvals', expected: '401' },
    { category: 'Platform', path: '/platform/audit', expected: '401' },
    { category: 'Platform', path: '/platform/configuration', expected: '401' },
    { category: 'Platform', path: '/platform/connect', expected: '401' },
    { category: 'Platform', path: '/platform/credentials', expected: '401' },
    { category: 'Platform', path: '/platform/explorer', expected: '401' },
    { category: 'Platform', path: '/platform/fleet', expected: '401' },
    { category: 'Platform', path: '/platform/observability', expected: '401' },
    { category: 'Platform', path: '/platform/operations', expected: '401' },
    { category: 'Platform', path: '/platform/packages', expected: '401' },
    { category: 'Platform', path: '/platform/plans', expected: '401' },
    { category: 'Platform', path: '/platform/projects', expected: '401' },
    { category: 'Platform', path: '/platform/projects/proj-123', expected: '401' },
    { category: 'Platform', path: '/platform/restaurants', expected: '401' },
    { category: 'Platform', path: '/platform/restaurants/rest-123', expected: '401' },
    { category: 'Platform', path: '/platform/security', expected: '401' },
    { category: 'Platform', path: '/platform/settings', expected: '401' },
    { category: 'Platform', path: '/platform/tests', expected: '401' },

    // 4. CRM Pages
    { category: 'CRM', path: '/crm', expected: '401' },
    { category: 'CRM', path: '/crm/leads', expected: '401' },

    // 5. HMS Pages
    { category: 'HMS', path: '/hms', expected: '401' },
    { category: 'HMS', path: '/hms/appointments', expected: '401' },
    { category: 'HMS', path: '/hms/beds', expected: '401' },
    { category: 'HMS', path: '/hms/billing', expected: '401' },
    { category: 'HMS', path: '/hms/hierarchy', expected: '401' },
    { category: 'HMS', path: '/hms/labs', expected: '401' },
    { category: 'HMS', path: '/hms/login', expected: '401' },
    { category: 'HMS', path: '/hms/patients', expected: '401' },
    { category: 'HMS', path: '/hms/pharmacy', expected: '401' },
    { category: 'HMS', path: '/hms/profile', expected: '401' },
    { category: 'HMS', path: '/hms/staff', expected: '401' },
    { category: 'HMS', path: '/hms/telemetry', expected: '401' },

    // 6. HRMS Pages
    { category: 'HRMS', path: '/hrms', expected: '401' },
    { category: 'HRMS', path: '/hrms/employees', expected: '401' },

    // 7. Finance Pages
    { category: 'Finance', path: '/finance', expected: '401' },
    { category: 'Finance', path: '/finance/invoices', expected: '401' },

    // 8. Commerce Pages
    { category: 'Commerce', path: '/commerce', expected: '401' },
    { category: 'Commerce', path: '/commerce/automations', expected: '401' },
    { category: 'Commerce', path: '/commerce/customers', expected: '401' },
    { category: 'Commerce', path: '/commerce/discounts', expected: '401' },
    { category: 'Commerce', path: '/commerce/media', expected: '401' },
    { category: 'Commerce', path: '/commerce/orders', expected: '401' },
    { category: 'Commerce', path: '/commerce/products', expected: '401' },
    { category: 'Commerce', path: '/commerce/store/builder', expected: '401' },
    { category: 'Commerce', path: '/commerce/store/pages', expected: '401' },
    { category: 'Commerce', path: '/commerce/store/theme', expected: '401' },

    // 9. Inventory, KDS, Fleet
    { category: 'Inventory', path: '/inventory/items', expected: '401' },
    { category: 'KDS', path: '/kds', expected: '401' },
    { category: 'Fleet', path: '/platform/fleet', expected: '401' },

    // 10. Dynamic Dotted Variants (S3-1 Regression Verification: png, svg, txt, js, css, map, ico, json)
    ...['png', 'svg', 'txt', 'js', 'css', 'map', 'ico', 'json'].flatMap((ext) => [
      { category: `Dynamic Dotted (.${ext})`, path: `/admin/projects/proj-123.${ext}`, expected: '401' },
      { category: `Dynamic Dotted (.${ext})`, path: `/platform/projects/proj-123.${ext}`, expected: '401' },
      { category: `Dynamic Dotted (.${ext})`, path: `/platform/restaurants/rest-123.${ext}`, expected: '401' },
      { category: `Dynamic Dotted (.${ext})`, path: `/admin/business/ecommerce/shopify.${ext}`, expected: '401' },
      { category: `Dynamic Dotted (.${ext})`, path: `/admin/services/crm.${ext}`, expected: '401' },
    ]),

    // 11. Audited Public / Static Assets
    { category: 'Public Asset', path: '/favicon.ico', expected: '200' },
    { category: 'Public Asset', path: '/robots.txt', expected: '200' },
    { category: 'Public Asset', path: '/_next/static/chunks/5610-60fa5a988d93f8a1.js', expected: '200' },
    { category: 'Public Route', path: '/api/health', expected: '200' },
    { category: 'Public Route', path: '/api/v1/openapi.json', expected: '200' },
    { category: 'Diner Public', path: '/dine/tbl-123', expected: '200' },
    { category: 'Storefront Public', path: '/store/sample-store', expected: '200' },
    { category: 'Storefront Public', path: '/store/sample-store/shop', expected: '200' },
  ];

  console.log('| Category | Requested Path | Status Code | Expected | Pass/Fail |');
  console.log('|---|---|---|---|---|');

  let passed = 0;
  let failed = 0;

  for (const item of paths) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${item.path}`, {
        headers: {
          // No tokens / credentials provided
        },
      });
      const actual = String(res.status);
      const isPass = actual === item.expected || (item.expected === '401' && (actual === '401' || actual === '403'));
      if (isPass) passed++;
      else failed++;
      console.log(`| ${item.category} | \`${item.path}\` | **${actual}** | ${item.expected} | ${isPass ? 'PASS' : 'FAIL'} |`);
    } catch (err: any) {
      failed++;
      console.log(`| ${item.category} | \`${item.path}\` | **ERROR** (${err.message}) | ${item.expected} | FAIL |`);
    }
  }

  console.log(`\nLive sweep summary: ${passed}/${paths.length} requests matched expected security status codes (${failed} failures).`);

  child.kill('SIGKILL');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Sweep execution error:', err);
  process.exit(1);
});
