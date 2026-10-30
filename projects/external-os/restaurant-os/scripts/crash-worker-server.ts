/**
 * 🍷 RestaurantOS Crash Durability Worker Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Spawns an ephemeral RestaurantOS instance on port 0 for crash testing.
 * Outputs `PORT_READY:<port>` when HTTP listener is ready.
 */

process.env.RESTAURANTOS_DISABLE_AUTOLISTEN = 'true';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://apple@localhost:5432/restaurant_os';
}

import * as http from 'http';
import { handleRequest } from '../src/server';

const server = http.createServer(handleRequest);

server.listen(0, '127.0.0.1', () => {
  const addr = server.address() as any;
  console.log(`PORT_READY:${addr.port}`);
});
