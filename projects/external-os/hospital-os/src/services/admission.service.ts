import { orbitox } from '@orbitox/runtime';
import { PatientEntity, PatientStatus } from '../domain/types';

export class AdmissionService {
  static async admitPatient(params: {
    patientId?: string;
    name?: string;
    age?: number;
    gender?: 'M' | 'F' | 'Other';
    bloodGroup?: string;
    category?: 'general' | 'vip' | 'pediatric' | 'geriatric' | 'maternity' | 'psychiatric' | 'trauma';
    diagnosis?: string;
    bedId?: string;
    attendingDoctorId?: string;
    status?: PatientStatus;
    triageLevel?: 1 | 2 | 3 | 4 | 5;
    phone?: string;
    email?: string;
    allergies?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    insuranceProvider?: string;
    policyNumber?: string;
    clinicalNotes?: string;
    contextId?: string;
  }): Promise<PatientEntity> {
    const patientStatus: PatientStatus = params.status || (params.bedId ? 'admitted' : 'pre_registered');
    console.log(`👤 [Admission/Registration] Processing patient status: '${patientStatus}' (Bed: ${params.bedId || 'Unassigned'})...`);

    // 1. Locate bed entity if bedId is provided
    let bed: any = null;
    let targetContextId = params.contextId || 'default-context';

    if (params.bedId) {
      if (params.contextId) {
        bed = await orbitox.db.findById<any>('bed', params.bedId, params.contextId);
      }
      if (!bed) {
        bed = await orbitox.db.findById<any>('bed', params.bedId);
      }
      if (!bed) {
        const allBeds = await orbitox.db.findMany<any>('bed');
        bed = allBeds.data.find((b: any) => b.id === params.bedId);
      }

      if (bed) {
        targetContextId = bed.contextId || targetContextId;
        if (patientStatus === 'admitted' && bed.status !== 'available' && bed.status !== 'reserved') {
          throw new Error(`⚠️ Bed '${bed.label}' is currently ${bed.status.toUpperCase()}!`);
        }
      }
    }

    let patient: any = null;

    // 2. Case A: Assign Existing Patient from Database to Bed / Update Status
    if (params.patientId) {
      const allPatients = await orbitox.db.findMany<any>('patient');
      const existing = allPatients.data.find((p: any) => p.id === params.patientId);
      if (!existing) throw new Error(`Patient '${params.patientId}' not found.`);

      const updates: any = {
        status: patientStatus,
        attendingDoctorId: params.attendingDoctorId || existing.attendingDoctorId || 'dr_ashlynn_01',
        diagnosis: params.diagnosis || existing.diagnosis
      };

      if (params.bedId) {
        updates.bedId = params.bedId;
      }

      if (patientStatus === 'admitted') {
        updates.admittedAt = new Date().toISOString();
      }

      patient = await orbitox.db.update('patient', existing.id, updates, existing.contextId || targetContextId);
      console.log(`✅ [Admission] Existing patient ${patient.name} updated to status '${patient.status}'`);
    } else {
      // 2. Case B: Register New Patient
      if (!params.name) throw new Error('Patient name is required for new registration.');

      const now = new Date().toISOString();
      patient = await orbitox.db.create<PatientEntity>('patient', {
        name: params.name,
        age: params.age || 30,
        gender: params.gender || 'F',
        bloodGroup: params.bloodGroup || 'O+',
        category: (params.category as any) || 'general',
        bedId: params.bedId,
        status: patientStatus,
        diagnosis: params.diagnosis || 'Clinical Consultation',
        attendingDoctorId: params.attendingDoctorId || 'dr_ashlynn_01',
        triageLevel: params.triageLevel || 3,
        phone: params.phone || '+1 (555) 019-2834',
        email: params.email || `${params.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        allergies: params.allergies ? (typeof params.allergies === 'string' ? params.allergies.split(',').map(a => a.trim()) : params.allergies) : [],
        emergencyContact: {
          name: params.emergencyContactName || 'Next of Kin',
          phone: params.emergencyContactPhone || '+1 (555) 992-1100',
          relation: params.emergencyContactRelation || 'Family'
        },
        insurance: {
          provider: params.insuranceProvider || 'Blue Cross Blue Shield',
          policyNumber: params.policyNumber || `POL-${Math.floor(100000 + Math.random() * 900000)}`,
          type: 'private'
        },
        clinicalNotes: params.clinicalNotes || 'Patient registration record created in clinical registry.',
        registeredAt: now,
        admittedAt: patientStatus === 'admitted' ? now : undefined
      }, targetContextId);
    }

    // 3. If patient is officially ADMITTED to a bed, mark bed occupied
    if (patientStatus === 'admitted' && bed) {
      await orbitox.db.update('bed', bed.id, { status: 'occupied' }, targetContextId);
    }

    // 4. Log to SHA-256 Audit Trail
    await orbitox.audit.log({
      action: patientStatus === 'admitted' ? 'PATIENT_ADMITTED' : 'PATIENT_REGISTERED',
      entityType: 'patient',
      entityId: patient.id,
      userId: params.attendingDoctorId || 'dr_ashlynn_01',
      contextId: targetContextId,
      reason: `${patientStatus === 'admitted' ? 'Admitted' : 'Registered'} ${patient.name} (${patient.age}yo ${patient.gender}, Status: ${patient.status}) ${bed ? `to ${bed.label}` : ''}`
    });

    // 5. Emit event to trigger n8n workflows
    await orbitox.events.emit(patientStatus === 'admitted' ? 'patient.admitted' : 'patient.registered', {
      patientId: patient.id,
      patientName: patient.name,
      status: patient.status,
      bedId: params.bedId,
      attendingDoctorId: params.attendingDoctorId || 'dr_ashlynn_01',
      timestamp: new Date().toISOString()
    }, targetContextId);

    console.log(`✅ [Complete] ${patient.name} processed with status '${patient.status}' (ID: ${patient.id})`);
    return patient;
  }
}
