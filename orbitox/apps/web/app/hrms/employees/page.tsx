'use client';

import React, { useState } from 'react';
import PlatformLayout from '../../(platform)/layout';
import { DynamicTable, ColumnDef, Button } from '@orbitox/ui';
import { useAdmin } from '../../admin/data/admin-context';

interface EmployeeRow {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  role: string;
  status: string;
}

const INITIAL_EMPLOYEES: EmployeeRow[] = [
  { id: '1', employeeCode: 'EMP-001', name: 'John Doe', department: 'Engineering', role: 'Lead Architect', status: 'active' },
  { id: '2', employeeCode: 'EMP-002', name: 'Jane Smith', department: 'Product', role: 'Product Manager', status: 'active' },
  { id: '3', employeeCode: 'EMP-003', name: 'Bob Wilson', department: 'Design', role: 'UI/UX Designer', status: 'on_leave' },
];

const columns: ColumnDef<EmployeeRow>[] = [
  { key: 'employeeCode', header: 'Code' },
  { key: 'name', header: 'Employee Name' },
  { key: 'department', header: 'Department' },
  { key: 'role', header: 'Role' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <span
        style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          background: row.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
          color: row.status === 'active' ? '#4ade80' : '#facc15',
        }}
      >
        {row.status.toUpperCase()}
      </span>
    ),
  },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>(INITIAL_EMPLOYEES);
  const { isServiceActive, consumeQuota, recordTenantAction, showToast } = useAdmin();

  const handleAddEmployee = () => {
    if (!isServiceActive('hrms')) {
      showToast('Action Denied: HRMS microservice is currently BLOCKED in Platform Admin.');
      return;
    }

    const quotaCheck = consumeQuota({ serviceId: 'hrms', actionName: 'EMPLOYEE_ONBOARDED' });
    if (!quotaCheck.allowed) {
      showToast(`Action Blocked: ${quotaCheck.reason}`);
      return;
    }

    const names = ['Dr. Sarah Connor', 'Rajesh Sharma', 'Claire Delacour', 'Amir Khan', 'Victoria Sterling'];
    const depts = ['Cybernetics & AI', 'Clinical Informatics', 'Operations & Logistics', 'Enterprise Sales', 'Brand Strategy'];
    const roles = ['Principal Specialist', 'Staff Scientist', 'Director of People', 'HR Business Partner', 'Systems Engineer'];
    const idx = Math.floor(Math.random() * names.length);

    const newEmp: EmployeeRow = {
      id: `emp-${Date.now()}`,
      employeeCode: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: names[idx] || 'Dr. Sarah Connor',
      department: depts[idx] || 'Cybernetics & AI',
      role: roles[idx] || 'Principal Specialist',
      status: 'active',
    };

    setEmployees((prev) => [newEmp, ...prev]);

    recordTenantAction({
      serviceId: 'hrms',
      serviceName: 'HRMS Employee Lifecycle',
      action: 'STAFF_ONBOARDED',
      details: `${newEmp.name} (${newEmp.role})`,
      amount: '$110,000',
      type: 'sync',
    });

    showToast(`Employee Onboarded: ${newEmp.name} • Synced to Platform Admin`);
  };

  return (
    <PlatformLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0' }}>HRMS Employee Directory</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Plugin: @orbitox/hrms v1.0.0 • Connected to Platform OS</p>
          </div>
          <Button variant="primary" onClick={handleAddEmployee}>+ Add Employee</Button>
        </div>

        <DynamicTable columns={columns} data={employees} />
      </div>
    </PlatformLayout>
  );
}
