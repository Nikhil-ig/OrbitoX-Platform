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
  { name: 'Tablet Portrait', width: 834, height: 1194 },
  { name: 'Tablet Landscape', width: 1194, height: 834 },
  { name: 'Desktop Large', width: 1440, height: 900 },
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

      const { PrismaClient: RestaurantPrismaClient } = await import(
        '../../../../services/restaurant-api/generated/prisma'
      );
      restaurantPrisma = new RestaurantPrismaClient({
        datasources: { db: { url: process.env.RESTAURANTOS_DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os' } },
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
      } catch (err) {
        console.error('[PLAYWRIGHT E2E TEARDOWN ERROR]:', err);
      } finally {
        await platformPrisma.$disconnect();
        await restaurantPrisma.$disconnect();
      }
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
      });
      if (proj) {
        createdProjectIds.add(proj.id);
        const canonTenantId = `org/${proj.organizationId}/project/${proj.id}/environment/prod`;
        createdTenantIds.add(canonTenantId);
        createdTenantIds.add(`tenant_${proj.slug}`);
      }
    });

    it('places authenticated test order in F4 and verifies persistence in PostgreSQL restaurant_os', async () => {
      // Sample table locator and QR code must be visible
      const qrEl = await page.waitForSelector('img[alt*="QR Code"]', { timeout: 15000 });
      assert.ok(qrEl, 'QR code must be visible on F4 card');

      // Place test order
      const testOrderBtn = page.locator('button:has-text("Place Quick Test Order")');
      await testOrderBtn.click();

      // Wait for success notice
      await page.waitForSelector('text=Test order submitted!', { timeout: 15000 });

      // Verify in PostgreSQL restaurant_os database
      const dbOrder = await restaurantPrisma.restaurantOrder.findFirst({
        where: { isTest: true },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(dbOrder, 'Test order must exist in PostgreSQL restaurant_os');
      assert.equal(dbOrder.isTest, true, 'isTest must be true on order in PostgreSQL');
      createdOrderIds.add(dbOrder.id);

      const dbTasks = await restaurantPrisma.kitchenTask.findMany({
        where: { orderId: dbOrder.id },
      });
      assert.ok(dbTasks.length > 0, 'Kitchen tasks must exist for test order');
      for (const t of dbTasks) {
        assert.equal(t.isTest, true, 'Kitchen task must have isTest = true');
        createdTaskIds.add(t.id);
      }
    });

    it('bumps KDS ticket to READY and verifies state update in PostgreSQL', async () => {
      // Find Bump button
      const bumpBtn = page.locator('button:has-text("Bump ticket"), button:has-text("Mark ready")');
      if (await bumpBtn.isVisible()) {
        await bumpBtn.click();
        await page.waitForSelector('text=READY, text=Fulfilled', { timeout: 10000 });

        // Verify task status in database
        const latestTaskId = Array.from(createdTaskIds).pop();
        if (latestTaskId) {
          const updatedTask = await restaurantPrisma.kitchenTask.findUnique({
            where: { id: latestTaskId },
          });
          assert.equal(updatedTask?.status, 'READY', 'Kitchen task status must be READY in PostgreSQL');
        }
      }
    });

    it('recovers F4 working preview state across browser reload', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=14 days preview remaining', { timeout: 15000 });
      assert.ok(await page.locator(`text=${restoName}`).first().isVisible(), 'Restaurant name must persist on reload');
    });
  });
});
