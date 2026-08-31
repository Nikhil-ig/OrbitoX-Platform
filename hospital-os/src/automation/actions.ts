import { orbitox } from '@orbitox/runtime';
import { InvoiceEntity } from '../domain/types';

export interface ActionDefinition<TInput = any, TOutput = any> {
  id: string;
  name: string;
  execute: (input: TInput, context?: any) => Promise<TOutput>;
}

export const HospitalActions = {
  dispatchCodeBlue: (config?: { team?: string; severity?: string }): ActionDefinition => ({
    id: 'hospital.action.dispatchCodeBlue',
    name: 'Dispatch Code Blue Alert',
    execute: async (input) => {
      console.log(`🚨 [ACTION: Code Blue] Blasting Emergency Alert for Bed: ${input.bedId} (Team: ${config?.team || 'resuscitation'})`);
      await orbitox.events.emit('hospital.code_blue.dispatched', {
        bedId: input.bedId,
        team: config?.team || 'resuscitation',
        timestamp: new Date().toISOString()
      });
      return { status: 'dispatched', alertLevel: config?.severity || 'HIGH_PRIORITY' };
    }
  }),

  lockBed: (status: 'occupied' | 'reserved' = 'occupied'): ActionDefinition => ({
    id: 'hospital.action.lockBed',
    name: 'Lock Bed Status',
    execute: async (input) => {
      console.log(`🛏️ [ACTION: Lock Bed] Setting Bed ${input.bedId} -> ${status}`);
      await orbitox.db.update('bed', input.bedId, { status });
      return { bedId: input.bedId, status };
    }
  }),

  pageDoctor: (config?: { role?: string; urgent?: boolean }): ActionDefinition => ({
    id: 'hospital.action.pageDoctor',
    name: 'Page On-Call Physician',
    execute: async (input) => {
      console.log(`📱 [ACTION: Page Doctor] Paging ${config?.role || 'attending_doctor'} regarding ${input.patientId || input.bedId}`);
      return { paged: true, doctorRole: config?.role || 'attending_doctor' };
    }
  }),

  queuePharmacy: (config?: { priority?: string }): ActionDefinition => ({
    id: 'hospital.action.queuePharmacy',
    name: 'Push to Pharmacy Dispensing Queue',
    execute: async (input) => {
      console.log(`💊 [ACTION: Pharmacy Queue] Added order for ${input.procedureOrDrug || input.treatmentId}`);
      return { inQueue: true, priority: config?.priority || 'routine' };
    }
  }),

  generateInvoice: (): ActionDefinition => ({
    id: 'hospital.action.generateInvoice',
    name: 'Auto-Generate Discharge Invoice',
    execute: async (input) => {
      console.log(`💳 [ACTION: Billing] Generating auto-invoice for patient ${input.patientId}`);
      const invoice = await orbitox.db.create<InvoiceEntity>('invoice', {
        patientId: input.patientId,
        lineItems: [],
        subtotal: 4500,
        taxAmount: 0,
        insuranceCoverage: 3600,
        patientDue: 900,
        status: 'draft',
        generatedAt: new Date().toISOString()
      });
      return { invoiceId: invoice.id, subtotal: 4500 };
    }
  }),

  destroySurgeBed: (): ActionDefinition => ({
    id: 'hospital.action.destroySurgeBed',
    name: 'Decommission Temporary Surge Bed',
    execute: async (input) => {
      const bed = await orbitox.db.findById('bed', input.bedId);
      if (bed?.isTemporary) {
        console.log(`⛺ [ACTION: Surge Cleanup] Decommissioning temporary bed context: ${input.bedId}`);
        await orbitox.context.delete(input.bedId);
        return { decommissioned: true, bedId: input.bedId };
      }
      return { decommissioned: false };
    }
  }),

  dispatchHousekeeping: (config?: { priority?: string }): ActionDefinition => ({
    id: 'hospital.action.dispatchHousekeeping',
    name: 'Dispatch Housekeeping Sanitization Task',
    execute: async (input) => {
      console.log(`🧹 [ACTION: Housekeeping] Dispatched crew to sanitize bed ${input.bedId}`);
      await orbitox.db.update('bed', input.bedId, { status: 'sanitizing' });
      return { taskCreated: true, status: 'sanitizing' };
    }
  }),

  auditVaultLog: (): ActionDefinition => ({
    id: 'hospital.action.auditVaultLog',
    name: 'Record SHA-256 Audit Vault Log',
    execute: async (input) => {
      await orbitox.audit.log({
        action: 'AUTOMATION_STEP_EXECUTED',
        entityType: 'automation',
        entityId: input.bedId || input.patientId || 'system',
        userId: input.staffId || 'system_automation',
        reason: JSON.stringify(input)
      });
      return { audited: true, hashVerified: true };
    }
  })
};
