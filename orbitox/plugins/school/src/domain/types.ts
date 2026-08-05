export type EnrollmentStatus = 'APPLIED' | 'ENROLLED' | 'SUSPENDED' | 'GRADUATED' | 'DROPPED_OUT';

export interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gradeLevel: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gradeLevel: string;
}

export interface SchoolFilter {
  status?: EnrollmentStatus;
  gradeLevel?: string;
  search?: string;
}
