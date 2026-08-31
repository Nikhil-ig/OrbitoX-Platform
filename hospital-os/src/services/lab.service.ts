import { orbitox } from '@orbitox/runtime';
import { LabOrderEntity } from '../domain/types';

export interface LabReferenceRange {
  testType: string;
  category: 'cardiac' | 'hematology' | 'biochemistry' | 'microbiology' | 'blood_gas';
  unit: string;
  lowNormal: number;
  highNormal: number;
  criticalLow?: number;
  criticalHigh?: number;
  standardPrice: number;
}

export const LAB_REFERENCE_RANGES: Record<string, LabReferenceRange> = {
  'Troponin-I (STAT)': { testType: 'Troponin-I (STAT)', category: 'cardiac', unit: 'ng/mL', lowNormal: 0, highNormal: 0.04, criticalHigh: 0.40, standardPrice: 120 },
  'CK-MB (Cardiac Panel)': { testType: 'CK-MB (Cardiac Panel)', category: 'cardiac', unit: 'ng/mL', lowNormal: 0, highNormal: 5.0, criticalHigh: 25.0, standardPrice: 95 },
  'Potassium (Serum)': { testType: 'Potassium (Serum)', category: 'biochemistry', unit: 'mEq/L', lowNormal: 3.5, highNormal: 5.0, criticalLow: 2.8, criticalHigh: 6.2, standardPrice: 45 },
  'Sodium (Serum)': { testType: 'Sodium (Serum)', category: 'biochemistry', unit: 'mEq/L', lowNormal: 135, highNormal: 145, criticalLow: 120, criticalHigh: 160, standardPrice: 45 },
  'Blood Glucose (Random)': { testType: 'Blood Glucose (Random)', category: 'biochemistry', unit: 'mg/dL', lowNormal: 70, highNormal: 140, criticalLow: 50, criticalHigh: 400, standardPrice: 35 },
  'Complete Blood Count (CBC)': { testType: 'Complete Blood Count (CBC)', category: 'hematology', unit: 'k/uL (WBC)', lowNormal: 4.5, highNormal: 11.0, criticalLow: 2.0, criticalHigh: 30.0, standardPrice: 65 },
  'Hemoglobin (Hgb)': { testType: 'Hemoglobin (Hgb)', category: 'hematology', unit: 'g/dL', lowNormal: 12.0, highNormal: 17.5, criticalLow: 7.0, criticalHigh: 20.0, standardPrice: 40 },
  'Platelets Count': { testType: 'Platelets Count', category: 'hematology', unit: 'k/uL', lowNormal: 150, highNormal: 450, criticalLow: 50, criticalHigh: 1000, standardPrice: 45 },
  'Arterial Blood Gas (pH)': { testType: 'Arterial Blood Gas (pH)', category: 'blood_gas', unit: 'pH', lowNormal: 7.35, highNormal: 7.45, criticalLow: 7.20, criticalHigh: 7.60, standardPrice: 110 },
  'Serum Lactate (Sepsis)': { testType: 'Serum Lactate (Sepsis)', category: 'biochemistry', unit: 'mmol/L', lowNormal: 0.5, highNormal: 2.0, criticalHigh: 4.0, standardPrice: 85 },
  'Serum Creatinine (Renal)': { testType: 'Serum Creatinine (Renal)', category: 'biochemistry', unit: 'mg/dL', lowNormal: 0.6, highNormal: 1.2, criticalHigh: 4.0, standardPrice: 50 }
};

export class LabService {
  static evaluateResult(testType: string, numericValue: number): {
    flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
    isCritical: boolean;
    referenceRange: string;
    interpretation: string;
  } {
    const range = LAB_REFERENCE_RANGES[testType];
    if (!range) {
      return { flag: 'NORMAL', isCritical: false, referenceRange: 'N/A', interpretation: 'Normal findings' };
    }

    const refString = `${range.lowNormal} - ${range.highNormal} ${range.unit}`;

    if (range.criticalHigh !== undefined && numericValue >= range.criticalHigh) {
      return { flag: 'CRITICAL', isCritical: true, referenceRange: refString, interpretation: `CRITICAL HIGH: ${numericValue} ${range.unit} (STAT alert triggered)` };
    }
    if (range.criticalLow !== undefined && numericValue <= range.criticalLow) {
      return { flag: 'CRITICAL', isCritical: true, referenceRange: refString, interpretation: `CRITICAL LOW: ${numericValue} ${range.unit} (STAT alert triggered)` };
    }
    if (numericValue > range.highNormal) {
      return { flag: 'HIGH', isCritical: false, referenceRange: refString, interpretation: `Elevated: ${numericValue} ${range.unit}` };
    }
    if (numericValue < range.lowNormal) {
      return { flag: 'LOW', isCritical: false, referenceRange: refString, interpretation: `Below normal: ${numericValue} ${range.unit}` };
    }

    return { flag: 'NORMAL', isCritical: false, referenceRange: refString, interpretation: `Normal: ${numericValue} ${range.unit}` };
  }

