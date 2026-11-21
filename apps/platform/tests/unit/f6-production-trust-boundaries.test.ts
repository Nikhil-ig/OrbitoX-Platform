import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getChecklist,
  recordStaffInvited,
  recordStaffVerified,
  recordKdsVerified,
  recordKdsMountedAttestation,
  recordPrinterConfigured,
  recordPrinterPending,
  recordLiveGatewayVerified,
  InvalidChecklistTransitionError,
} from '@/server/onboarding/checklist-service';
import {
  persistPrinterJob,
  getPrinterJob,
  verifyServerPrintJob,
  recordHardwarePrintJobAck,
  validatePrinterEndpoint,
  PrinterSecurityError,
} from '@/server/devices/printer-service';

describe('F6 Production Trust Boundaries & Non-Fabricated Verification', () => {
  const baseTenantId = `tenant_f6_prod_${Date.now()}`;

  describe('1. Printer Hardware Trust Boundary', () => {
    it('strictly rejects simulated adapter acknowledgements from satisfying physical verification', async () => {
      const tenantId = `${baseTenantId}_prn_sim`;
      const jobId = `prn_sim_${Date.now()}`;
      const now = new Date().toISOString();

      // Persist a job marked as a simulation (Mock adapter)
      await persistPrinterJob({
        jobId,
        tenantId,
        actorId: 'usr_test',
        driver: 'epson_escpos',
        endpoint: '192.168.1.200:9100',
        paperWidth: '80mm',
        status: 'ACKNOWLEDGED',
        deviceAckId: 'mock_ack_random_123',
        isSimulation: true,
        createdAt: now,
        dispatchedAt: now,
        acknowledgedAt: now,
      });

      // verifyServerPrintJob must fail-closed on simulation jobs
      const verified = await verifyServerPrintJob(tenantId, jobId);
      assert.strictEqual(
        verified,
        false,
        'Simulation printer acknowledgement must NEVER satisfy production hardware verification',
      );
    });

    it('accepts genuine hardware acknowledgements from registered devices', async () => {
      const tenantId = `${baseTenantId}_prn_hw`;
      const jobId = `prn_hw_${Date.now()}`;

      await recordHardwarePrintJobAck(tenantId, jobId, 'epson_escpos', 'hw_ack_epson_real_4421');
      const verified = await verifyServerPrintJob(tenantId, jobId);
      assert.strictEqual(verified, true, 'Genuine hardware acknowledgement must be verified');

      // Cross-tenant verification must be rejected
      const crossTenantVerified = await verifyServerPrintJob(`${baseTenantId}_attacker`, jobId);
      assert.strictEqual(crossTenantVerified, false, 'Cross-tenant print job verification must fail');
    });

    it('enforces comprehensive SSRF protection on printer endpoints', async () => {
      // Cloud metadata IP
      await assert.rejects(
        async () => { await validatePrinterEndpoint('169.254.169.254:9100', 'epson_escpos'); },
        (err: any) => err instanceof PrinterSecurityError,
      );

      // Link-local IP
      await assert.rejects(
        async () => { await validatePrinterEndpoint('169.254.1.1:9100', 'epson_escpos'); },
        (err: any) => err instanceof PrinterSecurityError,
      );

      // Cloud metadata domain
      await assert.rejects(
        async () => { await validatePrinterEndpoint('metadata.google.internal:9100', 'epson_escpos'); },
        (err: any) => err instanceof PrinterSecurityError,
      );

      // Invalid port for raw TCP ESC/POS
      if (process.env.NODE_ENV === 'production') {
        await assert.rejects(
          async () => { await validatePrinterEndpoint('10.0.0.50:8080', 'epson_escpos'); },
          (err: any) => err instanceof PrinterSecurityError,
        );
      }
    });

    it('truthfully records Hardware Pending as an incomplete status without fabrication', async () => {
      const tenantId = `${baseTenantId}_prn_pending`;
      const state = await recordPrinterPending(
        tenantId,
        'usr_op',
        { driver: 'epson_escpos', endpoint: '192.168.1.200:9100', paperWidth: '80mm' },
        1,
      );

      const prnItem = state.items.find((i) => i.id === 'printer');
      assert.ok(prnItem);
      assert.strictEqual(prnItem.status, 'UNAVAILABLE');
      assert.strictEqual(prnItem.completed, false);
      assert.strictEqual(prnItem.evidence?.hardwarePending, true);
      assert.strictEqual(state.allCompleted, false);
    });
  });

  describe('2. Staff Invitation Lifecycle & Membership Validation', () => {
    it('requires valid invitation before staff item can transition to pending verification', async () => {
      const tenantId = `${baseTenantId}_staff_invite`;
      const invRef = `tok_hash_${Date.now()}`;

      const state = await recordStaffInvited(
        tenantId,
        'usr_owner',
        'headchef@orbitox.restaurant',
        'ADMIN',
        1,
        invRef,
      );

      const staffItem = state.items.find((i) => i.id === 'staff');
      assert.ok(staffItem);
      assert.strictEqual(staffItem.status, 'PENDING_VERIFICATION');
      assert.strictEqual(staffItem.completed, false);
      assert.strictEqual(staffItem.evidence?.invitedEmail, 'headchef@orbitox.restaurant');
      assert.strictEqual(staffItem.evidence?.invitedRole, 'ADMIN');
      assert.strictEqual(staffItem.evidence?.invitationReference, invRef);
    });

    it('rejects direct completion of staff item without verified acceptance', async () => {
      const { updateChecklistItem } = await import('@/server/onboarding/checklist-service');
      const tenantId = `${baseTenantId}_staff_fabricate`;

      // Direct transition to COMPLETED via generic mutation is rejected
      await assert.rejects(
        () => updateChecklistItem(tenantId, { itemId: 'staff', status: 'COMPLETED' }),
        (err: any) => err instanceof InvalidChecklistTransitionError,
      );
    });
  });

  describe('3. KDS Station Durability & Mounting Attestation', () => {
    it('requires verified station link before mounting attestation is permitted', async () => {
      const tenantId = `${baseTenantId}_kds_attest`;

      // Attempting to attest mounting without verified station link must fail
      await assert.rejects(
        () => recordKdsMountedAttestation(tenantId, 'usr_owner', 1),
        (err: any) => err instanceof InvalidChecklistTransitionError,
      );

      // Verify station link first
      const linked = await recordKdsVerified(tenantId, 'usr_owner', 'station_expo_1', 2, 1);
      const kdsItem = linked.items.find((i) => i.id === 'kds');
      assert.ok(kdsItem);
      assert.strictEqual(kdsItem.status, 'ACTION_REQUIRED');
      assert.strictEqual(kdsItem.completed, false);
      assert.strictEqual(kdsItem.evidence?.stationLinkVerified, true);
      assert.strictEqual(kdsItem.evidence?.kdsStationId, 'station_expo_1');

      // Now mounting attestation succeeds
      const mounted = await recordKdsMountedAttestation(tenantId, 'usr_owner', 2);
      const mountedItem = mounted.items.find((i) => i.id === 'kds');
      assert.ok(mountedItem);
      assert.strictEqual(mountedItem.status, 'COMPLETED');
      assert.strictEqual(mountedItem.completed, true);
      assert.strictEqual(mountedItem.evidence?.hardwareMounted, true);
    });
  });

  describe('4. Payment Reconciliation & Separation of Preview', () => {
    it('rejects live gateway verification without authentic payment evidence', async () => {
      const { updateChecklistItem } = await import('@/server/onboarding/checklist-service');
      const tenantId = `${baseTenantId}_pay_live`;

      await assert.rejects(
        () => updateChecklistItem(tenantId, { itemId: 'payment', status: 'COMPLETED' }),
        (err: any) => err instanceof InvalidChecklistTransitionError,
      );
    });
  });
});
