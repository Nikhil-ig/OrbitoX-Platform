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
