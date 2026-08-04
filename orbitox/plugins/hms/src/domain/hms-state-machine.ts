import { PatientStatus } from './types';

const ALLOWED_PATIENT_TRANSITIONS: Record<PatientStatus, PatientStatus[]> = {
  REGISTERED: ['IN_TRIAGE', 'CONSULTING', 'DISCHARGED'],
  IN_TRIAGE: ['CONSULTING', 'ADMITTED', 'DISCHARGED'],
  CONSULTING: ['ADMITTED', 'DISCHARGED'],
  ADMITTED: ['DISCHARGED'],
  DISCHARGED: ['REGISTERED'] // Readmission
};

export class HmsStateMachine {
  static canTransition(current: PatientStatus, next: PatientStatus): boolean {
    return ALLOWED_PATIENT_TRANSITIONS[current]?.includes(next) ?? false;
  }

  static validateTransition(current: PatientStatus, next: PatientStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid HMS Patient State Transition: Cannot move patient from ${current} to ${next}`);
    }
  }
}
