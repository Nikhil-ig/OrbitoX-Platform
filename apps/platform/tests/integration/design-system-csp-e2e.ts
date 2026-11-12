import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const RAW_BASE = (process.env.ORBITOX_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
// Use localhost in Chromium so Secure cookies set during NODE_ENV=production are sent cleanly over HTTP loopback
const BROWSER_BASE = RAW_BASE.replace('127.0.0.1', 'localhost');
const PROD_CHECK_BASE = process.env.ORBITOX_PROD_CHECK_URL?.replace(/\/$/, '');

const OPERATOR_EMAIL = process.env.ORBITOX_OPERATOR_INITIAL_EMAIL;
const OPERATOR_PASSWORD = process.env.ORBITOX_OPERATOR_INITIAL_PASSWORD;
const OPERATOR_TOTP_SECRET = process.env.ORBITOX_OPERATOR_TEST_TOTP_SECRET;
const TOTP_STEP_OFFSET = Number.parseInt(process.env.ORBITOX_TOTP_STEP_OFFSET || '0', 10) || 0;

const SCREENSHOT_DIR =
  process.env.ORBITOX_DESIGN_SYSTEM_SCREENSHOTS_DIR ||
  path.join(os.tmpdir(), 'orbitox-design-system-e2e-screenshots');

function currentTotpCode(secret: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.replace(/=+$/, '')) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid bootstrap TOTP secret.');
    bits += digit.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const cacheDir = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
    const linuxCache = path.join(os.homedir(), '.cache', 'ms-playwright');
    for (const root of [cacheDir, linuxCache]) {
      if (!fs.existsSync(root)) continue;
      const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse();
      for (const dir of dirs) {
        const candidates = [
          path.join(root, dir, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
          path.join(root, dir, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
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

async function main() {
  if (!OPERATOR_EMAIL || !OPERATOR_PASSWORD || !OPERATOR_TOTP_SECRET) {
    throw new Error(
      'Set ORBITOX_OPERATOR_INITIAL_EMAIL, ORBITOX_OPERATOR_INITIAL_PASSWORD, and ORBITOX_OPERATOR_TEST_TOTP_SECRET.',
    );
  }

  // 1. Confirm anonymous HTTP request redirects to /platform/login
  const anonRes = await fetch(`${RAW_BASE}/console/design-system`, { redirect: 'manual' });
  const anonLoc = anonRes.headers.get('location') || '';
  assert.equal(anonRes.status, 307, `Expected 307 redirect for anonymous /console/design-system, got ${anonRes.status}`);
  assert.equal(
    new URL(anonLoc, RAW_BASE).pathname,
    '/platform/login',
    `Expected redirect to /platform/login, got ${anonLoc}`,
  );
  console.log('PASS  Anonymous GET /console/design-system -> 307 /platform/login');

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      (window as unknown as { __cspViolations: Array<{ blockedURI: string; violatedDirective: string }> }).__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        (window as unknown as { __cspViolations: Array<{ blockedURI: string; violatedDirective: string }> }).__cspViolations.push({
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
        });
      });
    });

    const page = await context.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 2. Navigate to /console/design-system -> browser follows redirect to /platform/login
    await page.goto(`${BROWSER_BASE}/console/design-system`, { waitUntil: 'networkidle' });
    assert.ok(
      new URL(page.url()).pathname === '/platform/login',
      `Expected Playwright to land on /platform/login, landed on ${page.url()}`,
    );

    // 3. Authenticate via real operator login form + live TOTP
    await page.locator('input[type="email"]').fill(OPERATOR_EMAIL);
    await page.locator('input[type="password"]').fill(OPERATOR_PASSWORD);
    await page.locator('input[autocomplete="one-time-code"]').fill(
      currentTotpCode(OPERATOR_TOTP_SECRET, Date.now() + TOTP_STEP_OFFSET * 30_000),
    );

    const [docResponse] = await Promise.all([
      page.waitForResponse((res) => new URL(res.url()).pathname === '/console/design-system' && res.request().resourceType() === 'document'),
      page.locator('button[type="submit"]').click(),
    ]);

    assert.equal(docResponse.status(), 200, `Expected 200 on /console/design-system after operator login, got ${docResponse.status()}`);
    const cspHeader = docResponse.headers()['content-security-policy'] || '';
    assert.ok(cspHeader.includes("default-src 'self'"), `Missing Content-Security-Policy header on /console/design-system: ${cspHeader}`);

    await page.getByText('Design System & Security Component Verification').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(300);

    // Toggle Brand Palette Option A <-> Option B and back to verify no runtime errors or CSP issues
    const sidebar = page.locator('aside');
    await sidebar.getByRole('button', { name: /Palette:/i }).click();
    await sidebar.getByRole('button', { name: /Option B/i }).waitFor({ state: 'visible' });
    await sidebar.getByRole('button', { name: /Palette:/i }).click();

    // 4. Capture desktop dark & light screenshots
    const isDarkInitially = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
    if (!isDarkInitially) {
      await sidebar.getByRole('button', { name: 'Toggle Theme', exact: true }).click();
      await page.waitForTimeout(200);
    }
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'console-design-system--desktop--dark.png'), fullPage: false });

    await sidebar.getByRole('button', { name: 'Toggle Theme', exact: true }).click();
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'console-design-system--desktop--light.png'), fullPage: false });

    // 5. Capture mobile (390x844) light & dark screenshots
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'console-design-system--mobile--light.png'), fullPage: false });

    await page.getByRole('button', { name: 'Open mobile navigation' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Toggle Theme', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'console-design-system--mobile--dark.png'), fullPage: false });

    // 6. Assert 0 CSP violations and 0 console/page errors
    const cspViolations = await page.evaluate(
      () => (window as unknown as { __cspViolations: Array<{ blockedURI: string; violatedDirective: string }> }).__cspViolations || [],
    );
    assert.deepEqual(cspViolations, [], `CSP violations detected: ${JSON.stringify(cspViolations)}`);
    assert.deepEqual(pageErrors, [], `Page errors detected: ${JSON.stringify(pageErrors)}`);
    assert.deepEqual(consoleErrors, [], `Console errors detected: ${JSON.stringify(consoleErrors)}`);
    console.log(`PASS  /console/design-system rendered in staging with real CSP, 0 violations, 0 console/page errors. Screenshots in ${SCREENSHOT_DIR}`);

    // 7. Verify production gate returns 404 even for authenticated operator (reuse active session cookie to respect TOTP anti-replay)
    if (PROD_CHECK_BASE) {
      const browserCookies = await context.cookies();
      const cookieHeader = browserCookies.map((c) => `${c.name}=${c.value}`).join('; ');
      assert.ok(cookieHeader.includes('orbitox_operator_session='), 'Expected active operator session cookie');
      const prodRes = await fetch(`${PROD_CHECK_BASE}/console/design-system`, {
        headers: { cookie: cookieHeader },
        redirect: 'manual',
      });
      assert.equal(
        prodRes.status,
        404,
        `Expected 404 on /console/design-system when ORBITOX_ENVIRONMENT=production, got ${prodRes.status}`,
      );
      console.log('PASS  ORBITOX_ENVIRONMENT=production GET /console/design-system -> 404 Not Found');
    }

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

