import fs from 'node:fs';
import path from 'node:path';

export function getStandaloneScript(testDir: string): string {
  const candidates: string[] = [
    path.resolve(testDir, '../.next/standalone/apps/platform/server.js'),
    path.resolve(testDir, '../.next/standalone/apps/web/server.js'),
    path.resolve(testDir, '../../.next/standalone/apps/platform/server.js'),
    path.resolve(testDir, '../../.next/standalone/apps/web/server.js'),
  ];
  const found = candidates.find(fs.existsSync);
  return found ?? candidates[0] ?? '';
}

export function getStandaloneCwd(testDir: string): string {
  const candidates: string[] = [
    path.resolve(testDir, '../.next/standalone/apps/platform'),
    path.resolve(testDir, '../.next/standalone/apps/web'),
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
  return env;
}
