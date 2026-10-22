// In-Memory Transactional Hospital Database for Resilient Standalone & Edge Execution

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  bloodGroup: string;
  category: string;
  triageLevel: number;
  diagnosis: string;
  status: 'pre_registered' | 'admitted' | 'triage' | 'outpatient' | 'discharged';
  bedLabel?: string;
  bedId?: string;
  roomNo?: string;
  email?: string;
  phone?: string;
  allergies?: string[];
  emergencyContact?: { name: string; phone: string; relation: string };
  insurance?: { provider: string; policyNumber: string; type: string };
  clinicalNotes?: string;
  attendingDoctorId?: string;
  registeredAt: string;
  admittedAt?: string;
  dischargedAt?: string;
  contextId?: string;
  vitals?: {
    bpSys: number;
    bpDia: number;
    heartRate: number;
    spo2: number;
    temperature: number;
    respRate: number;
    recordedAt: string;
  };
}

export interface Bed {
  id: string;
  label: string;
  wardId: string;
  wardName: string;
  dailyRate: number;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  patientId?: string;
  patientName?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'on_duty' | 'off_duty' | 'on_call';
  email: string;
}

export interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  testType: string;
  category: string;
  status: 'pending' | 'processing' | 'completed' | 'verified';
  orderedAt: string;
  completedAt?: string;
  doctorName: string;
  numericValue?: number;
  resultSummary?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  dateTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  reason: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  amountDue: number;
  amountPaid: number;
  status: 'pending' | 'partial' | 'paid' | 'cleared';
  items: Array<{ description: string; cost: number }>;
  issuedAt: string;
}

class HospitalInMemoryStore {
  private patients: Patient[] = [
    {
      id: 'pat-101',
      name: 'Eleanor Vance',
      age: 42,
      gender: 'F',
      bloodGroup: 'A+',
      category: 'emergency',
      triageLevel: 1,
      diagnosis: 'Acute Coronary Syndrome & Unstable Angina',
      status: 'admitted',
      bedLabel: 'ICU-B02',
      bedId: 'bed-icu-02',
      roomNo: 'ICU-East 201',
      phone: '+1 (555) 234-9812',
      allergies: ['Penicillin', 'Sulfa drugs'],
      clinicalNotes: 'Admitted via Emergency Trauma Bay. Heparin protocol active. ST elevation normalized post angioplasty.',
      attendingDoctorId: 'doc-01',
      registeredAt: '2026-09-08 08:30',
      admittedAt: '2026-09-08 09:15',
      vitals: {
        bpSys: 135,
        bpDia: 88,
        heartRate: 78,
        spo2: 97,
        temperature: 37.1,
        respRate: 16,
        recordedAt: 'Just now',
      },
    },
    {
      id: 'pat-102',
      name: 'Marcus Holloway',
      age: 31,
      gender: 'M',
      bloodGroup: 'O+',
      category: 'cardiology',
      triageLevel: 2,
      diagnosis: 'Supraventricular Tachycardia (SVT)',
      status: 'admitted',
      bedLabel: 'CARD-B04',
      bedId: 'bed-card-04',
      roomNo: 'Cardio 304',
      phone: '+1 (555) 432-1190',
      allergies: ['NKDA'],
      clinicalNotes: 'Adenosine push completed. Normal sinus rhythm restored at 72 bpm. Continuous telemetry monitoring enabled.',
      attendingDoctorId: 'doc-02',
      registeredAt: '2026-09-08 11:45',
      admittedAt: '2026-09-08 12:20',
      vitals: {
        bpSys: 120,
        bpDia: 80,
        heartRate: 72,
        spo2: 99,
        temperature: 36.8,
        respRate: 14,
        recordedAt: '10m ago',
      },
    },
    {
      id: 'pat-103',
      name: 'Sophia Chen',
      age: 26,
      gender: 'F',
      bloodGroup: 'B+',
      category: 'pediatric',
      triageLevel: 3,
      diagnosis: 'Severe Acute Bronchitis with Wheezing',
      status: 'admitted',
      bedLabel: 'GEN-B08',
      bedId: 'bed-gen-08',
      roomNo: 'General Ward 108',
      phone: '+1 (555) 876-5432',
      allergies: ['Aspirin'],
      clinicalNotes: 'Nebulization completed. Oxygen saturation steady on room air. Step-down transfer scheduled.',
      attendingDoctorId: 'doc-01',
      registeredAt: '2026-09-08 14:10',
      admittedAt: '2026-09-08 15:00',
      vitals: {
        bpSys: 115,
        bpDia: 74,
        heartRate: 82,
        spo2: 98,
        temperature: 37.4,
        respRate: 18,
        recordedAt: '25m ago',
      },
    },
    {
      id: 'pat-104',
      name: 'Arthur Pendelton',
      age: 68,
      gender: 'M',
      bloodGroup: 'AB-',
      category: 'general',
      triageLevel: 4,
      diagnosis: 'Post-Operative Total Knee Arthroplasty',
      status: 'outpatient',
      phone: '+1 (555) 901-2345',
      allergies: ['Codeine'],
      clinicalNotes: 'Physical therapy clearance given. Discharged home with outpatient follow-up in 2 weeks.',
      attendingDoctorId: 'doc-03',
      registeredAt: '2026-09-07 09:00',
      dischargedAt: '2026-09-09 10:00',
    },
  ];

