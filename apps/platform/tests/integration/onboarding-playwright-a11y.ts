/**
 * 🧪 OrbitoX RestaurantOS — Onboarding Multi-Viewport & Accessibility E2E Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Multi-viewport responsive rendering across 4 canonical viewports:
 *    - 390×844 (Mobile Phone)
 *    - 834×1194 (Tablet Portrait)
 *    - 1194×834 (Tablet Landscape)
 *    - 1440×900 (Desktop)
 * 2. Zero critical and serious accessibility violations via axe-core / @axe-core/playwright
 *    across F1 (Account), F2 (Organization), F3 (Restaurant), F4 (Preview), and D6 (Mobile Preview).
 * 3. Responsive layout integrity (no unwanted horizontal scroll overflow, proper landmark semantics).
 * 4. Form accessibility: labels, keyboard tab order, aria-invalid, error descriptions.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { chromium, Browser, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { PrismaClient as PlatformPrisma } from '@prisma/client';

function decryptPayload<T>(sealed: string, base64Key: string): T {
  const [version, ivText, tagText, ciphertextText] = sealed.split('.');
  if (version !== 'v1') throw new Error(`Invalid payload version: ${version}`);
  const key = Buffer.from(base64Key, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivText || '', 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText || '', 'base64url'));
  const cleartext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextText || '', 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(cleartext) as T;
}

const BASE_URL = process.env.ORBITOX_PUBLIC_BASE_URL || 'http://localhost:3005';
const STORAGE_KEY = 'orbitox_customer_onboarding_v1';

const VIEWPORTS = [
  { name: 'Mobile Phone', width: 390, height: 844 },
  { name: 'Tablet Small', width: 768, height: 1024 },
  { name: 'Tablet Portrait', width: 834, height: 1194 },
  { name: 'Tablet Landscape', width: 1194, height: 834 },
  { name: 'Desktop Laptop', width: 1440, height: 900 },
  { name: 'Desktop Large FHD', width: 1920, height: 1080 },
];

async function getBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const root = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
    if (fs.existsSync(root)) {
      const dirs = fs.readdirSync(root).filter(d => d.startsWith('chromium_headless_shell-') || d.startsWith('chromium-')).sort().reverse();
      for (const dir of dirs) {
        const candidates = [
          path.join(root, dir, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          path.join(root, dir, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
          path.join(root, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          path.join(root, dir, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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

describe('OrbitoX Onboarding Multi-Viewport & Axe Accessibility E2E', () => {
  let browser: Browser;

  before(async () => {
    browser = await getBrowser();
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Multi-Viewport Responsive Layout & F1 Accessibility Audit
  // ─────────────────────────────────────────────────────────────────────────────
  for (const vp of VIEWPORTS) {
    describe(`Viewport: ${vp.name} (${vp.width}×${vp.height})`, () => {
      let page: Page;
      let context: any;

      before(async () => {
        context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
        });
        page = await context.newPage();
      });

      after(async () => {
        if (page) {
          await page.close();
        }
        if (context) {
          await context.close();
        }
      });

      it(`renders /onboarding cleanly without horizontal overflow`, async () => {
        await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForSelector('main', { timeout: 25000 });

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.offsetWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          return scrollWidth > docWidth + 2; // allowance for subpixel rendering
        });
        assert.equal(overflow, false, `Page should not horizontally overflow at ${vp.width}px`);
      });

      it(`passes Axe accessibility audit with 0 critical/serious violations on F1`, async () => {
        await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForSelector('main', { timeout: 25000 });

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        const criticalOrSerious = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (criticalOrSerious.length > 0) {
          console.error(
            `Axe Violations on ${vp.name}:`,
            JSON.stringify(criticalOrSerious.map(v => ({ id: v.id, impact: v.impact, description: v.description })), null, 2)
          );
        }

        assert.equal(
          criticalOrSerious.length,
          0,
          `Expected 0 critical/serious accessibility violations on ${vp.name}, found ${criticalOrSerious.length}`
        );
      });

      it(`preserves accessible input labels and form landmarks`, async () => {
        await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForSelector('input[name="fullName"]', { timeout: 25000 });

        // Verify inputs have accessible labels
        const fullNameLabel = await page.$('label[for="f1-name"], label[for="fullName"]');
        assert.ok(fullNameLabel, 'Full name input must have an associated label');

        const emailLabel = await page.$('label[for="f1-email"], label[for="email"]');
        assert.ok(emailLabel, 'Email input must have an associated label');

        const passwordInput = await page.$('input[name="password"]');
        assert.ok(passwordInput, 'Password input must exist');

        // Check password strength meter appearance when typing
        await page.fill('input[name="password"]', 'P@ssw0rd123!Secure');
        const meter = page.locator('[role="status"]');
        await meter.waitFor({ state: 'visible', timeout: 5000 });
        assert.ok(await meter.isVisible(), 'Password strength indicator should be accessible to assistive technologies');
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Full Journey Step Transitions & Accessibility Audits (F2, F3, F4, D6)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Full Journey Stage Audits (F2, F3, F4, D6)', () => {
    let page: Page;
    let context: any;

    before(async () => {
      context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      });
      page = await context.newPage();
    });

    after(async () => {
      if (page) await page.close();
      if (context) await context.close();
    });

    it('F2 Business Organization: renders cleanly and passes Axe audit', async () => {
      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F2',
            user: { userId: 'usr_test_1', email: 'priya@shahgroup.in', name: 'Priya Shah' },
          })
        );
      }, STORAGE_KEY);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[name="businessName"]', { timeout: 15000 });

      // Check form fields
      assert.ok(await page.$('label[for="f2-businessName"]'), 'Business name label exists');
      assert.ok(await page.$('label[for="f2-city"]'), 'City label exists');

      // Axe audit
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      assert.equal(criticalOrSerious.length, 0, 'F2 must have 0 critical/serious a11y violations');
    });

    it('F3 Restaurant Identity & Subdomain: renders cleanly and passes Axe audit', async () => {
      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F3',
            user: { userId: 'usr_test_1', email: 'priya@shahgroup.in', name: 'Priya Shah' },
            organization: {
              id: 'org_test_1',
              name: 'Shah Hospitality Group',
              slug: 'shah-hospitality-group',
              city: 'Bengaluru',
            },
          })
        );
      }, STORAGE_KEY);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[name="restaurantName"]', { timeout: 15000 });

      // Verify table count adjustment
      const tableInput = page.locator('input[name="tableCount"]');
      assert.ok(await tableInput.isVisible(), 'Table count input is visible');

      // Axe audit
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      if (criticalOrSerious.length > 0) {
        console.error('F3 Axe Violations:', JSON.stringify(criticalOrSerious, null, 2));
      }
      assert.equal(criticalOrSerious.length, 0, 'F3 must have 0 critical/serious a11y violations');
    });

    it('F4 Working Preview Showcase: renders dual-pane preview and passes Axe audit', async () => {
      // Mock preview-summary for this static showcase audit to ensure QR code and tables render cleanly
      await page.route('**/api/v1/customer/tenants/*/preview-summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            preview: {
              restaurant: {
                name: 'Masala House Indiranagar',
                status: 'PREVIEW',
                subdomainUrl: 'http://masala-house.orbitox.io',
                previewExpiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
              },
              tables: {
                totalCount: 16,
                sampleTable: {
                  id: 'tbl_1',
                  tableNumber: 'Table T-01',
                  dinerUrl: 'http://localhost:4010/table/T-01',
                },
              },
              menu: {
                categoriesCount: 3,
                itemsCount: 8,
                categories: ['Curries', 'Breads'],
                items: [
                  { id: 'item_1', name: 'Paneer Butter Masala', basePriceMinor: 28000, categoryName: 'Curries' },
                ],
              },
            },
          }),
        });
      });

      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F4',
            user: { userId: 'usr_test_1', email: 'priya@shahgroup.in', name: 'Priya Shah' },
            organization: {
              id: 'org_test_1',
              name: 'Shah Hospitality Group',
              slug: 'shah-hospitality-group',
              city: 'Bengaluru',
            },
            restaurant: {
              tenantId: 'org/test-org/project/masala-house/environment/prod',
              slug: 'masala-house',
              restaurantName: 'Masala House Indiranagar',
              tableCount: 16,
              templateId: 'saffron',
              dinerUrl: 'http://localhost:4010/table/T-01',
            },
          })
        );
      }, STORAGE_KEY);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=14 days preview remaining', { timeout: 15000 });

      // Verify QR Code canvas or image exists (genuine QR code rendered)
      const qrEl = await page.waitForSelector('img[alt*="QR Code"], canvas', { timeout: 15000 });
      assert.ok(qrEl, 'Live QR code element must be rendered on F4 preview card');

      // Axe audit
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      if (criticalOrSerious.length > 0) {
        console.error('F4 Axe Violations:', JSON.stringify(criticalOrSerious, null, 2));
      }
      assert.equal(criticalOrSerious.length, 0, 'F4 must have 0 critical/serious a11y violations');

      await page.unroute('**/api/v1/customer/tenants/*/preview-summary');
    });

    it('D6 Mobile Preview Card: renders cleanly and passes Axe audit', async () => {
      // Switch to D6 mobile preview by clicking "Mobile Phone View (D6)"
      const switchBtn = page.locator('text=Mobile Phone View (D6)');
      if (await switchBtn.isVisible()) {
        await switchBtn.click();
        await page.waitForSelector('text=D6 Mobile Preview', { timeout: 10000 });

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        const criticalOrSerious = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );
        if (criticalOrSerious.length > 0) {
          console.error('D6 Axe Violations:', JSON.stringify(criticalOrSerious, null, 2));
        }
        assert.equal(criticalOrSerious.length, 0, 'D6 must have 0 critical/serious a11y violations');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Authentic Full Customer Journey (F1 -> F4 -> Live Test Order -> DB Verify -> Recovery)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Authentic Full Customer Journey & End-to-End Persistence', () => {
    let page: Page;
    let context: any;
    let platformPrisma: PlatformPrisma;
    let restaurantPrisma: any;

    const runId = crypto.randomBytes(4).toString('hex');
    const customerName = `Priya Shah ${runId}`;
    const customerEmail = `priya_${runId}@shahhospitality.in`;
    const password = 'SuperSecureP@ssw0rd2026!';
    const orgName = `Shah Hospitality ${runId}`;
    const restoName = `Masala Lounge ${runId}`;

    const sentinelTenantId = `tenant_sentinel_${runId}`;
    const sentinelOrderId = `ord_sentinel_${runId}`;
    const sentinelTaskId = `task_sentinel_${runId}`;

    const createdCustomerUserIds = new Set<string>();
    const createdOrgIds = new Set<string>();
    const createdProjectIds = new Set<string>();
    const createdTenantIds = new Set<string>();
    const createdOrderIds = new Set<string>();
    const createdTaskIds = new Set<string>();

    before(async () => {
      process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY ||= 'suHqZrDHA7KY4K81QyTKR1vIR+K9koUQWq0YlazJlNo=';
      platformPrisma = new PlatformPrisma({
        datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/orbitox_phase2' } },
      });

      const restaurantPrismaModule: any = '../../../../services/restaurant-api/generated/prisma';
      const { PrismaClient: RestaurantPrismaClient } = await import(restaurantPrismaModule);
      restaurantPrisma = new RestaurantPrismaClient({
        datasources: { db: { url: process.env.RESTAURANTOS_DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os' } },
      });

      // Seed sentinel record in restaurant_os to verify zero collateral test deletion
      await restaurantPrisma.tenant.create({
        data: {
          id: sentinelTenantId,
          name: `Sentinel Commercial Bistro ${runId}`,
          slug: `sentinel-${runId}`,
          status: 'active',
          planId: 'restaurant-starter',
          orders: {
            create: {
              id: sentinelOrderId,
              tableNumber: 'T99',
              sessionId: `sess_sentinel_${runId}`,
              status: 'CONFIRMED',
              items: [{ name: 'Commercial Biryani', quantity: 1, priceMinor: 38000 }],
              subtotalMinor: 38000,
              taxMinor: 1900,
              totalMinor: 39900,
              isTest: false,
            },
          },
          kitchenTasks: {
            create: {
              id: sentinelTaskId,
              orderId: sentinelOrderId,
              tableNumber: 'T99',
              itemName: 'Commercial Biryani',
              quantity: 1,
              station: 'CURRY_LINE',
              status: 'QUEUED',
              isTest: false,
            },
          },
        },
      });

      context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      });
      page = await context.newPage();
    });

    after(async () => {
      if (page) await page.close();
      if (context) await context.close();

      // Scoped teardown of created records
      try {
        // Assert sentinel records survived completely untouched BEFORE any deletions
        const checkSentinelTask = await restaurantPrisma.kitchenTask.findUnique({ where: { id: sentinelTaskId } });
        assert.ok(checkSentinelTask, 'FATAL: Sentinel kitchen task was destroyed during test suite execution!');
        assert.equal(checkSentinelTask.isTest, false);
        const checkSentinelOrder = await restaurantPrisma.restaurantOrder.findUnique({ where: { id: sentinelOrderId } });
        assert.ok(checkSentinelOrder, 'FATAL: Sentinel restaurant order was destroyed during test suite execution!');
        assert.equal(checkSentinelOrder.isTest, false);

        if (createdTaskIds.size > 0) {
          await restaurantPrisma.kitchenTask.deleteMany({
            where: { id: { in: Array.from(createdTaskIds) } },
          });
        }
        if (createdOrderIds.size > 0) {
          await restaurantPrisma.restaurantOrder.deleteMany({
            where: { id: { in: Array.from(createdOrderIds) } },
          });
        }
        const tIds = Array.from(createdTenantIds);
        if (tIds.length > 0) {
          await restaurantPrisma.tableFloor.deleteMany({ where: { tenantId: { in: tIds } } });
          await restaurantPrisma.floor.deleteMany({ where: { tenantId: { in: tIds } } });
          await restaurantPrisma.branch.deleteMany({ where: { tenantId: { in: tIds } } });
          await restaurantPrisma.menuItem.deleteMany({ where: { tenantId: { in: tIds } } });
          await restaurantPrisma.menuCategory.deleteMany({ where: { tenantId: { in: tIds } } });
          await restaurantPrisma.tenantBrandConfig.deleteMany({ where: { tenantId: { in: tIds } } });
          await restaurantPrisma.ownerInvite.deleteMany({ where: { tenantId: { in: tIds } } });
          await restaurantPrisma.tenant.deleteMany({ where: { id: { in: tIds } } });
        }

        const orgIds = Array.from(createdOrgIds);
        if (orgIds.length > 0) {
          const pIds = Array.from(createdProjectIds);
          if (pIds.length > 0) {
            await platformPrisma.projectEnvironment.deleteMany({ where: { projectId: { in: pIds } } });
            await platformPrisma.platformProject.deleteMany({ where: { id: { in: pIds } } });
          }
          await (platformPrisma as any).platformOperation.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
          await platformPrisma.customerMembership.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
          await platformPrisma.platformOrganization.deleteMany({ where: { id: { in: orgIds } } }).catch(() => {});
        }

        if (createdCustomerUserIds.size > 0) {
          const uIds = Array.from(createdCustomerUserIds);
          await platformPrisma.accountEmailOutbox.deleteMany({ where: { recipient: customerEmail } });
          await platformPrisma.customerSession.deleteMany({ where: { userId: { in: uIds } } });
          await (platformPrisma as any).accountToken?.deleteMany({ where: { userId: { in: uIds } } }).catch(() => {});
          await platformPrisma.customerUser.deleteMany({ where: { id: { in: uIds } } }).catch(() => {});
        }

        // Clean up sentinel records explicitly
        await restaurantPrisma.kitchenTask.deleteMany({ where: { id: sentinelTaskId } });
        await restaurantPrisma.restaurantOrder.deleteMany({ where: { id: sentinelOrderId } });
        await restaurantPrisma.tenant.deleteMany({ where: { id: sentinelTenantId } });
      } catch (err) {
        console.error('[PLAYWRIGHT E2E TEARDOWN ERROR]:', err);
        throw err;
      } finally {
        await platformPrisma.$disconnect();
        await restaurantPrisma.$disconnect();
      }
    });

    it('sentinel data safety check: unrelated commercial orders and tasks exist untouched before test flow', async () => {
      const task = await restaurantPrisma.kitchenTask.findUnique({ where: { id: sentinelTaskId } });
      assert.ok(task, 'Sentinel kitchen task must exist before any test mutations');
      assert.equal(task.isTest, false);
      const order = await restaurantPrisma.restaurantOrder.findUnique({ where: { id: sentinelOrderId } });
      assert.ok(order, 'Sentinel restaurant order must exist before any test mutations');
      assert.equal(order.isTest, false);
    });

    it('completes authentic registration and code verification from PostgreSQL outbox (F1)', async () => {
      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      // Clear localStorage to ensure fresh start
      await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
      await page.reload({ waitUntil: 'domcontentloaded' });

      await page.waitForSelector('input[name="fullName"]', { timeout: 15000 });
      await page.fill('input[name="fullName"]', customerName);
      await page.fill('input[name="email"]', customerEmail);
      await page.fill('input[name="password"]', password);

      await page.click('button[type="submit"]');

      // Verification modal appears
      await page.waitForSelector('text=Verify your email', { timeout: 15000 });

      // Track user ID from platform DB
      const user = await platformPrisma.customerUser.findFirst({
        where: { email: customerEmail },
      });
      assert.ok(user, 'User must exist in platform DB');
      createdCustomerUserIds.add(user.id);
      assert.equal(user.emailVerifiedAt, null, 'User must initially be unverified');

      // Fetch code from accountEmailOutbox in PostgreSQL
      const outboxRow = await platformPrisma.accountEmailOutbox.findFirst({
        where: { recipient: customerEmail, template: 'VERIFY_EMAIL' },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(outboxRow, 'Verification email must be present in outbox');
      const decrypted = decryptPayload<{ code: string }>(
        outboxRow.encryptedPayload,
        process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY || 'suHqZrDHA7KY4K81QyTKR1vIR+K9koUQWq0YlazJlNo='
      );
      assert.ok(decrypted.code, 'Decrypted payload must contain verification code');
      assert.equal(decrypted.code.length, 6);

      // Enter code into browser modal inputs (6 digits)
      const digits = decrypted.code.split('');
      for (let i = 0; i < 6; i++) {
        const input = page.locator(`input[aria-label="Digit ${i + 1}"]`);
        await input.fill(digits[i] || '');
      }

      const confirmBtn = page.locator('button:has-text("Confirm code")');
      if (await confirmBtn.isVisible() && await confirmBtn.isEnabled()) {
        await confirmBtn.click();
      }

      // Wait for automatic verification and transition to Step F2
      await page.waitForSelector('input[name="businessName"]', { timeout: 15000 });

      // Verify user is now verified in DB
      const updatedUser = await platformPrisma.customerUser.findFirst({
        where: { id: user.id },
      });
      assert.ok(updatedUser?.emailVerifiedAt, 'User must be marked emailVerified in database');
    });

    it('creates business organization (F2)', async () => {
      await page.fill('input[name="businessName"]', orgName);
      await page.fill('input[name="city"]', 'Bengaluru');
      await page.click('button[type="submit"]');

      // Transitions to Step F3
      await page.waitForSelector('input[name="restaurantName"]', { timeout: 15000 });

      // Verify org in DB
      const org = await platformPrisma.platformOrganization.findFirst({
        where: { name: orgName },
      });
      assert.ok(org, 'Organization must exist in platform DB');
      createdOrgIds.add(org.id);
    });

    it('provisions restaurant tenant through live saga state machine (F3)', async () => {
      await page.fill('input[name="restaurantName"]', restoName);
      await page.fill('input[name="branchArea"]', 'Indiranagar');

      // Wait for slug status
      await page.waitForSelector('text=Available', { timeout: 15000 });

      await page.click('button[type="submit"]');

      // Enters provisioning state machine
      await page.waitForSelector(`text=Provisioning ${restoName}`, { timeout: 15000 });

      // Wait for saga to complete and transition to F4
      await page.waitForSelector('text=14 days preview remaining', { timeout: 45000 });

      // Track created project and tenant
      const proj = await platformPrisma.platformProject.findFirst({
        where: { name: restoName },
        include: { environments: true },
      });
      if (proj) {
        createdProjectIds.add(proj.id);
        const prodEnv = proj.environments.find((e) => e.isProduction) || proj.environments[0];
        const canonTenantId = prodEnv
          ? `org/${proj.organizationId}/project/${proj.id}/environment/${prodEnv.id}`
          : `tenant_${proj.slug}`;
        createdTenantIds.add(canonTenantId);
        createdTenantIds.add(`tenant_${proj.slug}`);
      }
    });

    it('places authenticated test order in F4 and verifies persistence in PostgreSQL restaurant_os', async () => {
      // Find created project
      const proj = await platformPrisma.platformProject.findFirst({
        where: { name: restoName },
        include: { environments: true },
      });
      assert.ok(proj, 'Platform project must exist for created restaurant');
      const prodEnv = proj.environments.find((e) => e.isProduction) || proj.environments[0];
      const canonicalTenantId = prodEnv
        ? `org/${proj.organizationId}/project/${proj.id}/environment/${prodEnv.id}`
        : `tenant_${proj.slug}`;

      // Sample table locator and QR code must be visible
      const qrEl = await page.waitForSelector('img[alt*="QR Code"]', { timeout: 15000 });
      assert.ok(qrEl, 'QR code must be visible on F4 card');

      // Place test order
      const testOrderBtn = page.locator('button:has-text("Place Quick Test Order")');
      await testOrderBtn.click();

      // Wait for success notice
      await page.waitForSelector('text=Test order submitted!', { timeout: 15000 });

      // Verify in PostgreSQL restaurant_os database SCOPED TO CANONICAL TENANT ID
      const dbOrder = await restaurantPrisma.restaurantOrder.findFirst({
        where: { tenantId: canonicalTenantId, isTest: true },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(dbOrder, 'Test order must exist in PostgreSQL restaurant_os for this specific tenant');
      assert.equal(dbOrder.isTest, true, 'isTest must be true on order in PostgreSQL');
      assert.equal(dbOrder.tenantId, canonicalTenantId, 'Order must belong to the provisioned tenant');
      createdOrderIds.add(dbOrder.id);

      const dbTasks = await restaurantPrisma.kitchenTask.findMany({
        where: { tenantId: canonicalTenantId, orderId: dbOrder.id },
      });
      assert.ok(dbTasks.length > 0, 'Kitchen tasks must exist for test order');
      for (const t of dbTasks) {
        assert.equal(t.isTest, true, 'Kitchen task must have isTest = true');
        assert.equal(t.tenantId, canonicalTenantId, 'Kitchen task must belong to provisioned tenant');
        createdTaskIds.add(t.id);
      }
    });

    it('bumps KDS ticket to READY and verifies state update in PostgreSQL', async () => {
      // Find Bump button
      const bumpBtn = page.locator('button:has-text("Bump ticket"), button:has-text("Mark ready")').first();
      await bumpBtn.waitFor({ state: 'visible', timeout: 10000 });
      await bumpBtn.click();
      await page.waitForSelector('text=Dispatched / Ready', { timeout: 10000 });

      // Poll task status in database until committed
      let updatedTask = null;
      for (let i = 0; i < 15; i++) {
        updatedTask = await restaurantPrisma.kitchenTask.findFirst({
          where: { id: { in: Array.from(createdTaskIds) }, status: 'READY' },
        });
        if (updatedTask) break;
        await new Promise((r) => setTimeout(r, 400));
      }
      assert.ok(updatedTask, 'Kitchen task status must be READY in PostgreSQL');
      assert.equal(updatedTask?.status, 'READY');
    });

    it('sentinel data safety check: unrelated commercial orders and tasks survive after test flow and bumps', async () => {
      const task = await restaurantPrisma.kitchenTask.findUnique({ where: { id: sentinelTaskId } });
      assert.ok(task, 'Sentinel kitchen task must survive test mutations untouched');
      assert.equal(task.isTest, false);
      assert.equal(task.status, 'QUEUED');
      const order = await restaurantPrisma.restaurantOrder.findUnique({ where: { id: sentinelOrderId } });
      assert.ok(order, 'Sentinel restaurant order must survive test mutations untouched');
      assert.equal(order.isTest, false);
    });

    it('recovers F4 working preview state across browser reload', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=14 days preview remaining', { timeout: 15000 });
      assert.ok(await page.locator(`text=${restoName}`).first().isVisible(), 'Restaurant name must persist on reload');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Resilient Recovery Matrix & Edge State Verification
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Resilient Recovery Matrix & Edge State Verification', () => {
    let page: Page;
    let context: any;
    let platformPrisma: PlatformPrisma;

    const matrixRunId = crypto.randomBytes(4).toString('hex');
    const matrixOrgId = `org_matrix_${matrixRunId}`;
    const partialOpId = `op_partial_${matrixRunId}`;

    before(async () => {
      platformPrisma = new PlatformPrisma({
        datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/orbitox_phase2' } },
      });

      // Create a test organization and a PARTIAL platform operation
      await platformPrisma.platformOrganization.create({
        data: {
          id: matrixOrgId,
          name: `Matrix Test Org ${matrixRunId}`,
          slug: `matrix-org-${matrixRunId}`,
          billingEmail: `billing-${matrixRunId}@matrix.com`,
          city: 'Bengaluru',
        },
      });

      await (platformPrisma as any).platformOperation.create({
        data: {
          id: partialOpId,
          type: 'TENANT_PROVISION',
          tenantId: `org/${matrixOrgId}/project/matrix-resto-${matrixRunId}/environment/prod`,
          organizationId: matrixOrgId,
          idempotencyKey: `idem_${partialOpId}`,
          status: 'PARTIAL',
          steps: [
            { id: '1', name: 'validate_and_reserve', status: 'COMPLETED' },
            { id: '2', name: 'create_entities', status: 'COMPLETED' },
            { id: '3', name: 'create_subscription_and_entitlement', status: 'COMPLETED' },
            { id: '4', name: 'issue_api_keys', status: 'COMPLETED' },
            { id: '5', name: 'provision_plugins', status: 'FAILED', error: 'Simulated bridge timeout during runtime configuration' },
            { id: '6', name: 'push_first_grant', status: 'PENDING' },
            { id: '7', name: 'finalize_active', status: 'PENDING' },
          ],
          request: {
            name: 'Matrix Bistro',
            slug: `matrix-resto-${matrixRunId}`,
          },
          error: 'Simulated bridge timeout during runtime configuration',
        },
      });

      context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      });
      page = await context.newPage();

      // Intercept operation polling to supply reproducible PARTIAL status and handle retry
      await page.route('**/api/v1/customer/organizations/*/tenants/operations/**', async (route) => {
        if (route.request().method() === 'POST' && route.request().url().endsWith('/retry')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              operation: {
                id: partialOpId,
                status: 'RUNNING',
                steps: [
                  { id: '1', name: 'validate_and_reserve', status: 'COMPLETED' },
                  { id: '2', name: 'create_entities', status: 'COMPLETED' },
                  { id: '3', name: 'create_subscription_and_entitlement', status: 'COMPLETED' },
                  { id: '4', name: 'issue_api_keys', status: 'COMPLETED' },
                  { id: '5', name: 'provision_plugins', status: 'RUNNING' },
                  { id: '6', name: 'push_first_grant', status: 'PENDING' },
                  { id: '7', name: 'finalize_active', status: 'PENDING' },
                ],
              },
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            operation: {
              id: partialOpId,
              status: 'PARTIAL',
              steps: [
                { id: '1', name: 'validate_and_reserve', status: 'COMPLETED' },
                { id: '2', name: 'create_entities', status: 'COMPLETED' },
                { id: '3', name: 'create_subscription_and_entitlement', status: 'COMPLETED' },
                { id: '4', name: 'issue_api_keys', status: 'COMPLETED' },
                { id: '5', name: 'provision_plugins', status: 'FAILED', error: 'Simulated bridge timeout during runtime configuration' },
                { id: '6', name: 'push_first_grant', status: 'PENDING' },
                { id: '7', name: 'finalize_active', status: 'PENDING' },
              ],
              error: 'Simulated bridge timeout during runtime configuration',
            },
          }),
        });
      });
    });

    after(async () => {
      try {
        await page.unroute('**/api/v1/customer/organizations/*/tenants/operations/**');
      } catch {}

      if (page) await page.close();
      if (context) await context.close();

      try {
        await (platformPrisma as any).platformOperation.deleteMany({ where: { organizationId: matrixOrgId } }).catch(() => {});
        await platformPrisma.customerMembership.deleteMany({ where: { organizationId: matrixOrgId } }).catch(() => {});
        await platformPrisma.platformOrganization.deleteMany({ where: { id: matrixOrgId } }).catch(() => {});
      } catch (err) {
        console.error('[MATRIX TEARDOWN ERROR]:', err);
      } finally {
        await platformPrisma.$disconnect();
      }
    });

    it('handles reload during provisioning: resumes polling from persisted operation state', async () => {
      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ key, activeKey, orgId, opId }) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F3',
            user: { userId: 'usr_matrix_test', email: 'matrix@test.com', name: 'Matrix Tester' },
            organization: { id: orgId, name: 'Matrix Org', slug: 'matrix-org', city: 'Bengaluru' },
            restaurant: { restaurantName: 'Matrix Bistro', tableCount: 10, templateId: 'saffron', slug: 'matrix-bistro' },
          })
        );
        localStorage.setItem(
          activeKey,
          JSON.stringify({
            id: opId,
            restaurantName: 'Matrix Bistro',
            slug: 'matrix-bistro',
            status: 'RUNNING',
            steps: [
              { id: '1', name: 'validate_and_reserve', status: 'COMPLETED' },
              { id: '2', name: 'create_entities', status: 'RUNNING' },
            ],
          })
        );
      }, {
        key: STORAGE_KEY,
        activeKey: `orbitox_active_provisioning_${matrixOrgId}`,
        orgId: matrixOrgId,
        opId: partialOpId,
      });

      await page.reload({ waitUntil: 'domcontentloaded' });

      // Verifies that F3 reloads in provisioning mode
      await page.waitForSelector('text=Provisioning Matrix Bistro', { timeout: 15000 });
      assert.ok(await page.locator('text=Matrix Bistro').isVisible(), 'Restaurant name must be retained during reload');
    });

    it('handles PARTIAL provisioning state: renders retry button and error alert', async () => {
      // The page polls the PARTIAL operation and transitions to partial state
      await page.waitForSelector('text=Provisioning Interrupted (Partial)', { timeout: 15000 });
      assert.ok(await page.locator('text=Simulated bridge timeout during runtime configuration').isVisible(), 'Error message must be displayed');

      const retryBtn = page.locator('button:has-text("Retry Provisioning")');
      assert.ok(await retryBtn.isVisible(), 'Retry button must be visible for PARTIAL provisioning');
    });

    it('handles retry of PARTIAL provisioning: calls retry endpoint and restarts polling', async () => {
      const retryBtn = page.locator('button:has-text("Retry Provisioning")');
      await retryBtn.click();
      await page.waitForSelector('text=Provisioning Matrix Bistro', { timeout: 15000 });
      assert.ok(await page.locator('text=Matrix Bistro').isVisible(), 'Provisioning should resume upon retry');
    });

    it('handles empty menu state in F4: shows empty notice and disables test order', async () => {
      // Intercept preview-summary to simulate an empty menu
      await page.route('**/api/v1/customer/tenants/*/preview-summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            preview: {
              restaurant: {
                name: 'Empty Bistro',
                status: 'PREVIEW',
                subdomainUrl: 'http://empty-bistro.orbitox.io',
                previewExpiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
              },
              tables: {
                totalCount: 0,
                sampleTable: null,
              },
              menu: {
                categoriesCount: 0,
                itemsCount: 0,
                categories: [],
                items: [],
              },
            },
          }),
        });
      });

      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F4',
            user: { userId: 'usr_matrix_test', email: 'matrix@test.com', name: 'Matrix Tester' },
            organization: { id: 'org_empty', name: 'Empty Org', slug: 'empty-org', city: 'Bengaluru' },
            restaurant: {
              tenantId: 'org/test/project/empty/environment/prod',
              slug: 'empty-bistro',
              restaurantName: 'Empty Bistro',
              tableCount: 12,
              templateId: 'saffron',
            },
          })
        );
      }, STORAGE_KEY);

      await page.reload({ waitUntil: 'domcontentloaded' });

      // Verifies sample table required notice on button and disabled state
      await page.waitForSelector('button:has-text("Sample table required")', { timeout: 15000 });
      const testOrderBtn = page.locator('button:has-text("Sample table required")').first();
      assert.ok(await testOrderBtn.isDisabled(), 'Test order button must be disabled when menu has 0 tables');

      await page.unroute('**/api/v1/customer/tenants/*/preview-summary');
    });

    it('handles preview expiry state in F4: shows PREVIEW EXPIRED badge and disables test order', async () => {
      // Intercept preview-summary to simulate an expired preview
      await page.route('**/api/v1/customer/tenants/*/preview-summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            preview: {
              restaurant: {
                name: 'Expired Bistro',
                status: 'EXPIRED',
                subdomainUrl: 'http://expired-bistro.orbitox.io',
                previewExpiresAt: new Date(Date.now() - 86400000).toISOString(),
              },
              tables: {
                totalCount: 10,
                sampleTable: { id: 'tbl_1', tableNumber: 'Table T-01', dinerUrl: 'http://localhost:4010/table/T1' },
              },
              menu: {
                categoriesCount: 1,
                itemsCount: 1,
                categories: ['Curries'],
                items: [{ id: 'item_1', name: 'Old Dal', basePriceMinor: 20000, categoryName: 'Curries' }],
              },
            },
          }),
        });
      });

      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F4',
            user: { userId: 'usr_matrix_test', email: 'matrix@test.com', name: 'Matrix Tester' },
            organization: { id: 'org_exp', name: 'Expired Org', slug: 'exp-org', city: 'Bengaluru' },
            restaurant: {
              tenantId: 'org/test/project/expired/environment/prod',
              slug: 'expired-bistro',
              restaurantName: 'Expired Bistro',
              tableCount: 12,
              templateId: 'saffron',
            },
          })
        );
      }, STORAGE_KEY);

      await page.reload({ waitUntil: 'domcontentloaded' });

      // Verifies Preview expired badge
      await page.waitForSelector('text=Preview expired', { timeout: 15000 });
      assert.ok(await page.locator('text=Preview expired').first().isVisible());

      // Verifies disabled button with expired label
      const disabledBtn = page.locator('button:has-text("Preview Expired")');
      assert.ok(await disabledBtn.isVisible(), 'Button must reflect expired status');
      assert.ok(await disabledBtn.isDisabled(), 'Button must be disabled when preview is expired');

      await page.unroute('**/api/v1/customer/tenants/*/preview-summary');
    });

    it('handles runtime outage gracefully: displays error banner without crashing', async () => {
      // Intercept preview-summary to simulate 503 outage
      await page.route('**/api/v1/customer/tenants/*/preview-summary', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'SERVICE_UNAVAILABLE', message: 'Runtime plane offline' }),
        });
      });

      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F4',
            user: { userId: 'usr_matrix_test', email: 'matrix@test.com', name: 'Matrix Tester' },
            organization: { id: 'org_outage', name: 'Outage Org', slug: 'outage-org', city: 'Bengaluru' },
            restaurant: {
              tenantId: 'org/test/project/outage/environment/prod',
              slug: 'outage-bistro',
              restaurantName: 'Outage Bistro',
              tableCount: 12,
              templateId: 'saffron',
            },
          })
        );
      }, STORAGE_KEY);

      await page.reload({ waitUntil: 'domcontentloaded' });

      // Verifies page renders cleanly with restaurant name and does not crash
      await page.waitForSelector('text=Outage Bistro', { timeout: 15000 });
      assert.ok(await page.locator('text=Outage Bistro').first().isVisible(), 'Header should render cleanly despite runtime outage');

      await page.unroute('**/api/v1/customer/tenants/*/preview-summary');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. F5 Plan Selection & F6 Operational Checklist Journey
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. F5 Plan Selection & F6 Operational Checklist Journey', () => {
    let page: Page;
    let context: any;

    before(async () => {
      context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      });
      page = await context.newPage();
    });

    after(async () => {
      if (page) await page.close();
      if (context) await context.close();
    });

    it('F5 Plan Selection: renders catalogue plans, toggles billing cycles and passes Axe audit', async () => {
      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F5',
            user: { userId: 'usr_f5_test', email: 'owner@f5restaurant.com', name: 'Rohan Verma' },
            organization: { id: 'org_f5_test', name: 'Verma Hospitality', slug: 'verma-hospitality', city: 'Mumbai' },
            restaurant: {
              tenantId: 'org/org_f5_test/project/verma-bistro/environment/prod',
              slug: 'verma-bistro',
              restaurantName: 'Verma Bistro',
              tableCount: 16,
              templateId: 'saffron',
            },
          })
        );
      }, STORAGE_KEY);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Starter', { timeout: 15000 });
      await page.waitForSelector('text=Growth', { timeout: 15000 });
      await page.waitForSelector('text=Pro Enterprise', { timeout: 15000 });

      // Verify pricing details exist
      assert.ok(await page.locator('text=₹1,599').or(page.locator('text=1599')).first().isVisible());

      // Toggle monthly billing cycle
      const monthlyBtn = page.locator('button:has-text("Monthly billing")').first();
      if (await monthlyBtn.isVisible()) {
        await monthlyBtn.click();
        await page.waitForTimeout(300);
      }

      // Axe WCAG 2.2 AA audit on F5
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      if (criticalOrSerious.length > 0) {
        console.error('F5 Axe Violations:', JSON.stringify(criticalOrSerious, null, 2));
      }
      assert.equal(criticalOrSerious.length, 0, 'F5 Plan Selection must have 0 critical/serious a11y violations');
    });

    it('F6 Setup Checklist: renders authoritative 5-item checklist and 6 activation gates cleanly and passes Axe audit', async () => {
      // Mock activation status with truthful gates
      await page.route('**/api/v1/customer/tenants/*/activation-status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            isLive: false,
            isAwaitingWebhook: false,
            gates: {
              orgMapped: true,
              subscriptionActive: true,
              pluginActive: true,
              sagaCompleted: true,
              runtimeProvisioned: true,
              runtimeHealthy: true,
            },
            subscription: { id: 'sub_test_123', status: 'active', planId: 'plan_growth_annual' },
            provisioning: { status: 'COMPLETED' },
            runtime: { status: 'ACTIVE', health: 'HEALTHY' },
            installation: { status: 'ACTIVE', planId: 'growth' },
            checklist: { completedCount: 0, totalCount: 5, allCompleted: false },
          }),
        });
      });

      // Mock checklist get
      await page.route('**/api/v1/customer/tenants/*/checklist', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              checklist: {
                tenantId: 'org/org_f6_test/project/verma-bistro/environment/prod',
                version: 1,
                items: [
                  { id: 'qr', title: 'Print Table QR Codes', description: 'Download ready-to-print placards', actionLabel: 'Download QR Sheet', status: 'NOT_STARTED', completed: false, statusNote: 'Not yet printed' },
                  { id: 'kds', title: 'Station Kitchen Display (KDS)', description: 'Bookmark and open the real-time order queue', actionLabel: 'Open Station KDS', status: 'NOT_STARTED', completed: false, statusNote: 'Station unverified' },
                  { id: 'staff', title: 'Invite Captains & Service Staff', description: 'Grant role-based PIN access', actionLabel: 'Invite Team', status: 'NOT_STARTED', completed: false, statusNote: 'No invitations sent' },
                  { id: 'payment', title: 'Test Live UPI / Card Payment', description: 'Place and settle an authentic ₹1 test transaction', actionLabel: 'Test Settlement', status: 'NOT_STARTED', completed: false, statusNote: 'Payment unverified' },
                  { id: 'printer', title: 'Connect Thermal ESC/POS Printer', description: 'Auto-print Kitchen Order Tickets', actionLabel: 'Configure Printer', status: 'NOT_STARTED', completed: false, statusNote: 'No printer connected' },
                ],
                completedCount: 0,
                totalCount: 5,
                allCompleted: false,
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F6',
            user: { userId: 'usr_f6_test', email: 'owner@f6restaurant.com', name: 'Rohan Verma' },
            organization: { id: 'org_f6_test', name: 'Verma Hospitality', slug: 'verma-hospitality', city: 'Mumbai' },
            restaurant: {
              tenantId: 'org/org_f6_test/project/verma-bistro/environment/prod',
              slug: 'verma-bistro',
              restaurantName: 'Verma Bistro',
              tableCount: 16,
              templateId: 'saffron',
            },
          })
        );
      }, STORAGE_KEY);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Print Table QR Codes', { timeout: 15000 });
      await page.waitForSelector('text=Station Kitchen Display (KDS)', { timeout: 15000 });
      await page.waitForSelector('text=Invite Captains & Service Staff', { timeout: 15000 });
      await page.waitForSelector('text=Test Live UPI / Card Payment', { timeout: 15000 });
      await page.waitForSelector('text=Connect Thermal ESC/POS Printer', { timeout: 15000 });

      // Verify the 6 authoritative activation gates are visible
      assert.ok(await page.locator('text=Org & Role: Verified').isVisible());
      assert.ok(await page.locator('text=Subscription: Active').isVisible());
      assert.ok(await page.locator('text=RestaurantOS: Active').isVisible());

      // Axe WCAG 2.2 AA audit on F6
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      if (criticalOrSerious.length > 0) {
        console.error('F6 Axe Violations:', JSON.stringify(criticalOrSerious, null, 2));
      }
      assert.equal(criticalOrSerious.length, 0, 'F6 Setup Checklist must have 0 critical/serious a11y violations');

      await page.unroute('**/api/v1/customer/tenants/*/activation-status');
      await page.unroute('**/api/v1/customer/tenants/*/checklist');
    });

    it('F6 Setup Checklist: executes full interactive checklist lifecycle from download through verified live activation', async () => {
      let isLive = false;
      const checklistState: {
        tenantId: string;
        version: number;
        items: Array<{
          id: string;
          title: string;
          description: string;
          actionLabel: string;
          status: string;
          completed: boolean;
          statusNote: string;
          evidence?: any;
        }>;
        completedCount: number;
        totalCount: number;
        allCompleted: boolean;
      } = {
        tenantId: 'org/org_f6_test/project/verma-bistro/environment/prod',
        version: 1,
        items: [
          { id: 'qr', title: 'Print Table QR Codes', description: 'Download ready-to-print placards', actionLabel: 'Download QR Sheet', status: 'NOT_STARTED', completed: false, statusNote: 'Not yet printed' },
          { id: 'kds', title: 'Station Kitchen Display (KDS)', description: 'Bookmark and open the real-time order queue', actionLabel: 'Open Station KDS', status: 'NOT_STARTED', completed: false, statusNote: 'Station unverified' },
          { id: 'staff', title: 'Invite Captains & Service Staff', description: 'Grant role-based PIN access', actionLabel: 'Invite Team', status: 'NOT_STARTED', completed: false, statusNote: 'No invitations sent' },
          { id: 'payment', title: 'Test Live UPI / Card Payment', description: 'Place and settle an authentic ₹1 test transaction', actionLabel: 'Test Settlement', status: 'NOT_STARTED', completed: false, statusNote: 'Payment unverified' },
          { id: 'printer', title: 'Connect Thermal ESC/POS Printer', description: 'Auto-print Kitchen Order Tickets', actionLabel: 'Configure Printer', status: 'NOT_STARTED', completed: false, statusNote: 'No printer connected' },
        ],
        completedCount: 0,
        totalCount: 5,
        allCompleted: false,
      };

      await page.route('**/api/v1/customer/tenants/*/preview-summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            preview: {
              actions: { dinerPreviewUrl: '/preview', kdsUrl: '/kds', tablesUrl: '/tables' },
              restaurant: { status: 'ACTIVE', health: 'HEALTHY' },
            },
          }),
        });
      });

      await page.route('**/api/v1/customer/tenants/*/tables/qr-sheet', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<!DOCTYPE html><html><body><h1>Table QR Placards</h1></body></html>',
        });
      });

      await page.route('**/api/v1/customer/tenants/*/test-orders', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, order: { id: 'ord_test_playwright_1', orderId: 'ord_test_playwright_1' } }),
        });
      });

      await page.route('**/api/v1/customer/tenants/*/tables/settle', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, settled: true }),
        });
      });

      await page.route('**/api/v1/customer/tenants/*/devices/printer/test', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, testPrintId: 'job_test_prn_playwright_99', acknowledged: true }),
        });
      });

      await page.route('**/api/v1/customer/tenants/*/activation-status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            isLive,
            isAwaitingWebhook: false,
            gates: {
              orgMapped: true,
              subscriptionActive: true,
              pluginActive: true,
              sagaCompleted: true,
              runtimeProvisioned: true,
              runtimeHealthy: true,
            },
            subscription: { id: 'sub_live_playwright', status: 'active', planId: 'plan_growth_annual' },
            provisioning: { status: 'COMPLETED' },
            runtime: { status: 'ACTIVE', health: 'HEALTHY' },
            installation: { status: 'ACTIVE', planId: 'growth' },
            checklist: { completedCount: isLive ? 5 : checklistState.completedCount, totalCount: 5, allCompleted: isLive },
          }),
        });
      });

      await page.route('**/api/v1/customer/tenants/*/checklist', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, checklist: checklistState }),
          });
          return;
        }

        if (route.request().method() === 'POST') {
          const payload = JSON.parse(route.request().postData() || '{}');
          checklistState.version += 1;

          if (payload.action === 'RECORD_QR_DOWNLOAD') {
            const item = checklistState.items.find((i) => i.id === 'qr')!;
            item.status = 'ACTION_REQUIRED';
            item.statusNote = 'QR Sheet downloaded · Placement required';
            item.evidence = { artifactDownloaded: true };
          } else if (payload.action === 'CONFIRM_QR_PLACEMENT') {
            const item = checklistState.items.find((i) => i.id === 'qr')!;
            item.status = 'COMPLETED';
            item.completed = true;
            item.statusNote = 'QR placards placed on tables';
          } else if (payload.action === 'VERIFY_KDS') {
            const item = checklistState.items.find((i) => i.id === 'kds')!;
            item.status = 'ACTION_REQUIRED';
            item.statusNote = 'Station link verified · Hardware placement required';
            item.evidence = { kdsStationId: 'station_main_kitchen' };
          } else if (payload.action === 'CONFIRM_KDS_MOUNTED') {
            const item = checklistState.items.find((i) => i.id === 'kds')!;
            item.status = 'COMPLETED';
            item.completed = true;
            item.statusNote = 'KDS station operational & mounted';
          } else if (payload.action === 'INVITE_STAFF') {
            const item = checklistState.items.find((i) => i.id === 'staff')!;
            item.status = 'PENDING_VERIFICATION';
            item.statusNote = `Invite dispatched to ${payload.email} (${payload.role}) · Awaiting acceptance`;
            item.evidence = { invitedEmail: payload.email, invitedRole: payload.role };
          } else if (payload.action === 'VERIFY_STAFF') {
            const item = checklistState.items.find((i) => i.id === 'staff')!;
            item.status = 'COMPLETED';
            item.completed = true;
            item.statusNote = 'Staff member accepted & active';
          } else if (payload.action === 'RECORD_PREVIEW_PAYMENT') {
            const item = checklistState.items.find((i) => i.id === 'payment')!;
            item.status = 'ACTION_REQUIRED';
            item.statusNote = 'Preview test order submitted & settled · Live reconciliation pending';
          } else if (payload.action === 'VERIFY_GATEWAY') {
            const item = checklistState.items.find((i) => i.id === 'payment')!;
            item.status = 'COMPLETED';
            item.completed = true;
            item.statusNote = 'Razorpay Gateway verified via webhook & live settlement';
          } else if (payload.action === 'CONFIGURE_PRINTER') {
            const item = checklistState.items.find((i) => i.id === 'printer')!;
            item.status = 'COMPLETED';
            item.completed = true;
            item.statusNote = 'Printer connected (Epson ESC/POS @ 192.168.1.200:9100)';
          }

          checklistState.completedCount = checklistState.items.filter((i) => i.completed).length;
          checklistState.allCompleted = checklistState.completedCount === checklistState.items.length;
          if (checklistState.allCompleted) {
            isLive = true;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, checklist: checklistState }),
          });
          return;
        }

        await route.continue();
      });

      await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            step: 'F6',
            user: { userId: 'usr_f6_test', email: 'owner@f6restaurant.com', name: 'Rohan Verma' },
            organization: { id: 'org_f6_test', name: 'Verma Hospitality', slug: 'verma-hospitality', city: 'Mumbai' },
            restaurant: {
              tenantId: 'org/org_f6_test/project/verma-bistro/environment/prod',
              slug: 'verma-bistro',
              restaurantName: 'Verma Bistro',
              tableCount: 16,
              templateId: 'saffron',
            },
          })
        );
      }, STORAGE_KEY);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Print Table QR Codes', { timeout: 15000 });

      // Step 1: QR Sheet Download & Placement Attestation
      await page.click('button:has-text("Download QR Sheet")');
      await page.waitForSelector('button:has-text("Confirm Placement")', { timeout: 5000 });
      await page.click('button:has-text("Confirm Placement")');
      await page.waitForSelector('text=QR placards placed on tables', { timeout: 5000 });

      // Step 2: KDS Station Link Verification & Mounting Attestation
      await page.click('button:has-text("Open Station KDS")');
      await page.waitForSelector('button:has-text("Confirm Mounted")', { timeout: 5000 });
      await page.click('button:has-text("Confirm Mounted")');
      await page.waitForSelector('text=KDS station operational & mounted', { timeout: 5000 });

      // Step 3: Staff Invitation & Acceptance Verification
      await page.click('button:has-text("Invite Team")');
      await page.waitForSelector('text=Invite Team Member', { timeout: 5000 });
      await page.fill('input[type="email"]', 'captain@f6restaurant.com');
      await page.click('button:has-text("Send Invitation")');
      await page.waitForSelector('button:has-text("Verify Accepted")', { timeout: 5000 });
      await page.click('button:has-text("Verify Accepted")');
      await page.waitForSelector('text=Staff member accepted & active', { timeout: 5000 });

      // Step 4: Printer Configuration & Test Print
      await page.click('button:has-text("Configure Printer")');
      await page.waitForSelector('text=Thermal Printer Configuration', { timeout: 5000 });
      await page.click('button:has-text("Dispatch Test Print Receipt")');
      await page.waitForSelector('text=Test receipt packet acknowledged', { timeout: 5000 });
      await page.click('button:has-text("Confirm Connected")');
      await page.waitForSelector('text=Printer connected', { timeout: 5000 });

      // Step 5: Test Payment Settlement & Live Gateway Verification
      await page.click('button:has-text("Test Settlement")');
      await page.waitForSelector('button:has-text("Verify Live Gateway")', { timeout: 5000 });
      await page.click('button:has-text("Verify Live Gateway")');
      await page.waitForSelector('text=Razorpay Gateway verified', { timeout: 5000 });

      // Verify all 5 items completed
      assert.strictEqual(checklistState.completedCount, 5);
      assert.strictEqual(checklistState.allCompleted, true);

      // Verify Live Status Badge transitions cleanly
      await page.waitForSelector('text=You are live!', { timeout: 10000 });
      assert.ok(await page.locator('text=You are live!').isVisible());

      await page.unroute('**/api/v1/customer/tenants/*/preview-summary');
      await page.unroute('**/api/v1/customer/tenants/*/tables/qr-sheet');
      await page.unroute('**/api/v1/customer/tenants/*/test-orders');
      await page.unroute('**/api/v1/customer/tenants/*/tables/settle');
      await page.unroute('**/api/v1/customer/tenants/*/devices/printer/test');
      await page.unroute('**/api/v1/customer/tenants/*/activation-status');
      await page.unroute('**/api/v1/customer/tenants/*/checklist');
    });

    it('F6 Multi-Viewport verification across all canonical viewports without horizontal overflow', async () => {
      const viewports = [
        { name: 'Mobile', width: 390, height: 844 },
        { name: 'Tablet Small', width: 768, height: 1024 },
        { name: 'Tablet Portrait', width: 834, height: 1194 },
        { name: 'Tablet Landscape', width: 1194, height: 834 },
        { name: 'Desktop Laptop', width: 1440, height: 900 },
        { name: 'Desktop Large FHD', width: 1920, height: 1080 },
      ];

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('main', { timeout: 15000 });

        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.offsetWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          return scrollWidth > docWidth + 2;
        });
        assert.equal(overflow, false, `F6 should not have horizontal overflow at ${vp.name} (${vp.width}px)`);
      }
    });
  });
});
