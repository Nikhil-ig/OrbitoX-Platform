'use client';

import React from 'react';
import PlatformLayout from '../../(platform)/layout';
import { DynamicTable, ColumnDef, Button } from '@orbitox/ui';

interface EmployeeRow {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  role: string;
  status: string;
}

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

const mockData: EmployeeRow[] = [
  { id: 'emp-1', employeeCode: 'EMP-001', name: 'Dr. Sarah Connor', department: 'Engineering', role: 'Staff Principal Engineer', status: 'active' },
  { id: 'emp-2', employeeCode: 'EMP-002', name: 'David Miller', department: 'Product Management', role: 'Group PM', status: 'active' },
  { id: 'emp-3', employeeCode: 'EMP-003', name: 'Elena Rostova', department: 'Sales Operations', role: 'Head of Sales', status: 'on_leave' },
];

export default function EmployeesPage() {
  return (
    <PlatformLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0' }}>HRMS Employee Directory</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Plugin: @orbitox/hrms v1.0.0</p>
          </div>
          <Button variant="primary">+ Add Employee</Button>
        </div>

        <DynamicTable columns={columns} data={mockData} />
      </div>
    </PlatformLayout>
  );
}
