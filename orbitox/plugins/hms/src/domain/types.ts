export type PatientStatus = 'REGISTERED' | 'IN_TRIAGE' | 'CONSULTING' | 'ADMITTED' | 'DISCHARGED';
export type TriageLevel = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  status: PatientStatus;
  triageLevel: TriageLevel;
  primaryDoctor?: string;
  medicalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPatientPayload {
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  triageLevel?: TriageLevel;
  primaryDoctor?: string;
  medicalNotes?: string;
}

export interface HmsFilter {
  status?: PatientStatus;
  triageLevel?: TriageLevel;
  search?: string;
}
