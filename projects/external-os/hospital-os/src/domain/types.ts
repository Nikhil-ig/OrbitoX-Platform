// ─── Domain Types for Enterprise Hospital OS ─────────────────────────

// ─── 1. Organizational Hierarchy ───────────────────────────────
export type HospitalContextType =
  | 'organisation'
  | 'tenant'
  | 'department'
  | 'ward'
  | 'room'
  | 'bed';

export type ContextType = HospitalContextType;

export interface HospitalContextNode {
  id: string;
  name: string;
  type: HospitalContextType;
  parentId?: string;
  children?: HospitalContextNode[];
  meta?: Record<string, any>;
}

// ─── 2. Staff & Clinical Roles ─────────────────────────────────
export type StaffRole =
  | 'super_admin'
  | 'facility_director'
  | 'department_head'
  | 'attending_doctor'
  | 'specialist_doctor'
  | 'head_nurse'
  | 'staff_nurse'
  | 'pharmacist'
  | 'lab_technician';

export type ClinicalRole = StaffRole; // alias for backwards compatibility

export interface StaffEntity {
  id: string;
  name: string;
  role: StaffRole;
  customTitle?: string;
  departmentId: string;
  departmentName?: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  accessPin?: string; // 6-digit PIN or password for clinical login
  tempPassword?: string; // Onboarding credential
  avatarUrl?: string;
  shiftSchedule: 'day' | 'night' | 'rotating';
  isOnDuty: boolean;
  contextId: string; // references HospitalContext node (e.g. org/branch/dept/ward/room/bed)
  contextType?: HospitalContextType;
  contextName?: string;
  status?: 'active' | 'on_leave' | 'suspended' | 'deactivated';
  permissions?: string[]; // optional explicit granular permission capabilities override
  lastActive?: string;
  lastLogin?: string;
  meta?: Record<string, any>;
}

// ─── 3. Medical Devices & IoT Machinery ────────────────────────
export type DeviceCategory =
  | 'multi_para_vitals_monitor'
  | 'mechanical_ventilator'
  | 'infusion_pump'
  | 'defibrillator_crash_cart'
  | 'dialysis_machine'
  | 'ecg_telemetry_transmitter'
  | 'pulse_oximeter'
  | 'capnograph';

export interface DeviceTelemetryPoint {
  heartRate: number; // bpm
  spO2: number; // %
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  respiratoryRate: number; // breaths/min
  temperature: number; // Celsius
  etCO2?: number; // mmHg
  timestamp: string; // ISO 8601
}

export interface VitalsSnapshot {
  timestamp: string;
  heartRate: number;
  bloodPressure?: string;
  systolicBP?: number;
  diastolicBP?: number;
  spo2: number;
  temperature?: number;
  respiratoryRate?: number;
}

export interface DeviceSpecs {
  model: string;
  manufacturer: string;
  serialNumber: string;
  firmwareVersion: string;
  ipAddress?: string;
  macAddress?: string;
}

export interface AttachedEquipment {
  deviceId: string;
  deviceType: DeviceCategory;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  status: 'online' | 'standby' | 'alarm' | 'offline' | 'calibrating';
  lastPing?: string;
  telemetry?: DeviceTelemetryPoint;
}

// ─── 4. Beds & Clinical Stations ───────────────────────────────
export type BedType =
  | 'icu'
  | 'standard'
  | 'semi_private'
  | 'private_suite'
  | 'pediatric'
  | 'neonatal_incubator'
  | 'emergency_trauma_bay'
  | 'operating_theatre_table'
  | 'recovery_pacu'
  | 'temporary_surge'
  | 'burn_unit'
  | 'isolation_negative_pressure'
  | 'isolation_positive_pressure'
  | 'dialysis_station'
  | 'labor_delivery';

export type BedStatus =
  | 'available'
  | 'reserved'
  | 'occupied'
  | 'discharging'
  | 'sanitizing'
  | 'maintenance'
  | 'transferred'
  | 'condemned';

export interface BedFeatures {
  isBariatric?: boolean;
  hasAirLossMattress?: boolean;
  hasIntegratedScale?: boolean;
  hasDialysisPort?: boolean;
  hasNegativePressure?: boolean;
  hasPendantOxygen?: boolean;
}

export interface TelemetryThresholds {
  hrMin?: number;
  hrMax?: number;
  spO2Min?: number;
  sysBPMin?: number;
  sysBPMax?: number;
  tempMax?: number;
  minSpO2?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  maxTemperature?: number;
  minTemperature?: number;
  maxRespiratoryRate?: number;
}

export type MedicalDeviceType =
  | 'multi_para_vitals_monitor'
  | 'mechanical_ventilator'
  | 'infusion_syringe_pump'
  | 'defibrillator_crash_cart'
  | 'dialysis_unit'
  | 'pulse_oximeter_standalone'
  | 'ecmo_circuit'
  | string;

