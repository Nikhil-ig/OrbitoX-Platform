import fs from 'node:fs';
import path from 'node:path';

export function getStandaloneScript(testDir: string): string {
  const candidates: string[] = [
    path.resolve(testDir, '../.next/standalone/apps/platform/server.js'),
    path.resolve(testDir, '../.next/standalone/apps/web/server.js'),
    path.resolve(testDir, '../../.next/standalone/apps/platform/server.js'),
    path.resolve(testDir, '../../.next/standalone/apps/web/server.js'),
    path.resolve(testDir, '../../../.next/standalone/apps/platform/server.js'),
    path.resolve(testDir, '../../../.next/standalone/apps/web/server.js'),
    path.resolve(process.cwd(), '.next/standalone/apps/platform/server.js'),
    path.resolve(process.cwd(), 'apps/platform/.next/standalone/apps/platform/server.js'),
  ];
  const found = candidates.find(fs.existsSync);
  return found ?? candidates[0] ?? '';
}

export function getStandaloneCwd(testDir: string): string {
  const candidates: string[] = [
    path.resolve(testDir, '../.next/standalone/apps/platform'),
    path.resolve(testDir, '../.next/standalone/apps/web'),
    path.resolve(testDir, '../../.next/standalone/apps/platform'),
    path.resolve(testDir, '../../.next/standalone/apps/web'),
    path.resolve(testDir, '../../../.next/standalone/apps/platform'),
    path.resolve(testDir, '../../../.next/standalone/apps/web'),
    path.resolve(process.cwd(), '.next/standalone/apps/platform'),
    path.resolve(process.cwd(), 'apps/platform/.next/standalone/apps/platform'),
    path.resolve(testDir, '..'),
  ];
  const found = candidates.find(fs.existsSync);
  return found ?? candidates[0] ?? path.resolve(testDir, '..');
}

export function createCleanStandaloneEnv(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...baseEnv };
  if (env.NODE_OPTIONS) {
    env.NODE_OPTIONS = env.NODE_OPTIONS.replace(/--conditions=react-server/g, '').trim();
    if (!env.NODE_OPTIONS) {
      delete env.NODE_OPTIONS;
    }
  }
  delete env.ORBITOX_ENABLE_DEMO_SEED;
  delete env.ALLOW_UNAUTHENTICATED_DEV_MODE;
  if (!env.ORBITOX_EMAIL_WEBHOOK_SECRET) {
    env.ORBITOX_EMAIL_WEBHOOK_SECRET = 'whsec_test_fallback_whsec_secret_12345';
  }
  if (!env.RAZORPAY_KEY_ID || !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID)) {
    env.RAZORPAY_KEY_ID = 'rzp_test_FallbackKey12345';
  }
  if (!env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET.length < 32) {
    env.RAZORPAY_KEY_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef';
  }
  return env;
}
