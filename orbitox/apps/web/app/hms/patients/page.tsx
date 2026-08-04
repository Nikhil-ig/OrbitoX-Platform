'use client';

import React from 'react';
import PlatformLayout from '../../(platform)/layout';
import { DynamicTable, ColumnDef, Button } from '@orbitox/ui';

interface PatientRow {
  id: string;
  mrn: string;
  name: string;
  age: number;
  bloodGroup: string;
  primaryDoctor: string;
  status: string;
}

const columns: ColumnDef<PatientRow>[] = [
  { key: 'mrn', header: 'MRN' },
  { key: 'name', header: 'Patient Name' },
  { key: 'age', header: 'Age' },
  { key: 'bloodGroup', header: 'Blood Group' },
  { key: 'primaryDoctor', header: 'Attending Doctor' },
  {
    key: 'status',
    header: 'Admission Status',
    render: (row) => (
      <span
        style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          background: row.status === 'admitted' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          color: row.status === 'admitted' ? '#60a5fa' : '#4ade80',
        }}
      >
        {row.status.toUpperCase()}
      </span>
    ),
  },
];

const mockData: PatientRow[] = [
  { id: 'pat-1', mrn: 'MRN-90812', name: 'Robert Vance', age: 48, bloodGroup: 'O+', primaryDoctor: 'Dr. House', status: 'admitted' },
  { id: 'pat-2', mrn: 'MRN-90813', name: 'Clara Oswald', age: 29, bloodGroup: 'A-', primaryDoctor: 'Dr. Watson', status: 'outpatient' },
];

export default function PatientsPage() {
  return (
    <PlatformLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0' }}>Healthcare Patient Records (HMS)</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Plugin: @orbitox/hms v1.0.0</p>
          </div>
          <Button variant="primary">+ Register Patient</Button>
        </div>

        <DynamicTable columns={columns} data={mockData} />
      </div>
    </PlatformLayout>
  );
}
