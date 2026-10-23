const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

/**
 * 🪐 RestaurantOS Test Harness: Ephemeral Server & Store Sandbox
 * ─────────────────────────────────────────────────────────────────────────────
 * Spawns an isolated ephemeral RestaurantOS server with its own temporary store and directory.
 * Guarantees zero pollution of data/restaurant-runtime-store.json or development runtime (port 4010).
 */
async function startIsolatedServer(options = {}) {
  const prefix = options.prefix || 'test';
  const port = options.port || (4080 + Math.floor(Math.random() * 100));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `restaurant-${prefix}-${Date.now()}-`));
  const storePath = path.join(tmpDir, 'restaurant-runtime-store.json');

  // Seed with baseline restaurant data from data/ directory
  const sourceStorePath = path.join(__dirname, '..', 'data', 'restaurant-runtime-store.json');
  if (fs.existsSync(sourceStorePath)) {
    fs.copyFileSync(sourceStorePath, storePath);
  }

  const url = `http://127.0.0.1:${port}`;

  const serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      RESTAURANT_STORE_PATH: storePath,
      NODE_ENV: 'test',
    },
    stdio: 'ignore',
  });

  // Wait for server readiness
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${url}/healthz/live`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!ready) {
    try { serverProcess.kill('SIGKILL'); } catch {}
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw new Error(`Isolated test server failed to start on ${url} within 8000ms`);
  }

  const activeHarnesses = new Set();

  const stop = async () => {
    activeHarnesses.delete(stop);
    try {
      serverProcess.kill('SIGKILL');
    } catch (e) {
      console.error('Failed to kill test server process:', e);
    }
    // Allow process to terminate and release file handles
    await new Promise((r) => setTimeout(r, 150));

    if (fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (rmErr) {
        console.error(`Cleanup error removing ${tmpDir}:`, rmErr);
      }
    }
    assert.strictEqual(fs.existsSync(tmpDir), false, `Isolated tmpDir ${tmpDir} must be cleanly removed`);
  };

  activeHarnesses.add(stop);

  // Global exit fallback in case test terminates abruptly
  process.once('exit', () => {
    try { serverProcess.kill('SIGKILL'); } catch {}
    try { if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  return {
    url,
    port,
    storePath,
    tmpDir,
    serverProcess,
    stop,
  };
}

module.exports = {
  startIsolatedServer,
};
