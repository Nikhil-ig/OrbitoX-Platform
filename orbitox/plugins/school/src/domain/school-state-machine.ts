import { EnrollmentStatus } from './types';

export class SchoolStateMachine {
  private static readonly transitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
    APPLIED: ['ENROLLED', 'DROPPED_OUT'],
    ENROLLED: ['SUSPENDED', 'GRADUATED', 'DROPPED_OUT'],
    SUSPENDED: ['ENROLLED', 'DROPPED_OUT'],
    GRADUATED: [],
    DROPPED_OUT: ['APPLIED']
  };

  static validateTransition(currentStatus: EnrollmentStatus, nextStatus: EnrollmentStatus): void {
    const allowed = this.transitions[currentStatus];
    if (!allowed || !allowed.includes(nextStatus)) {
      throw new Error(`Invalid School transition: Cannot move from ${currentStatus} to ${nextStatus}`);
    }
  }
}
