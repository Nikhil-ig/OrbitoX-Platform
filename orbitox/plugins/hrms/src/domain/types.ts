export type EmployeeStatus = 'ONBOARDING' | 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: EmployeeStatus;
  joiningDate: string;
  salary: number;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardEmployeePayload {
  name: string;
  email: string;
  role: string;
  department: string;
  joiningDate: string;
  salary: number;
}

export interface LeaveRequestPayload {
  employeeId: string;
  leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'UNPAID';
  startDate: string;
  endDate: string;
  reason: string;
}

export interface HrmsFilter {
  department?: string;
  status?: EmployeeStatus;
  search?: string;
}
