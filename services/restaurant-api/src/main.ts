import * as http from 'http';
import { handleRequest, closeRuntimeServer } from './http/server';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4010;
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

export const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err: any) => {
    console.error('Unhandled request processing error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: err?.message || 'Internal server error' }));
    }
  });
});

export function startServer(port: number = PORT, host: string = HOSTNAME): Promise<http.Server> {
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      console.log(`🍷 [RestaurantOS 2.x] Runtime Plane operational at http://${host}:${port}`);
      resolve(server);
    });
  });
}

async function handleShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 [RestaurantOS] ${signal} received. Initiating graceful shutdown...`);
  server.close(async () => {
    try {
      await closeRuntimeServer();
      console.log('✅ [RestaurantOS] Clean shutdown complete.');
      process.exit(0);
    } catch (err: any) {
      console.error('❌ [RestaurantOS] Error during shutdown:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('⚠️ [RestaurantOS] Forcefully terminating after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

