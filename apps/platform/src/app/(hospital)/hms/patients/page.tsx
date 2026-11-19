'use client';

import React, { useState, useEffect } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';
import Link from 'next/link';
import { useStaffAuth } from '../context/StaffAuthContext';
import { ClinicalAIEngine, News2ScoreResult } from '../services/ClinicalAIEngine';

interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  bloodGroup: string;
  category?: string;
  triageLevel?: number;
  diagnosis: string;
  status: string;
  bedLabel?: string;
  bedId?: string;
  roomNo?: string;
  email?: string;
  phone?: string;
  allergies?: string[] | string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  insurance?: { provider?: string; policyNumber?: string; type?: string };
  clinicalNotes?: string;
  attendingDoctorId?: string;
  registeredAt?: string;
  admittedAt?: string;
  dischargedAt?: string;
  contextId?: string;
}

interface BedOption {
  id: string;
  label: string;
  wardId?: string;
  dailyRate: number;
  status: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function PatientsPage() {
  const { currentStaff, can } = useStaffAuth();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [beds, setBeds] = useState<BedOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pre-Registered' | 'Triage' | 'Admitted' | 'Outpatient' | 'Discharged'>('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Custom Toast Notification System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Custom Modals State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activePatientDrawer, setActivePatientDrawer] = useState<PatientRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'medications' | 'labs' | 'billing'>('overview');
  const [drawerLabs, setDrawerLabs] = useState<any[]>([]);
  const [drawerInvoices, setDrawerInvoices] = useState<any[]>([]);
  const [quickAdmitPatient, setQuickAdmitPatient] = useState<PatientRecord | null>(null);
  const [editPatient, setEditPatient] = useState<PatientRecord | null>(null);
  const [rxPatient, setRxPatient] = useState<PatientRecord | null>(null);

