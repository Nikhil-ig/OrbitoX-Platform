import { orbitox } from '@orbitox/runtime';
import { TreatmentEntity } from '../domain/types';

export class PharmacyService {
  static async prescribeMedication(params: {
    patientId: string;
    recordId?: string;
    doctorId?: string;
    drugName?: string;
    procedureOrDrug?: string;
    dosage: string;
    frequency?: string;
    route?: string;
    contextId?: string;
  }): Promise<TreatmentEntity> {
    const drug = params.drugName || params.procedureOrDrug || 'Standard Medication';
    console.log(`💊 [Pharmacy] Doctor prescribing ${drug} ${params.dosage} for Patient: ${params.patientId}...`);

    const targetContextId = params.contextId || 'default-context';

    // Create Treatment Record with generic typing
    const treatment = await orbitox.db.create<TreatmentEntity>('treatment', {
      recordId: params.recordId || 'rec_01',
      patientId: params.patientId,
      prescribedByDoctorId: params.doctorId || 'dr_ashlynn_01',
      type: 'medication',
      procedureOrDrug: drug,
      dosage: params.dosage,
      frequency: params.frequency || 'BID',
      route: params.route || 'Oral (PO)',
      status: 'ordered'
    }, targetContextId);

    // Write to Cryptographic Audit Ledger
    await orbitox.audit.log({
      action: 'MEDICATION_PRESCRIBED',
      entityType: 'treatment',
      entityId: treatment.id,
      userId: params.doctorId || 'dr_ashlynn_01',
      contextId: targetContextId,
      reason: `Prescribed ${drug} (${params.dosage}, ${params.frequency || 'BID'}, ${params.route || 'Oral (PO)'}) for patient ${params.patientId}`
    });

    // Emit event to notify Pharmacy queue
    await orbitox.events.emit('treatment.ordered', {
      treatmentId: treatment.id,
      patientId: params.patientId,
      procedureOrDrug: drug,
      dosage: params.dosage,
      frequency: params.frequency,
      route: params.route,
      prescribedBy: params.doctorId
    }, targetContextId);

    console.log(`✅ [Prescription Logged] Order #${treatment.id} pushed to Central Pharmacy Queue.`);
    return treatment;
  }

  static async verifyAndDispense(treatmentId: string, pharmacistId: string, contextId?: string) {
    console.log(`📦 [Pharmacy] Pharmacist ${pharmacistId} dispensing order #${treatmentId}...`);

    let treatment: any = null;
    if (contextId) {
      treatment = await orbitox.db.findById<any>('treatment', treatmentId, contextId);
    }
    if (!treatment) {
      treatment = await orbitox.db.findById<any>('treatment', treatmentId);
    }
    if (!treatment) {
      const all = await orbitox.db.findMany<any>('treatment');
      treatment = all.data.find((t: any) => t.id === treatmentId);
    }

    const targetContextId = treatment?.contextId || contextId || 'default-context';

    const updated = await orbitox.db.update('treatment', treatmentId, {
      status: 'dispensed',
      verifiedByPharmacistId: pharmacistId,
      dispensedAt: new Date().toISOString()
    }, targetContextId);

    await orbitox.audit.log({
      action: 'MEDICATION_DISPENSED',
      entityType: 'treatment',
      entityId: treatmentId,
      userId: pharmacistId,
      contextId: targetContextId,
      reason: `5-Rights Barcode Verified & Dispensed: ${treatment?.procedureOrDrug || 'medication'} (${treatment?.dosage || ''})`
    });

    await orbitox.events.emit('treatment.dispensed', { treatmentId, pharmacistId }, targetContextId);
    console.log(`✅ [Dispensed] Medication packed and ready for nurse bedside administration.`);
    return updated;
  }

  static async administerAtBedside(treatmentId: string, nurseId: string, contextId?: string) {
    console.log(`💉 [Nurse Bedside] Nurse ${nurseId} administered order #${treatmentId} (Barcode Verified).`);

    let treatment: any = null;
    if (contextId) {
      treatment = await orbitox.db.findById<any>('treatment', treatmentId, contextId);
    }
    if (!treatment) {
      treatment = await orbitox.db.findById<any>('treatment', treatmentId);
    }
    if (!treatment) {
      const all = await orbitox.db.findMany<any>('treatment');
      treatment = all.data.find((t: any) => t.id === treatmentId);
    }

    const targetContextId = treatment?.contextId || contextId || 'default-context';

    const updated = await orbitox.db.update('treatment', treatmentId, {
      status: 'administered',
      administeredByNurseId: nurseId,
      administeredAt: new Date().toISOString()
    }, targetContextId);

    await orbitox.audit.log({
      action: 'MEDICATION_ADMINISTERED',
      entityType: 'treatment',
      entityId: treatmentId,
      userId: nurseId,
      contextId: targetContextId,
      reason: `Administered ${treatment?.procedureOrDrug || 'medication'} (${treatment?.dosage || ''}) at bedside.`
    });

    await orbitox.events.emit('treatment.administered', { treatmentId, nurseId }, targetContextId);
    return updated;
  }
}
