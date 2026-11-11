/**
 * 🍷 RestaurantOS API — Bootstrap & Runtime Entrypoint
 */

import { createServer } from './http/server';
import {
  PORT,
  HOSTNAME,
  isProductionEnvironment,
  postgresStore,
  runtimeController,
  assertRestaurantOsProductionConfig,
} from './shared/state';
import { runDatabaseSecuritySelfCheck, logger } from '../packages/domain';

if (isProductionEnvironment) {
  assertRestaurantOsProductionConfig(process.env);
}

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DANGEROUS_RESET === 'true') {
  console.error('🚨 [SECURITY FATAL] Dangerous reset flags cannot be enabled in production mode! Halting startup.');
  process.exit(1);
}

export const server = createServer();

if (
  process.env.RESTAURANTOS_DISABLE_AUTOLISTEN !== 'true' &&
  !process.argv.includes('--test')
) {
  server.listen(PORT, HOSTNAME, async () => {
    if (postgresStore?.prisma) {
      try {
        console.log('🔒 Executing Database Security Self-Check (RLS & non-superuser role enforcement)...');
        const checkResult = await runDatabaseSecuritySelfCheck(postgresStore.prisma, {
          isProduction: process.env.NODE_ENV === 'production',
        });
        if (!checkResult.ok && process.env.NODE_ENV === 'production') {
          console.error('🚨 [DATABASE SECURITY FAILED] RLS self-check failed in production! Halting startup.', checkResult.errors);
          process.exit(1);
        }
      } catch (checkErr: any) {
        if (process.env.NODE_ENV === 'production') {
          console.error('🚨 [DATABASE SECURITY FATAL] Error running security self-check:', checkErr.message);
          process.exit(1);
        } else {
          console.warn('⚠️ [Storage] Database security self-check deferred in non-prod:', checkErr.message);
        }
      }
    }

    console.log(`\n🍷 =========================================================`);
    console.log(`🍷  RestaurantOS 2.x (Hospitality Runtime Plane) Active`);
    console.log(`🍷  Operations Command: http://localhost:${PORT}/`);
    console.log(`🍷  Spatial Floor Studio: http://localhost:${PORT}/operations/floor`);
    console.log(`🍷  Tables Fleet: http://localhost:${PORT}/operations/tables`);
    console.log(`🍷  Branches Management: http://localhost:${PORT}/operations/locations`);
    console.log(`🍷  Floor Plans: http://localhost:${PORT}/operations/floors`);
    console.log(`🍷  Kitchen KDS: http://localhost:${PORT}/kds`);
    console.log(`🍷  Diner Mobile PWA: http://localhost:${PORT}/dine/7Kp9xQ8m2L`);
    console.log(`🍷  Developer Inspector: http://localhost:${PORT}/developer/inspector`);
    console.log(`🍷  Realtime SSE Gateway: http://localhost:${PORT}/api/restaurant/events`);
    console.log(`🍷 =========================================================\n`);

    await runtimeController.start();
  });
}
