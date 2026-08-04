import { EmployeeStatus } from './types';

const ALLOWED_EMPLOYEE_TRANSITIONS: Record<EmployeeStatus, EmployeeStatus[]> = {
  ONBOARDING: ['ACTIVE', 'TERMINATED'],
  ACTIVE: ['ON_LEAVE', 'SUSPENDED', 'TERMINATED'],
  ON_LEAVE: ['ACTIVE', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  TERMINATED: ['ONBOARDING'] // Re-hiring
};

export class HrmsStateMachine {
  static canTransition(current: EmployeeStatus, next: EmployeeStatus): boolean {
    return ALLOWED_EMPLOYEE_TRANSITIONS[current]?.includes(next) ?? false;
  }

  static validateTransition(current: EmployeeStatus, next: EmployeeStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid HRMS Employee State Transition: Cannot move employee from ${current} to ${next}`);
    }
  }
}
