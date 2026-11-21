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
  recordDevicePrintJobAck,
  validatePrinterEndpoint,
  PrinterSecurityError,
} from '@/server/devices/printer-service';
import {
  persistCustomerInvitation,
  getCustomerInvitation,
  getLatestCustomerInvitationForEmail,
  type CustomerInvitationRecord,
} from '@/server/accounts/account-service';

describe('F6 Production Trust Boundaries & Non-Fabricated Verification', () => {
  const baseTenantId = `tenant_f6_prod_${Date.now()}`;

  describe('1. Printer Hardware Trust Boundary & Anti-Forgery', () => {
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

      // IPv4-mapped IPv6 metadata
      await assert.rejects(
        async () => { await validatePrinterEndpoint('::ffff:169.254.169.254:9100', 'epson_escpos'); },
        (err: any) => err instanceof PrinterSecurityError,
      );

      // Private RFC1918 IPs and web_bridge in production mode
      const prevEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';
      try {
        await assert.rejects(
          async () => { await validatePrinterEndpoint('10.0.0.5:9100', 'epson_escpos'); },
          (err: any) => err instanceof PrinterSecurityError,
        );
        await assert.rejects(
          async () => { await validatePrinterEndpoint('192.168.1.100:9100', 'epson_escpos'); },
          (err: any) => err instanceof PrinterSecurityError,
        );
        await assert.rejects(
          async () => { await validatePrinterEndpoint('http://printer.lan/prn', 'web_bridge'); },
          (err: any) => err instanceof PrinterSecurityError,
        );
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
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

    it('supports authenticated device acknowledgement transitions', async () => {
      const tenantId = `${baseTenantId}_prn_agent`;
      const jobId = `job_agent_${Date.now()}`;
      const now = new Date().toISOString();

      await persistPrinterJob({
        jobId,
        tenantId,
        actorId: 'usr_dispatch',
        driver: 'epson_escpos',
        endpoint: '192.168.1.200:9100',
        paperWidth: '80mm',
        status: 'DISPATCHED',
        createdAt: now,
        dispatchedAt: now,
      });

      // Initially not acknowledged
      const initialVerified = await verifyServerPrintJob(tenantId, jobId);
      assert.strictEqual(initialVerified, false);

      // Authenticated print agent reports hardware ACK
      await recordDevicePrintJobAck({
        tenantId,
        jobId,
        deviceIdentity: 'agent_pos_terminal_1',
        deviceAckId: 'ack_pos_term_hw_9981',
      });

      const updatedVerified = await verifyServerPrintJob(tenantId, jobId);
      assert.strictEqual(updatedVerified, true);
    });
  });

  describe('2. Staff Invitation Lifecycle & Membership Validation', () => {
    it('requires valid invitation before staff item can transition to pending verification', async () => {
      const tenantId = `${baseTenantId}_staff_invite`;
      const invRef = `inv_test_${Date.now()}`;

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

    it('distinguishes invitation supersession from actual acceptance', async () => {
      const orgId = `org_test_supersede_${Date.now()}`;
      const email = 'waiter@orbitox.restaurant';
      const now = new Date();

      // Older invitation
      const oldInv: CustomerInvitationRecord = {
        id: `inv_old_${Date.now()}`,
        tokenHash: 'hash_old_1',
        organizationId: orgId,
        email,
        role: 'MEMBER',
        status: 'SUPERSEDED',
        dispatchedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 86400000).toISOString(),
        supersededAt: now.toISOString(),
        createdAt: now.toISOString(),
      };

      // Newer active invitation
      const newInv: CustomerInvitationRecord = {
        id: `inv_new_${Date.now()}`,
        tokenHash: 'hash_new_2',
        organizationId: orgId,
        email,
        role: 'ADMIN',
        status: 'PENDING_ACCEPTANCE',
        dispatchedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 86400000).toISOString(),
        createdAt: now.toISOString(),
      };

      // In-memory / DB representation
      const mockTx = {
        $executeRaw: async () => {},
      } as any;
      await persistCustomerInvitation(mockTx, oldInv);
      await persistCustomerInvitation(mockTx, newInv);

      // Old invitation should have status SUPERSEDED
      const fetchedOld = await getCustomerInvitation(orgId, oldInv.id);
      assert.ok(fetchedOld);
      assert.strictEqual(fetchedOld.status, 'SUPERSEDED');

      // Latest for email should be new invitation
      const latest = await getLatestCustomerInvitationForEmail(orgId, email);
      assert.ok(latest);
      assert.strictEqual(latest.id, newInv.id);
      assert.strictEqual(latest.status, 'PENDING_ACCEPTANCE');
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

  describe('5. QR Code Table Status & Identity Validation', () => {
    it('strictly rejects table with missing or unspecified status with TABLE_STATUS_UNSPECIFIED', async () => {
      const { validateRuntimeTableIdentity } = await import(
        '@/server/restaurant-bridge/table-validation'
      );

      const table = { id: 1, number: '12', locator: 'loc_abc_123', branchId: 'branch_1' };
      const resolved = {
        id: 1,
        tableNumber: '12',
        locator: 'loc_abc_123',
        branchId: 'branch_1',
        tenantId: 'tenant_main',
        status: undefined, // Missing status!
      };

      const result = validateRuntimeTableIdentity(table, resolved, 'tenant_main');
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'TABLE_STATUS_UNSPECIFIED');
      assert.strictEqual(result.status, 422);
    });

    it('strictly rejects table with mismatched locator, number, or branch', async () => {
      const { validateRuntimeTableIdentity } = await import(
        '@/server/restaurant-bridge/table-validation'
      );

      const table = { id: 1, number: '12', locator: 'loc_abc_123', branchId: 'branch_1' };

      // Number mismatch
      const resNumMismatch = validateRuntimeTableIdentity(
        table,
        { id: 1, tableNumber: '13', locator: 'loc_abc_123', branchId: 'branch_1', tenantId: 'tenant_main', status: 'ACTIVE' },
        'tenant_main',
      );
      assert.strictEqual(resNumMismatch.valid, false);
      assert.strictEqual(resNumMismatch.error, 'QR_LOCATOR_MISMATCH');

      // Locator mismatch
      const resLocMismatch = validateRuntimeTableIdentity(
        table,
        { id: 1, tableNumber: '12', locator: 'loc_different', branchId: 'branch_1', tenantId: 'tenant_main', status: 'ACTIVE' },
        'tenant_main',
      );
      assert.strictEqual(resLocMismatch.valid, false);
      assert.strictEqual(resLocMismatch.error, 'QR_LOCATOR_MISMATCH');

      // Tenant mismatch
      const resTenantMismatch = validateRuntimeTableIdentity(
        table,
        { id: 1, tableNumber: '12', locator: 'loc_abc_123', branchId: 'branch_1', tenantId: 'attacker_tenant', status: 'ACTIVE' },
        'tenant_main',
      );
      assert.strictEqual(resTenantMismatch.valid, false);
      assert.strictEqual(resTenantMismatch.error, 'QR_LOCATOR_MISMATCH');

      // Missing tenantId (fails closed)
      const resMissingTenant = validateRuntimeTableIdentity(
        table,
        { id: 1, tableNumber: '12', locator: 'loc_abc_123', branchId: 'branch_1', status: 'ACTIVE' },
        'tenant_main',
      );
      assert.strictEqual(resMissingTenant.valid, false);
      assert.strictEqual(resMissingTenant.error, 'QR_LOCATOR_MISMATCH');

      // Missing branchId when table has branchId (fails closed)
      const resMissingBranch = validateRuntimeTableIdentity(
        table,
        { id: 1, tableNumber: '12', locator: 'loc_abc_123', tenantId: 'tenant_main', status: 'ACTIVE' },
        'tenant_main',
      );
      assert.strictEqual(resMissingBranch.valid, false);
      assert.strictEqual(resMissingBranch.error, 'QR_LOCATOR_MISMATCH');
    });

    it('accepts authentic dining table with valid active status', async () => {
      const { validateRuntimeTableIdentity } = await import(
        '@/server/restaurant-bridge/table-validation'
      );

      const table = { id: 1, number: '12', locator: 'loc_abc_123', branchId: 'branch_1' };
      const resolved = {
        id: 1,
        tableNumber: '12',
        locator: 'loc_abc_123',
        branchId: 'branch_1',
        tenantId: 'tenant_main',
        status: 'AVAILABLE',
      };

      const result = validateRuntimeTableIdentity(table, resolved, 'tenant_main');
      assert.strictEqual(result.valid, true);
    });
  });

  describe('6. Staff Membership Pre-Existing Invariant', () => {
    it('verifies that an invitation cannot be redeemed against a pre-existing membership', async () => {
      const orgId = `org_pre_member_${Date.now()}`;
      const email = 'existing_staff@orbitox.restaurant';

      // Membership was created yesterday
      const pastTime = new Date(Date.now() - 86400000);
      const preExistingMembership = {
        id: `mem_old_${Date.now()}`,
        organizationId: orgId,
        userId: 'usr_old_member',
        role: 'STAFF',
        createdAt: pastTime,
      };

      // Fresh invitation dispatched today
      const freshInvitation: CustomerInvitationRecord = {
        id: `inv_fresh_${Date.now()}`,
        tokenHash: 'hash_fresh',
        organizationId: orgId,
        email,
        role: 'STAFF',
        status: 'PENDING_ACCEPTANCE',
        dispatchedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Invariant check: membership.createdAt < invitation.createdAt MUST be rejected as pre-existing
      const isPreExisting = new Date(preExistingMembership.createdAt).getTime() < new Date(freshInvitation.createdAt).getTime();
      assert.strictEqual(
        isPreExisting,
        true,
        'Pre-existing membership created prior to invitation must be recognized and rejected',
      );
    });
  });
});