export interface AttachedMedicalDevice {
  deviceId: string;
  deviceType: MedicalDeviceType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: 'online' | 'offline' | 'calibrating' | 'error' | string;
  lastCalibrationDate: string;
  nextMaintenanceDue: string;
  telemetryTopic: string;
}

export interface BedEntity {
  id: string;
  label: string;
  wardId: string;
  roomId?: string;
  type: BedType;
  status: BedStatus;
  isTemporary: boolean;
  attachedEquipment: (AttachedEquipment | AttachedMedicalDevice)[];
  features?: BedFeatures;
  telemetryThresholds?: TelemetryThresholds;
  dailyRate: number;
  lastSanitizedAt?: string;
  lastMaintenanceAt?: string;
}

// ─── 5. Patient Domain ─────────────────────────────────────────
export type PatientStatus =
  | 'pre_registered'
  | 'registered'
  | 'triage'
  | 'outpatient'
  | 'admitted'
  | 'in_surgery'
  | 'recovering'
  | 'discharging'
  | 'discharged'
  | 'deceased';

export type PatientCategory =
  | 'general'
  | 'vip'
  | 'pediatric'
  | 'geriatric'
  | 'maternity'
  | 'psychiatric'
  | 'trauma';

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relation?: string;
}

export interface PatientInsurance {
  provider: string;
  policyNumber: string;
  type: 'private' | 'government' | 'corporate' | 'self_pay';
}

export interface PatientEntity {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  bloodGroup: string;
  category: PatientCategory;
  bedId?: string;
  status: PatientStatus;
  attendingDoctorId: string;
  triageLevel?: 1 | 2 | 3 | 4 | 5;
  phone?: string;
  email?: string;
  diagnosis?: string;
  allergies?: string[];
  emergencyContact?: EmergencyContact;
  insurance?: PatientInsurance;
  clinicalNotes?: string;
  registeredAt?: string;
  admittedAt?: string;
  dischargedAt?: string;
}

// ─── 6. Medical Records & Vitals ───────────────────────────────
export type MedicalRecordType =
  | 'progress_note'
  | 'admission_history_physical'
  | 'consultation_note'
  | 'operative_report'
  | 'discharge_summary'
  | 'nursing_assessment'
  | 'initial_assessment'
  | 'triage_evaluation';

export interface MedicalRecordEntity {
  id: string;
  patientId: string;
  doctorId: string;
  type: MedicalRecordType;
  diagnosis: string;
  icdCode?: string;
  clinicalNotes: string;
  vitalsSnapshot?: DeviceTelemetryPoint;
  vitals?: any;
  timestamp: string;
}

// ─── 7. Prescriptions & Pharmacy (eMAR) ─────────────────────────
export type TreatmentType =
  | 'medication'
  | 'procedure'
  | 'surgery'
  | 'therapy'
  | 'blood_transfusion'
  | 'radiotherapy';

export type TreatmentStatus =
  | 'ordered'
  | 'pharmacy_verified'
  | 'dispensed'
  | 'administered'
  | 'completed'
  | 'cancelled';

export interface TreatmentEntity {
  id: string;
  recordId: string;
  patientId: string;
  prescribedByDoctorId: string;
  type: TreatmentType;
  procedureOrDrug: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  status: TreatmentStatus;
  verifiedByPharmacistId?: string;
  administeredByNurseId?: string;
  orderedAt?: string;
  dispensedAt?: string;
  administeredAt?: string;
}

// ─── 8. Pathology & Lab Orders ──────────────────────────────────
export type LabTestType =
  | 'complete_blood_count'
  | 'basic_metabolic_panel'
  | 'cardiac_enzymes_troponin'
  | 'arterial_blood_gas'
  | 'urinalysis'
  | 'coagulation_pt_inr'
  | 'blood_cultures';

export type LabPriority = 'routine' | 'urgent' | 'stat';

export type LabStatus =
  | 'ordered'
  | 'sample_collected'
  | 'in_progress'
  | 'completed'
  | 'critical_result';

export interface LabOrderEntity {
  id: string;
  patientId: string;
  orderedByDoctorId: string;
  testType: LabTestType;
  priority: LabPriority;
  status: LabStatus;
  results?: Record<string, any>;
  isCriticalValue: boolean;
  orderedAt?: string;
  completedAt?: string;
}

// ─── 9. Billing, Invoicing & Insurance Claims ───────────────────
export type InvoiceStatus =
  | 'draft'
  | 'finalized'
  | 'paid'
  | 'insurance_pending'
  | 'disputed'
  | 'written_off';

export interface InvoiceLineItem {
  description: string;
  category: 'bed_charge' | 'medication' | 'procedure' | 'lab' | 'consultation';
  unitCost: number;
  quantity: number;
  totalCost: number;
}

export interface InvoiceEntity {
  id: string;
  patientId: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  insuranceCoverage: number;
  patientDue: number;
  status: InvoiceStatus;
  issuedAt?: string;
  settledAt?: string;
  generatedAt?: string;
  insuranceProvider?: string;
  policyNumber?: string;
}
