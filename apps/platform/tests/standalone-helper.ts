import crypto from 'node:crypto';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export async function terminateChildProcess(child?: ChildProcess | null, timeoutMs = 2000): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const pid = child.pid;
  if (!pid) return;

  const exitPromise = new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
  });

  try {
    process.kill(pid, 'SIGTERM');
  } catch (err: any) {
    if (err?.code === 'ESRCH') return;
  }

  const exited = await Promise.race([
    exitPromise.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ]);

  if (!exited) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch (err: any) {
      if (err?.code === 'ESRCH') return;
    }
    await Promise.race([
      exitPromise,
      new Promise<void>((resolve) => setTimeout(resolve, 1000)),
    ]);
  }
}

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
    env.ORBITOX_EMAIL_WEBHOOK_SECRET = `whsec_${crypto.randomBytes(24).toString('base64url')}`;
  }
  if (!env.RAZORPAY_KEY_ID || !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID)) {
    env.RAZORPAY_KEY_ID = `rzp_test_${crypto.randomBytes(8).toString('hex')}`;
  }
  if (!env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET.length < 32) {
    env.RAZORPAY_KEY_SECRET = crypto.randomBytes(24).toString('hex');
  }
  return env;
}