  static async orderTest(params: {
    patientId: string;
    doctorId: string;
    testType: string;
    priority?: 'routine' | 'urgent' | 'stat';
    clinicalNotes?: string;
    contextId: string;
  }): Promise<LabOrderEntity> {
    console.log(`🔬 [Lab] Doctor ordering ${params.testType} (${params.priority || 'routine'}) for Patient: ${params.patientId}...`);

    const order = await orbitox.db.create<LabOrderEntity>('lab_order', {
      patientId: params.patientId,
      orderedByDoctorId: params.doctorId,
      testType: params.testType,
      priority: params.priority || 'routine',
      status: 'ordered',
      isCriticalValue: false,
      orderedAt: new Date().toISOString()
    }, params.contextId);

    await orbitox.events.emit('lab.order.created', { orderId: order.id, testType: params.testType, priority: params.priority }, params.contextId);
    return order;
  }

  static async reportResults(params: {
    orderId: string;
    resultSummary: string;
    numericValue?: number;
    isCriticalValue?: boolean;
    technicianId?: string;
    contextId?: string;
  }) {
    const allOrders = await orbitox.db.findMany<any>('lab_order');
    const existing = allOrders.data.find((o: any) => o.id === params.orderId);
    const contextId = params.contextId || existing?.contextId || 'default-context';

    let isCritical = params.isCriticalValue ?? false;
    let evalDetails = { flag: isCritical ? 'CRITICAL' : 'NORMAL', isCritical, referenceRange: '', interpretation: params.resultSummary };

    if (existing && params.numericValue !== undefined) {
      evalDetails = this.evaluateResult(existing.testType, params.numericValue);
      isCritical = isCritical || evalDetails.isCritical;
    }

    console.log(`📊 [Lab Result] Reporting result for order #${params.orderId} (Critical: ${isCritical})...`);

    const updated = await orbitox.db.update('lab_order', params.orderId, {
      status: isCritical ? 'critical_result' : 'completed',
      resultSummary: params.resultSummary,
      isCriticalValue: isCritical,
      numericValue: params.numericValue,
      flag: evalDetails.flag,
      referenceRange: evalDetails.referenceRange,
      technicianId: params.technicianId || 'lab_tech_01',
      completedAt: new Date().toISOString()
    }, contextId);

    // Emit events
    await orbitox.events.emit('lab.result.completed', {
      orderId: params.orderId,
      isCritical,
      resultSummary: params.resultSummary,
      patientId: existing?.patientId
    }, contextId);

    if (isCritical) {
      await orbitox.events.emit('lab.result.critical', {
        orderId: params.orderId,
        testType: existing?.testType,
        resultSummary: params.resultSummary,
        patientId: existing?.patientId
      }, contextId);
    }

    return updated;
  }

  static async listLabOrders(contextId?: string, patientId?: string): Promise<any[]> {
    const [ordersRes, patientsRes, staffRes, bedsRes] = await Promise.all([
      orbitox.db.findMany<any>('lab_order', { contextId }),
      orbitox.db.findMany<any>('patient', { contextId }),
      orbitox.db.findMany<any>('staff', { contextId }),
      orbitox.db.findMany<any>('bed', { contextId })
    ]);

    let orders = ordersRes.data;
    if (patientId) {
      orders = orders.filter((o: any) => o.patientId === patientId);
    }

    return orders.map((o: any) => {
      const pat = patientsRes.data.find((p: any) => p.id === o.patientId);
      const doc = staffRes.data.find((s: any) => s.id === o.orderedByDoctorId);
      const bed = (pat?.status === 'admitted' && pat?.bedId) ? bedsRes.data.find((b: any) => b.id === pat.bedId) : null;
      const ref = LAB_REFERENCE_RANGES[o.testType];

      return {
        ...o,
        patientName: pat?.name || 'Inpatient',
        patientAge: pat?.age,
        patientGender: pat?.gender,
        bedLabel: bed?.label || (pat?.status === 'admitted' ? 'Admitted Ward' : 'Outpatient'),
        doctorName: doc?.name || o.orderedByDoctorId || 'Attending Physician',
        category: ref?.category || 'biochemistry',
        unit: ref?.unit || '',
        standardPrice: ref?.standardPrice || 50
      };
    });
  }
}
