import * as crypto from 'crypto';
import { Employee, EmployeeStatus, OnboardEmployeePayload, HrmsFilter } from './types';
import { HrmsStateMachine } from './hrms-state-machine';

export class HeadlessHrmsService {
  private employees: Employee[] = [];

  constructor(initialEmployees: Employee[] = []) {
    this.employees = [...initialEmployees];
  }

  onboardEmployee(payload: OnboardEmployeePayload): Employee {
    if (!payload.name || payload.name.trim() === '') {
      throw new Error('HRMS Onboarding Failed: Name is required.');
    }
    if (!payload.email || !payload.email.includes('@')) {
      throw new Error('HRMS Onboarding Failed: Valid work email is required.');
    }

    const newEmp: Employee = {
      id: `emp_${crypto.randomUUID()}`,
      employeeCode: `EMP-${crypto.randomInt(1000, 10000)}`,
      name: payload.name.trim(),
      email: payload.email.trim(),
      role: payload.role.trim(),
      department: payload.department.trim(),
      status: 'ONBOARDING',
      joiningDate: payload.joiningDate,
      salary: payload.salary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.employees.unshift(newEmp);
    return newEmp;
  }

  updateStatus(employeeId: string, nextStatus: EmployeeStatus): Employee {
    const emp = this.employees.find((e) => e.id === employeeId);
    if (!emp) {
      throw new Error(`Employee Not Found: ${employeeId}`);
    }

    HrmsStateMachine.validateTransition(emp.status, nextStatus);

    const updatedEmp: Employee = {
      ...emp,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    const index = this.employees.findIndex((e) => e.id === employeeId);
    if (index !== -1) {
      this.employees[index] = updatedEmp;
    }

    return updatedEmp;
  }

  filterEmployees(filter: HrmsFilter = {}): Employee[] {
    return this.employees.filter((emp) => {
      if (filter.department && emp.department !== filter.department) return false;
      if (filter.status && emp.status !== filter.status) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(query);
        const matchesCode = emp.employeeCode.toLowerCase().includes(query);
        const matchesRole = emp.role.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesRole) return false;
      }
      return true;
    });
  }

  evaluateEmployeePerformance(employeeId: string): { performanceScore: number; strengths: string[]; areasForImprovement: string[] } {
    const emp = this.employees.find((e) => e.id === employeeId);
    if (!emp) {
      throw new Error(`Employee Not Found: ${employeeId}`);
    }

    // AI Mock Logic for Performance Evaluation
    let performanceScore = 80;
    const strengths = ['Team Collaboration', 'Punctuality'];
    const areasForImprovement = ['Advanced Tooling Proficiency'];

    if (emp.status === 'ACTIVE') {
      performanceScore = 85 + crypto.randomInt(0, 10);
      strengths.push('Consistent output delivery');
    } else if (emp.status === 'SUSPENDED') {
      performanceScore = 40;
      areasForImprovement.push('Compliance with company policies');
    }

    return {
      performanceScore,
      strengths,
      areasForImprovement
    };
  }
}
