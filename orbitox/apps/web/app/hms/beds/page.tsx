'use client';

import React, { useState, useEffect, useMemo } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';
import Link from 'next/link';
import { useStaffAuth } from '../context/StaffAuthContext';
import { ClinicalAIEngine, BedRecommendation } from '../services/ClinicalAIEngine';

interface Equipment {
  name: string;
  brand: string;
  status: 'online' | 'standby' | 'alarm' | 'offline';
}

interface WardInfo {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  type: string;
}

interface DepartmentInfo {
  id: string;
  name: string;
  type: string;
}

interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  bloodGroup: string;
  category?: string;
  diagnosis: string;
  status: string;
  bedId?: string;
  bedLabel?: string;
  phone?: string;
  email?: string;
}

interface BedMatrixItem {
  id: string;
  label: string;
  wardId?: string;
  ward: string;
  departmentId?: string;
  departmentName?: string;
  roomId?: string;
  room: string;
  type: string;
  status: 'available' | 'occupied' | 'alarm' | 'sanitizing' | 'maintenance' | 'reserved';
  isTemporary?: boolean;
  dailyRate: number;
  equipment: Equipment[];
  patient?: any;
}

export default function BedMatrixPage() {
  const { currentStaff, can } = useStaffAuth();
  const [beds, setBeds] = useState<BedMatrixItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [wards, setWards] = useState<WardInfo[]>([]);
  const [allPatients, setAllPatients] = useState<PatientRecord[]>([]);
  const [filter, setFilter] = useState<'All' | 'Available' | 'Occupied' | 'Sanitizing' | 'Surge'>('All');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Custom Toast Notification System
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string }[]>([]);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    bedLabel?: string;
    confirmText: string;
    confirmVariant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
    isProcessing?: boolean;
  } | null>(null);

  // Modal States
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState<any | null>(null);
  const [showPairModal, setShowPairModal] = useState<BedMatrixItem | null>(null);
  const [selectedBedForAdmit, setSelectedBedForAdmit] = useState<BedMatrixItem | null>(null);
  const [maintenanceBed, setMaintenanceBed] = useState<BedMatrixItem | null>(null);
  const [sanitationBed, setSanitationBed] = useState<BedMatrixItem | null>(null);

  // ─── ADD BED FORM STATE (TWO SEPARATE STEPPED DROPDOWNS: DEPARTMENT -> WARDS) ───
  const [newBedLabel, setNewBedLabel] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [newBedRoom, setNewBedRoom] = useState('Room 102');
  const [newBedType, setNewBedType] = useState('icu');
  const [newBedRate, setNewBedRate] = useState('1500');
  const [newBedIsSurge, setNewBedIsSurge] = useState(false);
  const [newBedDevice, setNewBedDevice] = useState('Philips IntelliVue MX800');
  const [isCreatingBed, setIsCreatingBed] = useState(false);

  // ─── ASSIGN BED / ADMIT PATIENT STATE (SELECT EXISTING vs NEW) ───
  const [admitMode, setAdmitMode] = useState<'existing' | 'new'>('existing');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState<'all' | 'unassigned' | 'discharged'>('all');
  const [selectedExistingPatientId, setSelectedExistingPatientId] = useState('');
  const [admitDoctor, setAdmitDoctor] = useState('dr_ashlynn_01');

  // New Patient Form fields
  const [admitName, setAdmitName] = useState('');
  const [admitAge, setAdmitAge] = useState('35');
  const [admitGender, setAdmitGender] = useState<'M' | 'F' | 'Other'>('F');
  const [admitBlood, setAdmitBlood] = useState('O+');
  const [admitPhone, setAdmitPhone] = useState('+1 (805) 529-1832');
  const [admitCategory, setAdmitCategory] = useState('general');
  const [admitDiag, setAdmitDiag] = useState('Acute Respiratory Distress');
  const [isAdmitting, setIsAdmitting] = useState(false);

  // Pair Equipment State
  const [newDeviceModel, setNewDeviceModel] = useState('GE CARESCAPE B650');
  const [newDeviceBrand, setNewDeviceBrand] = useState('GE Healthcare');

  // AI-Driven Bed Recommendation matching patient diagnosis & acuity to beds
  const smartBedRecommendations = useMemo(() => {
    const diagnosis = admitMode === 'existing'
      ? (allPatients.find(p => p.id === selectedExistingPatientId)?.diagnosis || '')
      : admitDiag;
    if (!diagnosis || !diagnosis.trim()) return [];
    return ClinicalAIEngine.recommendBed(
      { diagnosis, category: admitCategory },
      beds.map(b => ({
        id: b.id,
        label: b.label,
        type: b.type,
        wardName: b.ward,
        status: b.status,
        attachedEquipment: (b.equipment || []).map(e => ({ deviceType: e.name, model: e.brand }))
      }))
    );
  }, [admitMode, selectedExistingPatientId, allPatients, admitDiag, admitCategory, beds]);

  // Fetch real departments & wards from OrbitoX DB / Hierarchy Engine
  const fetchDepartmentsAndWards = async () => {
    try {
      const res = await fetch('/api/hospital/departments');
      const data = await res.json();
      if (data.success) {
        if (data.departments && data.departments.length > 0) {
          setDepartments(data.departments);
          if (!selectedDeptId) {
            setSelectedDeptId(data.departments[0].id);
          }
        }
        if (data.wards && data.wards.length > 0) {
          setWards(data.wards);
          const firstDeptId = data.departments?.[0]?.id;
          const matchingWards = data.wards.filter((w: WardInfo) => w.departmentId === firstDeptId);
          if (matchingWards.length > 0 && !selectedWardId) {
            setSelectedWardId(matchingWards[0].id);
          } else if (!selectedWardId) {
            setSelectedWardId(data.wards[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch departments from DB:', err);
    }
  };

  // Fetch all patients from DB for patient selector dropdown
  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/hospital/patients');
      const data = await res.json();
      if (data.success && data.data) {
        setAllPatients(data.data);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Fetch real beds directly from OrbitoX Database
  const fetchBeds = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hospital/beds');
      const data = await res.json();
      if (data.success && data.data) {
        const mapped: BedMatrixItem[] = data.data.map((b: any) => {
          let wardLabel = b.wardId || 'Cardiac ICU Ward';
          if (b.type === 'emergency_trauma_bay' || (b.wardId && b.wardId.includes('er'))) wardLabel = 'Trauma Resuscitation Ward';
          else if (b.type === 'temporary_surge' || (b.wardId && b.wardId.includes('surge'))) wardLabel = 'Field Surge Overflow';
          else if (b.wardId && b.wardId.includes('cardio')) wardLabel = 'Cardiac ICU Ward';
          else if (b.wardId && b.wardId.includes('neuro')) wardLabel = 'Neuro ICU & Stroke Unit';
          else if (b.wardId && b.wardId.includes('peds')) wardLabel = 'Pediatric ICU (PICU)';
          else if (b.wardId && b.wardId.includes('surg')) wardLabel = 'Post-Anesthesia Care (PACU)';

          return {
            id: b.id,
            label: b.label,
            wardId: b.wardId,
            ward: wardLabel,
            roomId: b.roomId,
            room: b.roomId ? (b.roomId.includes('101') ? 'Room 101' : b.roomId.includes('102') ? 'Room 102' : 'Bay 01') : 'Bay 01',
            type: b.type === 'icu' ? 'ICU Critical Care' : b.type === 'emergency_trauma_bay' ? 'Emergency Bay' : b.type === 'temporary_surge' ? 'Temporary Surge' : b.type || 'Standard Ward',
            status: b.status || 'available',
            isTemporary: b.isTemporary || b.type === 'temporary_surge',
            dailyRate: b.dailyRate || 1200,
            equipment: b.attachedEquipment && b.attachedEquipment.length > 0 ? b.attachedEquipment.map((eq: any) => ({
              name: eq.model || eq.deviceId || 'Monitor',
              brand: eq.manufacturer || 'Medical Tech',
              status: eq.status || 'online'
            })) : [
              { name: 'IntelliVue MX800', brand: 'Philips', status: 'online' }
            ],
            patient: b.patient
          };
        });
        setBeds(mapped);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const [staffDoctors, setStaffDoctors] = useState<any[]>([]);

  // Fetch Live Staff Directory for Doctor Roster
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
          let defaultDocId = docs[0].id;
          const saved = localStorage.getItem('orbitox_active_clinical_staff');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const match = docs.find((d: any) => d.id === parsed.id || d.name === parsed.name);
              if (match) defaultDocId = match.id;
            } catch {}
          }
          setAdmitDoctor(defaultDocId);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch staff directory in beds page:', err);
    }
  };

  useEffect(() => {
    fetchBeds();
    fetchDepartmentsAndWards();
    fetchPatients();
    fetchStaffDoctors();

    const handleSessionChange = () => {
      fetchStaffDoctors();
    };

    window.addEventListener('orbitox_staff_session_changed', handleSessionChange);
    return () => window.removeEventListener('orbitox_staff_session_changed', handleSessionChange);
  }, []);

  // When Department changes in Add Bed Modal, automatically update Ward selection to the first ward in that department
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    const matchingWards = wards.filter(w => w.departmentId === deptId);
    if (matchingWards.length > 0 && matchingWards[0]) {
      setSelectedWardId(matchingWards[0].id);
    } else {
      setSelectedWardId('');
    }
  };

  // 1. ACTION: Provision New Bed
  const handleCreateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBedLabel) return;

    setIsCreatingBed(true);
    try {
      const selectedWard = wards.find(w => w.id === selectedWardId);
      const res = await fetch('/api/hospital/beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newBedLabel,
          wardId: selectedWardId || selectedDeptId || 'apollo-ny-cardio-icu',
          roomId: newBedRoom,
          type: newBedType,
          dailyRate: Number(newBedRate),
          isTemporary: newBedIsSurge || (selectedWard?.name.toLowerCase().includes('surge') ?? false),
          attachedEquipment: [
            {
              deviceId: `dev_${Date.now()}`,
              manufacturer: newBedDevice.includes('Philips') ? 'Philips' : newBedDevice.includes('GE') ? 'GE Healthcare' : newBedDevice.includes('Hamilton') ? 'Hamilton' : 'ZOLL',
              model: newBedDevice,
              status: 'online'
            }
          ]
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Bed Provisioned', `Added ${newBedLabel} to ${selectedWardId || 'ward'}.`);
        setShowAddBedModal(false);
        setNewBedLabel('');
        await fetchBeds();
      } else {
        showToast('error', 'Creation Failed', data.error || 'Failed to add bed');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to add bed');
    } finally {
      setIsCreatingBed(false);
    }
  };

  // 2. ACTION: Discharge Patient & Start Sanitization (Custom Popup)
  const handleDischargePatient = (bedId: string) => {
    const targetBed = beds.find(b => b.id === bedId);
    setConfirmDialog({
      isOpen: true,
      title: 'Discharge Inpatient',
      description: `Are you sure you want to discharge the patient in ${targetBed?.label || 'this bed'}? This will release the bed into sanitization turnover and record the discharge in the cryptographic ledger.`,
      bedLabel: targetBed?.label,
      confirmText: 'Confirm Discharge',
      confirmVariant: 'danger',
      action: async () => {
        const res = await fetch(`/api/hospital/beds/${bedId}?action=discharge`, {
          method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
          showToast('success', 'Patient Discharged', `${targetBed?.label || 'Bed'} marked for sanitization turnover.`);
          await fetchBeds();
          await fetchPatients();
        } else {
          showToast('error', 'Discharge Failed', data.error || 'Discharge failed');
        }
      }
    });
  };

  // 3. ACTION: Complete Bed Sanitization Turnover -> Mark Available
  const handleCompleteTurnover = async (bedId: string) => {
    try {
      const res = await fetch(`/api/hospital/beds/${bedId}?action=turnover`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Turnover Complete', 'Bed sanitization verified. Status set to Available.');
        await fetchBeds();
      }
    } catch (err: any) {
      showToast('error', 'Turnover Error', err.message);
    }
  };

  // 4. ACTION: Change Bed Status (e.g. Maintenance, Sanitizing)
  const handleChangeBedStatus = async (bedId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/hospital/beds/${bedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast('info', 'Status Updated', `Bed status updated to ${newStatus.toUpperCase()}`);
        await fetchBeds();
      }
    } catch (err: any) {
      showToast('error', 'Status Error', err.message);
    }
  };

  // 5. ACTION: Open Assign Bed / Admit Patient Modal
  const openAdmitModalForBed = (bed: BedMatrixItem) => {
    setSelectedBedForAdmit(bed);
    setSelectedExistingPatientId(allPatients[0]?.id || '');
    setAdmitMode('existing');
    setShowAdmitModal(true);
  };

  // Submit Admission (Existing Patient or New Registration)
  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedForAdmit) return;

    setIsAdmitting(true);
    try {
      let payload: any = {
        bedId: selectedBedForAdmit.id,
        attendingDoctorId: admitDoctor
      };

      if (admitMode === 'existing') {
        if (!selectedExistingPatientId) {
          showToast('error', 'Patient Required', 'Please select an existing patient from the database');
          setIsAdmitting(false);
          return;
        }
        payload.patientId = selectedExistingPatientId;
      } else {
        if (!admitName) {
          showToast('error', 'Name Required', 'Patient name is required');
          setIsAdmitting(false);
          return;
        }
        payload = {
          ...payload,
          name: admitName,
          age: parseInt(admitAge) || 30,
          gender: admitGender,
          bloodGroup: admitBlood,
          phone: admitPhone,
          category: admitCategory,
          diagnosis: admitDiag,
          allergies: 'NKDA'
        };
      }

      const res = await fetch('/api/hospital/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Admission Complete', `Patient assigned to ${selectedBedForAdmit.label}.`);
        setShowAdmitModal(false);
        setAdmitName('');
        await fetchBeds();
        await fetchPatients();
      } else {
        showToast('error', 'Admission Failed', data.error || 'Admission failed');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Admission failed');
    } finally {
      setIsAdmitting(false);
    }
  };

  // 6. ACTION: Pair Machinery / Equipment
  const handlePairEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPairModal) return;

    const updatedEquipment = [
      ...showPairModal.equipment,
      { name: newDeviceModel, brand: newDeviceBrand, status: 'online' as const }
    ];

    try {
      const res = await fetch(`/api/hospital/beds/${showPairModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachedEquipment: updatedEquipment.map(eq => ({
            deviceId: `dev_${Date.now()}`,
            model: eq.name,
            manufacturer: eq.brand,
            status: eq.status
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowPairModal(null);
        await fetchBeds();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered Patients for the dropdown in Admit Modal
  const filteredPatientsForAdmit = allPatients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      p.diagnosis.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      (p.bloodGroup && p.bloodGroup.toLowerCase().includes(patientSearchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (patientStatusFilter === 'unassigned') return !p.bedId || p.status !== 'admitted';
    if (patientStatusFilter === 'discharged') return p.status === 'discharged';
    return true;
  });

  // Filtered wards for currently selected department in Add Bed Modal
  const currentDeptWards = wards.filter(w => w.departmentId === selectedDeptId);

  // Filtered beds on main page
  const filteredBeds = beds.filter((b) => {
    if (filter === 'Available' && b.status !== 'available') return false;
    if (filter === 'Occupied' && b.status !== 'occupied' && b.status !== 'alarm') return false;
    if (filter === 'Sanitizing' && b.status !== 'sanitizing' && b.status !== 'maintenance') return false;
    if (filter === 'Surge' && !b.isTemporary) return false;

    if (deptFilter !== 'all') {
      if (b.wardId && !b.wardId.includes(deptFilter.replace('apollo-ny-', ''))) {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchLabel = b.label.toLowerCase().includes(q);
      const matchWard = b.ward.toLowerCase().includes(q);
      const matchPatient = b.patient?.name?.toLowerCase().includes(q);
      const matchDiag = b.patient?.diagnosis?.toLowerCase().includes(q);
      if (!matchLabel && !matchWard && !matchPatient && !matchDiag) return false;
    }

    return true;
  });

  return (
    <HospitalNavLayout
      headerTitle="Ward & Bed Matrix"
      headerSubtitle="Real-time clinical bed inventory & station lifecycle management"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Quick Search */}
          <input
            type="text"
            placeholder="Search bed, ward, or patient..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              background: 'rgba(255, 255, 255, 0.9)',
              fontSize: '12px',
              outline: 'none',
              color: '#0f172a',
              width: '200px'
            }}
          />

          {/* Department Filter Selector */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="all">🏢 All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Filter Status Pills */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.85)', padding: '4px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            {(['All', 'Available', 'Occupied', 'Sanitizing', 'Surge'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: 'none',
                  background: filter === f ? '#1e60ff' : 'transparent',
                  color: filter === f ? '#ffffff' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* + ADD BED BUTTON */}
          {can('bed.create') && (
            <button
              onClick={() => setShowAddBedModal(true)}
              style={{
                background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '24px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(30, 96, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>+</span> Add Bed
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', gridColumn: '1/-1' }}>
            Loading real beds from OrbitoX DB...
          </div>
        ) : filteredBeds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', gridColumn: '1/-1' }}>
            No beds matching active filters.
          </div>
        ) : (
          filteredBeds.map((bed) => {
            const isOccupied = bed.status === 'occupied' || bed.status === 'alarm';
            const isSanitizing = bed.status === 'sanitizing';
            const isMaintenance = bed.status === 'maintenance';
            const isAvailable = bed.status === 'available';

            return (
              <div
                key={bed.id}
                style={{
                  background: isSanitizing ? 'rgba(255, 251, 235, 0.92)' : 'rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(20px)',
                  border: isSanitizing ? '1px solid #fde68a' : '1px solid rgba(255, 255, 255, 0.95)',
                  borderRadius: '28px',
                  padding: '24px 28px',
                  boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{bed.label}</h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{bed.ward} • {bed.room}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {bed.isTemporary && (
                      <span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                        SURGE
                      </span>
                    )}
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: isOccupied ? 'rgba(30, 96, 255, 0.1)' : isSanitizing ? 'rgba(245, 158, 11, 0.15)' : isMaintenance ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: isOccupied ? '#1e60ff' : isSanitizing ? '#d97706' : isMaintenance ? '#ef4444' : '#10b981'
                      }}
                    >
                      ● {bed.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Admitted Patient Banner if Occupied */}
                {bed.patient && (
                  <div style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(30, 96, 255, 0.06)', border: '1px solid rgba(30, 96, 255, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#1e60ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ADMITTED INPATIENT</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{bed.patient.name} ({bed.patient.age}y {bed.patient.gender})</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{bed.patient.diagnosis || 'Clinical Inpatient'}</div>
                    </div>
                    <button
                      onClick={() => setShowPatientModal(bed.patient)}
                      style={{ padding: '4px 10px', borderRadius: '10px', border: '1px solid #93c5fd', background: '#ffffff', color: '#1e60ff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Inspect
                    </button>
                  </div>
                )}

                {/* Sanitizing / Terminal UV-C Turnover Status Banner */}
                {isSanitizing && (
                  <div style={{ padding: '12px 16px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.9) 0%, rgba(253, 230, 138, 0.5) 100%)', border: '1px solid #fcd34d', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', animation: 'pulse 1.5s infinite' }}>🧹</span>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>UV-C Terminal Turnover in Progress</div>
                          <div style={{ fontSize: '11px', color: '#78350f' }}>Automated room disinfection & airborne particle scrub active</div>
                        </div>
                      </div>
                      {can('bed.turnover') ? (
                        <button
                          onClick={() => handleCompleteTurnover(bed.id)}
                          style={{ padding: '6px 14px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', fontSize: '11px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
                        >
                          ✓ Validate & Release
                        </button>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#92400e', background: 'rgba(255,255,255,0.7)', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>
                          Housekeeping Role
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Specs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <span>Type: <strong style={{ color: '#0f172a' }}>{bed.type}</strong></span>
                  <span>Rate: <strong style={{ color: '#1e60ff' }}>${bed.dailyRate}/day</strong></span>
                </div>

                {/* Paired Machinery */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Paired Machinery ({bed.equipment.length})
                    </span>
                    <button
                      onClick={() => setShowPairModal(bed)}
                      style={{ border: 'none', background: 'transparent', color: '#1e60ff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Pair Device
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {bed.equipment.map((eq, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '12px',
                          background: 'rgba(248, 250, 252, 0.9)',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a' }}>{eq.name}</strong> <span style={{ color: '#64748b' }}>({eq.brand})</span>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: eq.status === 'online' ? '#10b981' : '#f59e0b' }}>
                          ● {eq.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ACTION TRAY (THE REQUESTED ACTIONS) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: 'auto' }}>
                  {isOccupied ? (
                    <>
                      {can('patient.discharge') ? (
                        <button
                          onClick={() => handleDischargePatient(bed.id)}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '12px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.06)',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          🚪 Discharge Patient
                        </button>
                      ) : (
                        <span
                          title="Patient discharge is restricted to Attending Doctors and Admins"
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#94a3b8',
                            fontSize: '11px',
                            fontWeight: 600,
                            textAlign: 'center',
                            cursor: 'not-allowed'
                          }}
                        >
                          🔒 Discharge (Doctor Only)
                        </span>
                      )}

                      <button
                        onClick={() => setShowPairModal(bed)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        📟 Devices
                      </button>
                    </>
                  ) : isAvailable ? (
                    <>
                      {can('patient.admit') ? (
                        <button
                          onClick={() => openAdmitModalForBed(bed)}
                          style={{
                            flex: 1.2,
                            padding: '9px 14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(30, 96, 255, 0.25)'
                          }}
                        >
                          <span>+</span> Admit / Assign Patient
                        </button>
                      ) : (
                        <span
                          title="Patient admission is restricted to Doctors and Admins"
                          style={{
                            flex: 1.2,
                            padding: '9px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#94a3b8',
                            fontSize: '11px',
                            fontWeight: 600,
                            textAlign: 'center',
                            cursor: 'not-allowed'
                          }}
                        >
                          🔒 Admit (Doctor Only)
                        </span>
                      )}

                      {can('bed.turnover') && (
                        <button
                          onClick={() => handleChangeBedStatus(bed.id, 'sanitizing')}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#64748b',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🧹 Turnover
                        </button>
                      )}

                      <button
                        onClick={() => handleChangeBedStatus(bed.id, 'maintenance')}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#64748b',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🔧 Service
                      </button>
                    </>
                  ) : (
                    <>
                      {can('bed.turnover') ? (
                        <button
                          onClick={() => handleCompleteTurnover(bed.id)}
                          style={{
                            flex: 1,
                            padding: '9px 14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#10b981',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          ✓ Mark Available for Admissions
                        </button>
                      ) : (
                        <span
                          title="Bed turnover completion is restricted to Nurses, Housekeeping and Admins"
                          style={{
                            flex: 1,
                            padding: '9px 14px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#94a3b8',
                            fontSize: '11px',
                            fontWeight: 600,
                            textAlign: 'center',
                            cursor: 'not-allowed'
                          }}
                        >
                          🔒 Sanitizing in Progress (Nurse/Housekeeping)
                        </span>
                      )}
                    </>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ─── MODAL 1: PROVISION BED (SEPARATE DEPARTMENT & WARD DROPDOWNS) ─── */}
      {showAddBedModal && (
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
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Provision Clinical Bed Station</h2>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                    REAL DB WARDS
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  First select Department, then choose its assigned Ward to place the new bed.
                </p>
              </div>
              <button
                onClick={() => setShowAddBedModal(false)}
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBed} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Bed Label / Station Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bed 102-A (Cardiac ICU)"
                  value={newBedLabel}
                  onChange={e => setNewBedLabel(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* ─── SEPARATE DEPARTMENT & WARD DROPDOWNS ─── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                
                {/* 1. SELECT DEPARTMENT */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    1. Select Department *
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={e => handleDepartmentChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        📁 {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. SELECT WARD (FILTERED BY DEPARTMENT) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      2. Select Ward *
                    </label>
                    <span style={{ fontSize: '10px', color: '#1e60ff', fontWeight: 700 }}>
                      {currentDeptWards.length} Available
                    </span>
                  </div>
                  <select
                    value={selectedWardId}
                    onChange={e => setSelectedWardId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    {currentDeptWards.length === 0 ? (
                      <option value={selectedDeptId}>General Ward ({selectedDeptId})</option>
                    ) : (
                      currentDeptWards.map(w => (
                        <option key={w.id} value={w.id}>
                          🏥 {w.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

              </div>

              {/* Room & Bed Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Room / Bay Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBedRoom}
                    onChange={e => setNewBedRoom(e.target.value)}
                    placeholder="e.g. Room 102"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Bed Classification Type
                  </label>
                  <select
                    value={newBedType}
                    onChange={e => setNewBedType(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="icu">ICU Critical Care</option>
                    <option value="standard">Standard General Ward</option>
                    <option value="emergency_trauma_bay">Emergency Trauma Bay</option>
                    <option value="private_suite">Private VIP Suite</option>
                    <option value="temporary_surge">Temporary Surge Overflow</option>
                    <option value="burn_unit">Burn Unit Isolation</option>
                    <option value="recovery_pacu">PACU Recovery</option>
                  </select>
                </div>
              </div>

              {/* Rate & Initial Device */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Daily Rate ($/day)
                  </label>
                  <input
                    type="number"
                    value={newBedRate}
                    onChange={e => setNewBedRate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Initial Paired Medical Device
                  </label>
                  <select
                    value={newBedDevice}
                    onChange={e => setNewBedDevice(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option>Philips IntelliVue MX800 (Multi-Para Vitals)</option>
                    <option>GE CARESCAPE B650 (Bedside Monitor)</option>
                    <option>Hamilton Medical Hamilton-G5 (Ventilator)</option>
                    <option>ZOLL R Series Plus (Crash Cart Defib)</option>
                    <option>Masimo Rad-97 (Pulse Oximeter)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="surgeCheck"
                  checked={newBedIsSurge}
                  onChange={e => setNewBedIsSurge(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="surgeCheck" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                  Mark as Emergency Surge / Temporary Overflow Bed
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddBedModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBed}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(30, 96, 255, 0.3)'
                  }}
                >
                  {isCreatingBed ? 'Provisioning...' : 'Provision Bed Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ASSIGN BED / ADMIT PATIENT (WITH PATIENT DROPDOWN & FILTERS) ─── */}
      {showAdmitModal && selectedBedForAdmit && (
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
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    Assign Bed to Patient
                  </h2>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e60ff', background: 'rgba(30, 96, 255, 0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                    {selectedBedForAdmit.label}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Select an existing registered patient from DB or register a new patient for immediate admission.
                </p>
              </div>

              <button
                onClick={() => setShowAdmitModal(false)}
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs: Existing DB Patient vs Register New */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '16px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setAdmitMode('existing')}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: admitMode === 'existing' ? '#ffffff' : 'transparent',
                  color: admitMode === 'existing' ? '#1e60ff' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: admitMode === 'existing' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                👥 Select Existing Patient ({allPatients.length} in DB)
              </button>

              <button
                type="button"
                onClick={() => setAdmitMode('new')}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: admitMode === 'new' ? '#ffffff' : 'transparent',
                  color: admitMode === 'new' ? '#1e60ff' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: admitMode === 'new' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                ➕ Register & Admit New Patient
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* ─── CASE A: SELECT EXISTING PATIENT WITH SEARCH & FILTERS ─── */}
              {admitMode === 'existing' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Search and Status Filters */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="🔍 Search patient by name, ID, diagnosis, blood..."
                      value={patientSearchTerm}
                      onChange={e => setPatientSearchTerm(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#f8fafc'
                      }}
                    />

                    <select
                      value={patientStatusFilter}
                      onChange={e => setPatientStatusFilter(e.target.value as any)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569'
                      }}
                    >
                      <option value="all">All Patients</option>
                      <option value="unassigned">Unassigned / Waiting</option>
                      <option value="discharged">Discharged / Re-admit</option>
                    </select>
                  </div>

                  {/* Patient Dropdown List */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Select Patient Record *
                    </label>
                    <select
                      size={Math.min(6, Math.max(3, filteredPatientsForAdmit.length))}
                      value={selectedExistingPatientId}
                      onChange={e => setSelectedExistingPatientId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '14px',
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {filteredPatientsForAdmit.length === 0 ? (
                        <option disabled>No matching patients found</option>
                      ) : (
                        filteredPatientsForAdmit.map(p => (
                          <option
                            key={p.id}
                            value={p.id}
                            style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                          >
                            👤 {p.name} — {p.age}y ({p.gender}), Blood: {p.bloodGroup || 'O+'} | Diagnosis: {p.diagnosis} | [{p.status.toUpperCase()}]
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Selected Patient Details Preview Card */}
                  {selectedExistingPatientId && (() => {
                    const sel = allPatients.find(p => p.id === selectedExistingPatientId);
                    if (!sel) return null;
                    return (
                      <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(30, 96, 255, 0.05)', border: '1px solid rgba(30, 96, 255, 0.15)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{sel.name}</span>
                          <span style={{ fontWeight: 700, color: '#1e60ff', background: '#fff', padding: '2px 8px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                            {sel.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ color: '#475569' }}>
                          <strong>Demographics:</strong> {sel.age} years old • {sel.gender === 'F' ? 'Female' : 'Male'} • Blood: <strong style={{ color: '#dc2626' }}>{sel.bloodGroup || 'O+'}</strong>
                        </div>
                        <div style={{ color: '#475569' }}>
                          <strong>Chief Complaint / Diagnosis:</strong> {sel.diagnosis}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>
                          Current Station: {sel.bedLabel || 'Not currently assigned to an active bed'}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Attending Doctor */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Attending Physician
                    </label>
                    <select
                      value={admitDoctor}
                      onChange={e => setAdmitDoctor(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      {staffDoctors.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.customTitle || doc.roleDisplayName || doc.role})
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              ) : (
                /* ─── CASE B: REGISTER NEW PATIENT ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Peter Parker"
                      value={admitName}
                      onChange={e => setAdmitName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Age</label>
                      <input
                        type="number"
                        value={admitAge}
                        onChange={e => setAdmitAge(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Gender</label>
                      <select
                        value={admitGender}
                        onChange={e => setAdmitGender(e.target.value as any)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box', fontSize: '13px' }}
                      >
                        <option value="F">Female</option>
                        <option value="M">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Blood Group</label>
                      <select
                        value={admitBlood}
                        onChange={e => setAdmitBlood(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box', fontSize: '13px' }}
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Primary Diagnosis / Chief Complaint *
                    </label>
                    <input
                      type="text"
                      required
                      value={admitDiag}
                      onChange={e => setAdmitDiag(e.target.value)}
                      placeholder="e.g. Acute Respiratory Distress"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                    />
                  </div>

                  {/* Attending Doctor */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Attending Physician
                    </label>
                    <select
                      value={admitDoctor}
                      onChange={e => setAdmitDoctor(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      {staffDoctors.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.customTitle || doc.roleDisplayName || doc.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Category</label>
                      <select
                        value={admitCategory}
                        onChange={e => setAdmitCategory(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box', fontSize: '13px' }}
                      >
                        <option value="general">General Inpatient</option>
                        <option value="vip">VIP Suite</option>
                        <option value="trauma">Trauma Emergency</option>
                        <option value="pediatric">Pediatric</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Phone</label>
                      <input
                        type="text"
                        value={admitPhone}
                        onChange={e => setAdmitPhone(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SMART BED AI ALLOCATION RECOMMENDER ─── */}
              {smartBedRecommendations.length > 0 && smartBedRecommendations[0] && (() => {
                const topRec = smartBedRecommendations[0];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '16px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#1e40af' }}>
                        <span>🤖</span> Clinical AI Bed Match Recommendation
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px' }}>
                        {topRec.matchScore}% Match
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#1e3a8a' }}>
                      Recommended Station: <strong>{topRec.bedLabel}</strong> ({topRec.wardName})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#475569' }}>
                      {topRec.reasons.map((r, i) => (
                        <div key={i}>✓ {r}</div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdmitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(30, 96, 255, 0.3)'
                  }}
                >
                  {isAdmitting ? 'Assigning Bed...' : `Assign to ${selectedBedForAdmit.label}`}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: PAIR DEVICE MODAL ─── */}
      {showPairModal && (
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
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Pair Medical Machinery</h2>
              <button onClick={() => setShowPairModal(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handlePairEquipment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Device Model</label>
                <input
                  type="text"
                  required
                  value={newDeviceModel}
                  onChange={e => setNewDeviceModel(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Manufacturer Brand</label>
                <input
                  type="text"
                  required
                  value={newDeviceBrand}
                  onChange={e => setNewDeviceBrand(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowPairModal(null)} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: '#1e60ff', color: '#fff', fontWeight: 700 }}>
                  Attach to {showPairModal.label}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: PATIENT INSPECT MODAL (DEEPLY INTERCONNECTED) ─── */}
      {showPatientModal && (
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
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#1e60ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
                  {showPatientModal.name ? showPatientModal.name[0] : 'P'}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{showPatientModal.name}</h2>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>ID: {showPatientModal.id}</span>
                </div>
              </div>
              <button onClick={() => setShowPatientModal(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '18px', fontSize: '13px' }}>
              <div>Age / Gender: <strong style={{ color: '#0f172a' }}>{showPatientModal.age} yrs ({showPatientModal.gender})</strong></div>
              <div>Blood Group: <strong style={{ color: '#0f172a' }}>{showPatientModal.bloodGroup || 'O+'}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>Diagnosis: <strong style={{ color: '#1e60ff' }}>{showPatientModal.diagnosis}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>Attending Doctor: <strong style={{ color: '#0f172a' }}>{showPatientModal.attendingDoctorId || 'Dr. Ashlynn Carder'}</strong></div>
            </div>

            {/* Quick Cross-Module Action Links */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Interconnected Clinical Actions:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <Link
                  href="/hms/pharmacy"
                  style={{
                    padding: '9px 12px',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#16a34a',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    justifyContent: 'center'
                  }}
                >
                  💊 Prescribe eMAR
                </Link>

                <Link
                  href="/hms/labs"
                  style={{
                    padding: '9px 12px',
                    borderRadius: '12px',
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    color: '#9333ea',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    justifyContent: 'center'
                  }}
                >
                  🔬 Order STAT Lab
                </Link>

                <Link
                  href="/hms/telemetry"
                  style={{
                    padding: '9px 12px',
                    borderRadius: '12px',
                    background: '#fef2f2',
                    border: '1px solid #fecdd3',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    justifyContent: 'center'
                  }}
                >
                  📡 Live Telemetry
                </Link>

                <Link
                  href="/hms/billing"
                  style={{
                    padding: '9px 12px',
                    borderRadius: '12px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0284c7',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    justifyContent: 'center'
                  }}
                >
                  💳 Inpatient Billing
                </Link>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <Link
                href="/hms/patients"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e60ff',
                  textDecoration: 'none'
                }}
              >
                Open Full EHR Chart →
              </Link>
              <button
                onClick={() => setShowPatientModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              gap: '18px'
            }}
          >
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

            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {confirmDialog.description}
            </p>

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

      {/* ─── MODAL: MEDICAL EQUIPMENT MAINTENANCE & CALIBRATION ─── */}
      {maintenanceBed && (
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
          onClick={() => setMaintenanceBed(null)}
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
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>🛠️ Medical Device Maintenance & Calibration</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Station: <strong>{maintenanceBed.label}</strong> ({maintenanceBed.ward})</span>
              </div>
              <button onClick={() => setMaintenanceBed(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(maintenanceBed.equipment || []).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No medical telemetry hardware currently paired to this station.
                </div>
              ) : (
                maintenanceBed.equipment.map((eq, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{eq.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Brand: {eq.brand} • Calibration Status: <strong style={{ color: '#10b981' }}>PASSED</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        showToast('success', 'Calibration Logged', `${eq.name} calibrated by Clinical Engineering. Certificate hash logged to SHA-256 ledger.`);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid #bbf7d0',
                        background: '#f0fdf4',
                        color: '#16a34a',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Calibrate
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setMaintenanceBed(null)}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: UV-C SANITATION & TURNOVER VERIFICATION ─── */}
      {sanitationBed && (
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
          onClick={() => setSanitationBed(null)}
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
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>🧼 Housekeeping UV-C Disinfection</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Station: <strong>{sanitationBed.label}</strong> ({sanitationBed.ward})</span>
              </div>
              <button onClick={() => setSanitationBed(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '13px' }}>
              <div style={{ fontWeight: 800, color: '#16a34a' }}>✨ UV-C Sterilization Cycle Completed</div>
              <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                Terminal cleaning checklist passed: Linens changed, high-touch surfaces disinfected, telemetry leads replaced.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" onClick={() => setSanitationBed(null)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  await handleCompleteTurnover(sanitationBed.id);
                  setSanitationBed(null);
                }}
                style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
              >
                ✓ Authorize Bed Available
              </button>
            </div>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
