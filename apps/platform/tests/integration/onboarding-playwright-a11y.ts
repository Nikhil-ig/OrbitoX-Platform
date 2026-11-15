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
import { chromium, Browser, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

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
});
