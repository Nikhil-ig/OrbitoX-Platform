import * as crypto from 'crypto';
import { EventBusService } from '@orbitox/core';
import { EnrollStudentPayload, EnrollmentStatus, Student } from './types';
import { SchoolStateMachine } from './school-state-machine';

export class HeadlessSchoolService {
  constructor(
    private readonly eventBus: EventBusService,
    // Database injected via constructor in real apps
    private readonly mockDb: Map<string, Student> = new Map()
  ) {}

  async apply(payload: EnrollStudentPayload, contextId: string): Promise<Student> {
    const student: Student = {
      id: `student_${crypto.randomUUID()}`,
      studentId: `STU-${crypto.randomInt(1000, 10000)}`,
      ...payload,
      status: 'APPLIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.mockDb.set(student.id, student);

    await this.eventBus.emit('school.student.applied', { studentId: student.id }, contextId, 'SchoolService');
    return student;
  }

  async updateStatus(studentId: string, newStatus: EnrollmentStatus, contextId: string): Promise<Student> {
    const student = this.mockDb.get(studentId);
    if (!student) throw new Error(`Student ${studentId} not found`);

    SchoolStateMachine.validateTransition(student.status, newStatus);
    
    student.status = newStatus;
    student.updatedAt = new Date().toISOString();
    this.mockDb.set(student.id, student);

    await this.eventBus.emit('school.student.status_changed', { studentId: student.id, status: newStatus }, contextId, 'SchoolService');
    return student;
  }

  async getStudent(studentId: string): Promise<Student | undefined> {
    return this.mockDb.get(studentId);
  }
}
