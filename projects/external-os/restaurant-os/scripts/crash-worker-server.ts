/**
 * 🍷 RestaurantOS Crash Durability Worker Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Spawns an ephemeral RestaurantOS instance on port 0 for crash testing.
 * Outputs `PORT_READY:<port>` when HTTP listener is ready.
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.RESTAURANTOS_DISABLE_AUTOLISTEN = 'true';
if (!process.env.DATABASE_URL) {
  if (process.env.CI) {
    throw new Error('DATABASE_URL environment variable is required in CI.');
  }
  process.env.DATABASE_URL = 'postgresql://apple@localhost:5432/restaurant_os';
}

import * as http from 'http';

async function main() {
  const { handleRequest } = await import('../src/server');
  const server = http.createServer(handleRequest);

  server.listen(0, '127.0.0.1', () => {
    const addr = server.address() as any;
    console.log(`PORT_READY:${addr.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
