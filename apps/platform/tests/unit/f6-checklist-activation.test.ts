import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getChecklist,
  updateChecklistItem,
  getDefaultChecklistItems,
  recordQrDownloaded,
  recordQrPlacementAttestation,
  recordKdsVerified,
  recordKdsMountedAttestation,
  recordPreviewPaymentSettled,
  recordLiveGatewayVerified,
  recordPrinterConfigured,
  recordPrinterPending,
  ChecklistConcurrencyError,
  InvalidChecklistTransitionError,
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

  it('rejects fabricated completion without required evidence or attestation', async () => {
    const freshTenantId = `tenant_f6_guard_${Date.now()}`;
    await assert.rejects(
      async () => {
        await updateChecklistItem(freshTenantId, {
          itemId: 'qr',
          status: 'COMPLETED',
          statusNote: 'Fabricated complete',
        });
      },
      (err: any) => {
        assert.ok(err instanceof InvalidChecklistTransitionError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
    );

    await assert.rejects(
      async () => {
        await recordQrPlacementAttestation(freshTenantId, 'usr_fake');
      },
      (err: any) => {
        assert.ok(err instanceof InvalidChecklistTransitionError);
        return true;
      },
    );
  });

  it('enforces optimistic concurrency versioning on checklist updates', async () => {
    const casTenantId = `tenant_f6_cas_${Date.now()}`;
    const initial = await getChecklist(casTenantId);
    assert.strictEqual(initial.version, 1);

    const updated = await recordQrDownloaded(casTenantId, 'usr_op_1', 12, 1);
    assert.strictEqual(updated.version, 2);

    // Stale expectedVersion=1 must be rejected
    await assert.rejects(
      async () => {
        await recordQrDownloaded(casTenantId, 'usr_op_2', 12, 1);
      },
      (err: any) => {
        assert.ok(err instanceof ChecklistConcurrencyError);
        assert.strictEqual(err.statusCode, 409);
        return true;
      },
    );

    // Matching expectedVersion=2 must succeed and increment to 3
    const v3 = await recordQrPlacementAttestation(casTenantId, 'usr_op_1', 2);
    assert.strictEqual(v3.version, 3);
  });

  it('distinguishes preview order settlement from live gateway reconciliation', async () => {
    const payTenantId = `tenant_f6_pay_${Date.now()}`;
    // Stage 1: Preview order settlement
    const previewState = await recordPreviewPaymentSettled(payTenantId, 'usr_tester', 'ord_preview_123', 100, 'UPI');
    const payItem1 = previewState.items.find((i) => i.id === 'payment');
    assert.ok(payItem1);
    assert.strictEqual(payItem1.status, 'ACTION_REQUIRED');
    assert.strictEqual(payItem1.completed, false);
    assert.strictEqual(payItem1.evidence?.previewOrderId, 'ord_preview_123');
    assert.ok(payItem1.statusNote.includes('Preview test order settled'));

    // Stage 2: Live gateway verification
    const liveState = await recordLiveGatewayVerified(payTenantId, 'usr_tester', 'pay_live_999', 'UPI');
    const payItem2 = liveState.items.find((i) => i.id === 'payment');
    assert.ok(payItem2);
    assert.strictEqual(payItem2.status, 'COMPLETED');
    assert.strictEqual(payItem2.completed, true);
    assert.strictEqual(payItem2.evidence?.gatewayTransactionId, 'pay_live_999');
  });

  it('supports truthful printer hardware pending state without synthetic IDs', async () => {
    const prnTenantId = `tenant_f6_prn_${Date.now()}`;
    const state = await recordPrinterPending(prnTenantId, 'usr_op', {
      driver: 'epson_escpos',
      endpoint: '192.168.1.200:9100',
    });
    const prnItem = state.items.find((i) => i.id === 'printer');
    assert.ok(prnItem);
    assert.strictEqual(prnItem.status, 'UNAVAILABLE');
    assert.strictEqual(prnItem.completed, false);
    assert.strictEqual(prnItem.evidence?.hardwarePending, true);
    assert.strictEqual(prnItem.evidence?.testPrintId, undefined);
  });
});
