import { Patient, PatientStatus, RegisterPatientPayload, HmsFilter } from './types';
import { HmsStateMachine } from './hms-state-machine';

export class HeadlessHmsService {
  private patients: Patient[] = [];

  constructor(initialPatients: Patient[] = []) {
    this.patients = [...initialPatients];
  }

  registerPatient(payload: RegisterPatientPayload): Patient {
    if (!payload.name || payload.name.trim() === '') {
      throw new Error('HMS Patient Registration Failed: Name is required.');
    }
    if (!payload.phone || payload.phone.trim() === '') {
      throw new Error('HMS Patient Registration Failed: Phone number is required.');
    }

    const newPatient: Patient = {
      id: `pat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      mrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
      name: payload.name.trim(),
      age: payload.age,
      gender: payload.gender,
      phone: payload.phone.trim(),
      status: 'REGISTERED',
      triageLevel: payload.triageLevel || 'ROUTINE',
      primaryDoctor: payload.primaryDoctor?.trim(),
      medicalNotes: payload.medicalNotes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.patients.unshift(newPatient);
    return newPatient;
  }

  updatePatientStatus(patientId: string, nextStatus: PatientStatus): Patient {
    const pat = this.patients.find((p) => p.id === patientId);
    if (!pat) {
      throw new Error(`Patient Not Found: ${patientId}`);
    }

    HmsStateMachine.validateTransition(pat.status, nextStatus);

    const updatedPat: Patient = {
      ...pat,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    const index = this.patients.findIndex((p) => p.id === patientId);
    if (index !== -1) {
      this.patients[index] = updatedPat;
    }

    return updatedPat;
  }

  filterPatients(filter: HmsFilter = {}): Patient[] {
    return this.patients.filter((pat) => {
      if (filter.status && pat.status !== filter.status) return false;
      if (filter.triageLevel && pat.triageLevel !== filter.triageLevel) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchesName = pat.name.toLowerCase().includes(query);
        const matchesMrn = pat.mrn.toLowerCase().includes(query);
        const matchesPhone = pat.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesMrn && !matchesPhone) return false;
      }
      return true;
    });
  }

  generateClinicalSummary(patientId: string): { summary: string; riskLevel: string; nextSteps: string[] } {
    const pat = this.patients.find((p) => p.id === patientId);
    if (!pat) {
      throw new Error(`Patient Not Found: ${patientId}`);
    }

    // AI Mock Logic for Clinical Decision Support
    const isCritical = pat.triageLevel === 'EMERGENCY';
    const riskLevel = isCritical ? 'HIGH' : pat.triageLevel === 'URGENT' ? 'MEDIUM' : 'LOW';

    const summary = `Patient ${pat.name} (${pat.age} ${pat.gender}) is currently ${pat.status}. Triage level: ${pat.triageLevel}. ${pat.medicalNotes ? `Notes: ${pat.medicalNotes}` : 'No notes available.'}`;
    
    const nextSteps = isCritical 
      ? ['Immediate physician consult required', 'Prepare for admission']
      : ['Monitor vitals', 'Schedule routine follow-up'];

    return {
      summary,
      riskLevel,
      nextSteps
    };
  }
}
