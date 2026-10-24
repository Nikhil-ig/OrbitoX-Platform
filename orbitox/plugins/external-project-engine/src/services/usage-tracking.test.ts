import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  PersistentUsageStore,
  UsageTrackingService,
  isWindowExpired,
} from './usage-tracking.service.ts';
import type {
  IQuoteService,
  IRuntimeController,
} from './usage-tracking.service.ts';

function createTempStore(): { store: PersistentUsageStore; tempPath: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-usage-test-'));
  const tempPath = path.join(tempDir, 'platform-usage-store.json');
  const store = new PersistentUsageStore(tempPath);
  return { store, tempPath };
}

test('isWindowExpired: daily and monthly rollover calculation', () => {
  const Jan1_10AM = new Date('2026-01-01T10:00:00.000Z');
  const Jan1_11PM = new Date('2026-01-01T23:00:00.000Z');
  const Jan2_01AM = new Date('2026-01-02T01:00:00.000Z');
  const Feb1_10AM = new Date('2026-02-01T10:00:00.000Z');

  // 'never' window never expires
  assert.equal(isWindowExpired('never', Jan1_10AM, Feb1_10AM), false);

  // 'daily' window
  assert.equal(isWindowExpired('daily', Jan1_10AM, Jan1_11PM), false);
  assert.equal(isWindowExpired('daily', Jan1_10AM, Jan2_01AM), true);

  // 'monthly' window
  assert.equal(isWindowExpired('monthly', Jan1_10AM, Jan1_11PM), false);
  assert.equal(isWindowExpired('monthly', Jan1_10AM, Jan2_01AM), false);
  assert.equal(isWindowExpired('monthly', Jan1_10AM, Feb1_10AM), true);
});

test('PersistentUsageStore: increment persists across reads and disk reload', () => {
  const { store, tempPath } = createTempStore();

  const projectId = 'proj_alpha';
  const res1 = store.incrementUsage(projectId, 'api_calls', 5, 'monthly');
  assert.equal(res1.count, 5);
  assert.equal(res1.prevCount, 0);
  assert.equal(res1.resetOccurred, false);

  const res2 = store.incrementUsage(projectId, 'api_calls', 10, 'monthly');
  assert.equal(res2.count, 15);
  assert.equal(res2.prevCount, 5);

  const usage = store.getUsage(projectId, 'api_calls');
  assert.ok(usage);
  assert.equal(usage.count, 15);
  assert.equal(usage.window, 'monthly');

  // Force flush to disk
  store.saveImmediate();

  // Create a new store instance reading from the same file
  const reloadedStore = new PersistentUsageStore(tempPath);
  const reloadedUsage = reloadedStore.getUsage(projectId, 'api_calls');
  assert.ok(reloadedUsage);
  assert.equal(reloadedUsage.count, 15);
});

test('PersistentUsageStore: window reset zeroes count at the right time', () => {
  const { store } = createTempStore();
  const projectId = 'proj_reset_test';

  const day1 = new Date('2026-03-10T12:00:00.000Z');
  store.incrementUsage(projectId, 'daily_emails', 42, 'daily', day1);
  assert.equal(store.getUsage(projectId, 'daily_emails', day1)?.count, 42);

  // Same day later
  const day1Later = new Date('2026-03-10T22:00:00.000Z');
  store.incrementUsage(projectId, 'daily_emails', 8, 'daily', day1Later);
  assert.equal(store.getUsage(projectId, 'daily_emails', day1Later)?.count, 50);

  // Next calendar day in UTC
  const day2 = new Date('2026-03-11T02:00:00.000Z');
  const resNextDay = store.incrementUsage(projectId, 'daily_emails', 5, 'daily', day2);
  assert.equal(resNextDay.resetOccurred, true, 'Window reset must occur on day rollover');
  assert.equal(resNextDay.prevCount, 0, 'Previous count is treated as 0 after reset');
  assert.equal(resNextDay.count, 5, 'Count starts from the new increment after reset');

  // getProjectUsage also reflects reset
  const allUsage = store.getProjectUsage(projectId, day2);
  assert.equal(allUsage.daily_emails?.count, 5);
});

test('PersistentUsageStore: concurrent increments do not lose updates', async () => {
  const { store } = createTempStore();
  const projectId = 'proj_concurrency';

  const increments = 100;
  // Trigger 100 concurrent asynchronous increments
  await Promise.all(
    Array.from({ length: increments }).map(async (_, idx) => {
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      store.incrementUsage(projectId, 'api_calls', 1, 'monthly');
    })
  );

  const usage = store.getUsage(projectId, 'api_calls');
  assert.equal(usage?.count, increments, `Expected ${increments} total counts without loss`);
});

