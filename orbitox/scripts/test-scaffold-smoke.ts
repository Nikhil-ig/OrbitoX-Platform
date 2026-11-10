import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { execSync, spawn, ChildProcess } from 'child_process';

console.log('======================================================================');
console.log('🚀 OrbitoX Scaffold & Multi-Template End-to-End Smoke Test');
console.log('======================================================================');

const REPO_ROOT = path.resolve(__dirname, '..');
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-scaffold-e2e-'));
const TARBALL_DIR = path.join(TEMP_ROOT, 'tarballs');
fs.mkdirSync(TARBALL_DIR, { recursive: true });

function cleanup() {
  console.log(`\n🧹 Cleaning up temporary test sandbox: ${TEMP_ROOT}...`);
  try {
    fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup error
  }
}

process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ ${message}`);
}

function makeHttpRequest(
  port: number,
  method: string,
  urlPath: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const reqHeaders: Record<string, string> = { ...headers };
    let buffer: Buffer | null = null;

    if (body !== undefined) {
      const data = typeof body === 'string' ? body : JSON.stringify(body);
      buffer = Buffer.from(data, 'utf8');
      if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(buffer.length);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let parsed: any = null;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed, raw });
        });
      }
    );

    req.on('error', reject);
    if (buffer) req.write(buffer);
    req.end();
  });
}

async function waitForHealth(port: number, timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await makeHttpRequest(port, 'GET', '/health');
      if (res.status === 200) return;
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for server on port ${port} to become healthy.`);
}

