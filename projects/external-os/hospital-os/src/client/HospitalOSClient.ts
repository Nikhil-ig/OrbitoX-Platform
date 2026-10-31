import type {
  BedEntity,
  PatientEntity,
  TreatmentEntity,
  StaffEntity,
  LabOrderEntity,
  InvoiceEntity,
  HospitalContextNode,
  VitalsSnapshot
} from '../domain/types';

export interface HospitalOSClientConfig {
  baseUrl?: string;
  contextId?: string;
  staffId?: string;
}

export interface BedWithPatient extends BedEntity {
  patient?: PatientEntity | null;
}

export interface HierarchyTreeNode {
  id: string;
  name: string;
  type: 'organisation' | 'tenant' | 'department' | 'ward' | 'room' | 'bed';
  children?: HierarchyTreeNode[];
  depth?: number;
  path?: string;
}

/**
 * 🏥 HospitalOSClient — Universal JavaScript / TypeScript Client SDK
 *
 * Provides a clean, typed, isomorphic API for connecting to any OrbitoX Hospital OS instance.
 * Works seamlessly in React, Next.js, Vue, Svelte, Node.js, and server-side automation scripts.
 *
 * @example
 * ```typescript
 * import { HospitalOSClient } from 'hospital-os';
 *
 * const client = new HospitalOSClient({ baseUrl: 'http://localhost:3000' });
 * const beds = await client.getBeds();
 * const patient = await client.admitPatient({ name: 'Tony Stark', age: 48, bedId: 'bed-101-a', diagnosis: 'STEMI' });
 * ```
 */
export class HospitalOSClient {
  private baseUrl: string;
  private contextId?: string;
  private staffId?: string;