  private beds: Bed[] = [
    { id: 'bed-icu-01', label: 'ICU-B01', wardId: 'ward-icu', wardName: 'Intensive Care Unit', dailyRate: 1850, status: 'available' },
    { id: 'bed-icu-02', label: 'ICU-B02', wardId: 'ward-icu', wardName: 'Intensive Care Unit', dailyRate: 1850, status: 'occupied', patientId: 'pat-101', patientName: 'Eleanor Vance' },
    { id: 'bed-icu-03', label: 'ICU-B03', wardId: 'ward-icu', wardName: 'Intensive Care Unit', dailyRate: 1850, status: 'available' },
    { id: 'bed-card-04', label: 'CARD-B04', wardId: 'ward-card', wardName: 'Cardiology Telemetry Ward', dailyRate: 1200, status: 'occupied', patientId: 'pat-102', patientName: 'Marcus Holloway' },
    { id: 'bed-card-05', label: 'CARD-B05', wardId: 'ward-card', wardName: 'Cardiology Telemetry Ward', dailyRate: 1200, status: 'available' },
    { id: 'bed-gen-08', label: 'GEN-B08', wardId: 'ward-gen', wardName: 'Acute Medical Care', dailyRate: 650, status: 'occupied', patientId: 'pat-103', patientName: 'Sophia Chen' },
    { id: 'bed-gen-09', label: 'GEN-B09', wardId: 'ward-gen', wardName: 'Acute Medical Care', dailyRate: 650, status: 'available' },
    { id: 'bed-gen-10', label: 'GEN-B10', wardId: 'ward-gen', wardName: 'Acute Medical Care', dailyRate: 650, status: 'available' },
  ];

  private staff: Staff[] = [
    { id: 'doc-01', name: 'Dr. Ashlynn Vance', role: 'department_head', department: 'Emergency & Critical Care', status: 'on_duty', email: 'ashlynn@hospital.orbito.com' },
    { id: 'doc-02', name: 'Dr. Ramesh Sharma', role: 'doctor_cardiology', department: 'Interventional Cardiology', status: 'on_duty', email: 'sharma@hospital.orbito.com' },
    { id: 'doc-03', name: 'Dr. Sarah Connor', role: 'doctor_orthopedics', department: 'Orthopedic Surgery', status: 'on_call', email: 'sarah@hospital.orbito.com' },
    { id: 'nurse-01', name: 'Nurse David Kim, RN', role: 'nurse_icu', department: 'Intensive Care Unit', status: 'on_duty', email: 'david.kim@hospital.orbito.com' },
  ];

