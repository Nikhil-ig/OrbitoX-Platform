import { useState, useCallback } from 'react';
import { Patient, PatientStatus, RegisterPatientPayload, HmsFilter } from '../domain/types';
import { HeadlessHmsService } from '../domain/hms-actions';

const defaultHmsService = new HeadlessHmsService([
  {
    id: 'pat-1',
    mrn: 'MRN-884920',
    name: 'David Miller',
    age: 45,
    gender: 'MALE',
    phone: '+1-555-0192',
    status: 'IN_TRIAGE',
    triageLevel: 'URGENT',
    primaryDoctor: 'Dr. House',
    medicalNotes: 'Chest discomfort, hypertension history.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pat-2',
    mrn: 'MRN-194029',
    name: 'Emma Watson',
    age: 29,
    gender: 'FEMALE',
    phone: '+1-555-0831',
    status: 'CONSULTING',
    triageLevel: 'ROUTINE',
    primaryDoctor: 'Dr. Watson',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);

export function usePatients(filter: HmsFilter = {}) {
  const [service] = useState(() => defaultHmsService);
  const [patients, setPatients] = useState<Patient[]>(() => service.filterPatients(filter));

  const refreshPatients = useCallback(() => {
    setPatients(service.filterPatients(filter));
  }, [service, filter]);

  return {
    patients,
    refreshPatients
  };
}

export function useHmsActions() {
  const [service] = useState(() => defaultHmsService);

  const registerPatient = useCallback((payload: RegisterPatientPayload): Patient => {
    return service.registerPatient(payload);
  }, [service]);

  const updatePatientStatus = useCallback((patientId: string, nextStatus: PatientStatus): Patient => {
    return service.updatePatientStatus(patientId, nextStatus);
  }, [service]);

  return {
    registerPatient,
    updatePatientStatus
  };
}