  constructor(config: HospitalOSClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/api/hospital';
    this.contextId = config.contextId;
    this.staffId = config.staffId || 'admin_root_01';
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.contextId) h['x-context-id'] = this.contextId;
    if (this.staffId) h['x-staff-id'] = this.staffId;
    return h;
  }

  // ─── 1. Beds & Infrastructure ────────────────────────────────────

  /**
   * Get all live beds with active patient assignments
   */
  async getBeds(): Promise<BedWithPatient[]> {
    const res = await fetch(`${this.baseUrl}/beds`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch beds');
    return data.data || [];
  }

  /**
   * Provision a new bed station
   */
  async provisionBed(params: Partial<BedEntity>): Promise<BedEntity> {
    const res = await fetch(`${this.baseUrl}/beds`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to provision bed');
    return data.bed;
  }

  /**
   * Update bed configuration or status
   */
  async updateBed(bedId: string, updates: Partial<BedEntity>): Promise<BedEntity> {
    const res = await fetch(`${this.baseUrl}/beds/${bedId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update bed');
    return data.bed;
  }

  /**
   * Discharge patient from bed station and start sanitization
   */
  async dischargeBed(bedId: string): Promise<{ bed: BedEntity; dischargedPatient?: PatientEntity }> {
    const res = await fetch(`${this.baseUrl}/beds/${bedId}/discharge`, {
      method: 'POST',
      headers: this.headers
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to discharge bed');
    return { bed: data.bed, dischargedPatient: data.dischargedPatient };
  }

  /**
   * Complete bed sanitization turnover and mark available
   */
  async turnoverBed(bedId: string): Promise<BedEntity> {
    const res = await fetch(`${this.baseUrl}/beds/${bedId}/turnover`, {
      method: 'POST',
      headers: this.headers
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to turnover bed');
    return data.bed;
  }

  // ─── 2. Context Hierarchy ────────────────────────────────────────

  /**
   * Get 6-Tier Hierarchy Tree
   */
  async getHierarchy(): Promise<{ tree: HierarchyTreeNode; allContexts: HospitalContextNode[] }> {
    const res = await fetch(`${this.baseUrl}/hierarchy`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch hierarchy');
    return { tree: data.tree, allContexts: data.allContexts || [] };
  }

  /**
   * Get Live Departments & Wards
   */
  async getDepartmentsAndWards(): Promise<{ departments: any[]; wards: any[] }> {
    const res = await fetch(`${this.baseUrl}/departments`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch departments');
    return { departments: data.departments || [], wards: data.wards || [] };
  }

  /**
   * Provision a new Hierarchy Context Node
   */
  async addHierarchyNode(params: {
    name: string;
    type: 'organisation' | 'tenant' | 'department' | 'ward' | 'room' | 'bed';
    parentId?: string;
    meta?: any;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/contexts`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create context node');
    return data.context || data.node;
  }

  // ─── 3. Patients & Clinical Intake ───────────────────────────────

  /**
   * List all registered and admitted patients
   */
  async getPatients(): Promise<PatientEntity[]> {
    const res = await fetch(`${this.baseUrl}/patients`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch patients');
    return data.data || [];
  }

  /**
   * Register or admit a patient (Atomic Persistence)
   */
  async admitPatient(params: {
    patientId?: string;
    name?: string;
    age?: number;
    gender?: 'M' | 'F' | 'Other';
    bloodGroup?: string;
    bedId?: string;
    status?: string;
    diagnosis?: string;
    attendingDoctorId?: string;
    triageLevel?: number;
    phone?: string;
    email?: string;
    allergies?: string | string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    insuranceProvider?: string;
    policyNumber?: string;
    clinicalNotes?: string;
  }): Promise<PatientEntity> {
    const res = await fetch(`${this.baseUrl}/admissions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Patient admission failed');
    return data.patient;
  }

  /**
   * Update patient details or clinical status
   */
  async updatePatient(patientId: string, updates: Partial<PatientEntity>): Promise<PatientEntity> {
    const res = await fetch(`${this.baseUrl}/patients/${patientId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update patient');
    return data.patient;
  }

  /**
   * Assign an existing patient to a bed station
   */
  async assignPatientToBed(patientId: string, bedId: string, doctorId?: string): Promise<{ patient: PatientEntity; bed: BedEntity }> {
    const res = await fetch(`${this.baseUrl}/patients/${patientId}/admit`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ bedId, doctorId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to assign patient to bed');
    return { patient: data.patient, bed: data.bed };
  }

  /**
   * Discharge patient from hospital inpatient care
   */
  async dischargePatient(patientId: string, staffId?: string): Promise<PatientEntity> {
    const res = await fetch(`${this.baseUrl}/patients/${patientId}/discharge`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ staffId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to discharge patient');
    return data.patient;
  }

  /**
   * Delete a patient record
   */
  async deletePatient(patientId: string, staffId?: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/patients/${patientId}`, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify({ staffId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete patient');
    return true;
  }

  // ─── 4. Pharmacy & eMAR ──────────────────────────────────────────

  /**
   * Get medication and treatment queue
   */
  async getTreatments(): Promise<TreatmentEntity[]> {
    const res = await fetch(`${this.baseUrl}/treatments`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch treatments');
    return data.data || [];
  }

  /**
   * Prescribe a medication or treatment
   */
  async prescribeMedication(params: {
    patientId: string;
    drugName: string;
    dosage: string;
    frequency?: string;
    route?: string;
    doctorId?: string;
  }): Promise<TreatmentEntity> {
    const res = await fetch(`${this.baseUrl}/treatments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to prescribe medication');
    return data.treatment;
  }

  /**
   * 5-Rights Pharmacy Dispense
   */
  async dispenseMedication(treatmentId: string, staffId = 'pharmacist_pepper_01'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/treatments/${treatmentId}/dispense`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ staffId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Dispense failed');
    return data.updated || data.treatment;
  }

  /**
   * Bedside Nurse Administration
   */
  async administerMedication(treatmentId: string, staffId = 'nurse_palmer_01'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/treatments/${treatmentId}/administer`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ staffId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Administration failed');
    return data.updated || data.treatment;
  }

  // ─── 5. Staff & Security Governance ─────────────────────────────

  /**
   * List staff members with optional filters
   */
  async getStaff(filters?: { role?: string; departmentId?: string; status?: string; search?: string }): Promise<StaffEntity[]> {
    const query = filters ? `?${new URLSearchParams(filters as any).toString()}` : '';
    const res = await fetch(`${this.baseUrl}/security/staff${query}`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch staff directory');
    return data.data || [];
  }

  /**
   * Provision a new clinical staff member
   */
  async createStaff(staffData: Partial<StaffEntity>): Promise<StaffEntity> {
    const res = await fetch(`${this.baseUrl}/security/staff`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(staffData)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to provision staff member');
    return data.data;
  }

  /**
   * Update a staff member's details or role
   */
  async updateStaff(id: string, updates: Partial<StaffEntity>): Promise<StaffEntity> {
    const res = await fetch(`${this.baseUrl}/security/staff/${id}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update staff member');
    return data.data;
  }

  /**
   * Authenticate clinical staff member
   */
  async authenticateStaff(identifier: string, pinOrPassword: string): Promise<{ success: boolean; staff?: StaffEntity; token?: string; error?: string }> {
    const res = await fetch(`${this.baseUrl}/security/login`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ identifier, pinOrPassword })
    });
    return res.json();
  }

  /**
   * Toggle staff On-Duty status
   */
  async toggleStaffDuty(id: string, isOnDuty: boolean): Promise<StaffEntity> {
    const res = await fetch(`${this.baseUrl}/security/staff/${id}/toggle-duty`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ isOnDuty })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to toggle duty');
    return data.data;
  }

  // ─── 6. Appointments & Clinical Scheduling ───────────────────────

  /**
   * List all hospital appointments
   */
  async getAppointments(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/appointments`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch appointments');
    return data.data || [];
  }

  /**
   * Create a new appointment
   */
  async createAppointment(appointment: {
    patientName: string;
    doctor: string;
    type: string;
    time?: string;
    date?: string;
    room?: string;
    status?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/appointments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(appointment)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create appointment');
    return data.appointment;
  }

  /**
   * Update appointment status or time
   */
  async updateAppointment(id: string, updates: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/appointments/${id}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update appointment');
    return data.appointment;
  }

  /**
   * Delete or cancel an appointment
   */
  async deleteAppointment(id: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/appointments/${id}`, {
      method: 'DELETE',
      headers: this.headers
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete appointment');
    return true;
  }

  // ─── 7. Diagnostics, IoT Telemetry & Labs ────────────────────────

  /**
   * Order a Pathology Lab Test
   */
  async orderLabTest(params: {
    patientId: string;
    doctorId: string;
    testType: string;
    priority?: 'routine' | 'urgent' | 'stat';
    clinicalNotes?: string;
  }): Promise<LabOrderEntity> {
    const res = await fetch(`${this.baseUrl}/labs`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to order lab test');
    return data.order;
  }

  /**
   * Stream Real-Time Bedside IoT Telemetry
   */
  async streamTelemetry(bedId: string, vitals: Partial<VitalsSnapshot>): Promise<any> {
    const res = await fetch(`${this.baseUrl}/telemetry`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        bedId,
        vitals: {
          spo2: 98,
          heartRate: 75,
          bloodPressure: '120/80',
          temperature: 37.0,
          respiratoryRate: 16,
          timestamp: new Date().toISOString(),
          ...vitals
        }
      })
    });
    return res.json();
  }

  // ─── 7B. Pathology & Diagnostic Laboratories ───────────────────

  /**
   * List lab orders with optional patient filter
   */
  async getLabOrders(filters?: { patientId?: string }): Promise<any[]> {
    const query = filters?.patientId ? `?patientId=${filters.patientId}` : '';
    const res = await fetch(`${this.baseUrl}/labs${query}`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch lab orders');
    return data.data || [];
  }


  /**
   * Submit / report diagnostic lab findings & evaluate critical alerts
   */
  async reportLabResult(orderId: string, params: {
    resultSummary: string;
    numericValue?: number;
    isCriticalValue?: boolean;
    technicianId?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/labs/${orderId}/results`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to report lab result');
    return data.updated;
  }

  // ─── 8. Billing, Statistics & Dashboard ──────────────────────────

  /**
   * List itemized invoices & billing records
   */
  async getInvoices(filters?: { patientId?: string }): Promise<any[]> {
    const query = filters?.patientId ? `?patientId=${filters.patientId}` : '';
    const res = await fetch(`${this.baseUrl}/billing${query}`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch invoices');
    return data.data || [];
  }

  /**
   * Settle invoice payment
   */
  async payInvoice(
    invoiceId: string,
    paymentMethodOrParams?: string | { paymentMethod?: string; amount?: number },
    amount?: number
  ): Promise<any> {
    const payload = typeof paymentMethodOrParams === 'string'
      ? { paymentMethod: paymentMethodOrParams, amount }
      : (paymentMethodOrParams || {});

    const res = await fetch(`${this.baseUrl}/billing/pay/${invoiceId}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to pay invoice');
    return data.invoice;
  }

  /**
   * Generate itemized discharge invoice
   */
  async generateDischargeBill(patientId: string): Promise<InvoiceEntity> {
    const res = await fetch(`${this.baseUrl}/billing/discharge`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ patientId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to generate discharge bill');
    return data.invoice;
  }

  /**
   * Get real hospital statistics
   */
  async getStats(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/stats`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch hospital statistics');
    return data.stats;
  }

  /**
   * Get role-based dashboard metrics & widgets
   */
  async getDashboard(role = 'attending_doctor'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/dashboard`, {
      headers: { ...this.headers, 'x-staff-role': role }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch dashboard');
    return data.dashboard;
  }

  /**
   * Emergency Break-Glass Security Override
   */
  async requestBreakGlass(params: { doctorId: string; reason: string; patientId?: string }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security/break-glass`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        ...params,
        patientId: params.patientId || 'EMERGENCY_GLOBAL_OVERRIDE'
      })
    });
    return res.json();
  }

  /**
   * Query Cryptographic SHA-256 Audit Ledger
   */
  async getAuditLogs(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/audit`, { headers: this.headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch audit logs');
    return data.data || [];
  }
}
