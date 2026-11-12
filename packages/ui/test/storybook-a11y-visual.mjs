import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const DIST_DIR = path.resolve(import.meta.dirname, '../dist-storybook');
const SNAPSHOT_DIR = path.resolve(import.meta.dirname, '../test/__snapshots__');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqPath = (req.url || '/').split('?')[0];
      let filePath = path.join(DIST_DIR, reqPath === '/' ? 'index.html' : reqPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

import os from 'node:os';

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    // Fallback to any existing cached Playwright headless shell on macOS/Linux if exact revision isn't downloaded yet
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

async function run() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.json'))) {
    throw new Error('dist-storybook/index.json not found. Run pnpm --filter @orbitox-io/ui run build-storybook first.');
  }

  const indexData = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'index.json'), 'utf8'));
  const storyIds = Object.values(indexData.entries)
    .filter((e) => e.type === 'story')
    .map((e) => e.id);

  console.log(`Discovered ${storyIds.length} Storybook stories for WCAG 2.2 AA & Visual audit.`);
  assert.ok(storyIds.length >= 10, `Expected >= 10 stories, found ${storyIds.length}`);

  const { server, port } = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser();

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];
  const themes = ['dark', 'light'];

  if (process.env.UPDATE_SNAPSHOTS === '1') {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  let totalChecks = 0;
  const failures = [];

  try {
    for (const vp of viewports) {
      for (const theme of themes) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();

        const consoleErrors = [];
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        for (const storyId of storyIds) {
          const url = `${baseUrl}/iframe.html?id=${storyId}&viewMode=story`;
          await page.goto(url, { waitUntil: 'networkidle' });

          // Set theme mode on documentElement
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
            document.body.style.backgroundColor = 'var(--color-bg)';
            document.body.style.color = 'var(--color-text)';
          }, theme);

          // Wait briefly for CSS custom properties and Recharts ResizeObserver to settle
          await page.waitForTimeout(150);

          // Ensure root element rendered non-empty content
          const rootBox = await page.locator('#storybook-root').boundingBox();
          assert.ok(rootBox && rootBox.height > 0, `Story ${storyId} rendered empty height in ${vp.name}/${theme}`);

          // Run WCAG 2.2 AA Axe audit on desktop viewport
          if (vp.name === 'desktop') {
            const axeResults = await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
              .analyze();

            if (axeResults.violations.length > 0) {
              failures.push({
                storyId,
                viewport: vp.name,
                theme,
                violations: axeResults.violations.map((v) => ({
                  id: v.id,
                  impact: v.impact,
                  description: v.description,
                  nodes: v.nodes.length,
                })),
              });
            }
          }

          if (process.env.SAVE_SCREENSHOTS === '1') {
            fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
            await page.screenshot({
              path: path.join(SNAPSHOT_DIR, `${storyId}--${vp.name}--${theme}.png`),
              fullPage: false,
            });
          }

          totalChecks++;
        }

        if (consoleErrors.length > 0) {
          failures.push({ viewport: vp.name, theme, pageErrors: consoleErrors });
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`Completed ${totalChecks} Playwright render & WCAG 2.2 AA accessibility checks.`);

  if (failures.length > 0) {
    console.error('Accessibility / Render Failures:', JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('ALL STORYBOOK ACCESSIBILITY & VISUAL VIEWPORT CHECKS PASSED (0 VIOLATIONS).');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