  private labs: LabOrder[] = [
    { id: 'lab-901', patientId: 'pat-101', patientName: 'Eleanor Vance', testType: 'Troponin I High Sensitivity', category: 'Biochemistry', status: 'completed', orderedAt: 'Today, 09:30', completedAt: 'Today, 10:15', doctorName: 'Dr. Ashlynn Vance', numericValue: 0.02, resultSummary: 'Normal range post-intervention (< 0.04 ng/mL)' },
    { id: 'lab-902', patientId: 'pat-101', patientName: 'Eleanor Vance', testType: 'Complete Blood Count (CBC)', category: 'Hematology', status: 'completed', orderedAt: 'Today, 09:30', completedAt: 'Today, 10:20', doctorName: 'Dr. Ashlynn Vance', numericValue: 14.2, resultSummary: 'Hemoglobin 14.2 g/dL, Platelets 260K' },
    { id: 'lab-903', patientId: 'pat-102', patientName: 'Marcus Holloway', testType: 'Serum Electrolytes & Magnesium', category: 'Biochemistry', status: 'completed', orderedAt: 'Today, 12:30', completedAt: 'Today, 13:10', doctorName: 'Dr. Ramesh Sharma', numericValue: 4.1, resultSummary: 'Potassium 4.1 mEq/L, Mg 2.2 mg/dL - Stable' },
  ];

  private appointments: Appointment[] = [
    { id: 'apt-01', patientId: 'pat-101', patientName: 'Eleanor Vance', doctorId: 'doc-02', doctorName: 'Dr. Ramesh Sharma', department: 'Cardiology', dateTime: '2026-09-12 10:30', status: 'scheduled', reason: 'Post-Angioplasty Follow-Up' },
    { id: 'apt-02', patientId: 'pat-103', patientName: 'Sophia Chen', doctorId: 'doc-01', doctorName: 'Dr. Ashlynn Vance', department: 'Pediatrics', dateTime: '2026-09-15 14:00', status: 'scheduled', reason: 'Pulmonary Re-Evaluation' },
  ];

  private invoices: Invoice[] = [
    { id: 'inv-801', patientId: 'pat-101', patientName: 'Eleanor Vance', amountDue: 350, amountPaid: 3200, status: 'pending', items: [{ description: 'Emergency Angioplasty Stent Delivery', cost: 2800 }, { description: 'ICU Bed Stay (1 Night)', cost: 1850 }, { description: 'Insurance Coverage Deduction', cost: -4300 }], issuedAt: '2026-09-08' },
    { id: 'inv-802', patientId: 'pat-102', patientName: 'Marcus Holloway', amountDue: 0, amountPaid: 1440, status: 'cleared', items: [{ description: 'Cardiology Telemetry & Adenosine IV', cost: 1440 }], issuedAt: '2026-09-08' },
  ];

  // Patients CRUD
  getPatients() {
    return this.patients;
  }

  getPatientById(id: string) {
    return this.patients.find((p) => p.id === id);
  }

  addPatient(patientData: Partial<Patient>): Patient {
    const id = patientData.id || `pat-${Date.now()}`;
    const newPatient: Patient = {
      id,
      name: patientData.name || 'New Patient',
      age: Number(patientData.age) || 30,
      gender: patientData.gender || 'M',
      bloodGroup: patientData.bloodGroup || 'O+',
      category: patientData.category || 'general',
      triageLevel: Number(patientData.triageLevel) || 3,
      diagnosis: patientData.diagnosis || 'Clinical evaluation pending',
      status: (patientData.status as any) || 'pre_registered',
      bedLabel: patientData.bedLabel,
      bedId: patientData.bedId,
      roomNo: patientData.roomNo,
      phone: patientData.phone,
      email: patientData.email,
      allergies: patientData.allergies || ['NKDA'],
      clinicalNotes: patientData.clinicalNotes || 'Registered in clinical intake.',
      attendingDoctorId: patientData.attendingDoctorId || 'doc-01',
      registeredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      vitals: patientData.vitals,
    };

    // If bed is assigned, mark bed as occupied
    if (newPatient.bedId) {
      const bed = this.beds.find((b) => b.id === newPatient.bedId);
      if (bed) {
        bed.status = 'occupied';
        bed.patientId = newPatient.id;
        bed.patientName = newPatient.name;
        newPatient.bedLabel = bed.label;
      }
    }

    this.patients = [newPatient, ...this.patients];
    return newPatient;
  }

