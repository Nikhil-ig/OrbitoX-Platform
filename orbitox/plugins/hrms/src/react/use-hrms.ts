import { useState, useCallback } from 'react';
import { Employee, EmployeeStatus, OnboardEmployeePayload, HrmsFilter } from '../domain/types';
import { HeadlessHrmsService } from '../domain/hrms-actions';

const defaultHrmsService = new HeadlessHrmsService([
  {
    id: 'emp-1',
    employeeCode: 'EMP-1001',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    role: 'Senior Software Engineer',
    department: 'Engineering',
    status: 'ACTIVE',
    joiningDate: '2023-01-15',
    salary: 125000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'emp-2',
    employeeCode: 'EMP-1002',
    name: 'Bob Smith',
    email: 'bob@company.com',
    role: 'HR Manager',
    department: 'Human Resources',
    status: 'ACTIVE',
    joiningDate: '2022-06-01',
    salary: 95000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);

export function useEmployees(filter: HrmsFilter = {}) {
  const [service] = useState(() => defaultHrmsService);
  const [employees, setEmployees] = useState<Employee[]>(() => service.filterEmployees(filter));

  const refreshEmployees = useCallback(() => {
    setEmployees(service.filterEmployees(filter));
  }, [service, filter]);

  return {
    employees,
    refreshEmployees
  };
}

export function useHrmsActions() {
  const [service] = useState(() => defaultHrmsService);

  const onboardEmployee = useCallback((payload: OnboardEmployeePayload): Employee => {
    return service.onboardEmployee(payload);
  }, [service]);

  const updateStatus = useCallback((employeeId: string, nextStatus: EmployeeStatus): Employee => {
    return service.updateStatus(employeeId, nextStatus);
  }, [service]);

  return {
    onboardEmployee,
    updateStatus
  };
}