test('UsageTrackingService: quota enforcement and audit on first crossing', () => {
  const { store } = createTempStore();

  const mockQuoteService: IQuoteService = {
    getPlan: (id: string) => ({
      id,
      name: 'Starter Plan',
      tier: 'starter',
      basePriceMinor: '490000',
      currency: 'INR',
      billingInterval: 'monthly',
      features: ['dine_qr'],
      limits: {
        tables: { key: 'tables', name: 'Tables', limit: 15, enforced: true, unit: 'tables', window: 'never' },
        monthlyOrders: { key: 'monthlyOrders', name: 'Orders', limit: 3000, enforced: true, unit: 'orders', window: 'monthly' },
        api_calls: { key: 'api_calls', name: 'API Calls', limit: 10, enforced: true, unit: 'calls', window: 'monthly' },
      },
      addons: [],
    }),
    listPlans: () => [],
  };

  const audits: any[] = [];
  const desiredMap: Record<string, any> = {};
  const mockRuntimeController: IRuntimeController = {
    getProject: (id: string) => ({
      id,
      slug: 'quota-test',
      name: 'Quota Test',
      manifest: { planReferences: ['plan_restaurant_starter'] },
    }),
    getDesiredState: (id: string) => desiredMap[id] || {},
    recordAudit: (entry: any) => { audits.unshift(entry); },
    getAudits: (id?: string) => (id ? audits.filter((a) => a.projectId === id) : audits),
  };

  const service = new UsageTrackingService(store, mockQuoteService, mockRuntimeController);
  const projectId = 'proj_quota_test';

  // Override limit for api_calls to 10
  desiredMap[projectId] = {
    entitlements: {
      api_calls: { limit: 10, enforced: true },
    },
  };

  // Report 4 calls -> allowed: true
  const rep1 = service.reportUsage(projectId, 'api_calls', 4);
  assert.equal(rep1.used, 4);
  assert.equal(rep1.limit, 10);
  assert.equal(rep1.allowed, true);
  assert.equal(rep1.remaining, 6);
  assert.equal(rep1.firstExceeded, false);

  // Report 5 calls -> 9 total -> allowed: true
  const rep2 = service.reportUsage(projectId, 'api_calls', 5);
  assert.equal(rep2.used, 9);
  assert.equal(rep2.allowed, true);
  assert.equal(rep2.remaining, 1);
  assert.equal(rep2.firstExceeded, false);

  // Report 1 call -> 10 total -> hits limit -> allowed: false, firstExceeded: true
  const rep3 = service.reportUsage(projectId, 'api_calls', 1);
  assert.equal(rep3.used, 10);
  assert.equal(rep3.allowed, false, 'Hitting enforced limit must flip allowed to false');
  assert.equal(rep3.remaining, 0);
  assert.equal(rep3.firstExceeded, true, 'First crossing of enforced limit must flag firstExceeded');

  // Verify USAGE_LIMIT_EXCEEDED audit was recorded
  const auditList = mockRuntimeController.getAudits(projectId);
  const exceededAudit = auditList.find((a) => a.action === 'USAGE_LIMIT_EXCEEDED');
  assert.ok(exceededAudit, 'USAGE_LIMIT_EXCEEDED audit must be recorded');
  assert.equal(exceededAudit.status, 'DENIED');
  assert.equal(exceededAudit.details?.key, 'api_calls');
  assert.equal(exceededAudit.details?.used, 10);

  // Subsequent increment -> 11 total -> allowed: false, but firstExceeded: false (no audit spam!)
  const prevAuditCount = auditList.filter((a) => a.action === 'USAGE_LIMIT_EXCEEDED').length;
  const rep4 = service.reportUsage(projectId, 'api_calls', 1);
  assert.equal(rep4.used, 11);
  assert.equal(rep4.allowed, false);
  assert.equal(rep4.firstExceeded, false, 'Subsequent increments must not trigger firstExceeded audit');

  const newAuditCount = mockRuntimeController.getAudits(projectId).filter((a) => a.action === 'USAGE_LIMIT_EXCEEDED').length;
  assert.equal(newAuditCount, prevAuditCount, 'Audit trail must not be spammed on repeated exceeding calls');

  // Reset by admin
  service.resetUsage(projectId, 'api_calls');
  const repAfterReset = service.getProjectEntitlements(projectId);
  assert.equal(repAfterReset.api_calls?.used, 0);
});