  // ─── CUSTOM CONFIRMATION POPUP STATE (REPLACES BROWSER DEFAULT POPUP) ───
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    patient?: PatientRecord;
    confirmText: string;
    confirmVariant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
    isProcessing?: boolean;
  } | null>(null);

  // Quick Admit Modal state
  const [selectedBedToAssign, setSelectedBedToAssign] = useState('');
  const [assigningDoctor, setAssigningDoctor] = useState('dr_ashlynn_01');
  const [isQuickAdmitting, setIsQuickAdmitting] = useState(false);

  // Edit Patient Form state
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('30');
  const [editGender, setEditGender] = useState<'M' | 'F' | 'Other'>('F');
  const [editBlood, setEditBlood] = useState('O+');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [editStatus, setEditStatus] = useState('pre_registered');
  const [editDiag, setEditDiag] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Quick Prescribe Rx state
  const [rxDrug, setRxDrug] = useState('Metoprolol Tartrate');
  const [rxDosage, setRxDosage] = useState('50mg');
  const [rxFreq, setRxFreq] = useState('BID (Twice Daily)');
  const [rxRoute, setRxRoute] = useState('Oral (PO)');
  const [isPrescribing, setIsPrescribing] = useState(false);

  // ─── 1. BEDSIDE VITALS RECORDER STATE ───
  const [vitalsModalPatient, setVitalsModalPatient] = useState<PatientRecord | null>(null);
  const [vitalsBpSys, setVitalsBpSys] = useState('120');
  const [vitalsBpDia, setVitalsBpDia] = useState('80');
  const [vitalsHr, setVitalsHr] = useState('72');
  const [vitalsSpo2, setVitalsSpo2] = useState('98');
  const [vitalsTemp, setVitalsTemp] = useState('37.0');
  const [vitalsResp, setVitalsResp] = useState('16');
  const [vitalsOnO2, setVitalsOnO2] = useState(false);
  const [isRecordingVitals, setIsRecordingVitals] = useState(false);

  // ─── 2. DOCTOR SOAP CONSULTATION NOTES STATE ───
  const [soapModalPatient, setSoapModalPatient] = useState<PatientRecord | null>(null);
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapPlan, setSoapPlan] = useState('');
  const [soapIcd10Code, setSoapIcd10Code] = useState('');
  const [soapIcd10Query, setSoapIcd10Query] = useState('');
  const [isSavingSoap, setIsSavingSoap] = useState(false);

  // ─── 3. SBAR SHIFT HANDOVER STATE ───
  const [sbarModalPatient, setSbarModalPatient] = useState<PatientRecord | null>(null);
  const [sbarData, setSbarData] = useState<{
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
    formattedText: string;
  } | null>(null);

  // ─── 4. INPATIENT INTER-WARD TRANSFER STATE ───
  const [transferModalPatient, setTransferModalPatient] = useState<PatientRecord | null>(null);
  const [transferTargetBedId, setTransferTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('Step-down from Intensive Care Unit');
  const [isTransferring, setIsTransferring] = useState(false);

  // ─── 5. FORMAL DISCHARGE CLEARANCE PROTOCOL STATE ───
  const [dischargeProtocolPatient, setDischargeProtocolPatient] = useState<PatientRecord | null>(null);
  const [dischargeCondition, setDischargeCondition] = useState<'Improved' | 'Stable' | 'Transferred' | 'AMA'>('Improved');
  const [dischargeSummaryText, setDischargeSummaryText] = useState('');
  const [isProcessingDischarge, setIsProcessingDischarge] = useState(false);

  // Register New Patient Form state (DEFAULT: PRE_REGISTERED)
  const [admitName, setAdmitName] = useState('');
  const [admitAge, setAdmitAge] = useState('28');
  const [admitGender, setAdmitGender] = useState<'M' | 'F' | 'Other'>('M');
  const [admitBlood, setAdmitBlood] = useState('O+');
  const [admitPhone, setAdmitPhone] = useState('+1 (805) 529-1832');
  const [admitEmail, setAdmitEmail] = useState('');
  const [admitCategory, setAdmitCategory] = useState('general');
  const [admitTriage, setAdmitTriage] = useState('3');
  const [admitBedId, setAdmitBedId] = useState('');
  const [admitDoctor, setAdmitDoctor] = useState('dr_ashlynn_01');
  const [admitStatus, setAdmitStatus] = useState('pre_registered'); // BY DEFAULT: PRE_REGISTERED
  const [admitDiag, setAdmitDiag] = useState('Clinical Consultation & Evaluation');
  const [admitAllergies, setAdmitAllergies] = useState('NKDA (No Known Drug Allergies)');
  const [admitEmergName, setAdmitEmergName] = useState('Next of Kin');
  const [admitEmergPhone, setAdmitEmergPhone] = useState('+1 (555) 992-1100');
  const [admitEmergRelation, setAdmitEmergRelation] = useState('Family');
  const [admitInsurance, setAdmitInsurance] = useState('Blue Cross Blue Shield');
  const [admitPolicyNo, setAdmitPolicyNo] = useState('BCBS-982144');
  const [admitNotes, setAdmitNotes] = useState('Patient intake registry record.');
  const [isAdmitting, setIsAdmitting] = useState(false);

  // Staff Doctors List from Security Staff Directory
  const [staffDoctors, setStaffDoctors] = useState<any[]>([]);

  // Fetch Real Patients from DB
  const fetchLivePatients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hospital/patients');
      const data = await res.json();
      if (data.success && data.data) {
        setPatients(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch patients from OrbitoX DB:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Beds for Bed Assignment
  const fetchBeds = async () => {
    try {
      const res = await fetch('/api/hospital/beds');
      const data = await res.json();
      if (data.success && data.data) {
        setBeds(data.data);
        const avail = data.data.find((b: any) => b.status === 'available');
        if (avail && !selectedBedToAssign) {
          setSelectedBedToAssign(avail.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch beds:', err);
    }
  };

  // Fetch Live Staff Directory to dynamically link attending physicians
  const fetchStaffDoctors = async () => {
    try {
      const res = await fetch('/api/hospital/security/staff');
      const data = await res.json();
      if (data.success && data.data) {
        const docs = data.data.filter((s: any) =>
          s.role.includes('doctor') ||
          s.role === 'department_head' ||
          s.role === 'facility_director' ||
          s.role === 'super_admin'
        );
        setStaffDoctors(docs);
        if (docs.length > 0) {
          let activeDocName = docs[0].name;
          const saved = localStorage.getItem('orbitox_active_clinical_staff');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const match = docs.find((d: any) => d.id === parsed.id || d.name === parsed.name);
              if (match) activeDocName = match.name;
            } catch {}
          }
          setAdmitDoctor(activeDocName);
          setAssigningDoctor(activeDocName);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff directory:', err);
    }
  };

  useEffect(() => {
    fetchLivePatients();
    fetchBeds();
    fetchStaffDoctors();
  }, []);

  // Fetch real diagnostic labs and itemized invoices when patient drawer opens
  useEffect(() => {
    if (activePatientDrawer) {
      fetch(`/api/hospital/labs?patientId=${activePatientDrawer.id}`)
        .then(r => r.json())
        .then(d => { if (d.success && d.data) setDrawerLabs(d.data); })
        .catch(() => {});

      fetch(`/api/hospital/billing?patientId=${activePatientDrawer.id}`)
        .then(r => r.json())
        .then(d => { if (d.success && d.data) setDrawerInvoices(d.data); })
        .catch(() => {});
    } else {
      setDrawerLabs([]);
      setDrawerInvoices([]);
    }
  }, [activePatientDrawer]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPatients.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // 1. ACTION: Direct Inline Status Change
  const handleQuickStatusChange = async (patientId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/hospital/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Status Updated', `Patient status changed to ${newStatus.toUpperCase()}`);
        await fetchLivePatients();
        await fetchBeds();
      } else {
        showToast('error', 'Update Failed', data.error || 'Failed to update status');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  // 2. ACTION: Trigger Custom Discharge Modal
  const requestDischargePatient = (patient: PatientRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Discharge Inpatient',
      description: `Are you sure you want to discharge ${patient.name}? This will unassign ${patient.bedLabel || 'their bed station'}, set the bed to sanitizing turnover, and record the discharge in the audit ledger.`,
      patient,
      confirmText: 'Confirm Discharge',
      confirmVariant: 'danger',
      action: async () => {
        const res = await fetch(`/api/hospital/patients/${patient.id}?action=discharge`, {
          method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', 'Patient Discharged', `${patient.name} discharged and bed released for sanitization.`);
          await fetchLivePatients();
          await fetchBeds();
        } else {
          showToast('error', 'Discharge Failed', data.error || 'Failed to discharge patient');
        }
      }
    });
  };

  // 3. ACTION: Trigger Custom Delete Modal
  const requestDeletePatient = (patient: PatientRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Patient Record',
      description: `Are you sure you want to permanently remove the medical record for ${patient.name}? This will free any assigned bed station.`,
      patient,
      confirmText: 'Delete Record',
      confirmVariant: 'danger',
      action: async () => {
        const res = await fetch(`/api/hospital/patients/${patient.id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          showToast('info', 'Record Deleted', `Patient record for ${patient.name} has been removed.`);
          setSelectedIds(prev => prev.filter(id => id !== patient.id));
          await fetchLivePatients();
          await fetchBeds();
        } else {
          showToast('error', 'Delete Failed', data.error || 'Failed to delete patient');
        }
      }
    });
  };

  // 4. ACTION: Open Quick Admit Bed Modal
  const openQuickAdmit = (patient: PatientRecord) => {
    setQuickAdmitPatient(patient);
    const avail = beds.find(b => b.status === 'available');
    setSelectedBedToAssign(avail ? avail.id : (beds[0]?.id || ''));
  };

  // Submit Quick Bed Admission
  const handleQuickAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdmitPatient || !selectedBedToAssign) return;

    setIsQuickAdmitting(true);
    try {
      const res = await fetch(`/api/hospital/patients/${quickAdmitPatient.id}?action=admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId: selectedBedToAssign,
          doctorId: assigningDoctor
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Admission Complete', `${quickAdmitPatient.name} successfully admitted to bed station.`);
        setQuickAdmitPatient(null);
        await fetchLivePatients();
        await fetchBeds();
      } else {
        showToast('error', 'Admission Failed', data.error || 'Failed to admit patient to bed');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsQuickAdmitting(false);
    }
  };

  // 5. ACTION: Open Edit Patient Modal
  const openEditModal = (patient: PatientRecord) => {
    setEditPatient(patient);
    setEditName(patient.name);
    setEditAge(patient.age.toString());
    setEditGender(patient.gender || 'M');
    setEditBlood(patient.bloodGroup || 'O+');
    setEditPhone(patient.phone || '');
    setEditEmail(patient.email || '');
    setEditCategory(patient.category || 'general');
    setEditStatus(patient.status || 'pre_registered');
    setEditDiag(patient.diagnosis || '');
    setEditNotes(patient.clinicalNotes || '');
  };

  // Submit Edit Patient
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/hospital/patients/${editPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          age: parseInt(editAge) || 30,
          gender: editGender,
          bloodGroup: editBlood,
          phone: editPhone,
          email: editEmail,
          category: editCategory,
          status: editStatus,
          diagnosis: editDiag,
          clinicalNotes: editNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Patient Updated', `Record for ${editName} updated in database.`);
        setEditPatient(null);
        await fetchLivePatients();
        await fetchBeds();
      } else {
        showToast('error', 'Update Failed', data.error || 'Failed to update patient');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 6. ACTION: Prescribe Rx Modal
  const openRxModal = (patient: PatientRecord) => {
    setRxPatient(patient);
  };

  const handleRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxPatient) return;

    setIsPrescribing(true);
    try {
      const res = await fetch('/api/hospital/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: rxPatient.id,
          prescribedByDoctorId: 'dr_ashlynn_01',
          type: 'medication',
          procedureOrDrug: rxDrug,
          dosage: rxDosage,
          frequency: rxFreq,
          route: rxRoute
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Rx Ordered', `Prescription for ${rxDrug} sent to Central Pharmacy.`);
        setRxPatient(null);
      } else {
        showToast('error', 'Order Failed', data.error || 'Failed to prescribe medication');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsPrescribing(false);
    }
  };

  // ─── 8. ACTION: Record Bedside Vitals ───
  const openVitalsModal = (patient: PatientRecord) => {
    setVitalsModalPatient(patient);
    setVitalsBpSys('120');
    setVitalsBpDia('80');
    setVitalsHr('74');
    setVitalsSpo2('98');
    setVitalsTemp('37.0');
    setVitalsResp('16');
    setVitalsOnO2(false);
  };

  const handleRecordVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalsModalPatient) return;

    setIsRecordingVitals(true);
    try {
      const spo2 = parseInt(vitalsSpo2) || 98;
      const hr = parseInt(vitalsHr) || 74;
      const sys = parseInt(vitalsBpSys) || 120;
      const temp = parseFloat(vitalsTemp) || 37.0;
      const resp = parseInt(vitalsResp) || 16;

      const news2 = ClinicalAIEngine.calculateNews2({
        spo2,
        heartRate: hr,
        systolicBp: sys,
        temperature: temp,
        respiratoryRate: resp,
        onOxygen: vitalsOnO2
      });

      // Push vital telemetry packet
      await fetch('/api/hospital/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId: vitalsModalPatient.bedId || 'bed_manual_entry',
          patientId: vitalsModalPatient.id,
          vitals: {
            heartRate: hr,
            spo2,
            bloodPressure: `${sys}/${vitalsBpDia}`,
            temperature: temp,
            respiratoryRate: resp
          }
        })
      });

      // Update patient notes with latest recorded vitals
      await fetch(`/api/hospital/patients/${vitalsModalPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalNotes: `Vitals [${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]: BP ${sys}/${vitalsBpDia}, HR ${hr}, SpO2 ${spo2}%, Temp ${temp}°C, RR ${resp}. NEWS2 Score: ${news2.score} (${news2.riskLevel}). ${vitalsModalPatient.clinicalNotes || ''}`.trim()
        })
      });

      if (news2.riskLevel === 'EMERGENCY_CODE_BLUE' || news2.score >= 7) {
        showToast('error', '🚨 Code Blue / Deterioration Alert', `NEWS2 Score: ${news2.score} (High Risk). ${news2.clinicalAction}`);
      } else {
        showToast('success', 'Vitals Recorded', `NEWS2 Score: ${news2.score} (${news2.riskLevel} Risk). Clinical notes updated.`);
      }

      setVitalsModalPatient(null);
      await fetchLivePatients();
    } catch (err: any) {
      showToast('error', 'Failed to Log Vitals', err.message);
    } finally {
      setIsRecordingVitals(false);
    }
  };

  // ─── 9. ACTION: Save Doctor SOAP Consultation Note ───
  const openSoapModal = (patient: PatientRecord) => {
    setSoapModalPatient(patient);
    setSoapSubjective(`Patient presents with ${patient.diagnosis}. Reports symptoms ongoing for 48 hours.`);
    setSoapObjective(`General: Alert, oriented x 3. Vitals stable. Physical examination confirms clinical presentation.`);
    setSoapAssessment(`Primary: ${patient.diagnosis}. ICD-10 matched.`);
    setSoapPlan(`1. Continue current inpatient medication regimen.\n2. Serial pathology workup.\n3. Daily morning rounds.`);
    setSoapIcd10Code('I21.9');
    setSoapIcd10Query(patient.diagnosis || '');
  };

  const handleSaveSoapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soapModalPatient) return;

    setIsSavingSoap(true);
    try {
      const formattedNote = `[SOAP NOTE - ${new Date().toLocaleDateString()}]
S: ${soapSubjective}
O: ${soapObjective}
A: ${soapAssessment} (ICD-10: ${soapIcd10Code})
P: ${soapPlan}
Attending: ${currentStaff?.name || 'Physician'} (${currentStaff?.licenseNumber || 'MD-AUTH'})
---
${soapModalPatient.clinicalNotes || ''}`.trim();

      await fetch(`/api/hospital/patients/${soapModalPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicalNotes: formattedNote })
      });

      showToast('success', 'SOAP Note Signed', `Consultation documentation saved to ${soapModalPatient.name}'s chart.`);
      setSoapModalPatient(null);
      await fetchLivePatients();
    } catch (err: any) {
      showToast('error', 'Failed to Save SOAP Note', err.message);
    } finally {
      setIsSavingSoap(false);
    }
  };

  // ─── 10. ACTION: SBAR Handover Note Generator ───
  const openSbarModal = (patient: PatientRecord) => {
    setSbarModalPatient(patient);
    const summary = ClinicalAIEngine.generateSbarSummary({
      patient: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        diagnosis: patient.diagnosis,
        bedLabel: patient.bedLabel,
        triageLevel: patient.triageLevel,
        allergies: patient.allergies,
        clinicalNotes: patient.clinicalNotes,
        attendingDoctorId: patient.attendingDoctorId
      }
    });
    setSbarData(summary);
  };

  // ─── 11. ACTION: Inpatient Inter-Ward Transfer ───
  const openTransferModal = (patient: PatientRecord) => {
    setTransferModalPatient(patient);
    setTransferTargetBedId('');
    setTransferReason('Clinical acuity step-down transfer');
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalPatient || !transferTargetBedId) return;

    setIsTransferring(true);
    try {
      const oldBedId = transferModalPatient.bedId;
      const targetBed = beds.find(b => b.id === transferTargetBedId);

      // 1. Update target bed to occupied
      await fetch(`/api/hospital/beds/${transferTargetBedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'occupied' })
      });

      // 2. Update previous bed to sanitizing
      if (oldBedId && oldBedId !== transferTargetBedId) {
        await fetch(`/api/hospital/beds/${oldBedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sanitizing' })
        });
      }

      // 3. Update patient's assigned bed
      await fetch(`/api/hospital/patients/${transferModalPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId: transferTargetBedId,
          clinicalNotes: `[PATIENT TRANSFER - ${new Date().toLocaleDateString()}]: Transferred to ${targetBed?.label || 'New Bed'}. Reason: ${transferReason}. ${transferModalPatient.clinicalNotes || ''}`.trim()
        })
      });

      showToast('success', 'Transfer Complete', `${transferModalPatient.name} transferred to ${targetBed?.label || 'Target Station'}. Previous bed marked for disinfection.`);
      setTransferModalPatient(null);
      await fetchLivePatients();
      await fetchBeds();
    } catch (err: any) {
      showToast('error', 'Transfer Failed', err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  // ─── 12. ACTION: Formal Discharge Protocol ───
  const openDischargeProtocolModal = (patient: PatientRecord) => {
    setDischargeProtocolPatient(patient);
    setDischargeCondition('Improved');
    const summary = ClinicalAIEngine.generateDischargeSummary({
      patient: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        diagnosis: patient.diagnosis,
        admittedAt: patient.admittedAt
      },
      stayDays: 3,
      medications: [
        { drugName: 'Metoprolol Tartrate', dosage: '25mg PO Daily' },
        { drugName: 'Aspirin', dosage: '81mg PO Daily' }
      ],
      dischargeCondition: 'Improved'
    });
    setDischargeSummaryText(summary);
  };

  const handleDischargeProtocolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeProtocolPatient) return;

    setIsProcessingDischarge(true);
    try {
      const res = await fetch(`/api/hospital/patients/${dischargeProtocolPatient.id}?action=discharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'discharged',
          dischargedAt: new Date().toISOString(),
          dischargeSummary: dischargeSummaryText
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Discharge Complete', `${dischargeProtocolPatient.name} discharged. Bed marked for UV-C sanitization. Discharge bill generated.`);
        setDischargeProtocolPatient(null);
        await fetchLivePatients();
        await fetchBeds();
      } else {
        showToast('error', 'Discharge Failed', data.error || 'Failed to discharge patient');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsProcessingDischarge(false);
    }
  };

  // 7. ACTION: Bulk Status Change
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/hospital/patients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }
      showToast('success', 'Bulk Update Complete', `${selectedIds.length} patients updated to ${newStatus.toUpperCase()}`);
      setSelectedIds([]);
      await fetchLivePatients();
      await fetchBeds();
    } catch (err: any) {
      showToast('error', 'Bulk Error', err.message);
    }
  };

  // 8. ACTION: Register New Patient Submit (DEFAULT: PRE_REGISTERED)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitName) return;

    if (admitStatus === 'admitted' && !admitBedId) {
      showToast('error', 'Bed Required', 'Please select an inpatient bed station to admit this patient.');
      return;
    }

    setIsAdmitting(true);
    try {
      const res = await fetch('/api/hospital/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: admitName,
          age: parseInt(admitAge) || 30,
          gender: admitGender,
          bloodGroup: admitBlood,
          phone: admitPhone,
          email: admitEmail || `${admitName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          category: admitCategory,
          triageLevel: parseInt(admitTriage) || 3,
          diagnosis: admitDiag,
          bedId: admitBedId || undefined,
          attendingDoctorId: admitDoctor,
          status: admitStatus,
          allergies: admitAllergies,
          emergencyContactName: admitEmergName,
          emergencyContactPhone: admitEmergPhone,
          emergencyContactRelation: admitEmergRelation,
          insuranceProvider: admitInsurance,
          policyNumber: admitPolicyNo,
          clinicalNotes: admitNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Patient Registered', `Successfully registered ${admitName} with status ${admitStatus.toUpperCase()}.`);
        setShowRegisterModal(false);
        setAdmitName('');
        setAdmitBedId('');
        setAdmitStatus('pre_registered');
        await fetchLivePatients();
        await fetchBeds();
      } else {
        showToast('error', 'Registration Failed', data.error || 'Registration failed');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Registration failed');
    } finally {
      setIsAdmitting(false);
    }
  };

  // Filtered patients
  const filteredPatients = patients.filter(p => {
    const s = (p.status || '').toLowerCase();
    if (statusFilter === 'Pre-Registered' && s !== 'pre_registered') return false;
    if (statusFilter === 'Triage' && s !== 'triage') return false;
    if (statusFilter === 'Admitted' && s !== 'admitted') return false;
    if (statusFilter === 'Outpatient' && s !== 'outpatient') return false;
    if (statusFilter === 'Discharged' && s !== 'discharged') return false;

    if (searchTerm) {
      const matchName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDiag = p.diagnosis && p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBed = p.bedLabel && p.bedLabel.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBlood = p.bloodGroup && p.bloodGroup.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchDiag && !matchBed && !matchBlood) return false;
    }

    return true;
  });

  const availableBedsList = beds.filter(b => b.status === 'available');

  return (
    <HospitalNavLayout
      headerTitle="Patient Registry & Management"
      headerSubtitle="Clinical directory with quick bed admissions, triage transitions, and patient lifecycle actions"
      actions={
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {can('patient.create') && (
            <button
              onClick={() => {
                setAdmitStatus('pre_registered');
                setAdmitBedId('');
                setShowRegisterModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '24px',
                padding: '10px 22px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(30, 96, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>+</span> Register New Patient
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        
        {/* Floating Custom Toast Notifications */}
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px' }}>
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                padding: '14px 18px',
                borderRadius: '18px',
                background: t.type === 'success' ? '#0f172a' : t.type === 'error' ? '#7f1d1d' : '#1e293b',
                color: '#ffffff',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                border: t.type === 'success' ? '1px solid #10b981' : t.type === 'error' ? '1px solid #ef4444' : '1px solid #3b82f6',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                animation: 'fadeIn 0.2s ease-in-out'
              }}
            >
              <span style={{ fontSize: '16px' }}>
                {t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px' }}>{t.title}</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>{t.message}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Table Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            borderRadius: '28px',
            padding: '28px 32px',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Header Bar with Search & Status Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Clinical Directory & Action Console
                </h2>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  REAL ORBITOX DB
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Showing {filteredPatients.length} patient records with instant management actions
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(241, 245, 249, 0.9)', padding: '4px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                {(['All', 'Pre-Registered', 'Triage', 'Admitted', 'Outpatient', 'Discharged'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '18px',
                      border: 'none',
                      background: statusFilter === s ? '#1e60ff' : 'transparent',
                      color: statusFilter === s ? '#ffffff' : '#64748b',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search name, diagnosis, blood..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  background: 'rgba(248, 250, 252, 0.9)',
                  fontSize: '12px',
                  outline: 'none',
                  color: '#0f172a',
                  width: '200px'
                }}
              />

              <button
                onClick={fetchLivePatients}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '20px',
                  background: 'rgba(241, 245, 249, 0.8)',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* BULK ACTIONS TOOLBAR (Appears when checkboxes are selected) */}
          {selectedIds.length > 0 && (
            <div
              style={{
                padding: '12px 20px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 700 }}>
                <span style={{ background: '#3b82f6', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                  {selectedIds.length} Selected
                </span>
                <span>Bulk Management:</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => handleBulkStatusChange('triage')}
                  style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Set to Triage
                </button>
                <button
                  onClick={() => handleBulkStatusChange('outpatient')}
                  style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: 'rgba(147, 51, 234, 0.25)', color: '#d8b4fe', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Set to Outpatient
                </button>
                <button
                  onClick={() => handleBulkStatusChange('pre_registered')}
                  style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: 'rgba(245, 158, 11, 0.25)', color: '#fde68a', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Set to Pre-Reg
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid #475569', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}
                >
                  ✕ Deselect
                </button>
              </div>
            </div>
          )}

          {/* Interactive Patients Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '14px 12px', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredPatients.length && filteredPatients.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer', borderRadius: '4px' }}
                    />
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    BED / LOCATION
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    PATIENT NAME & CONTACT
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    DEMOGRAPHICS
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    DIAGNOSIS
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    CLINICAL STATUS
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    ACTIONS & CONTROLS
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      Loading real patient records from OrbitoX DB...
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No patients found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const isSelected = selectedIds.includes(patient.id);

                    // Dynamic Status Styling
                    const s = (patient.status || 'pre_registered').toLowerCase();
                    const isAdmitted = s === 'admitted';
                    const isTriage = s === 'triage';
                    const isPreReg = s === 'pre_registered';
                    const isOutpatient = s === 'outpatient';
                    const isDischarged = s === 'discharged';

                    let badgeBg = 'rgba(245, 158, 11, 0.12)';
                    let badgeColor = '#d97706';
                    let badgeLabel = 'PRE-REGISTERED';

                    if (isAdmitted) {
                      badgeBg = 'rgba(30, 96, 255, 0.12)';
                      badgeColor = '#1e60ff';
                      badgeLabel = 'ADMITTED';
                    } else if (isTriage) {
                      badgeBg = 'rgba(239, 68, 68, 0.12)';
                      badgeColor = '#dc2626';
                      badgeLabel = 'ER TRIAGE';
                    } else if (isOutpatient) {
                      badgeBg = 'rgba(147, 51, 234, 0.12)';
                      badgeColor = '#9333ea';
                      badgeLabel = 'OUTPATIENT';
                    } else if (isDischarged) {
                      badgeBg = 'rgba(16, 185, 129, 0.12)';
                      badgeColor = '#059669';
                      badgeLabel = 'DISCHARGED';
                    }

                    const avatarColors = ['#fed7aa', '#bfdbfe', '#bbf7d0', '#fbcfe8', '#ddd6fe', '#fef08a'];
                    const avatarBg = avatarColors[Math.abs(patient.name.charCodeAt(0)) % avatarColors.length];

                    // ONLY ADMITTED PATIENTS OCCUPY A BED STATION
                    const hasBed = isAdmitted && patient.bedId && patient.bedLabel && patient.bedLabel !== 'Unassigned';

                    return (
                      <tr
                        key={patient.id}
                        style={{
                          borderBottom: '1px solid #f8fafc',
                          background: isSelected ? 'rgba(30, 96, 255, 0.03)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '16px 12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(patient.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        {/* BED / LOCATION */}
                        <td style={{ padding: '16px', fontSize: '13px' }}>
                          {hasBed ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700, color: '#1e60ff' }}>
                                🛏️ {patient.bedLabel}
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Inpatient Ward</span>
                            </div>
                          ) : isDischarged ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#059669', fontSize: '11px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '8px' }}>
                                Discharged (No Bed)
                              </span>
                              <button
                                onClick={() => openQuickAdmit(patient)}
                                title="Re-Admit to Inpatient Bed"
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #93c5fd',
                                  background: '#eff6ff',
                                  color: '#1e60ff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                + Bed
                              </button>
                            </div>
                          ) : isTriage ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.1)', padding: '3px 8px', borderRadius: '8px' }}>
                                ER Waiting
                              </span>
                              <button
                                onClick={() => openQuickAdmit(patient)}
                                title="Admit to Inpatient Bed"
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #93c5fd',
                                  background: '#eff6ff',
                                  color: '#1e60ff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                + Bed
                              </button>
                            </div>
                          ) : isOutpatient ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#9333ea', fontSize: '11px', fontWeight: 700, background: 'rgba(147, 51, 234, 0.1)', padding: '3px 8px', borderRadius: '8px' }}>
                                Outpatient Clinic
                              </span>
                              <button
                                onClick={() => openQuickAdmit(patient)}
                                title="Admit to Inpatient Bed"
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #93c5fd',
                                  background: '#eff6ff',
                                  color: '#1e60ff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                + Bed
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#94a3b8', fontSize: '12px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '8px' }}>
                                Unassigned (Waiting)
                              </span>
                              <button
                                onClick={() => openQuickAdmit(patient)}
                                title="Assign Inpatient Bed"
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #93c5fd',
                                  background: '#eff6ff',
                                  color: '#1e60ff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                + Bed
                              </button>
                            </div>
                          )}
                        </td>

                        {/* PATIENT NAME + AVATAR + EMAIL */}
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: avatarBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#1e293b'
                              }}
                            >
                              {patient.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                {patient.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {patient.email || `${patient.name.toLowerCase().replace(/\s+/g, '.')}@example.com`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* DEMOGRAPHICS (AGE + GENDER + BLOOD) */}
                        <td style={{ padding: '16px', fontSize: '13px', color: '#475569' }}>
                          <div>{patient.age}y ({patient.gender || 'M'}) • <span style={{ padding: '2px 6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontSize: '11px', fontWeight: 800 }}>{patient.bloodGroup || 'O+'}</span></div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize', marginTop: '2px' }}>{patient.category || 'General'}</div>
                        </td>

                        {/* DIAGNOSIS */}
                        <td style={{ padding: '16px', fontSize: '13px', color: '#334155', fontWeight: 600, maxWidth: '200px' }}>
                          {patient.diagnosis || 'Clinical Consultation'}
                        </td>

                        {/* INTERACTIVE CLINICAL STATUS SELECTOR */}
                        <td style={{ padding: '16px' }}>
                          <select
                            value={patient.status}
                            onChange={e => handleQuickStatusChange(patient.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              border: `1px solid ${badgeColor}`,
                              background: badgeBg,
                              color: badgeColor,
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="pre_registered">🟡 Pre-Reg</option>
                            <option value="triage">🔴 ER Triage</option>
                            <option value="outpatient">🟣 Outpatient</option>
                            <option value="admitted">🔵 Admitted</option>
                            <option value="discharged">🟢 Discharged</option>
                          </select>
                        </td>

                        {/* COMPREHENSIVE ACTIONS TRAY */}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            
                            {/* ACTION 1: Bedside Vitals Logging */}
                            <button
                              onClick={() => openVitalsModal(patient)}
                              title="Log Bedside Vitals & Calculate NEWS2"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '10px',
                                border: '1px solid #fed7aa',
                                background: '#fff7ed',
                                color: '#c2410c',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              🩺 Vitals
                            </button>

                            {/* ACTION 2: Doctor SOAP Consultation Note */}
                            <button
                              onClick={() => openSoapModal(patient)}
                              title="Doctor SOAP Consultation Note & ICD-10"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '10px',
                                border: '1px solid #bfdbfe',
                                background: '#eff6ff',
                                color: '#1e60ff',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              📝 SOAP
                            </button>

                            {/* ACTION 3: SBAR Shift Handover */}
                            <button
                              onClick={() => openSbarModal(patient)}
                              title="Generate SBAR Shift Handover Note"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '10px',
                                border: '1px solid #e9d5ff',
                                background: '#faf5ff',
                                color: '#9333ea',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              📋 SBAR
                            </button>

                            {/* ACTION 4: Inter-Ward Transfer (if admitted) */}
                            {isAdmitted && (
                              <button
                                onClick={() => openTransferModal(patient)}
                                title="Transfer Patient to another Ward/Bed"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '10px',
                                  border: '1px solid #bbf7d0',
                                  background: '#f0fdf4',
                                  color: '#16a34a',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🔄 Transfer
                              </button>
                            )}

                            {/* ACTION 5: Admit to Bed (if unassigned) or Formal Discharge (if admitted) */}
                            {isAdmitted ? (
                              can('patient.discharge') ? (
                                <button
                                  onClick={() => openDischargeProtocolModal(patient)}
                                  title="Formal Inpatient Discharge Clearance Protocol"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    color: '#dc2626',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  🚪 Discharge
                                </button>
                              ) : null
                            ) : (
                              can('patient.admit') ? (
                                <button
                                  onClick={() => openQuickAdmit(patient)}
                                  title="Assign Inpatient Bed"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 8px rgba(30, 96, 255, 0.25)'
                                  }}
                                >
                                  🛏️ Admit Bed
                                </button>
                              ) : null
                            )}

                            {/* ACTION 6: Prescribe Rx */}
                            {can('treatment.prescribe') && (
                              <button
                                onClick={() => openRxModal(patient)}
                                title="Prescribe Medication"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  color: '#475569',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                💊 Rx
                              </button>
                            )}

                            {/* ACTION 7: Edit Details */}
                            {can('patient.update') && (
                              <button
                                onClick={() => openEditModal(patient)}
                                title="Edit Patient Details"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  color: '#475569',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Edit
                              </button>
                            )}

                            {/* ACTION 8: View EMR */}
                            <button
                              onClick={() => setActivePatientDrawer(patient)}
                              title="Inspect Full Medical Record & Patient Portal Summary"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#1e60ff',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              🔍 View EMR
                            </button>

                            {/* ACTION 5: Delete Record */}
                            {can('patient.delete') && (
                              <button
                                onClick={() => requestDeletePatient(patient)}
                                title="Delete Patient Record"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '10px',
                                  border: '1px solid #fee2e2',
                                  background: '#fff5f5',
                                  color: '#ef4444',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Displaying {filteredPatients.length} live records from OrbitoX Database
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '6px 10px' }}
              >
                ‹ Previous
              </button>

              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#1e60ff',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(30, 96, 255, 0.3)'
                }}
              >
                1
              </button>

              <button
                onClick={() => setCurrentPage(p => p + 1)}
                style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '6px 10px' }}
              >
                Next ›
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ─── CUSTOM CONFIRMATION POPUP (REPLACES BROWSER DEFAULT CONFIRM) ─── */}
      {confirmDialog && confirmDialog.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '20px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              position: 'relative'
            }}
          >
            {/* Warning Icon Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: confirmDialog.confirmVariant === 'danger' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: confirmDialog.confirmVariant === 'danger' ? '#dc2626' : '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                {confirmDialog.confirmVariant === 'danger' ? '🚪' : '⚠️'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {confirmDialog.title}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Action Confirmation
                </span>
              </div>
            </div>

            {/* Description */}
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {confirmDialog.description}
            </p>

            {/* Patient Context Card if applicable */}
            {confirmDialog.patient && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{confirmDialog.patient.name}</div>
                  <div style={{ color: '#64748b' }}>{confirmDialog.patient.age}y ({confirmDialog.patient.gender}) • Blood: {confirmDialog.patient.bloodGroup || 'O+'}</div>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: '8px', background: '#eff6ff', color: '#1e60ff', fontWeight: 700 }}>
                  {confirmDialog.patient.bedLabel || 'Inpatient'}
                </span>
              </div>
            )}

            {/* Custom Modal Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={confirmDialog.isProcessing}
                onClick={async () => {
                  try {
                    setConfirmDialog(prev => prev ? { ...prev, isProcessing: true } : null);
                    await confirmDialog.action();
                  } finally {
                    setConfirmDialog(null);
                  }
                }}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  background: confirmDialog.confirmVariant === 'danger' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: confirmDialog.confirmVariant === 'danger' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : '0 4px 14px rgba(30, 96, 255, 0.35)'
                }}
              >
                {confirmDialog.isProcessing ? 'Processing...' : confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: QUICK ADMIT TO BED MODAL ─── */}
      {quickAdmitPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>Admit Patient to Bed</h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Assigning <strong>{quickAdmitPatient.name}</strong> ({quickAdmitPatient.age}y {quickAdmitPatient.gender})
                </p>
              </div>
              <button onClick={() => setQuickAdmitPatient(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleQuickAdmitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Select Available Bed Station *
                </label>
                <select
                  required
                  value={selectedBedToAssign}
                  onChange={e => setSelectedBedToAssign(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  {availableBedsList.length === 0 ? (
                    <option disabled>No available beds currently. Free a bed or add a surge bed.</option>
                  ) : (
                    availableBedsList.map(b => (
                      <option key={b.id} value={b.id}>
                        🛏️ {b.label} — ${b.dailyRate}/day ({b.status.toUpperCase()})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Attending Physician
                </label>
                <select
                  value={assigningDoctor}
                  onChange={e => setAssigningDoctor(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  {staffDoctors.length > 0 ? (
                    staffDoctors.map(doc => (
                      <option key={doc.id} value={doc.name}>
                        {doc.name} — {doc.customTitle || doc.roleDisplayName || doc.role} ({doc.contextName || 'General'})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Dr. Ashlynn Carder">Dr. Ashlynn Carder (Lead Clinician)</option>
                      <option value="Dr. Stephen Strange">Dr. Stephen Strange (Cardiothoracic)</option>
                      <option value="Dr. Gregory House">Dr. Gregory House (Diagnostic Medicine)</option>
                      <option value="Dr. John Watson">Dr. John Watson (General Medicine)</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(30, 96, 255, 0.05)', border: '1px solid rgba(30, 96, 255, 0.15)', fontSize: '12px', color: '#475569' }}>
                <div><strong>Diagnosis:</strong> {quickAdmitPatient.diagnosis}</div>
                <div><strong>Blood Group:</strong> {quickAdmitPatient.bloodGroup || 'O+'}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setQuickAdmitPatient(null)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={isQuickAdmitting || availableBedsList.length === 0}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(30, 96, 255, 0.3)' }}
                >
                  {isQuickAdmitting ? 'Admitting...' : 'Confirm Admission to Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT PATIENT DETAILS MODAL ─── */}
      {editPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>Edit Patient Details</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>ID: {editPatient.id}</span>
              </div>
              <button onClick={() => setEditPatient(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Age</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={e => setEditAge(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Gender</label>
                  <select
                    value={editGender}
                    onChange={e => setEditGender(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Blood Group</label>
                  <select
                    value={editBlood}
                    onChange={e => setEditBlood(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Clinical Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="pre_registered">Pre-Registered</option>
                    <option value="triage">ER Triage</option>
                    <option value="outpatient">Outpatient</option>
                    <option value="admitted">Admitted</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="general">General Inpatient</option>
                    <option value="vip">VIP Suite</option>
                    <option value="trauma">Trauma Emergency</option>
                    <option value="pediatric">Pediatric</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Diagnosis / Chief Complaint</label>
                <input
                  type="text"
                  value={editDiag}
                  onChange={e => setEditDiag(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditPatient(null)} style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' }}>Cancel</button>
                <button type="submit" disabled={isSavingEdit} style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', background: '#1e60ff', color: '#fff', fontWeight: 700 }}>
                  {isSavingEdit ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: PRESCRIBE RX MODAL ─── */}
      {rxPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Prescribe Medication (eMAR)</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Patient: <strong>{rxPatient.name}</strong></span>
              </div>
              <button onClick={() => setRxPatient(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleRxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Medication / Drug Name *</label>
                <input
                  type="text"
                  required
                  value={rxDrug}
                  onChange={e => setRxDrug(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Dosage</label>
                  <input
                    type="text"
                    value={rxDosage}
                    onChange={e => setRxDosage(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Route</label>
                  <select
                    value={rxRoute}
                    onChange={e => setRxRoute(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option>Oral (PO)</option>
                    <option>IV Push</option>
                    <option>IV Piggyback</option>
                    <option>Subcutaneous</option>
                    <option>Inhalation</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Frequency</label>
                <select
                  value={rxFreq}
                  onChange={e => setRxFreq(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option>BID (Twice Daily)</option>
                  <option>TID (Three Times Daily)</option>
                  <option>Q24H (Daily)</option>
                  <option>STAT (Immediate Push)</option>
                  <option>PRN (As Needed)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setRxPatient(null)} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' }}>Cancel</button>
                <button type="submit" disabled={isPrescribing} style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: '#1e60ff', color: '#fff', fontWeight: 700 }}>
                  {isPrescribing ? 'Prescribing...' : 'Order Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: FULL FIELD INSPECTOR DRAWER ─── */}
      {activePatientDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{activePatientDrawer.name}</h2>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '10px' }}>
                    {activePatientDrawer.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Patient ID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{activePatientDrawer.id}</code>
                </div>
              </div>
              <button
                onClick={() => setActivePatientDrawer(null)}
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Clinical Toolstrip */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => {
                  const p = activePatientDrawer;
                  setActivePatientDrawer(null);
                  openVitalsModal(p);
                }}
                style={{ padding: '6px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                🩺 Log Bedside Vitals
              </button>
              <button
                onClick={() => {
                  const p = activePatientDrawer;
                  setActivePatientDrawer(null);
                  openSoapModal(p);
                }}
                style={{ padding: '6px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e60ff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                📝 SOAP Consultation
              </button>
              <button
                onClick={() => {
                  const p = activePatientDrawer;
                  setActivePatientDrawer(null);
                  openSbarModal(p);
                }}
                style={{ padding: '6px 12px', borderRadius: '10px', background: '#faf5ff', border: '1px solid #e9d5ff', color: '#9333ea', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                📋 SBAR Handover
              </button>
              {activePatientDrawer.status === 'admitted' && (
                <button
                  onClick={() => {
                    const p = activePatientDrawer;
                    setActivePatientDrawer(null);
                    openTransferModal(p);
                  }}
                  style={{ padding: '6px 12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🔄 Ward Transfer
                </button>
              )}
              {activePatientDrawer.status === 'admitted' && (
                <button
                  onClick={() => {
                    const p = activePatientDrawer;
                    setActivePatientDrawer(null);
                    openDischargeProtocolModal(p);
                  }}
                  style={{ padding: '6px 12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecdd3', color: '#dc2626', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🚪 Discharge Protocol
                </button>
              )}
            </div>

            {/* Top Tab Bar for Patient Portal & Clinician Inspector */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
              {[
                { id: 'overview', label: '🩺 Clinical Overview', icon: '🩺' },
                { id: 'medications', label: '💊 5-Rights eMAR Regimen', icon: '💊' },
                { id: 'labs', label: `🔬 Labs & Pathology (${drawerLabs.length})`, icon: '🔬' },
                { id: 'billing', label: `💳 Invoices & Claims (${drawerInvoices.length})`, icon: '💳' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '16px',
                    border: 'none',
                    background: drawerTab === tab.id ? 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)' : 'rgba(241, 245, 249, 0.9)',
                    color: drawerTab === tab.id ? '#ffffff' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: drawerTab === tab.id ? '0 4px 12px rgba(30, 96, 255, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Clinical Overview & Demographics */}
            {drawerTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Demographics</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{activePatientDrawer.age} years • {activePatientDrawer.gender === 'F' ? 'Female' : 'Male'}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>Blood Group: <strong style={{ color: '#dc2626' }}>{activePatientDrawer.bloodGroup || 'O+'}</strong></div>
                </div>

                <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Bed & Station Placement</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{activePatientDrawer.bedLabel || 'Unassigned (No Active Bed)'}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>Category: <span style={{ textTransform: 'capitalize' }}>{activePatientDrawer.category || 'General'}</span></div>
                </div>

                <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Clinical Diagnosis</span>
                  <div style={{ fontWeight: 700, color: '#1e60ff', marginTop: '4px' }}>{activePatientDrawer.diagnosis}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>Doctor: {activePatientDrawer.attendingDoctorId || 'Dr. Stephen Strange, MD'}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Allergies & Safety</span>
                  <div style={{ fontWeight: 700, color: '#d97706', marginTop: '4px' }}>
                    {Array.isArray(activePatientDrawer.allergies) ? activePatientDrawer.allergies.join(', ') : activePatientDrawer.allergies || 'No Known Drug Allergies (NKDA)'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Contact Information</span>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>📞 {activePatientDrawer.phone || '+1 (805) 529-1832'}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>✉️ {activePatientDrawer.email || 'patient@example.com'}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Emergency Contact</span>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>{activePatientDrawer.emergencyContact?.name || 'Next of Kin'}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>{activePatientDrawer.emergencyContact?.phone || '+1 (555) 992-1100'}</div>
                </div>

                <div style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Insurance & Billing Policy</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>Carrier: <strong>{activePatientDrawer.insurance?.provider || 'Blue Cross Blue Shield'}</strong></span>
                    <span>Policy ID: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{activePatientDrawer.insurance?.policyNumber || 'BCBS-982144'}</code></span>
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Registration & Admission Timestamps</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px' }}>
                    <span>Status: <strong style={{ color: '#1e60ff' }}>{activePatientDrawer.status.toUpperCase()}</strong></span>
                    <span>Registered At: <strong>{activePatientDrawer.registeredAt ? new Date(activePatientDrawer.registeredAt).toLocaleString() : 'Recent'}</strong></span>
                    <span>Admitted At: <strong>{activePatientDrawer.admittedAt ? new Date(activePatientDrawer.admittedAt).toLocaleString() : 'Not Yet Admitted'}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 5-Rights eMAR Medication Timeline */}
            {drawerTab === 'medications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px 16px', borderRadius: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
                  💊 <strong>5-Rights Safety Protocol:</strong> Right Patient, Right Drug, Right Dose, Right Route, Right Time. Prescribed by attending physician, verified by pharmacist, administered by bedside nurse.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { drug: 'Metoprolol Tartrate', dose: '50mg Oral (PO)', freq: 'BID (Twice Daily)', status: 'administered', verifiedBy: 'PharmD Pepper Potts', adminBy: 'RN Christine Palmer' },
                    { drug: 'Ceftriaxone IV', dose: '1g IV Infusion', freq: 'STAT', status: 'dispensed', verifiedBy: 'PharmD Pepper Potts', adminBy: 'Pending Bedside Admin' },
                    { drug: 'Aspirin (Cardio)', dose: '81mg Oral (PO)', freq: 'Daily', status: 'ordered', verifiedBy: 'Central Pharmacy Queue', adminBy: 'Awaiting Dispense' }
                  ].map((med, idx) => (
                    <div key={idx} style={{ padding: '14px 18px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{med.drug}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{med.dose} • {med.freq}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Verifier: {med.verifiedBy} | Admin: {med.adminBy}</div>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: med.status === 'administered' ? 'rgba(16, 185, 129, 0.12)' : med.status === 'dispensed' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: med.status === 'administered' ? '#059669' : med.status === 'dispensed' ? '#2563eb' : '#d97706'
                      }}>
                        ● {med.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Diagnostic Labs & Pathology Findings */}
            {drawerTab === 'labs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534' }}>
                  <span>🔬 <strong>Real-Time LIS Results:</strong> Diagnostic specimen tests and reference range evaluations.</span>
                  <a
                    href="/hms/labs"
                    style={{ padding: '6px 12px', borderRadius: '10px', background: '#166534', color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '11px' }}
                  >
                    + Order STAT Lab Panel →
                  </a>
                </div>

                {drawerLabs.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                    No diagnostic laboratory tests recorded for this patient yet.
                    <div style={{ marginTop: '10px' }}>
                      <a href="/hms/labs" style={{ color: '#1e60ff', fontWeight: 700, textDecoration: 'none' }}>Go to Laboratory Hub to order tests →</a>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {drawerLabs.map((lab: any) => {
                      const isCritical = lab.isCriticalValue || lab.status === 'critical_result';
                      const isCompleted = lab.status === 'completed' || isCritical;
                      return (
                        <div
                          key={lab.id}
                          style={{
                            padding: '14px 18px',
                            borderRadius: '14px',
                            background: isCritical ? '#fef2f2' : '#f8fafc',
                            border: isCritical ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: isCritical ? '#dc2626' : '#0f172a', fontSize: '13px' }}>{lab.testType}</span>
                              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: lab.priority === 'stat' ? '#fee2e2' : '#eff6ff', color: lab.priority === 'stat' ? '#dc2626' : '#2563eb' }}>
                                {lab.priority?.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                              {lab.resultSummary || (lab.numericValue !== undefined ? `Value: ${lab.numericValue}` : 'Specimen Processing')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                              Ref Range: {lab.referenceRange || 'Standard'} • Dr. {lab.doctorName || 'Attending'}
                            </div>
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: isCritical ? '#ef4444' : isCompleted ? '#10b981' : '#f59e0b',
                            color: '#ffffff'
                          }}>
                            {isCritical ? 'CRITICAL' : isCompleted ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Itemized Financial Statement & Inpatient Claims */}
            {drawerTab === 'billing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '14px 18px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                      {drawerInvoices.length > 0 ? `Total Inpatient Bill (#${drawerInvoices[0].id.slice(-6)})` : 'Inpatient Financial Statement'}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
                      ${drawerInvoices.length > 0 ? drawerInvoices[0].patientDue.toLocaleString() : '2,166.00'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Insurance Provider</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{activePatientDrawer.insurance?.provider || 'Blue Cross Blue Shield'}</div>
                    <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>Pre-Authorized (80% Coverage)</div>
                  </div>
                </div>

                {drawerInvoices.length > 0 && drawerInvoices[0].lineItems && drawerInvoices[0].lineItems.length > 0 ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '10px 14px' }}>Category & Service Description</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Gross Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawerInvoices[0].lineItems.map((item: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px' }}>{item.description} ({item.quantity}x)</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>${item.totalCost.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                          <td style={{ padding: '10px 14px' }}>Gross Total Charges</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>${drawerInvoices[0].subtotal.toLocaleString()}</td>
                        </tr>
                        <tr style={{ color: '#059669', fontWeight: 700 }}>
                          <td style={{ padding: '10px 14px' }}>Less: Insurance Payer Coverage (80%)</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>- ${drawerInvoices[0].insuranceCoverage.toLocaleString()}</td>
                        </tr>
                        <tr style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 800 }}>
                          <td style={{ padding: '10px 14px' }}>Net Patient Responsibility Balance</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px' }}>
                            ${drawerInvoices[0].patientDue.toLocaleString()} {drawerInvoices[0].status === 'paid' && '(PAID)'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '10px 14px' }}>Category & Service Description</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Gross Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>🛏️ Inpatient ICU Station Room & Board (3 Days)</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>$4,500.00</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>👨‍⚕️ Attending Physician Consultation & Daily Rounds</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>$1,200.00</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>🔬 STAT Cardiac Biomarkers & Troponin-I Lab Panel</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>$650.00</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>💊 Pharmacy Dispensing & IV Medication Regimen</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>$1,150.00</td>
                        </tr>
                        <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                          <td style={{ padding: '10px 14px' }}>Gross Total Charges</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>$7,500.00</td>
                        </tr>
                        <tr style={{ color: '#059669', fontWeight: 700 }}>
                          <td style={{ padding: '10px 14px' }}>Less: Insurance Payer Pre-Auth Deduction (80%)</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>- $6,000.00</td>
                        </tr>
                        <tr style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 800 }}>
                          <td style={{ padding: '10px 14px' }}>Net Patient Responsibility Balance</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px' }}>$2,166.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <a
                    href="/hms/billing"
                    style={{ padding: '8px 16px', borderRadius: '12px', background: '#0f172a', color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '12px' }}
                  >
                    Open Full Billing & Settle Balance →
                  </a>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setActivePatientDrawer(null)}
                style={{ padding: '10px 24px', borderRadius: '14px', border: 'none', background: '#1e60ff', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Close EMR Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: REGISTER PATIENT MODAL (DEFAULT: PRE-REGISTERED) ─── */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '780px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Register New Patient</h2>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                    ● Default: Pre-Registered / Intake
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Register a patient into the clinical directory. Patients are not admitted to a bed by default unless chosen.
                </p>
              </div>

              <button
                onClick={() => setShowRegisterModal(false)}
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* SECTION 1 */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e60ff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  1. Patient Identity & Demographics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Peter Parker"
                      value={admitName}
                      onChange={e => setAdmitName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Age *</label>
                    <input
                      type="number"
                      required
                      value={admitAge}
                      onChange={e => setAdmitAge(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Gender *</label>
                    <select
                      value={admitGender}
                      onChange={e => setAdmitGender(e.target.value as any)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Blood Group *</label>
                    <select
                      value={admitBlood}
                      onChange={e => setAdmitBlood(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                    <input
                      type="text"
                      value={admitPhone}
                      onChange={e => setAdmitPhone(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Email Address</label>
                    <input
                      type="email"
                      placeholder="patient@example.com"
                      value={admitEmail}
                      onChange={e => setAdmitEmail(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2 */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  2. Clinical Status & Inpatient Bed Placement
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      Clinical Status * (Default: Pre-Registered)
                    </label>
                    <select
                      value={admitStatus}
                      onChange={e => setAdmitStatus(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '2px solid #38bdf8', outline: 'none', fontSize: '13px', background: '#f0f9ff', fontWeight: 700, color: '#0369a1', boxSizing: 'border-box' }}
                    >
                      <option value="pre_registered">🟡 Pre-Registered / Intake Waiting</option>
                      <option value="triage">🔴 ER Triage & Rapid Assessment</option>
                      <option value="outpatient">🟣 Outpatient Specialist Consult</option>
                      <option value="admitted">🔵 Inpatient Admitted to Bed Station</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Assign Bed Station {admitStatus === 'admitted' ? '*' : '(Optional)'}
                    </label>
                    <select
                      value={admitBedId}
                      onChange={e => setAdmitBedId(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Unassigned (Waiting / Outpatient) --</option>
                      {beds.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.label} — ${b.dailyRate}/day ({b.status.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Category</label>
                    <select
                      value={admitCategory}
                      onChange={e => setAdmitCategory(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="general">General Inpatient</option>
                      <option value="vip">VIP Suite</option>
                      <option value="trauma">Emergency Trauma</option>
                      <option value="pediatric">Pediatric</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Attending Physician</label>
                    <select
                      value={admitDoctor}
                      onChange={e => setAdmitDoctor(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      {staffDoctors.length > 0 ? (
                        staffDoctors.map(doc => (
                          <option key={doc.id} value={doc.name}>
                            {doc.name} — {doc.customTitle || doc.roleDisplayName || doc.role} ({doc.contextName || 'General'})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Dr. Ashlynn Carder">Dr. Ashlynn Carder (Lead Clinician)</option>
                          <option value="Dr. Stephen Strange">Dr. Stephen Strange (Cardiothoracic)</option>
                          <option value="Dr. Gregory House">Dr. Gregory House (Diagnostic Medicine)</option>
                          <option value="Dr. John Watson">Dr. John Watson (General Medicine)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3 */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  3. Clinical Diagnosis & Safety Alerts
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Primary Diagnosis *</label>
                    <input
                      type="text"
                      required
                      value={admitDiag}
                      onChange={e => setAdmitDiag(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Known Allergies</label>
                    <input
                      type="text"
                      value={admitAllergies}
                      onChange={e => setAdmitAllergies(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{ padding: '12px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdmitting}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(30, 96, 255, 0.35)'
                  }}
                >
                  {isAdmitting ? 'Saving to DB...' : (admitStatus === 'admitted' ? 'Admit to Inpatient Bed' : 'Register Patient Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: BEDSIDE VITALS RECORDER & NEWS2 DETERIORATION SCORER ─── */}
      {vitalsModalPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
          onClick={() => setVitalsModalPatient(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>🩺 Record Bedside Vitals (NEWS2 Scored)</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Patient: <strong>{vitalsModalPatient.name}</strong> • Station: {vitalsModalPatient.bedLabel || 'Inpatient Bed'}</span>
              </div>
              <button onClick={() => setVitalsModalPatient(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleRecordVitalsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    required
                    value={vitalsBpSys}
                    onChange={e => setVitalsBpSys(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    required
                    value={vitalsBpDia}
                    onChange={e => setVitalsBpDia(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Heart Rate (bpm)</label>
                  <input
                    type="number"
                    required
                    value={vitalsHr}
                    onChange={e => setVitalsHr(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>SpO2 Pulse (%)</label>
                  <input
                    type="number"
                    required
                    value={vitalsSpo2}
                    onChange={e => setVitalsSpo2(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={vitalsTemp}
                    onChange={e => setVitalsTemp(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Respiratory Rate (bpm)</label>
                  <input
                    type="number"
                    required
                    value={vitalsResp}
                    onChange={e => setVitalsResp(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ paddingTop: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={vitalsOnO2}
                      onChange={e => setVitalsOnO2(e.target.checked)}
                    />
                    Patient on Supplemental O2
                  </label>
                </div>
              </div>

              {/* Instant NEWS2 Score Live Preview */}
              {(() => {
                const score = ClinicalAIEngine.calculateNews2({
                  spo2: parseInt(vitalsSpo2) || 98,
                  heartRate: parseInt(vitalsHr) || 74,
                  systolicBp: parseInt(vitalsBpSys) || 120,
                  temperature: parseFloat(vitalsTemp) || 37.0,
                  respiratoryRate: parseInt(vitalsResp) || 16,
                  onOxygen: vitalsOnO2
                });
                return (
                  <div style={{ padding: '12px', borderRadius: '14px', background: score.riskLevel === 'EMERGENCY_CODE_BLUE' ? '#fee2e2' : '#f0fdf4', border: score.riskLevel === 'EMERGENCY_CODE_BLUE' ? '1px solid #fecaca' : '1px solid #dcfce7', fontSize: '12px' }}>
                    <div style={{ fontWeight: 800, color: score.riskLevel === 'EMERGENCY_CODE_BLUE' ? '#dc2626' : '#16a34a' }}>
                      NEWS2 Score: {score.score} Points • Risk: {score.riskLevel}
                    </div>
                    <div style={{ color: '#475569', marginTop: '2px' }}>{score.clinicalAction}</div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setVitalsModalPatient(null)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={isRecordingVitals}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                >
                  {isRecordingVitals ? 'Recording...' : 'Save Vitals & Push Telemetry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: DOCTOR SOAP CONSULTATION NOTES WITH ICD-10 ─── */}
      {soapModalPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
          onClick={() => setSoapModalPatient(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>📝 Doctor SOAP Consultation Note</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Patient: <strong>{soapModalPatient.name}</strong> • Attending: {currentStaff?.name || 'Lead Clinician'}</span>
              </div>
              <button onClick={() => setSoapModalPatient(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveSoapSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e60ff', display: 'block', marginBottom: '4px' }}>S — Subjective (Chief Complaint & History)</label>
                <textarea
                  rows={2}
                  required
                  value={soapSubjective}
                  onChange={e => setSoapSubjective(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e60ff', display: 'block', marginBottom: '4px' }}>O — Objective (Exam Findings & Vitals)</label>
                <textarea
                  rows={2}
                  required
                  value={soapObjective}
                  onChange={e => setSoapObjective(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>

              {/* ICD-10 Lookup Assistant */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e60ff', display: 'block', marginBottom: '4px' }}>A — Assessment & ICD-10 Clinical Diagnosis</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '8px', marginBottom: '6px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Assessment summary..."
                    value={soapAssessment}
                    onChange={e => setSoapAssessment(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                  />
                  <select
                    value={soapIcd10Code}
                    onChange={e => setSoapIcd10Code(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  >
                    {ClinicalAIEngine.suggestIcd10Diagnosis(soapIcd10Query).map(d => (
                      <option key={d.code} value={d.code}>
                        {d.code} — {d.name.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e60ff', display: 'block', marginBottom: '4px' }}>P — Plan (Orders, Medications, Consults)</label>
                <textarea
                  rows={2}
                  required
                  value={soapPlan}
                  onChange={e => setSoapPlan(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setSoapModalPatient(null)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={isSavingSoap}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(30, 96, 255, 0.3)' }}
                >
                  {isSavingSoap ? 'Signing Note...' : 'Sign & Save SOAP Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: SBAR SHIFT HANDOVER GENERATOR ─── */}
      {sbarModalPatient && sbarData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
          onClick={() => setSbarModalPatient(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>📋 SBAR Shift Handover Note</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Patient: <strong>{sbarModalPatient.name}</strong> • Station: {sbarModalPatient.bedLabel || 'Inpatient'}</span>
              </div>
              <button onClick={() => setSbarModalPatient(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ fontWeight: 800, fontSize: '12px', color: '#1e60ff' }}>[S] SITUATION</div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>{sbarData.situation}</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                <div style={{ fontWeight: 800, fontSize: '12px', color: '#9333ea' }}>[B] BACKGROUND</div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>{sbarData.background}</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <div style={{ fontWeight: 800, fontSize: '12px', color: '#c2410c' }}>[A] ASSESSMENT</div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>{sbarData.assessment}</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ fontWeight: 800, fontSize: '12px', color: '#16a34a' }}>[R] RECOMMENDATION</div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>{sbarData.recommendation}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(sbarData.formattedText);
                  showToast('success', 'SBAR Copied', 'SBAR Handover note copied to clipboard.');
                }}
                style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1e60ff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                📄 Copy to Clipboard
              </button>
              <button
                type="button"
                onClick={() => setSbarModalPatient(null)}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: INPATIENT INTER-WARD TRANSFER MODAL ─── */}
      {transferModalPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
          onClick={() => setTransferModalPatient(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>🔄 Inter-Ward Bed Transfer</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Transferring: <strong>{transferModalPatient.name}</strong> from {transferModalPatient.bedLabel || 'Current Bed'}</span>
              </div>
              <button onClick={() => setTransferModalPatient(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Target Available Bed *</label>
                <select
                  required
                  value={transferTargetBedId}
                  onChange={e => setTransferTargetBedId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="">-- Choose Target Available Bed --</option>
                  {availableBedsList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.label} (${b.dailyRate}/day)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Clinical Transfer Reason</label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setTransferModalPatient(null)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={isTransferring || !transferTargetBedId}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                >
                  {isTransferring ? 'Transferring...' : 'Execute Patient Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 7: FORMAL DISCHARGE CLEARANCE PROTOCOL & SUMMARY ─── */}
      {dischargeProtocolPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
          onClick={() => setDischargeProtocolPatient(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>🚪 Formal Inpatient Discharge Protocol</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Discharging: <strong>{dischargeProtocolPatient.name}</strong> • Station: {dischargeProtocolPatient.bedLabel || 'Inpatient Bed'}</span>
              </div>
              <button onClick={() => setDischargeProtocolPatient(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleDischargeProtocolSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Condition at Discharge</label>
                <select
                  value={dischargeCondition}
                  onChange={e => setDischargeCondition(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="Improved">Stable & Clinically Improved</option>
                  <option value="Stable">Routine Outpatient Follow-up Needed</option>
                  <option value="Transferred">Transferred to Specialized Facility</option>
                  <option value="AMA">Discharged Against Medical Advice (AMA)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Generated Clinical Discharge Summary</label>
                <textarea
                  rows={8}
                  value={dischargeSummaryText}
                  onChange={e => setDischargeSummaryText(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.4, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #fed7aa', fontSize: '12px', color: '#c2410c' }}>
                ⚠️ <strong>Clinical Action:</strong> Completing discharge will release Bed <strong>{dischargeProtocolPatient.bedLabel || 'Station'}</strong>, schedule UV-C housekeeping disinfection, and generate the final itemized patient billing statement.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setDischargeProtocolPatient(null)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={isProcessingDischarge}
                  style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)' }}
                >
                  {isProcessingDischarge ? 'Discharging...' : 'Authorize Discharge & Generate Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
