import { orbitox } from '@orbitox/runtime';

export const treatmentHooks = {
  beforeCreate: async (payload: any, context: any) => {
    // 5-Rights Safety Validation: Check Patient Allergies
    const patient = await orbitox.db.findById('patient', payload.patientId, context.id);
    if (patient?.allergies && payload.procedureOrDrug) {
      for (const allergy of patient.allergies) {
        if (payload.procedureOrDrug.toLowerCase().includes(allergy.toLowerCase())) {
          throw new Error(`🚨 DRUG ALLERGY WARNING: Patient is allergic to '${allergy}'!`);
        }
      }
    }
    return payload;
  }
};
