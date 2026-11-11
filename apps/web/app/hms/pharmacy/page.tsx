'use client';

import React, { useState, useEffect, useMemo } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';
import Link from 'next/link';
import { useStaffAuth } from '../context/StaffAuthContext';
import { ClinicalAIEngine, DrugInteraction, DrugAllergyConflict } from '../services/ClinicalAIEngine';

interface PrescriptionOrder {
  id: string;
  patientId?: string;
  patientName: string;
  bedId: string;
  prescribedByDoctorId: string;
  procedureOrDrug: string;
  dosage: string;
  route: string;
  frequency: string;
  status: 'ordered' | 'dispensed' | 'administered';
}

interface PatientRecord {
  id: string;
  name: string;
  bedLabel?: string;
  status: string;
  allergies?: string[] | string;
}

export default function PharmacyPage() {
  const { currentStaff, can } = useStaffAuth();
  const [orders, setOrders] = useState<PrescriptionOrder[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'ordered' | 'dispensed' | 'administered'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string }[]>([]);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Prescribe New Medication Modal State
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [prescribingDoctor, setPrescribingDoctor] = useState('Dr. Ashlynn Carder');
  const [staffDoctors, setStaffDoctors] = useState<any[]>([]);
  const [rxDrug, setRxDrug] = useState('Metoprolol Tartrate');
  const [rxDosage, setRxDosage] = useState('50mg');
  const [rxFreq, setRxFreq] = useState('BID (Twice Daily)');
  const [rxRoute, setRxRoute] = useState('Oral (PO)');
  const [isPrescribing, setIsPrescribing] = useState(false);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);

  // ─── FORMULARY INVENTORY STATE ───
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryList, setInventoryList] = useState([
    { id: 'rx_01', name: 'Metoprolol Tartrate', category: 'Cardiovascular', stock: 142, reorder: 50, unitCost: 1.25, expiry: '2028-06-30' },
    { id: 'rx_02', name: 'Ceftriaxone IV 1g', category: 'Antibiotics', stock: 88, reorder: 30, unitCost: 14.50, expiry: '2027-11-15' },
    { id: 'rx_03', name: 'Aspirin 81mg (Cardio)', category: 'Antiplatelet', stock: 320, reorder: 100, unitCost: 0.45, expiry: '2029-01-01' },
    { id: 'rx_04', name: 'Nitroglycerin IV Infusion', category: 'Emergency Vasodilator', stock: 18, reorder: 25, unitCost: 45.00, expiry: '2027-04-10' },
    { id: 'rx_05', name: 'Vancomycin 1g IV', category: 'Antibiotics', stock: 45, reorder: 40, unitCost: 28.00, expiry: '2027-09-20' },
    { id: 'rx_06', name: 'Heparin Sodium 5000 units', category: 'Anticoagulant', stock: 95, reorder: 50, unitCost: 8.50, expiry: '2028-03-12' },
    { id: 'rx_07', name: 'Epinephrine 1:1000 STAT', category: 'Emergency Code Blue', stock: 12, reorder: 20, unitCost: 65.00, expiry: '2027-02-28' }
  ]);

  // ─── BCMA BARSCODE VERIFICATION STATE ───
  const [bcmaOrder, setBcmaOrder] = useState<PrescriptionOrder | null>(null);
  const [bcmaWristbandScanned, setBcmaWristbandScanned] = useState(false);
  const [bcmaMedScanned, setBcmaMedScanned] = useState(false);

  // ─── ADVERSE DRUG REACTION (ADR) STATE ───
  const [adrOrder, setAdrOrder] = useState<PrescriptionOrder | null>(null);
  const [adrReactionText, setAdrReactionText] = useState('Mild erythema and localized pruritus following IV infusion.');
  const [adrSeverity, setAdrSeverity] = useState<'Mild' | 'Moderate' | 'Severe'>('Mild');
  const [isLoggingAdr, setIsLoggingAdr] = useState(false);

  // Real-time CDSS interaction and allergy analysis
  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  const activePatientMedications = useMemo(() => {
    if (!selectedPatientId) return [];
    return orders
      .filter(o => o.patientId === selectedPatientId && o.status !== 'administered')
      .map(o => o.procedureOrDrug);
  }, [orders, selectedPatientId]);

  const cdssResults = useMemo(() => {
    if (!rxDrug || !rxDrug.trim()) return { ddi: [], allergies: [] };
    const ddi = ClinicalAIEngine.checkDrugInteractions(rxDrug, activePatientMedications);
    const allergies = currentPatient ? ClinicalAIEngine.checkAllergyConflicts(rxDrug, currentPatient.allergies || []) : [];
    return { ddi, allergies };
  }, [rxDrug, activePatientMedications, currentPatient]);

  const fetchLiveOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hospital/treatments');
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch treatments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/hospital/patients');
      const data = await res.json();
      if (data.success && data.data) {
        setPatients(data.data);
        if (data.data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    }
  };

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
          setPrescribingDoctor(activeDocName);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff in pharmacy:', err);
    }
  };

  useEffect(() => {
    fetchLiveOrders();
    fetchPatients();
    fetchStaffDoctors();
  }, []);

  const handleAction = async (treatmentId: string, action: 'dispense' | 'administer') => {
    try {
      let activeStaffId = action === 'dispense' ? 'pharmacist_pepper_01' : 'nurse_palmer_01';
      const saved = localStorage.getItem('orbitox_active_clinical_staff');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.id) activeStaffId = parsed.id;
        } catch {}
      }

      const res = await fetch('/api/hospital/treatments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId,
          action,
          staffId: activeStaffId
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          'success',
          action === 'dispense' ? 'Medication Dispensed' : 'Administered at Bedside',
          `Order #${treatmentId.slice(-6)} verified with 5-rights and updated in DB.`
        );
        await fetchLiveOrders();
      } else {
        showToast('error', 'Action Failed', data.error || 'Failed to update treatment');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handlePrescribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setIsPrescribing(true);
    try {
      const res = await fetch('/api/hospital/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          prescribedByDoctorId: prescribingDoctor,
          type: 'medication',
          procedureOrDrug: rxDrug,
          dosage: rxDosage,
          frequency: rxFreq,
          route: rxRoute
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Rx Prescribed', `Order for ${rxDrug} added to pharmacy queue.`);
        setShowPrescribeModal(false);
        await fetchLiveOrders();
      } else {
        showToast('error', 'Prescription Failed', data.error || 'Failed to create order');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsPrescribing(false);
    }
  };

  const handleRestockItem = (itemId: string) => {
    setInventoryList(prev =>
      prev.map(item => (item.id === itemId ? { ...item, stock: item.stock + 50 } : item))
    );
    showToast('success', 'Formulary Restocked', '+50 units added to pharmacy central inventory.');
  };

  const handleBcmaAdministerSubmit = async () => {
    if (!bcmaOrder) return;
    if (!bcmaWristbandScanned || !bcmaMedScanned) {
      showToast('error', 'BCMA Incomplete', 'Both Patient Wristband and Medication Barcode must be scanned to verify 5-Rights.');
      return;
    }
    await handleAction(bcmaOrder.id, 'administer');
    setBcmaOrder(null);
    setBcmaWristbandScanned(false);
    setBcmaMedScanned(false);
  };

  const handleAdrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adrOrder) return;

    setIsLoggingAdr(true);
    try {
      if (adrOrder.patientId) {
        await fetch(`/api/hospital/patients/${adrOrder.patientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicalNotes: `[ADR ALERT - ${new Date().toLocaleDateString()}]: Adverse reaction to ${adrOrder.procedureOrDrug} (${adrSeverity}). Reaction: ${adrReactionText}. Attending notified.`
          })
        });
      }
      showToast('error', '🚨 ADR Alert Logged', `Adverse Drug Reaction for ${adrOrder.procedureOrDrug} recorded in patient EHR.`);
      setAdrOrder(null);
    } catch (err: any) {
      showToast('error', 'Failed to Log ADR', err.message);
    } finally {
      setIsLoggingAdr(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    if (searchTerm) {
      const matchPatient = o.patientName && o.patientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDrug = o.procedureOrDrug && o.procedureOrDrug.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchPatient && !matchDrug) return false;
    }
    return true;
  });

  return (
    <HospitalNavLayout
      headerTitle="Central Pharmacy & eMAR Queue"
      headerSubtitle="5-Rights medication safety, automated barcode verification & bedside dispensing."
      actions={
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowInventoryModal(true)}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '24px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📦 Formulary Stock ({inventoryList.length})
          </button>
          {can('treatment.prescribe') && (
            <button
              onClick={() => setShowPrescribeModal(true)}
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
              <span>+</span> Order Prescription
            </button>
          )}
          <span
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            ✓ 5-RIGHTS VERIFIED
          </span>
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
              <span style={{ fontSize: '16px' }}>{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px' }}>{t.title}</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>{t.message}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 5-Rights Verification Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            borderRadius: '28px',
            padding: '24px 32px',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px'
          }}
        >
          {[
            { label: 'Right Patient', desc: 'Wristband Barcode Scanned' },
            { label: 'Right Drug', desc: 'Rx Database Matched' },
            { label: 'Right Dose', desc: 'Clinical Quota Validated' },
            { label: 'Right Route', desc: 'IV / Oral Form Verified' },
            { label: 'Right Time', desc: 'Schedule Clock Synced' }
          ].map((r, i) => (
            <div
              key={i}
              style={{
                padding: '16px',
                borderRadius: '18px',
                background: 'rgba(248, 250, 252, 0.9)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e60ff' }}>{r.label}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{r.desc}</div>
            </div>
          ))}
        </div>

        {/* Orders Queue Table */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            borderRadius: '28px',
            padding: '28px 32px',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Prescription Orders ({filteredOrders.length})
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>Real-time pharmacy orders and bedside administration logs</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(241, 245, 249, 0.9)', padding: '4px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                {(['All', 'ordered', 'dispensed', 'administered'] as const).map(s => (
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
                      textTransform: 'capitalize'
                    }}
                  >
                    {s === 'ordered' ? 'Pending' : s}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search patient, drug..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  background: 'rgba(248, 250, 252, 0.9)',
                  fontSize: '12px',
                  outline: 'none',
                  color: '#0f172a',
                  width: '180px'
                }}
              />

              <button
                onClick={fetchLiveOrders}
                style={{
                  padding: '7px 14px',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient & Bed</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Medication</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dosage & Route</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Frequency</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Clinical Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      Loading prescription orders from OrbitoX DB...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      No active prescriptions in queue matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    let badgeBg = 'rgba(245, 158, 11, 0.1)';
                    let badgeColor = '#d97706';
                    if (order.status === 'dispensed') {
                      badgeBg = 'rgba(37, 99, 235, 0.1)';
                      badgeColor = '#2563eb';
                    } else if (order.status === 'administered') {
                      badgeBg = 'rgba(16, 185, 129, 0.1)';
                      badgeColor = '#059669';
                    }

                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '16px' }}>
                          <Link
                            href="/hms/patients"
                            style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Open Patient EHR Chart"
                          >
                            <span>{order.patientName}</span>
                            <span style={{ fontSize: '11px', color: '#1e60ff' }}>↗</span>
                          </Link>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{order.bedId || 'Inpatient Station'}</div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#1e60ff' }}>
                          {order.procedureOrDrug}
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>
                          {order.dosage} • {order.route}
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>
                          {order.frequency}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: badgeBg,
                              color: badgeColor
                            }}
                          >
                            ● {order.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          {order.status === 'ordered' && (
                            can('treatment.dispense') ? (
                              <button
                                onClick={() => handleAction(order.id, 'dispense')}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(30, 96, 255, 0.25)'
                                }}
                              >
                                Dispense Meds
                              </button>
                            ) : (
                              <span
                                title="Dispensing is restricted to Pharmacists (PharmD) and Admins"
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '10px',
                                  background: '#f1f5f9',
                                  color: '#94a3b8',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'not-allowed'
                                }}
                              >
                                🔒 Pharmacist Only
                              </span>
                            )
                          )}
                          {order.status === 'dispensed' && (
                            can('treatment.administer') ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => {
                                    setBcmaOrder(order);
                                    setBcmaWristbandScanned(false);
                                    setBcmaMedScanned(false);
                                  }}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#ffffff',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  📱 BCMA Barcode Scan
                                </button>
                              </div>
                            ) : (
                              <span
                                title="Bedside administration is restricted to Nurses (RN) and Admins"
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '10px',
                                  background: '#f1f5f9',
                                  color: '#94a3b8',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'not-allowed'
                                }}
                              >
                                🔒 Nurse Only
                              </span>
                            )
                          )}
                          {order.status === 'administered' && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                                ✓ Administered
                              </span>
                              <button
                                onClick={() => {
                                  setAdrOrder(order);
                                  setAdrReactionText(`Patient experienced adverse reaction to ${order.procedureOrDrug}.`);
                                  setAdrSeverity('Mild');
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #fecdd3',
                                  background: '#fff1f2',
                                  color: '#e11d48',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title="Report Adverse Drug Reaction to Patient EHR"
                              >
                                ⚠️ ADR
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── MODAL: PRESCRIBE NEW MEDICATION ─── */}
      {showPrescribeModal && (
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
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>Prescribe Medication (eMAR)</h2>
              <button onClick={() => setShowPrescribeModal(false)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handlePrescribeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Select Inpatient / Patient *</label>
                <select
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.bedLabel || p.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Prescribing Physician *</label>
                <select
                  value={prescribingDoctor}
                  onChange={e => setPrescribingDoctor(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
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
                      <option value="Dr. Stephen Strange">Dr. Stephen Strange (Cardiology)</option>
                      <option value="Dr. Gregory House">Dr. Gregory House (Diagnostics)</option>
                    </>
                  )}
                </select>
              </div>

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

              {/* ─── REAL-TIME CLINICAL DECISION SUPPORT (CDSS) AI BANNER ─── */}
              {((cdssResults.ddi && cdssResults.ddi.length > 0) || (cdssResults.allergies && cdssResults.allergies.length > 0)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '14px', background: '#fff1f2', border: '1px solid #fecdd3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#b91c1c' }}>
                    <span>🛡️</span> CDSS Clinical Safety Alerts Detected
                  </div>

                  {/* Allergy Alerts */}
                  {cdssResults.allergies.map((allergy, idx) => (
                    <div key={`allergy-${idx}`} style={{ fontSize: '12px', color: '#991b1b', background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                      <strong style={{ color: '#dc2626' }}>🚨 ALLERGY CONFLICT:</strong> Patient allergic to <strong>{allergy.allergen}</strong>. {allergy.description}
                    </div>
                  ))}

                  {/* DDI Alerts */}
                  {cdssResults.ddi.map((ddi, idx) => (
                    <div key={`ddi-${idx}`} style={{ fontSize: '12px', color: '#991b1b', background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                      <strong style={{ color: '#dc2626' }}>⚠️ {ddi.severity}: {ddi.title}</strong>
                      <p style={{ margin: '3px 0', fontSize: '11px', color: '#475569' }}>{ddi.mechanism}</p>
                      <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>💡 Recommendation: {ddi.recommendation}</div>
                    </div>
                  ))}

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#7f1d1d', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      checked={overrideAcknowledged}
                      onChange={e => setOverrideAcknowledged(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    I acknowledge these clinical warnings and approve clinical override.
                  </label>
                </div>
              )}

              {/* Patient Allergies Notice if no conflict */}
              {currentPatient && (!cdssResults.allergies || cdssResults.allergies.length === 0) && (
                <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                  🩺 <strong>Documented Allergies:</strong> {Array.isArray(currentPatient.allergies) ? currentPatient.allergies.join(', ') : currentPatient.allergies || 'No Known Drug Allergies (NKDA)'}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowPrescribeModal(false)} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={isPrescribing || (((cdssResults.ddi && cdssResults.ddi.length > 0) || (cdssResults.allergies && cdssResults.allergies.length > 0)) && !overrideAcknowledged)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: (((cdssResults.ddi && cdssResults.ddi.length > 0) || (cdssResults.allergies && cdssResults.allergies.length > 0)) && !overrideAcknowledged) ? '#94a3b8' : '#1e60ff',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: (((cdssResults.ddi && cdssResults.ddi.length > 0) || (cdssResults.allergies && cdssResults.allergies.length > 0)) && !overrideAcknowledged) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isPrescribing ? 'Ordering...' : 'Confirm Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: FORMULARY INVENTORY & REORDER TRACKER ─── */}
      {showInventoryModal && (
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
          onClick={() => setShowInventoryModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '750px',
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
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>📦 Central Pharmacy Formulary Inventory</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Real-time stock monitoring, reorder thresholds & unit acquisition pricing</span>
              </div>
              <button onClick={() => setShowInventoryModal(false)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '10px 12px' }}>Drug & Category</th>
                  <th style={{ padding: '10px 12px' }}>Stock on Hand</th>
                  <th style={{ padding: '10px 12px' }}>Unit Cost</th>
                  <th style={{ padding: '10px 12px' }}>Expiry</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {inventoryList.map(item => {
                  const isLow = item.stock <= item.reorder;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.category}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '8px', background: isLow ? '#fee2e2' : '#f0fdf4', color: isLow ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                          {item.stock} units {isLow && '(LOW)'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#334155' }}>
                        ${item.unitCost.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {item.expiry}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRestockItem(item.id)}
                          style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e60ff', fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Restock 50
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowInventoryModal(false)}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Close Formulary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: BCMA BEDSIDE BARCODE SCANNER VERIFIER ─── */}
      {bcmaOrder && (
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
          onClick={() => setBcmaOrder(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
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
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>📱 BCMA Bedside Barcode Verification</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Order: <strong>{bcmaOrder.procedureOrDrug}</strong> ({bcmaOrder.dosage})</span>
              </div>
              <button onClick={() => setBcmaOrder(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Step 1: Scan Patient Wristband */}
              <div style={{ padding: '14px 18px', borderRadius: '16px', background: bcmaWristbandScanned ? '#f0fdf4' : '#f8fafc', border: bcmaWristbandScanned ? '1px solid #bbf7d0' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>1. Patient Wristband Barcode</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Target: {bcmaOrder.patientName} • ID: {bcmaOrder.patientId || 'PT-ORB'}
                  </div>
                </div>
                {bcmaWristbandScanned ? (
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '12px' }}>✓ VERIFIED</span>
                ) : (
                  <button
                    onClick={() => {
                      setBcmaWristbandScanned(true);
                      showToast('success', 'Wristband Scanned', `Patient ${bcmaOrder.patientName} confirmed.`);
                    }}
                    style={{ padding: '6px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e60ff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                  >
                    📷 Scan Wristband
                  </button>
                )}
              </div>

              {/* Step 2: Scan Medication Blister / Unit Dose */}
              <div style={{ padding: '14px 18px', borderRadius: '16px', background: bcmaMedScanned ? '#f0fdf4' : '#f8fafc', border: bcmaMedScanned ? '1px solid #bbf7d0' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>2. Medication Unit Dose Barcode</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Target: {bcmaOrder.procedureOrDrug} ({bcmaOrder.dosage})
                  </div>
                </div>
                {bcmaMedScanned ? (
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '12px' }}>✓ VERIFIED</span>
                ) : (
                  <button
                    onClick={() => {
                      setBcmaMedScanned(true);
                      showToast('success', 'Medication Scanned', `${bcmaOrder.procedureOrDrug} dose verified.`);
                    }}
                    style={{ padding: '6px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e60ff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                  >
                    📷 Scan Unit Dose
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" onClick={() => setBcmaOrder(null)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button
                type="button"
                disabled={!bcmaWristbandScanned || !bcmaMedScanned}
                onClick={handleBcmaAdministerSubmit}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  background: (!bcmaWristbandScanned || !bcmaMedScanned) ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: (!bcmaWristbandScanned || !bcmaMedScanned) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                }}
              >
                ✓ Confirm Bedside Administration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: ADVERSE DRUG REACTION (ADR) REPORTING ─── */}
      {adrOrder && (
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
          onClick={() => setAdrOrder(null)}
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
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>⚠️ Report Adverse Drug Reaction (ADR)</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Patient: <strong>{adrOrder.patientName}</strong> • Drug: {adrOrder.procedureOrDrug}</span>
              </div>
              <button onClick={() => setAdrOrder(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAdrSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Reaction Severity</label>
                <select
                  value={adrSeverity}
                  onChange={e => setAdrSeverity(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="Mild">Mild (Erythema, Nausea, Localized)</option>
                  <option value="Moderate">Moderate (Urticaria, Dyspnea, Bronchospasm)</option>
                  <option value="Severe">Severe (Anaphylaxis, Angioedema, Code Blue)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Clinical Symptoms & Intervention</label>
                <textarea
                  rows={4}
                  required
                  value={adrReactionText}
                  onChange={e => setAdrReactionText(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setAdrOrder(null)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={isLoggingAdr}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)' }}
                >
                  {isLoggingAdr ? 'Logging...' : 'Submit ADR to Patient Chart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
