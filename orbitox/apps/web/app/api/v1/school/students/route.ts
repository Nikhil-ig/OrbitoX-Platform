import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../../_lib/api-guard';

const STUDENTS = [
  {
    studentId: 'STU-2026-001',
    name: 'Aiden Alexander Clark',
    gradeCohort: 'Grade 11 — Advanced Stem Honours',
    enrollmentStatus: 'enrolled_active',
    tuitionFeeStatus: 'settled',
    gpa: 3.92,
    attendanceRate: 98.4,
    parentEmail: 'clark.family@stanford-horizon.org',
    enrolledCourses: ['AP Physics C', 'Differential Calculus', 'Data Structures in TS'],
  },
  {
    studentId: 'STU-2026-002',
    name: 'Chloe Isabella Chen',
    gradeCohort: 'Grade 12 — Global Humanities & Pre-Law',
    enrollmentStatus: 'enrolled_active',
    tuitionFeeStatus: 'settled',
    gpa: 4.0,
    attendanceRate: 99.1,
    parentEmail: 'chen.parents@stanford-horizon.org',
    enrolledCourses: ['AP World History', 'Mock Trial & Forensics', 'Bioethics'],
  },
  {
    studentId: 'STU-2026-003',
    name: 'Lucas Mateo Rodriguez',
    gradeCohort: 'Grade 10 — Computer Science Foundations',
    enrollmentStatus: 'enrolled_active',
    tuitionFeeStatus: 'invoice_sent',
    gpa: 3.85,
    attendanceRate: 97.2,
    parentEmail: 'rodriguez.family@stanford-horizon.org',
    enrolledCourses: ['Python & Algorithms', 'Linear Algebra', 'Digital Art & UX'],
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'school',
    serviceName: 'School & Campus OS',
  },
  async (req: NextRequest) => {
    return NextResponse.json({
      success: true,
      data: STUDENTS,
      meta: {
        totalEnrolled: STUDENTS.length,
        averageAttendance: 98.2,
        academicTerm: 'Fall 2026 / Spring 2027',
      },
    });
  }
);
