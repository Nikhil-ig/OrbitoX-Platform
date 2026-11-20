import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getChecklist,
  updateChecklistItem,
  getDefaultChecklistItems,
  type ChecklistItemId,
} from '@/server/onboarding/checklist-service';

describe('F6 Onboarding Setup Checklist & Activation Status', () => {
  const testTenantId = `tenant_f6_test_${Date.now()}`;

  it('provides the authoritative 5-item checklist defaults', () => {
    const defaults = getDefaultChecklistItems(12);
    assert.strictEqual(defaults.length, 5);
    const expectedIds: ChecklistItemId[] = ['qr', 'kds', 'staff', 'payment', 'printer'];
    assert.deepStrictEqual(
      defaults.map((i) => i.id),
      expectedIds,
    );
    for (const item of defaults) {
      assert.strictEqual(item.status, 'NOT_STARTED');
      assert.strictEqual(item.completed, false);
      assert.ok(item.statusNote);
    }
  });

  it('retrieves default checklist when no state has been persisted', async () => {
    const state = await getChecklist(testTenantId, 16);
    assert.strictEqual(state.tenantId, testTenantId);
    assert.strictEqual(state.totalCount, 5);
    assert.strictEqual(state.completedCount, 0);
    assert.strictEqual(state.allCompleted, false);
  });

  it('updates QR code item through its lifecycle with authentic evidence', async () => {
    // Stage 1: Download placard sheet
    const stage1 = await updateChecklistItem(testTenantId, {
      itemId: 'qr',
      status: 'ACTION_REQUIRED',
      statusNote: 'QR Sheet downloaded · Placement required',
      evidence: {
        artifactDownloaded: true,
        downloadedAt: new Date().toISOString(),
        tablesCount: 16,
      },
      actorId: 'usr_test_operator',
    });

    const qrItem1 = stage1.items.find((i) => i.id === 'qr');
    assert.ok(qrItem1);
    assert.strictEqual(qrItem1.status, 'ACTION_REQUIRED');
    assert.strictEqual(qrItem1.completed, false);
    assert.strictEqual(qrItem1.evidence?.artifactDownloaded, true);
    assert.strictEqual(qrItem1.evidence?.tablesCount, 16);

    // Stage 2: Physical placement confirmed
    const stage2 = await updateChecklistItem(testTenantId, {
      itemId: 'qr',
      status: 'COMPLETED',
      statusNote: 'QR placards placed on tables',
      evidence: {
        physicalPlacementConfirmed: true,
      },
      actorId: 'usr_test_operator',
    });

    const qrItem2 = stage2.items.find((i) => i.id === 'qr');
    assert.ok(qrItem2);
    assert.strictEqual(qrItem2.status, 'COMPLETED');
    assert.strictEqual(qrItem2.completed, true);
    assert.strictEqual(qrItem2.evidence?.physicalPlacementConfirmed, true);
    assert.strictEqual(qrItem2.evidence?.artifactDownloaded, true);
    assert.strictEqual(stage2.completedCount, 1);
  });

  it('updates KDS item distinguishing link verification from physical mounting', async () => {
    const stage1 = await updateChecklistItem(testTenantId, {
      itemId: 'kds',
      status: 'ACTION_REQUIRED',
      statusNote: 'Station link verified · Hardware placement required',
      evidence: {
        kdsStationId: 'station_main_kitchen',
        tasksCount: 4,
      },
    });

    const kds1 = stage1.items.find((i) => i.id === 'kds');
    assert.ok(kds1);
    assert.strictEqual(kds1.status, 'ACTION_REQUIRED');
    assert.strictEqual(kds1.completed, false);

    const stage2 = await updateChecklistItem(testTenantId, {
      itemId: 'kds',
      status: 'COMPLETED',
      statusNote: 'KDS station operational & mounted',
      evidence: {
        hardwareMounted: true,
      },
    });

    const kds2 = stage2.items.find((i) => i.id === 'kds');
    assert.ok(kds2);
    assert.strictEqual(kds2.status, 'COMPLETED');
    assert.strictEqual(kds2.completed, true);
    assert.strictEqual(kds2.evidence?.hardwareMounted, true);
  });

  it('records staff invitations with role and recipient evidence', async () => {
    const state = await updateChecklistItem(testTenantId, {
      itemId: 'staff',
      status: 'COMPLETED',
      statusNote: 'Invite dispatched to chef@restaurant.test (ADMIN)',
      evidence: {
        invitedEmail: 'chef@restaurant.test',
        invitedRole: 'ADMIN',
      },
      actorId: 'usr_owner',
    });

    const staffItem = state.items.find((i) => i.id === 'staff');
    assert.ok(staffItem);
    assert.strictEqual(staffItem.completed, true);
    assert.strictEqual(staffItem.evidence?.invitedEmail, 'chef@restaurant.test');
    assert.strictEqual(staffItem.evidence?.invitedRole, 'ADMIN');
  });

  it('records verified payment settlement evidence', async () => {
    const state = await updateChecklistItem(testTenantId, {
      itemId: 'payment',
      status: 'COMPLETED',
      statusNote: 'Preview test order submitted & settled (ord_test_882)',
      evidence: {
        orderId: 'ord_test_882',
        settledAmountMinor: 100,
        paymentMethod: 'UPI',
      },
    });

    const payItem = state.items.find((i) => i.id === 'payment');
    assert.ok(payItem);
    assert.strictEqual(payItem.completed, true);
    assert.strictEqual(payItem.evidence?.orderId, 'ord_test_882');
    assert.strictEqual(payItem.evidence?.settledAmountMinor, 100);
  });

  it('handles printer configuration with driver details and test print ID', async () => {
    const state = await updateChecklistItem(testTenantId, {
      itemId: 'printer',
      status: 'COMPLETED',
      statusNote: 'Printer connected (Epson ESC/POS @ 192.168.1.200:9100)',
      evidence: {
        printerDriver: 'epson_escpos',
        printerEndpoint: '192.168.1.200:9100',
        testPrintId: 'test_prn_99182',
      },
    });

    const printerItem = state.items.find((i) => i.id === 'printer');
    assert.ok(printerItem);
    assert.strictEqual(printerItem.completed, true);
    assert.strictEqual(printerItem.evidence?.printerDriver, 'epson_escpos');
    assert.strictEqual(printerItem.evidence?.testPrintId, 'test_prn_99182');

    // All 5 items completed
    assert.strictEqual(state.completedCount, 5);
    assert.strictEqual(state.allCompleted, true);
  });
});
