import { Injectable, Logger } from '@nestjs/common';

export interface EmployeeRecord {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  role: string;
  status: 'active' | 'on_leave' | 'terminated';
}

@Injectable()
export class HrmsService {
  private readonly logger = new Logger(HrmsService.name);

  getEmployees(contextId: string): EmployeeRecord[] {
    this.logger.log(`Fetching employee directory for context ${contextId}`);
    return [
      { id: 'emp-1', employeeCode: 'EMP-001', name: 'Dr. Sarah Connor', department: 'Engineering', role: 'Staff Principal Engineer', status: 'active' },
      { id: 'emp-2', employeeCode: 'EMP-002', name: 'David Miller', department: 'Product Management', role: 'Group PM', status: 'active' },
      { id: 'emp-3', employeeCode: 'EMP-003', name: 'Elena Rostova', department: 'Sales Operations', role: 'Head of Sales', status: 'on_leave' },
    ];
  }
}
