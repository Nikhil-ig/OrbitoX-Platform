import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../../_lib/api-guard';

const EMPLOYEES = [
  {
    employeeId: 'EMP-9021',
    name: 'Dr. Marcus Vance',
    role: 'Chief Medical Attending (ICU/ER)',
    department: 'Acute Critical Care',
    shiftStatus: 'on_duty',
    rosterSchedule: 'Mon-Thu Night Shift (07:00 - 19:00)',
    contactEmail: 'm.vance@mednet-health.org',
    activeBadges: ['ICU_ACCESS', 'NARCOTICS_VAULT_LEVEL3'],
  },
  {
    employeeId: 'EMP-4102',
    name: 'Sophia Martinez',
    role: 'VP of Platform & Kitchen Mesh Operations',
    department: 'Core Logistics',
    shiftStatus: 'active',
    rosterSchedule: 'Standard Core Hours (09:00 - 18:00)',
    contactEmail: 's.martinez@omnideliver.global',
    activeBadges: ['ALL_DISPATCH_HUBS', 'HQ_ROOT'],
  },
  {
    employeeId: 'EMP-1192',
    name: 'Dr. Elena Rostova',
    role: 'Lead Trauma Surgeon',
    department: 'Surgical Operations',
    shiftStatus: 'on_call',
    rosterSchedule: 'Emergency 24hr On-Call Rotation',
    contactEmail: 'e.rostova@mednet-health.org',
    activeBadges: ['SURGERY_OT_SUITE', 'TRAUMA_BAY'],
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'hrms',
    serviceName: 'HRMS & Workforce Suite',
  },
  async (req: NextRequest) => {
    return NextResponse.json({
      success: true,
      data: EMPLOYEES,
      meta: {
        totalHeadcount: EMPLOYEES.length,
        activeOnDuty: 2,
        onCallCount: 1,
      },
    });
  }
);
