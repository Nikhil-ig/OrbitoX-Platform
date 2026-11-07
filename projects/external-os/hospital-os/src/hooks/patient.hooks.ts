import { orbitox } from '@orbitox/runtime';

export const patientHooks = {
  beforeCreate: async (payload: any, context: any) => {
    // 1. Anti-Double-Booking Guard
    const bed = await orbitox.db.findById('bed', payload.bedId, context.id);
    if (!bed) throw new Error(`Bed '${payload.bedId}' does not exist.`);
    if (bed.status !== 'available') {
      throw new Error(`⚠️ Admission Blocked: Bed '${bed.label}' is already OCCUPIED!`);
    }

    // 2. SaaS Bed Quota Guard
    const quota = await orbitox.billing.checkQuota(context.rootId || 'apollo-global', 'maxBeds', 1);
    if (!quota.allowed) {
      throw new Error('⚠️ SaaS Quota Limit Exceeded: Please upgrade your Hospital OS license.');
    }

    return payload;
  },

  afterCreate: async (record: any, context: any) => {
    // Lock bed status atomically
    await orbitox.db.update('bed', record.bedId, { status: 'occupied' }, context.id);

    // Record in SHA-256 compliance audit vault
    await orbitox.audit.log({
      action: 'PATIENT_ADMISSION_CONFIRMED',
      entityType: 'patient',
      entityId: record.id,
      userId: record.attendingDoctorId,
      newValue: record
    });
  }
};