  updatePatient(id: string, updates: Partial<Patient>): Patient | null {
    const target = this.patients.find((p) => p.id === id);
    if (!target) return null;

    // Handle bed change
    if (updates.bedId && updates.bedId !== target.bedId) {
      // Free old bed
      const oldBed = this.beds.find((b) => b.id === target.bedId);
      if (oldBed) {
        oldBed.status = 'available';
        delete oldBed.patientId;
        delete oldBed.patientName;
      }
      // Occupy new bed
      const newBed = this.beds.find((b) => b.id === updates.bedId);
      if (newBed) {
        newBed.status = 'occupied';
        newBed.patientId = id;
        newBed.patientName = updates.name || target.name;
        updates.bedLabel = newBed.label;
      }
    }

    Object.assign(target, updates);
    return target;
  }

  deletePatient(id: string): boolean {
    const p = this.patients.find((item) => item.id === id);
    if (p?.bedId) {
      const bed = this.beds.find((b) => b.id === p.bedId);
      if (bed) {
        bed.status = 'available';
        delete bed.patientId;
        delete bed.patientName;
      }
    }
    this.patients = this.patients.filter((item) => item.id !== id);
    return true;
  }

  // Beds CRUD
  getBeds(): Bed[] {
    return this.beds;
  }

  updateBed(id: string, updates: Partial<Bed>): Bed | null {
    const bed = this.beds.find((b) => b.id === id);
    if (!bed) return null;
    Object.assign(bed, updates);
    return bed;
  }

  // Staff CRUD
  getStaff() {
    return this.staff;
  }

  // Labs CRUD
  getLabs(patientId?: string) {
    if (patientId) {
      return this.labs.filter((l) => l.patientId === patientId);
    }
    return this.labs;
  }

  addLab(labData: Partial<LabOrder>): LabOrder {
    const newLab: LabOrder = {
      id: `lab-${Date.now()}`,
      patientId: labData.patientId || 'pat-101',
      patientName: labData.patientName || 'Eleanor Vance',
      testType: labData.testType || 'Comprehensive Metabolic Panel (CMP)',
      category: labData.category || 'Biochemistry',
      status: labData.status || 'pending',
      orderedAt: 'Just now',
      doctorName: labData.doctorName || 'Dr. Ashlynn Vance',
      resultSummary: labData.resultSummary || 'In processing queue',
    };
    this.labs = [newLab, ...this.labs];
    return newLab;
  }

  // Appointments CRUD
  getAppointments() {
    return this.appointments;
  }

  addAppointment(aptData: Partial<Appointment>): Appointment {
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: aptData.patientId || 'pat-101',
      patientName: aptData.patientName || 'Eleanor Vance',
      doctorId: aptData.doctorId || 'doc-01',
      doctorName: aptData.doctorName || 'Dr. Ashlynn Vance',
      department: aptData.department || 'General Medicine',
      dateTime: aptData.dateTime || '2026-09-15 11:00',
      status: aptData.status || 'scheduled',
      reason: aptData.reason || 'General Consultation',
    };
    this.appointments = [newApt, ...this.appointments];
    return newApt;
  }

  // Invoices & Billing
  getInvoices(patientId?: string) {
    if (patientId) {
      return this.invoices.filter((i) => i.patientId === patientId);
    }
    return this.invoices;
  }

  getFinancialStats() {
    const totalRevenue = this.invoices.reduce((acc, i) => acc + i.amountPaid, 0);
    const outstandingDue = this.invoices.reduce((acc, i) => acc + i.amountDue, 0);
    return {
      totalRevenue,
      outstandingDue,
      collectionRate: '92.4%',
      activeInvoices: this.invoices.length,
    };
  }
}

// Global Singleton
export const hospitalStore = new HospitalInMemoryStore();
