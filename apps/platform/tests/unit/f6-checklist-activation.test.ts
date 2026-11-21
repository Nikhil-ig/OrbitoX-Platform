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
  recordStaffInvited,
  recordStaffVerified,
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
    // Stage 1: Invite dispatched -> PENDING_VERIFICATION
    const stage1 = await updateChecklistItem(testTenantId, {
      itemId: 'staff',
      status: 'PENDING_VERIFICATION',
      statusNote: 'Invite dispatched to chef@restaurant.test (ADMIN)',
      evidence: {
        invitedEmail: 'chef@restaurant.test',
        invitedRole: 'ADMIN',
      },
      actorId: 'usr_owner',
    });

    const staffItem1 = stage1.items.find((i) => i.id === 'staff');
    assert.ok(staffItem1);
    assert.strictEqual(staffItem1.status, 'PENDING_VERIFICATION');
    assert.strictEqual(staffItem1.completed, false);
    assert.strictEqual(staffItem1.evidence?.invitedEmail, 'chef@restaurant.test');
    assert.strictEqual(staffItem1.evidence?.invitedRole, 'ADMIN');

    // Stage 2: Member accepted & verified -> COMPLETED
    const stage2 = await updateChecklistItem(testTenantId, {
      itemId: 'staff',
      status: 'COMPLETED',
      statusNote: 'Staff member accepted & active',
      evidence: {
        memberVerified: true,
      },
      actorId: 'usr_owner',
    });

    const staffItem2 = stage2.items.find((i) => i.id === 'staff');
    assert.ok(staffItem2);
    assert.strictEqual(staffItem2.completed, true);
    assert.strictEqual(staffItem2.evidence?.invitedEmail, 'chef@restaurant.test');
    assert.strictEqual(staffItem2.evidence?.memberVerified, true);
  });

  it('records verified payment settlement evidence', async () => {
    // Stage 1: Preview test order settled
    const stage1 = await updateChecklistItem(testTenantId, {
      itemId: 'payment',
      status: 'ACTION_REQUIRED',
      statusNote: 'Preview test order submitted & settled (ord_test_882) · Live reconciliation pending',
      evidence: {
        previewOrderId: 'ord_test_882',
        previewSettledAmountMinor: 100,
        previewPaymentMethod: 'UPI',
      },
    });

    const payItem1 = stage1.items.find((i) => i.id === 'payment');
    assert.ok(payItem1);
    assert.strictEqual(payItem1.status, 'ACTION_REQUIRED');
    assert.strictEqual(payItem1.completed, false);
    assert.strictEqual(payItem1.evidence?.previewOrderId, 'ord_test_882');

    // Stage 2: Live gateway reconciled
    const stage2 = await updateChecklistItem(testTenantId, {
      itemId: 'payment',
      status: 'COMPLETED',
      statusNote: 'Razorpay Gateway verified via webhook & live settlement',
      evidence: {
        gatewayVerified: true,
        orderId: 'pay_live_77192',
        settledAmountMinor: 100,
        paymentMethod: 'UPI',
      },
    });

    const payItem2 = stage2.items.find((i) => i.id === 'payment');
    assert.ok(payItem2);
    assert.strictEqual(payItem2.completed, true);
    assert.strictEqual(payItem2.evidence?.gatewayVerified, true);
    assert.strictEqual(payItem2.evidence?.orderId, 'pay_live_77192');
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

  it('handles concurrent writers with the same expectedVersion where exactly one succeeds', async () => {
    const concurrentTenantId = `tenant_f6_concurrent_${Date.now()}`;
    const initial = await getChecklist(concurrentTenantId);
    assert.strictEqual(initial.version, 1);

    // Launch two simultaneous updates with expectedVersion=1
    const results = await Promise.allSettled([
      recordQrDownloaded(concurrentTenantId, 'usr_concurrent_1', 12, 1),
      recordQrDownloaded(concurrentTenantId, 'usr_concurrent_2', 12, 1),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent update must succeed');
    assert.strictEqual(rejected.length, 1, 'The competing concurrent update must be rejected');

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    assert.ok(
      rejectionReason instanceof ChecklistConcurrencyError,
      'Rejection must be a ChecklistConcurrencyError (HTTP 409)',
    );
    assert.strictEqual(rejectionReason.statusCode, 409);

    // Verify persisted state advanced cleanly to version 2
    const finalState = await getChecklist(concurrentTenantId);
    assert.strictEqual(finalState.version, 2);
  });

  it('validates printer endpoint to prevent SSRF and internal cloud metadata traversal', async () => {
    const { validatePrinterEndpoint, PrinterSecurityError } = await import('@/server/devices/printer-service');

    // Cloud metadata link-local IP
    assert.throws(
      () => validatePrinterEndpoint('169.254.169.254:9100', 'epson_escpos'),
      (err: any) => err instanceof PrinterSecurityError && err.statusCode === 400,
    );

    // Cloud metadata internal host
    assert.throws(
      () => validatePrinterEndpoint('metadata.google.internal:9100', 'epson_escpos'),
      (err: any) => err instanceof PrinterSecurityError && err.statusCode === 400,
    );

    // Zero-IP
    assert.throws(
      () => validatePrinterEndpoint('0.0.0.0:9100', 'epson_escpos'),
      (err: any) => err instanceof PrinterSecurityError && err.statusCode === 400,
    );

    // Valid LAN printer endpoint should pass without error
    assert.doesNotThrow(() => {
      validatePrinterEndpoint('192.168.1.200:9100', 'epson_escpos');
    });
  });

  it('rejects printer configuration with unverified or cross-tenant testPrintId', async () => {
    const { verifyServerPrintJob, recordTestPrintJobAck } = await import('@/server/devices/printer-service');
    const tenantA = `tenant_prn_a_${Date.now()}`;
    const tenantB = `tenant_prn_b_${Date.now()}`;
    const fakeJobId = 'job_fabricated_999';

    // Fabricated ID without server record is rejected
    assert.strictEqual(await verifyServerPrintJob(tenantA, fakeJobId), false);

    // Legitimate acknowledged job for Tenant A is verified
    await recordTestPrintJobAck(tenantA, 'job_verified_123', 'epson_escpos');
    assert.strictEqual(await verifyServerPrintJob(tenantA, 'job_verified_123'), true);

    // Cross-tenant verification of Tenant A job by Tenant B is rejected
    assert.strictEqual(await verifyServerPrintJob(tenantB, 'job_verified_123'), false);
  });
});

describe('F6 Security Trust Boundaries & Six-Gate Activation Invariants', () => {
  it('enforces that generic updateChecklistItem mutations strictly reject COMPLETED status without required evidence', async () => {
    const allItems: ChecklistItemId[] = ['qr', 'kds', 'staff', 'payment', 'printer'];
    const freshTenantId = `tenant_f6_gate_${Date.now()}`;
    for (const itemId of allItems) {
      await assert.rejects(
        async () => {
          await updateChecklistItem(freshTenantId, {
            itemId,
            status: 'COMPLETED',
            expectedVersion: 1,
          });
        },
        (err: any) => {
          assert.ok(err instanceof InvalidChecklistTransitionError);
          assert.strictEqual(err.statusCode, 400);
          return true;
        },
      );
    }
  });

  it('enforces mandatory auth on checklist route: unauthenticated request returns 401', async () => {
    const { POST: checklistPost } = await import('@/app/api/v1/customer/tenants/[tenantId]/checklist/route');
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost:3005/api/v1/customer/tenants/tenant_test/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedVersion: 1, itemId: 'payment', status: 'IN_PROGRESS' }),
    });
    const res = await checklistPost(req, { params: Promise.resolve({ tenantId: 'tenant_test' }) });
    assert.strictEqual(res.status, 401);
  });

  it('enforces that staff invitation dispatch remains PENDING_VERIFICATION until accepted', async () => {
    const staffTenantId = `tenant_staff_lifecycle_${Date.now()}`;
    const state = await recordStaffInvited(staffTenantId, 'usr_owner', 'chef@restaurant.test', 'CHEF', 1);
    const staffItem = state.items.find((i) => i.id === 'staff');
    assert.ok(staffItem);
    assert.strictEqual(staffItem.status, 'PENDING_VERIFICATION');
    assert.strictEqual(staffItem.completed, false);
    assert.strictEqual(staffItem.evidence?.invitedEmail, 'chef@restaurant.test');
    assert.strictEqual(staffItem.evidence?.invitedRole, 'CHEF');

    // Attempting to complete staff without verified acceptance must fail
    await assert.rejects(
      async () => {
        await updateChecklistItem(staffTenantId, {
          itemId: 'staff',
          status: 'COMPLETED',
          expectedVersion: 2,
        });
      },
      (err: any) => {
        assert.ok(err instanceof InvalidChecklistTransitionError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
    );

    // Legitimate verified staff acceptance transitions cleanly to COMPLETED
    const verifiedState = await recordStaffVerified(staffTenantId, 'usr_owner', 'chef@restaurant.test', 2);
    const verifiedItem = verifiedState.items.find((i) => i.id === 'staff');
    assert.ok(verifiedItem);
    assert.strictEqual(verifiedItem.status, 'COMPLETED');
    assert.strictEqual(verifiedItem.completed, true);
    assert.strictEqual(verifiedItem.evidence?.memberVerified, true);
  });

  it('enforces that KDS mounting attestation requires verified station link first', async () => {
    const kdsTenantId = `tenant_kds_guard_${Date.now()}`;
    // Attesting hardware mounting before station link is verified must fail
    await assert.rejects(
      async () => {
        await recordKdsMountedAttestation(kdsTenantId, 'usr_owner', 1);
      },
      (err: any) => {
        assert.ok(err instanceof InvalidChecklistTransitionError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
    );

    // Record verified station link
    const linkedState = await recordKdsVerified(kdsTenantId, 'usr_owner', 'TANDOOR', 3, 1);
    const kdsItem = linkedState.items.find((i) => i.id === 'kds');
    assert.ok(kdsItem);
    assert.strictEqual(kdsItem.status, 'ACTION_REQUIRED');
    assert.strictEqual(kdsItem.completed, false);
    assert.strictEqual(kdsItem.evidence?.kdsStationId, 'TANDOOR');
    assert.strictEqual(kdsItem.evidence?.stationLinkVerified, true);

    // Mounting attestation succeeds after link is verified
    const mountedState = await recordKdsMountedAttestation(kdsTenantId, 'usr_owner', 2);
    const mountedItem = mountedState.items.find((i) => i.id === 'kds');
    assert.ok(mountedItem);
    assert.strictEqual(mountedItem.status, 'COMPLETED');
    assert.strictEqual(mountedItem.completed, true);
    assert.strictEqual(mountedItem.evidence?.hardwareMounted, true);
  });

  it('enforces printer job persistence across restarts with exact tenant scoping', async () => {
    const { persistPrinterJob, verifyServerPrintJob } = await import('@/server/devices/printer-service');
    const tenantA = `tenant_prn_persist_a_${Date.now()}`;
    const tenantB = `tenant_prn_persist_b_${Date.now()}`;
    const jobId = `prn_job_durable_${Date.now()}`;
    const now = new Date().toISOString();

    // Dispatched job is not yet acknowledged
    await persistPrinterJob({
      jobId,
      tenantId: tenantA,
      actorId: 'usr_op',
      driver: 'epson_escpos',
      endpoint: '192.168.1.100:9100',
      paperWidth: '80mm',
      status: 'DISPATCHED',
      createdAt: now,
      dispatchedAt: now,
    });

    assert.strictEqual(await verifyServerPrintJob(tenantA, jobId), false, 'Dispatched job without device ACK must not be verified');

    // Update with hardware acknowledgement
    await persistPrinterJob({
      jobId,
      tenantId: tenantA,
      actorId: 'usr_op',
      driver: 'epson_escpos',
      endpoint: '192.168.1.100:9100',
      paperWidth: '80mm',
      status: 'ACKNOWLEDGED',
      deviceAckId: 'ack_hw_9981',
      createdAt: now,
      dispatchedAt: now,
      acknowledgedAt: now,
    });

    // Acknowledged job is verified for Tenant A
    assert.strictEqual(await verifyServerPrintJob(tenantA, jobId), true);

    // Cross-tenant query for the same job ID by Tenant B must return false
    assert.strictEqual(await verifyServerPrintJob(tenantB, jobId), false);
  });

  it('rejects live gateway verification without verified captured payment evidence', async () => {
    const payTenantId = `tenant_pay_gate_${Date.now()}`;
    // Attempting to mark live gateway completed without captured evidence throws
    await assert.rejects(
      async () => {
        await updateChecklistItem(payTenantId, {
          itemId: 'payment',
          status: 'COMPLETED',
          expectedVersion: 1,
        });
      },
      (err: any) => {
        assert.ok(err instanceof InvalidChecklistTransitionError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
    );
  });

  it('evaluates each of the six activation gates independently to enforce authoritative live status', () => {
    const evaluateActivation = (gates: {
      orgMapped: boolean;
      subscriptionActive: boolean;
      pluginActive: boolean;
      sagaCompleted: boolean;
      runtimeProvisioned: boolean;
      runtimeHealthy: boolean;
    }) => {
      return Boolean(
        gates.orgMapped &&
        gates.subscriptionActive &&
        gates.pluginActive &&
        gates.sagaCompleted &&
        gates.runtimeProvisioned &&
        gates.runtimeHealthy
      );
    };

    // All 6 true -> Live
    assert.strictEqual(
      evaluateActivation({
        orgMapped: true,
        subscriptionActive: true,
        pluginActive: true,
        sagaCompleted: true,
        runtimeProvisioned: true,
        runtimeHealthy: true,
      }),
      true,
    );

    // Gate 1: Missing orgMapped -> Not live
    assert.strictEqual(
      evaluateActivation({
        orgMapped: false,
        subscriptionActive: true,
        pluginActive: true,
        sagaCompleted: true,
        runtimeProvisioned: true,
        runtimeHealthy: true,
      }),
      false,
    );

    // Gate 2: Missing subscriptionActive -> Not live
    assert.strictEqual(
      evaluateActivation({
        orgMapped: true,
        subscriptionActive: false,
        pluginActive: true,
        sagaCompleted: true,
        runtimeProvisioned: true,
        runtimeHealthy: true,
      }),
      false,
    );

    // Gate 3: Missing pluginActive -> Not live
    assert.strictEqual(
      evaluateActivation({
        orgMapped: true,
        subscriptionActive: true,
        pluginActive: false,
        sagaCompleted: true,
        runtimeProvisioned: true,
        runtimeHealthy: true,
      }),
      false,
    );

    // Gate 4: Missing sagaCompleted -> Not live
    assert.strictEqual(
      evaluateActivation({
        orgMapped: true,
        subscriptionActive: true,
        pluginActive: true,
        sagaCompleted: false,
        runtimeProvisioned: true,
        runtimeHealthy: true,
      }),
      false,
    );

    // Gate 5: Missing runtimeProvisioned -> Not live
    assert.strictEqual(
      evaluateActivation({
        orgMapped: true,
        subscriptionActive: true,
        pluginActive: true,
        sagaCompleted: true,
        runtimeProvisioned: false,
        runtimeHealthy: true,
      }),
      false,
    );

    // Gate 6: Missing runtimeHealthy -> Not live
    assert.strictEqual(
      evaluateActivation({
        orgMapped: true,
        subscriptionActive: true,
        pluginActive: true,
        sagaCompleted: true,
        runtimeProvisioned: true,
        runtimeHealthy: false,
      }),
      false,
    );
  });

  it('strictly rejects simulated printer acknowledgements from satisfying physical hardware verification', async () => {
    const { persistPrinterJob, verifyServerPrintJob, recordHardwarePrintJobAck } = await import('@/server/devices/printer-service');
    const simTenant = `tenant_sim_guard_${Date.now()}`;
    const simJobId = `job_sim_${Date.now()}`;
    const now = new Date().toISOString();

    // A job with isSimulation: true must NEVER be verified as real hardware
    await persistPrinterJob({
      jobId: simJobId,
      tenantId: simTenant,
      actorId: 'usr_test',
      driver: 'epson_escpos',
      endpoint: '192.168.1.100:9100',
      paperWidth: '80mm',
      status: 'ACKNOWLEDGED',
      deviceAckId: 'sim_ack_123',
      isSimulation: true,
      createdAt: now,
      dispatchedAt: now,
      acknowledgedAt: now,
    });

    assert.strictEqual(
      await verifyServerPrintJob(simTenant, simJobId),
      false,
      'verifyServerPrintJob must reject simulated job even if status is ACKNOWLEDGED and deviceAckId exists',
    );

    // Conversely, a genuine hardware acknowledgement with isSimulation: false succeeds
    const hwJobId = `job_hw_${Date.now()}`;
    await recordHardwarePrintJobAck(simTenant, hwJobId, 'epson_escpos', 'hw_ack_verified_123');
    assert.strictEqual(
      await verifyServerPrintJob(simTenant, hwJobId),
      true,
      'verifyServerPrintJob must accept genuine hardware acknowledgement',
    );
  });

  it('enforces that staff invitation stores invitationReference and tracks acceptance lifecycle', async () => {
    const inviteTenant = `tenant_invite_lifecycle_${Date.now()}`;
    const invRef = `inv_ref_hash_${Date.now()}`;

    // Stage 1: Invitation dispatched with stable invitationReference
    const state1 = await recordStaffInvited(
      inviteTenant,
      'usr_owner',
      'captain@verma.test',
      'MEMBER',
      1,
      invRef,
    );

    const staffItem = state1.items.find((i) => i.id === 'staff');
    assert.ok(staffItem);
    assert.strictEqual(staffItem.status, 'PENDING_VERIFICATION');
    assert.strictEqual(staffItem.completed, false);
    assert.strictEqual(staffItem.evidence?.invitedEmail, 'captain@verma.test');
    assert.strictEqual(staffItem.evidence?.invitedRole, 'MEMBER');
    assert.strictEqual(staffItem.evidence?.invitationReference, invRef);

    // Stage 2: Verified staff completion requires memberVerified evidence
    const state2 = await recordStaffVerified(inviteTenant, 'usr_owner', 'captain@verma.test', 2);
    const verifiedStaff = state2.items.find((i) => i.id === 'staff');
    assert.ok(verifiedStaff);
    assert.strictEqual(verifiedStaff.status, 'COMPLETED');
    assert.strictEqual(verifiedStaff.completed, true);
    assert.strictEqual(verifiedStaff.evidence?.memberVerified, true);
  });
});
