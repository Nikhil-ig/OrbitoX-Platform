import { OrbitoXEntity } from '@orbitox/runtime';

export const hospitalEntityConfigs: OrbitoXEntity[] = [
  {
    id: 'staff',
    name: 'Staff',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'role', type: 'text', required: true },
      { name: 'customTitle', type: 'text' },
      { name: 'departmentId', type: 'text', required: true },
      { name: 'email', type: 'text', required: true },
      { name: 'phone', type: 'text' },
      { name: 'licenseNumber', type: 'text', required: true },
      { name: 'shiftSchedule', type: 'enum', options: ['day', 'night', 'rotating'], default: 'day' },
      { name: 'isOnDuty', type: 'boolean', default: true },
      { name: 'contextId', type: 'text' },
      { name: 'contextType', type: 'text' },
      { name: 'contextName', type: 'text' },
      { name: 'status', type: 'enum', options: ['active', 'on_leave', 'suspended', 'deactivated'], default: 'active' },
      { name: 'permissions', type: 'json' },
      { name: 'lastActive', type: 'text' }
    ]
  },
  {
    id: 'bed',
    name: 'Bed',
    fields: [
      { name: 'label', type: 'text', required: true },
      { name: 'wardId', type: 'text', required: true },
      { name: 'roomId', type: 'text' },
      { name: 'type', type: 'text', default: 'standard' },
      { name: 'status', type: 'enum', options: ['available', 'reserved', 'occupied', 'discharging', 'sanitizing', 'maintenance', 'transferred', 'condemned'], default: 'available' },
      { name: 'isTemporary', type: 'boolean', default: false },
      { name: 'dailyRate', type: 'number', default: 250 }
    ]
  },
  {
    id: 'patient',
    name: 'Patient',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'age', type: 'number', required: true },
      { name: 'gender', type: 'enum', options: ['M', 'F', 'Other'], required: true },
      { name: 'bloodGroup', type: 'text', required: true },
      { name: 'category', type: 'text', default: 'general' },
      { name: 'bedId', type: 'text' },
      { name: 'status', type: 'enum', options: ['pre_registered', 'registered', 'triage', 'outpatient', 'admitted', 'in_surgery', 'recovering', 'discharging', 'discharged', 'deceased'], default: 'pre_registered' },
      { name: 'attendingDoctorId', type: 'text', required: true },
      { name: 'diagnosis', type: 'text' },
      { name: 'triageLevel', type: 'number', default: 3 },
      { name: 'phone', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'allergies', type: 'text' },
      { name: 'emergencyContact', type: 'json' },
      { name: 'insurance', type: 'json' },
      { name: 'clinicalNotes', type: 'text' },
      { name: 'registeredAt', type: 'text' },
      { name: 'admittedAt', type: 'text' },
      { name: 'dischargedAt', type: 'text' }
    ]
  },

  {
    id: 'medical_record',
    name: 'MedicalRecord',
    fields: [
      { name: 'patientId', type: 'text', required: true },
      { name: 'doctorId', type: 'text', required: true },
      { name: 'type', type: 'text', default: 'progress_note' },
      { name: 'diagnosis', type: 'text', required: true },
      { name: 'icdCode', type: 'text' },
      { name: 'clinicalNotes', type: 'text', required: true }
    ]
  },
  {
    id: 'treatment',
    name: 'Treatment',
    fields: [
      { name: 'recordId', type: 'text', required: true },
      { name: 'patientId', type: 'text', required: true },
      { name: 'prescribedByDoctorId', type: 'text', required: true },
      { name: 'type', type: 'enum', options: ['medication', 'procedure', 'surgery', 'therapy'], required: true },
      { name: 'procedureOrDrug', type: 'text', required: true },
      { name: 'dosage', type: 'text' },
      { name: 'frequency', type: 'text' },
      { name: 'route', type: 'text' },
      { name: 'status', type: 'enum', options: ['ordered', 'pharmacy_verified', 'dispensed', 'administered', 'completed', 'cancelled'], default: 'ordered' }
    ]
  },
  {
    id: 'lab_order',
    name: 'LabOrder',
    fields: [
      { name: 'patientId', type: 'text', required: true },
      { name: 'orderedByDoctorId', type: 'text', required: true },
      { name: 'testType', type: 'text', required: true },
      { name: 'priority', type: 'enum', options: ['routine', 'urgent', 'stat'], default: 'routine' },
      { name: 'status', type: 'enum', options: ['ordered', 'sample_collected', 'in_progress', 'completed', 'critical_result'], default: 'ordered' },
      { name: 'isCriticalValue', type: 'boolean', default: false }
    ]
  },
  {
    id: 'invoice',
    name: 'Invoice',
    fields: [
      { name: 'patientId', type: 'text', required: true },
      { name: 'subtotal', type: 'number', required: true },
      { name: 'taxAmount', type: 'number', default: 0 },
      { name: 'insuranceCoverage', type: 'number', default: 0 },
      { name: 'patientDue', type: 'number', required: true },
      { name: 'status', type: 'enum', options: ['draft', 'finalized', 'paid', 'insurance_pending'], default: 'draft' }
    ]
  },
  {
    id: 'appointment',
    name: 'Appointment',
    fields: [
      { name: 'patientName', type: 'text', required: true },
      { name: 'doctor', type: 'text', required: true },
      { name: 'type', type: 'text', required: true },
      { name: 'time', type: 'text', required: true },
      { name: 'date', type: 'text', required: true },
      { name: 'room', type: 'text', required: true },
      { name: 'status', type: 'enum', options: ['Confirmed', 'Pending', 'Completed', 'Cancelled'], default: 'Confirmed' }
    ]
  }
];
