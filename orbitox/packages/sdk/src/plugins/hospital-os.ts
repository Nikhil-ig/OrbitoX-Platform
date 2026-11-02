/**
 * 🪐 OrbitoX SDK - HospitalOS Typed Plugin Client
 */

import { HttpTransport } from '../transport';

export interface PatientRecord {
  id: string;
  mrn: string;
  name?: string;
  phone?: string;
  ageBand?: string;
  gender?: string;
  bloodGroup?: string;
  triageLevel?: string;
  allergies?: string[];
  createdAt: string;
  [key: string]: any;
}

export interface PatientCreateInput {
  name: string;
  mrn?: string;
  phone?: string;
  dateOfBirth?: string;
  ageBand?: string;
  gender?: string;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContact?: string;
  [key: string]: any;
}

export interface AppointmentRecord {
  id: string;
  patientId: string;
  departmentId?: string;
  doctorName?: string;
  scheduledAt?: string;
  status: string;
  [key: string]: any;
}

export interface AppointmentCreateInput {
  patientId: string;
  departmentId?: string;
  doctorName?: string;
  scheduledAt?: string;
  notes?: string;
  [key: string]: any;
}

export class HospitalOsClient {
  constructor(
    private readonly transport: HttpTransport,
    readonly tenantId: string,
    private readonly customHeaders: Record<string, string> = {}
  ) {}

  private get headers(): Record<string, string> {
    const slug = this.tenantId.includes('/project/')
      ? this.tenantId.split('/project/')[1]?.split('/')[0] || this.tenantId
      : this.tenantId;

    return {
      'x-tenant-id': this.tenantId,
      'x-tenant-slug': slug,
      ...this.customHeaders,
    };
  }

  readonly patients = {
    list: async (query?: { phone?: string; limit?: number }): Promise<PatientRecord[]> => {
      const res = await this.transport.request<{ success: boolean; data: PatientRecord[] }>({
        method: 'GET',
        path: '/api/hospital/patients',
        query,
        headers: this.headers,
      });
      return res.data || [];
    },

    get: async (patientId: string): Promise<PatientRecord> => {
      const res = await this.transport.request<{ success: boolean; data: PatientRecord }>({
        method: 'GET',
        path: `/api/hospital/patients/${encodeURIComponent(patientId)}`,
        headers: this.headers,
      });
      return res.data;
    },

    create: async (
      input: PatientCreateInput,
      options: { idempotencyKey?: string } = {}
    ): Promise<PatientRecord> => {
      const res = await this.transport.request<{ success: boolean; data: PatientRecord }>({
        method: 'POST',
        path: '/api/hospital/patients',
        body: input,
        headers: this.headers,
        idempotencyKey: options.idempotencyKey,
      });
      return res.data;
    },
  };

  readonly appointments = {
    list: async (): Promise<AppointmentRecord[]> => {
      const res = await this.transport.request<{ success: boolean; data: AppointmentRecord[] }>({
        method: 'GET',
        path: '/api/hospital/appointments',
        headers: this.headers,
      });
      return res.data || [];
    },

    create: async (
      input: AppointmentCreateInput,
      options: { idempotencyKey?: string } = {}
    ): Promise<AppointmentRecord> => {
      const res = await this.transport.request<{ success: boolean; data: AppointmentRecord }>({
        method: 'POST',
        path: '/api/hospital/appointments',
        body: input,
        headers: this.headers,
        idempotencyKey: options.idempotencyKey,
      });
      return res.data;
    },
  };

  readonly departments = {
    list: async (): Promise<any[]> => {
      const res = await this.transport.request<{ success: boolean; data: any[] }>({
        method: 'GET',
        path: '/api/hospital/departments',
        headers: this.headers,
      });
      return res.data || [];
    },
  };

  readonly beds = {
    list: async (): Promise<any[]> => {
      const res = await this.transport.request<{ success: boolean; data: any[] }>({
        method: 'GET',
        path: '/api/hospital/beds',
        headers: this.headers,
      });
      return res.data || [];
    },
  };

  readonly stats = {
    get: async (): Promise<Record<string, any>> => {
      const res = await this.transport.request<{ success: boolean; data: Record<string, any> }>({
        method: 'GET',
        path: '/api/hospital/stats',
        headers: this.headers,
      });
      return res.data || {};
    },
  };
}