async function run() {
  try {
    // -------------------------------------------------------------------------
    // Step 1: Pack foundational packages into TARBALL_DIR
    // -------------------------------------------------------------------------
    console.log('\n[1/4] Packing local @orbitox-io/* packages for clean offline installation...');
    const PACKAGES = [
      'packages/types',
      'packages/utils',
      'packages/core',
      'packages/sdk',
      'packages/ui',
      'packages/external-runtime-sdk',
      'packages/plugin-engine',
      'packages/runtime',
      'plugins/pos',
      'tools/cli',
    ];

    for (const pkg of PACKAGES) {
      execSync(`pnpm pack --pack-destination "${TARBALL_DIR}"`, {
        cwd: path.join(REPO_ROOT, pkg),
        stdio: 'ignore',
      });
    }
    console.log(`  ✅ Successfully packed ${PACKAGES.length} packages into tarball cache.`);

    const cliBin = path.join(REPO_ROOT, 'tools/cli/dist/bin.js');

    // -------------------------------------------------------------------------
    // Step 2: Test Template 1 - Restaurant SaaS (my-cafe)
    // -------------------------------------------------------------------------
    console.log('\n[2/4] Testing Template 1: Restaurant SaaS (my-cafe)...');
    const cafeDir = path.join(TEMP_ROOT, 'my-cafe');
    execSync(`node "${cliBin}" create my-cafe --template=restaurant --install-mode=file --pack-dir="${TARBALL_DIR}" --skip-install`, {
      cwd: TEMP_ROOT,
      stdio: 'pipe',
    });

    assert(fs.existsSync(path.join(cafeDir, 'orbitox.config.ts')), 'my-cafe: orbitox.config.ts created');
    assert(fs.existsSync(path.join(cafeDir, 'docker-compose.yml')), 'my-cafe: docker-compose.yml created');
    assert(fs.existsSync(path.join(cafeDir, 'package.json')), 'my-cafe: package.json created');
    assert(fs.existsSync(path.join(cafeDir, 'src/main.ts')), 'my-cafe: src/main.ts created');

    console.log('  -> Installing dependencies into my-cafe...');
    execSync('npm install --no-audit --no-fund', { cwd: cafeDir, stdio: 'pipe' });

    console.log('  -> Verifying TypeScript build for my-cafe...');
    execSync('npm run build', { cwd: cafeDir, stdio: 'inherit' });
    console.log('  ✅ my-cafe TypeScript compilation passed cleanly.');

    console.log('  -> Booting my-cafe runtime on port 4050...');
    const cafePort = 4050;
    const cafeProc: ChildProcess = spawn('npx', ['-y', 'tsx', 'src/main.ts'], {
      cwd: cafeDir,
      env: {
        ...process.env,
        PORT: String(cafePort),
        NODE_ENV: 'test',
        ORBITOX_TEST_MODE: '0',
      },
      stdio: 'pipe',
    });
    cafeProc.stdout?.pipe(process.stdout);
    cafeProc.stderr?.pipe(process.stderr);

    try {
      await waitForHealth(cafePort);
      console.log('  ✅ my-cafe /health endpoint is responding 200 UP.');

      // Place an order as tenant "tenant_artisan_cafe"
      console.log('  -> Placing test order through composed @orbitox/pos engine...');
      const orderRes = await makeHttpRequest(
        cafePort,
        'POST',
        '/api/pos/orders',
        {
          'x-tenant-id': 'tenant_artisan_cafe',
          Authorization: 'Bearer test_staff_jwt_token_123',
        },
        {
          tableNumber: 4,
          items: [
            { id: 'item_cold_brew', name: 'Nitro Cold Brew', priceMinor: 45000, quantity: 2 },
            { id: 'item_croissant', name: 'Almond Croissant', priceMinor: 35000, quantity: 1 },
          ],
        }
      );

      assert(orderRes.status === 201, `my-cafe order returned 201 Created (got: ${orderRes.status})`);
      assert(Boolean(orderRes.body.orderId), 'my-cafe order response includes orderId');
      assert(orderRes.body.quote.taxMinor === 6250, `my-cafe quote includes calculated 5% GST (got: ${orderRes.body.quote.taxMinor})`);
      assert(orderRes.body.quote.totalMinor === 131250, `my-cafe quote matches 125000 + 6250 = 131250 (got: ${orderRes.body.quote.totalMinor})`);
      assert(Array.isArray(orderRes.body.kitchenTasks), 'my-cafe dispatched kitchen DAG tasks');
      console.log(`  ✅ Restaurant order placed successfully: ID=${orderRes.body.orderId}, Total=₹${(orderRes.body.quote.totalMinor / 100).toFixed(2)}`);
    } finally {
      cafeProc.kill();
    }

    // -------------------------------------------------------------------------
    // Step 3: Test Template 2 - HospitalOS SaaS (my-hms)
    // -------------------------------------------------------------------------
    console.log('\n[3/3] Testing Template 2: HospitalOS SaaS (my-hms)...');
    const hmsDir = path.join(TEMP_ROOT, 'my-hms');
    execSync(`node "${cliBin}" create my-hms --template=hms --install-mode=file --pack-dir="${TARBALL_DIR}" --skip-install`, {
      cwd: TEMP_ROOT,
      stdio: 'pipe',
    });

    assert(fs.existsSync(path.join(hmsDir, 'orbitox.config.ts')), 'my-hms: orbitox.config.ts created');
    assert(fs.existsSync(path.join(hmsDir, 'docker-compose.yml')), 'my-hms: docker-compose.yml created');
    assert(fs.existsSync(path.join(hmsDir, 'package.json')), 'my-hms: package.json created');
    assert(fs.existsSync(path.join(hmsDir, 'src/main.ts')), 'my-hms: src/main.ts created');

    console.log('  -> Installing dependencies into my-hms...');
    execSync('npm install --no-audit --no-fund', { cwd: hmsDir, stdio: 'pipe' });

    console.log('  -> Verifying TypeScript build for my-hms...');
    execSync('npm run build', { cwd: hmsDir, stdio: 'inherit' });
    console.log('  ✅ my-hms TypeScript compilation passed cleanly.');

    // -------------------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('🎉 ALL SCAFFOLDING & COMPOSABILITY SMOKE TESTS PASSED 100%!');
    console.log('   - Template [restaurant]: Composes @orbitox/pos + tenancy + order lifecycle');
    console.log('   - Template [hms]:        Composes HospitalOS config + tenancy');
    console.log('======================================================================\n');
  } finally {
    cleanup();
  }
}

run()
  .then(() => process.exit(0)) // spawned `npx tsx` children keep the event loop alive; exit explicitly
  .catch((err) => {
  console.error('\n💥 FATAL SCAFFOLD SMOKE FAILURE:', err);
  cleanup();
  process.exit(1);
  });
