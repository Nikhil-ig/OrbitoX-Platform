import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import { PrismaClient } from '@prisma/client';
import {
  createTestOperatorSession,
  deleteTestOperatorSession,
  type TestOperatorSession,
} from './test-operator-session';

const BASE_URL = (process.env.ORBITOX_URL || 'http://localhost:3005').replace(/\/$/, '');

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const cacheDir = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
    const linuxCache = path.join(os.homedir(), '.cache', 'ms-playwright');
    for (const root of [cacheDir, linuxCache]) {
      if (!fs.existsSync(root)) continue;
      const dirs = fs
        .readdirSync(root)
        .filter((d) => d.startsWith('chromium_headless_shell-') || d.startsWith('chromium-'))
        .sort()
        .reverse();
      for (const dir of dirs) {
        const candidates = [
          path.join(root, dir, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
          path.join(root, dir, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
          path.join(root, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          path.join(root, dir, 'chrome-headless-shell-linux', 'chrome-headless-shell'),
          path.join(root, dir, 'chrome-headless-shell-linux-arm64', 'chrome-headless-shell'),
        ];
        for (const exe of candidates) {
          if (fs.existsSync(exe)) {
            return await chromium.launch({ headless: true, executablePath: exe });
          }
        }
      }
    }
    throw err;
  }
}

interface LinkCheckResult {
  url: string;
  category: 'Sidebar' | 'Cross-link' | 'Product / Legacy';
  status: number;
  heading: string;
  has404: boolean;
}

async function run() {
  console.log('===============================================================');
  console.log(' Stage 7C: Operator Console Wiring & Golden Path E2E Suite');
  console.log(' Target Base URL:', BASE_URL);
  console.log('===============================================================\n');

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2',
      },
    },
  });

  let testSession: TestOperatorSession | null = null;
  try {
    testSession = await createTestOperatorSession(prisma);
    const sessionMatch = testSession.cookie.match(/orbitox_operator_session=([^;]+)/);
    const csrfMatch = testSession.cookie.match(/orbitox_operator_csrf=([^;]+)/);
    if (sessionMatch?.[1] && csrfMatch?.[1]) {
      await context.addCookies([
        {
          name: 'orbitox_operator_session',
          value: sessionMatch[1],
          domain: 'localhost',
          path: '/',
        },
        {
          name: 'orbitox_operator_csrf',
          value: csrfMatch[1],
          domain: 'localhost',
          path: '/',
        },
      ]);
      console.log('INFO  Injected authentic operator session and CSRF tokens from PostgreSQL');
    }
  } catch (err: any) {
    console.warn('WARN  Could not create DB operator session, using fallback:', err.message);
    await context.addCookies([
      {
        name: 'orbitox_operator_session',
        value: 'session_e2e_operator_token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'orbitox_operator_csrf',
        value: 'csrf_e2e_token',
        domain: 'localhost',
        path: '/',
      },
    ]);
  }

  try {
    const page = await context.newPage();
    const results: LinkCheckResult[] = [];

    const visitAndCheck = async (
      targetPath: string,
      category: 'Sidebar' | 'Cross-link' | 'Product / Legacy',
    ): Promise<LinkCheckResult> => {
      const fullUrl = `${BASE_URL}${targetPath}`;
      const response = await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = response ? response.status() : 0;

    // Check for 404 indicators via HTTP status and error DOM elements
    const pageTitle = (await page.title()) || '';
    const errorHeading = await page.$('.next-error-h1, h1:has-text("404"), h2:has-text("This page could not be found")');
    const has404 = status === 404 || status >= 500 || pageTitle.includes('404: This page could not be found') || Boolean(errorHeading);

    // Extract heading or title
    let heading = '';
    const h1 = await page.$('h1');
    if (h1) {
      heading = (await h1.textContent())?.trim() || '';
    } else {
      const h2 = await page.$('h2');
      if (h2) {
        heading = (await h2.textContent())?.trim() || '';
      } else {
        heading = (await page.title()) || 'No heading element found';
      }
    }

    const res: LinkCheckResult = {
      url: targetPath,
      category,
      status,
      heading,
      has404: Boolean(has404),
    };
    results.push(res);
    return res;
  };

  // 1. Sidebar Links Verification
  console.log('--- 1. Testing Sidebar Navigation Links ---');
  const sidebarLinks = [
    '/console/overview',
    '/console/organizations',
    '/console/tenants',
    '/console/provisioning',
    '/console/billing',
    '/console/data-rights',
    '/console/security',
    '/console/audit',
    '/console/settings/appearance',
    '/console/design-system',
    '/admin',
    '/platform',
    '/admin/restaurant',
    '/hms',
  ];

  for (const sPath of sidebarLinks) {
    const r = await visitAndCheck(sPath, sPath.startsWith('/console') ? 'Sidebar' : 'Product / Legacy');
    const badge = r.status === 200 && !r.has404 ? 'PASS' : 'FAIL';
    console.log(`[${badge}] ${r.status} ${r.url.padEnd(35)} -> "${r.heading}"`);
    assert.equal(r.has404, false, `Link ${r.url} returned 404 or error page!`);
    assert.equal(r.status, 200, `Link ${r.url} returned HTTP ${r.status}, expected 200`);
  }

  // 2. Cross-Links Verification from Overview, Tenants Index, and Detail
  console.log('\n--- 2. Testing Live Page Cross-Links ---');
  const crossLinks = [
    // From Overview
    { path: '/console/tenants', label: 'Overview: "Open tenants" link' },
    { path: '/console/tenants/proj_oasis_blr', label: 'Overview: Attention tenant Oasis Medical' },
    { path: '/console/tenants/tenant_hyatt_bom', label: 'Overview: Attention tenant Grand Hyatt' },
    { path: '/console/audit', label: 'Overview: Audit trail card "View full audit log"' },
    { path: '/console/security', label: 'Overview: Alert feed security rotation event' },
    { path: '/console/provisioning?status=FAILED', label: 'Overview: Cluster degraded banner' },
    // From Tenant Detail
    { path: '/console/organizations?org=Oasis%20Healthcare%20Network', label: 'Detail: Organization cross-link' },
    { path: '/console/provisioning?tenant=proj_oasis_blr', label: 'Detail: Provisioning job cross-link' },
    { path: '/console/billing?tenant=proj_oasis_blr', label: 'Detail: Billing cross-link' },
    { path: '/console/audit?entity=TENANT:proj_oasis_blr', label: 'Detail: Tenant audit trail link' },
  ];

  for (const item of crossLinks) {
    const r = await visitAndCheck(item.path, 'Cross-link');
    const badge = r.status === 200 && !r.has404 ? 'PASS' : 'FAIL';
    console.log(`[${badge}] ${r.status} ${item.label.padEnd(48)} -> "${r.heading}"`);
    assert.equal(r.has404, false, `Cross-link ${item.path} returned 404 or error!`);
    assert.equal(r.status, 200, `Cross-link ${item.path} returned HTTP ${r.status}`);
  }

  // 3. Golden Path Verification: Overview -> Tenants -> Detail -> Suspend -> Resume
  console.log('\n--- 3. Testing Golden Path (Suspend & Resume) ---');

  // Step A: Overview -> Click Open Tenants
  await page.goto(`${BASE_URL}/console/overview`, { waitUntil: 'domcontentloaded' });
  const openTenantsLink = page.locator('a[href="/console/tenants"]').first();
  await openTenantsLink.click();
  await page.waitForURL('**/console/tenants');
  assert.ok(page.url().includes('/console/tenants'), 'Failed to navigate to /console/tenants');
  console.log('PASS  Step 1: Navigated from Overview to Tenants Fleet Registry');

  // Step B: Tenants -> Click Tenant Detail
  await page.goto(`${BASE_URL}/console/tenants/proj_oasis_blr`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1:has-text("Oasis Medical Center")');
  await page.waitForTimeout(1000);
  console.log('PASS  Step 2: Landed on Tenant Detail for Oasis Medical Center');

  // Check breadcrumb
  const breadcrumbOverview = page.locator('nav[aria-label="Breadcrumb"] a[href="/console/overview"]');
  assert.ok(await breadcrumbOverview.isVisible(), 'Breadcrumb link to Overview missing on tenant detail');
  const breadcrumbTenants = page.locator('nav[aria-label="Breadcrumb"] a[href="/console/tenants"]');
  assert.ok(await breadcrumbTenants.isVisible(), 'Breadcrumb link to Tenants missing on tenant detail');
  console.log('PASS  Step 3: Breadcrumbs `Overview / Tenants / Oasis Medical Center` verified');

  // Step C: If tenant is currently suspended, restore to active first
  let resumeBtn = page.getByRole('button', { name: 'Resume Tenant' });
  if (await resumeBtn.isVisible()) {
    await resumeBtn.click();
    await page.waitForSelector('text=ACTIVE', { timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('INFO  Reset tenant status to ACTIVE before starting test');
  }

  // Step D: Suspend Action via DangerousAction Modal
  const suspendTrigger = page.getByRole('button', { name: 'Suspend Tenant' });
  assert.ok(await suspendTrigger.isVisible(), 'Suspend Tenant trigger button not visible');
  await suspendTrigger.click();

  // Modal opens
  await page.waitForSelector('text=Suspend Tenant Environment', { timeout: 10000 });
  const confirmInput = page.locator('input[placeholder="SUSPEND"]');
  await confirmInput.fill('SUSPEND');

  const reasonInput = page.locator('textarea');
  await reasonInput.fill('Commercial payment overdue 30 days');

  const modalConfirmBtn = page.locator('[role="dialog"] button:has-text("Suspend Tenant"):not([disabled])');
  await modalConfirmBtn.click();

  // Wait for status badge change
  await page.waitForSelector('text=SUSPENDED (402 PAYMENT_REQUIRED)', { timeout: 10000 });
  console.log('PASS  Step 4: Executed Suspend Action (typed SUSPEND, reason >= 5 chars, confirmed)');

  // Step E: Resume Action
  resumeBtn = page.getByRole('button', { name: 'Resume Tenant' });
  assert.ok(await resumeBtn.isVisible(), 'Resume Tenant button not visible after suspension');
  await resumeBtn.click();

  await page.waitForSelector('text=ACTIVE', { timeout: 10000 });
  console.log('PASS  Step 5: Executed Resume Action -> Status restored to ACTIVE');

  // 4. Responsive Viewport Check (1440px, 834px, 390px)
  console.log('\n--- 4. Testing Responsive Viewports (Zero Horizontal Scroll) ---');
  const viewports = [
    { name: 'Desktop (1440x900)', width: 1440, height: 900 },
    { name: 'Tablet (834x1194)', width: 834, height: 1194 },
    { name: 'Mobile (390x844)', width: 390, height: 844 },
  ];

  const testedPages = [
    '/console/overview',
    '/console/tenants',
    '/console/tenants/proj_oasis_blr',
    '/console/organizations',
    '/console/provisioning',
  ];

  for (const p of testedPages) {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}${p}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      assert.equal(
        hasHorizontalScroll,
        false,
        `Page ${p} has horizontal scroll at viewport ${vp.name}! scrollWidth > clientWidth`,
      );
    }
    console.log(`PASS  ${p.padEnd(35)}: No horizontal scroll across 1440, 834, and 390 px`);
  }

  console.log('\n===============================================================');
  console.log(' SUMMARY: All 24 links verified with HTTP 200 and zero 404s.');
  console.log(' Golden path completed with successful Suspend & Resume cycles.');
  console.log(' All responsive invariants passed with 0 horizontal overflow.');
  console.log('===============================================================\n');
  } finally {
    if (testSession) {
      await deleteTestOperatorSession(prisma, testSession.operatorId).catch(() => {});
      console.log('INFO  Cleaned up test operator session from PostgreSQL');
    }
    await prisma.$disconnect().catch(() => {});
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\nFAIL: Integration test failed with error:');
  console.error(err);
  process.exit(1);
});
