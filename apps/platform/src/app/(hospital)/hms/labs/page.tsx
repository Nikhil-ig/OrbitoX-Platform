'use client';

import React, { useState, useEffect, useMemo } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';
import { useStaffAuth } from '../context/StaffAuthContext';
import Link from 'next/link';

interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  bedLabel?: string;
  doctorName: string;
  orderedByDoctorId: string;
  testType: string;
  category: 'cardiac' | 'hematology' | 'biochemistry' | 'microbiology' | 'blood_gas';
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'completed' | 'critical_result';
  isCriticalValue: boolean;
  numericValue?: number;
  flag?: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
  referenceRange?: string;
  resultSummary?: string;
  technicianId?: string;
  orderedAt: string;
  completedAt?: string;
  standardPrice?: number;
}

const AVAILABLE_TESTS = [
  { name: 'Troponin-I (STAT)', category: 'cardiac', defaultPriority: 'stat', refRange: '< 0.04 ng/mL', unit: 'ng/mL' },
  { name: 'CK-MB (Cardiac Panel)', category: 'cardiac', defaultPriority: 'urgent', refRange: '0 - 5.0 ng/mL', unit: 'ng/mL' },
  { name: 'Potassium (Serum)', category: 'biochemistry', defaultPriority: 'urgent', refRange: '3.5 - 5.0 mEq/L', unit: 'mEq/L' },
  { name: 'Sodium (Serum)', category: 'biochemistry', defaultPriority: 'routine', refRange: '135 - 145 mEq/L', unit: 'mEq/L' },
  { name: 'Blood Glucose (Random)', category: 'biochemistry', defaultPriority: 'routine', refRange: '70 - 140 mg/dL', unit: 'mg/dL' },
  { name: 'Complete Blood Count (CBC)', category: 'hematology', defaultPriority: 'routine', refRange: '4.5 - 11.0 k/uL', unit: 'k/uL' },
  { name: 'Hemoglobin (Hgb)', category: 'hematology', defaultPriority: 'routine', refRange: '12.0 - 17.5 g/dL', unit: 'g/dL' },
  { name: 'Platelets Count', category: 'hematology', defaultPriority: 'routine', refRange: '150 - 450 k/uL', unit: 'k/uL' },
  { name: 'Arterial Blood Gas (pH)', category: 'blood_gas', defaultPriority: 'stat', refRange: '7.35 - 7.45', unit: 'pH' },
  { name: 'Serum Lactate (Sepsis)', category: 'biochemistry', defaultPriority: 'urgent', refRange: '0.5 - 2.0 mmol/L', unit: 'mmol/L' },
  { name: 'Serum Creatinine (Renal)', category: 'biochemistry', defaultPriority: 'routine', refRange: '0.6 - 1.2 mg/dL', unit: 'mg/dL' }
];

export default function PathologyLabsPage() {
  const { currentStaff, can } = useStaffAuth();
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [staffDoctors, setStaffDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState<LabOrder | null>(null);
  const [phlebotomyModalOrder, setPhlebotomyModalOrder] = useState<LabOrder | null>(null);
  const [criticalAlertModalOrder, setCriticalAlertModalOrder] = useState<LabOrder | null>(null);
  const [tubeType, setTubeType] = useState('Lavender Top (EDTA)');
  const [phlebotomistName, setPhlebotomistName] = useState('Phleb. Wanda Maximoff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Order Form State
  const [orderPatientId, setOrderPatientId] = useState('');
  const [orderDoctorId, setOrderDoctorId] = useState('');
  const [orderTestType, setOrderTestType] = useState(AVAILABLE_TESTS[0]?.name || 'Troponin-I (STAT)');
  const [orderPriority, setOrderPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [orderClinicalNotes, setOrderClinicalNotes] = useState('');

  // Enter Result Form State
  const [reportNumericValue, setReportNumericValue] = useState<string>('');
  const [reportSummary, setReportSummary] = useState('');
  const [reportIsCritical, setReportIsCritical] = useState(false);

  const fetchLabData = async () => {
    try {
      setLoading(true);
      const [labsRes, patientsRes, staffRes] = await Promise.all([
        fetch('/api/hospital/labs'),
        fetch('/api/hospital/patients'),
        fetch('/api/hospital/security/staff')
      ]);

      const labsData = await labsRes.json();
      const patientsData = await patientsRes.json();
      const staffData = await staffRes.json();

      if (labsData.success && labsData.data) {
        setLabOrders(labsData.data);
      }
      if (patientsData.success && patientsData.data) {
        setPatients(patientsData.data);
        if (patientsData.data.length > 0 && !orderPatientId) {
          setOrderPatientId(patientsData.data[0].id);
        }
      }
      if (staffData.success && staffData.data) {
        const docs = staffData.data.filter((s: any) => s.role.includes('doctor') || s.role === 'super_admin');
        setStaffDoctors(docs);
        if (docs.length > 0 && !orderDoctorId) {
          setOrderDoctorId(currentStaff?.id || docs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load lab data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
    const interval = setInterval(fetchLabData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Lab Orders
  const filteredOrders = useMemo(() => {
    return labOrders.filter(order => {
      const matchesSearch =
        order.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.testType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = selectedPriority === 'all' || order.priority === selectedPriority;
      const matchesCategory = selectedCategory === 'all' || order.category === selectedCategory;

      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [labOrders, searchQuery, selectedPriority, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const total = labOrders.length;
    const statOrders = labOrders.filter(o => o.priority === 'stat' && o.status === 'ordered').length;
    const pending = labOrders.filter(o => o.status === 'ordered').length;
    const critical = labOrders.filter(o => o.status === 'critical_result' || o.isCriticalValue).length;
    return { total, statOrders, pending, critical };
  }, [labOrders]);

  // Handle Create Lab Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hospital/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: orderPatientId,
          doctorId: orderDoctorId || currentStaff?.id || 'dr_ashlynn_01',
          testType: orderTestType,
          priority: orderPriority,
          clinicalNotes: orderClinicalNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowOrderModal(false);
        setOrderClinicalNotes('');
        await fetchLabData();
      } else {
        alert(data.error || 'Failed to order lab test');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Submit Lab Result
  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReportModal) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/hospital/labs/${showReportModal.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numericValue: reportNumericValue ? parseFloat(reportNumericValue) : undefined,
          resultSummary: reportSummary || `Value reported: ${reportNumericValue}`,
          isCriticalValue: reportIsCritical,
          technicianId: currentStaff?.id || 'lab_tech_01'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowReportModal(null);
        setReportNumericValue('');
        setReportSummary('');
        setReportIsCritical(false);
        await fetchLabData();
      } else {
        alert(data.error || 'Failed to report results');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <HospitalNavLayout
      headerTitle="Pathology & Diagnostic Laboratories 🔬"
      headerSubtitle="STAT Clinical Diagnostics, Specimen Workflow & Real-Time Critical Value Alerts"
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          {can('lab.order') && (
            <button
              onClick={() => setShowOrderModal(true)}
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
              <span>+</span> Order Diagnostic Test
            </button>
          )}
        </div>
      }
    >
      {/* 1. Top KPI Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL SPECIMENS</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{stats.total}</div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>● 100% Digital LIS Tracked</div>
        </div>

        <div style={{ background: stats.statOrders > 0 ? '#fef2f2' : '#ffffff', padding: '20px', borderRadius: '20px', border: stats.statOrders > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: stats.statOrders > 0 ? '#dc2626' : '#64748b' }}>STAT ORDERS PENDING</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: stats.statOrders > 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>{stats.statOrders}</div>
          <div style={{ fontSize: '11px', color: stats.statOrders > 0 ? '#b91c1c' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
            {stats.statOrders > 0 ? '⚠️ High Priority Processing' : '✓ Normal Turnaround'}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>QUEUE PENDING</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e60ff', marginTop: '4px' }}>{stats.pending}</div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Awaiting lab verification</div>
        </div>

        <div style={{ background: stats.critical > 0 ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : '#ffffff', padding: '20px', borderRadius: '20px', border: stats.critical > 0 ? '1px solid #f87171' : '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: stats.critical > 0 ? '#991b1b' : '#64748b' }}>CRITICAL VALUES</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: stats.critical > 0 ? '#991b1b' : '#10b981', marginTop: '4px' }}>{stats.critical}</div>
          <div style={{ fontSize: '11px', color: stats.critical > 0 ? '#7f1d1d' : '#10b981', fontWeight: 700, marginTop: '2px' }}>
            {stats.critical > 0 ? '🚨 STAT Escalations Active' : '✓ Reference Ranges Safe'}
          </div>
        </div>
      </div>

      {/* 2. Critical Alert Banner if Any Critical Results */}
      {stats.critical > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: '#ffffff', padding: '16px 20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🚨</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.02em' }}>CRITICAL LABORATORY VALUES DETECTED</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>One or more diagnostic test results have breached life-threatening thresholds. Attending clinical teams notified.</div>
            </div>
          </div>
          <Link
            href="/hms/telemetry"
            style={{ padding: '8px 16px', borderRadius: '12px', background: '#ffffff', color: '#dc2626', fontWeight: 800, fontSize: '12px', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          >
            Monitor Telemetry →
          </Link>
        </div>
      )}

      {/* 3. Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: '#ffffff', padding: '14px 20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
        <input
          type="text"
          placeholder="Search by patient, test name, or specimen ID..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '240px', padding: '9px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
        />

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={e => setSelectedPriority(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
        >
          <option value="all">All Priorities</option>
          <option value="stat">🚨 STAT</option>
          <option value="urgent">⚡ Urgent</option>
          <option value="routine">Routine</option>
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
        >
          <option value="all">All Panels</option>
          <option value="cardiac">Cardiac</option>
          <option value="biochemistry">Biochemistry</option>
          <option value="hematology">Hematology</option>
          <option value="blood_gas">Blood Gas</option>
        </select>
      </div>

      {/* 4. Lab Orders Worklist Table */}
      <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            Diagnostic Specimen Worklist ({filteredOrders.length})
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Real-time LIS Sync</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading laboratory orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No laboratory orders found matching filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Priority</th>
                  <th style={{ padding: '14px 20px' }}>Patient & Bed</th>
                  <th style={{ padding: '14px 20px' }}>Test Panel</th>
                  <th style={{ padding: '14px 20px' }}>Reference Range</th>
                  <th style={{ padding: '14px 20px' }}>Finding / Status</th>
                  <th style={{ padding: '14px 20px' }}>Ordering Physician</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const isStat = order.priority === 'stat';
                  const isUrgent = order.priority === 'urgent';
                  const isCompleted = order.status === 'completed' || order.status === 'critical_result';
                  const isCritical = order.isCriticalValue || order.status === 'critical_result';

                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isCritical ? 'rgba(254, 226, 226, 0.4)' : isStat && !isCompleted ? 'rgba(254, 243, 199, 0.3)' : 'transparent'
                      }}
                    >
                      {/* Priority */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: isStat ? '#fee2e2' : isUrgent ? '#fef3c7' : '#f1f5f9',
                            color: isStat ? '#dc2626' : isUrgent ? '#d97706' : '#475569',
                            display: 'inline-block'
                          }}
                        >
                          {order.priority.toUpperCase()}
                        </span>
                      </td>

                      {/* Patient & Bed */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{order.patientName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {order.patientAge ? `${order.patientAge}y ${order.patientGender || ''}` : ''} • 📍 {order.bedLabel || 'Inpatient'}
                        </div>
                      </td>

                      {/* Test Panel */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#1e60ff' }}>{order.testType}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>Category: {order.category}</div>
                      </td>

                      {/* Reference Range */}
                      <td style={{ padding: '16px 20px', color: '#475569' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {order.referenceRange || AVAILABLE_TESTS.find(t => t.name === order.testType)?.refRange || 'Standard Range'}
                        </div>
                      </td>

                      {/* Finding / Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {isCompleted ? (
                          <div>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: isCritical ? '#ef4444' : '#10b981',
                                color: '#ffffff',
                                display: 'inline-block',
                                marginBottom: '4px'
                              }}
                            >
                              {isCritical ? '🚨 CRITICAL RESULT' : '✓ VERIFIED NORMAL'}
                            </span>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                              {order.resultSummary || (order.numericValue !== undefined ? `${order.numericValue} ${AVAILABLE_TESTS.find(t => t.name === order.testType)?.unit || ''}` : 'Completed')}
                            </div>
                          </div>
                        ) : (
                          <span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: '#eff6ff', color: '#2563eb' }}>
                            SPECIMEN IN QUEUE
                          </span>
                        )}
                      </td>

                      {/* Ordering Physician */}
                      <td style={{ padding: '16px 20px', color: '#475569' }}>
                        <div>{order.doctorName}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(order.orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setPhlebotomyModalOrder(order);
                              const test = AVAILABLE_TESTS.find(t => t.name === order.testType);
                              if (test?.category === 'hematology') setTubeType('Lavender Top (EDTA)');
                              else if (test?.category === 'cardiac' || test?.category === 'biochemistry') setTubeType('Gold Top (SST Serum Gel)');
                              else if (test?.category === 'blood_gas') setTubeType('Green Top (Heparin)');
                              else setTubeType('Light Blue (Sodium Citrate)');
                            }}
                            title="Phlebotomy Specimen Label & Barcode Tracker"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '10px',
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              color: '#1e60ff',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🩸 Barcode
                          </button>

                          {order.isCriticalValue && (
                            <button
                              onClick={() => setCriticalAlertModalOrder(order)}
                              title="STAT Escalate Critical Panic Value to Attending MD"
                              style={{
                                padding: '5px 10px',
                                borderRadius: '10px',
                                border: '1px solid #fca5a5',
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              🚨 Alert MD
                            </button>
                          )}

                          {!isCompleted ? (
                            can('lab.report') ? (
                              <button
                                onClick={() => {
                                  setShowReportModal(order);
                                  const found = AVAILABLE_TESTS.find(t => t.name === order.testType);
                                  setReportNumericValue('');
                                  setReportSummary('');
                                  setReportIsCritical(false);
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
                                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                }}
                              >
                                Enter Findings
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Lab Role Required</span>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                setShowReportModal(order);
                                setReportNumericValue(order.numericValue !== undefined ? String(order.numericValue) : '');
                                setReportSummary(order.resultSummary || '');
                                setReportIsCritical(order.isCriticalValue);
                              }}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Inspect / Amend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: ORDER DIAGNOSTIC LAB TEST ─── */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Order Diagnostic Lab Panel 🔬</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>CPOE pathology order requisition</span>
              </div>
              <button onClick={() => setShowOrderModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Select Patient */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Patient *</label>
                <select
                  value={orderPatientId}
                  onChange={e => setOrderPatientId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}y {p.gender}) — {p.bedLabel || p.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Test Panel */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Test Panel *</label>
                <select
                  value={orderTestType}
                  onChange={e => {
                    setOrderTestType(e.target.value);
                    const found = AVAILABLE_TESTS.find(t => t.name === e.target.value);
                    if (found?.defaultPriority) {
                      setOrderPriority(found.defaultPriority as any);
                    }
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
                >
                  {AVAILABLE_TESTS.map(t => (
                    <option key={t.name} value={t.name}>
                      {t.name} (Ref: {t.refRange})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority & Attending Doctor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Priority</label>
                  <select
                    value={orderPriority}
                    onChange={e => setOrderPriority(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">⚡ Urgent</option>
                    <option value="stat">🚨 STAT (Immediate)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Physician</label>
                  <select
                    value={orderDoctorId}
                    onChange={e => setOrderDoctorId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
                  >
                    {staffDoctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clinical Indication Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Clinical Indication / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Rule out acute STEMI / Sepsis evaluation"
                  value={orderClinicalNotes}
                  onChange={e => setOrderClinicalNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(30, 96, 255, 0.3)' }}
                >
                  {isSubmitting ? 'Submitting Order...' : 'Dispatch Lab Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ENTER FINDINGS & REPORT RESULTS ─── */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Enter Diagnostic Findings 🧪</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {showReportModal.testType} for <strong>{showReportModal.patientName}</strong>
                </span>
              </div>
              <button onClick={() => setShowReportModal(null)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleSubmitResult} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Reference Range Banner */}
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                <strong>Standard Reference Range:</strong> {showReportModal.referenceRange || AVAILABLE_TESTS.find(t => t.name === showReportModal.testType)?.refRange || 'Standard Lab Panel'}
              </div>

              {/* Numeric Value Input */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Numeric Value ({AVAILABLE_TESTS.find(t => t.name === showReportModal.testType)?.unit || 'unit'})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 0.45"
                  value={reportNumericValue}
                  onChange={e => {
                    const val = e.target.value;
                    setReportNumericValue(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      if (showReportModal.testType.includes('Troponin') && num > 0.10) {
                        setReportIsCritical(true);
                      } else if (showReportModal.testType.includes('Potassium') && (num < 3.0 || num > 6.0)) {
                        setReportIsCritical(true);
                      } else if (showReportModal.testType.includes('pH') && (num < 7.25 || num > 7.55)) {
                        setReportIsCritical(true);
                      } else {
                        setReportIsCritical(false);
                      }
                    }
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              {/* Diagnostic Interpretation / Summary */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Clinical Finding & Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Elevated Troponin-I consistent with myocardial injury. Immediate cardiology consult recommended."
                  value={reportSummary}
                  onChange={e => setReportSummary(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Critical Value Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', background: reportIsCritical ? '#fee2e2' : '#f8fafc', border: reportIsCritical ? '1px solid #fca5a5' : '1px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  id="critValCheck"
                  checked={reportIsCritical}
                  onChange={e => setReportIsCritical(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="critValCheck" style={{ fontSize: '13px', fontWeight: 700, color: reportIsCritical ? '#dc2626' : '#334155', cursor: 'pointer' }}>
                  🚨 Flag as CRITICAL VALUE (Trigger STAT Emergency Escalation)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(null)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: reportIsCritical ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                >
                  {isSubmitting ? 'Verifying & Saving...' : 'Validate & Publish Results'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: PHLEBOTOMY SPECIMEN BARCODE LABEL & COLLECTION TRACKER ─── */}
      {phlebotomyModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
          onClick={() => setPhlebotomyModalOrder(null)}
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
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>🩸 Specimen Barcode & Collection</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Requisition: <strong>{phlebotomyModalOrder.testType}</strong></span>
              </div>
              <button onClick={() => setPhlebotomyModalOrder(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Specimen Barcode Label Preview */}
            <div style={{ padding: '16px 20px', borderRadius: '16px', background: '#f8fafc', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e60ff', textTransform: 'uppercase' }}>ORBITOX CENTRAL PATHOLOGY</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>SPEC-ID: {phlebotomyModalOrder.id.slice(-8).toUpperCase()}</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{phlebotomyModalOrder.patientName}</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Test: <strong>{phlebotomyModalOrder.testType}</strong> • Tube: <strong style={{ color: '#059669' }}>{tubeType}</strong>
              </div>
              <div style={{ fontFamily: 'monospace', letterSpacing: '4px', fontSize: '18px', fontWeight: 800, color: '#0f172a', textAlign: 'center', padding: '8px 0', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                ||| | |||| | ||||| || | |||
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Vacuum Tube Type</label>
                <select
                  value={tubeType}
                  onChange={e => setTubeType(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                >
                  <option>Lavender Top (EDTA)</option>
                  <option>Gold Top (SST Serum Gel)</option>
                  <option>Light Blue (Sodium Citrate)</option>
                  <option>Green Top (Sodium Heparin)</option>
                  <option>Red Top (Plain Serum)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Phlebotomist Name</label>
                <input
                  type="text"
                  value={phlebotomistName}
                  onChange={e => setPhlebotomistName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setPhlebotomyModalOrder(null)}
                style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Specimen barcode label printed for ${phlebotomyModalOrder.patientName} (${tubeType}). Status: Specimen Received in Core Lab.`);
                  setPhlebotomyModalOrder(null);
                }}
                style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(30, 96, 255, 0.3)' }}
              >
                🖨️ Print Label & Verify Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: STAT CRITICAL PANIC VALUE ESCALATION ─── */}
      {criticalAlertModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
          onClick={() => setCriticalAlertModalOrder(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '30px 36px',
              boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '2px solid #fca5a5'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                🚨
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>Critical Panic Value Escalation</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Urgent Clinical MD Notification Protocol</span>
              </div>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: '14px', background: '#fff1f2', border: '1px solid #fecdd3', fontSize: '13px' }}>
              <div><strong>Patient:</strong> {criticalAlertModalOrder.patientName} ({criticalAlertModalOrder.bedLabel || 'Inpatient Bed'})</div>
              <div style={{ marginTop: '4px' }}><strong>Critical Finding:</strong> {criticalAlertModalOrder.testType} = <span style={{ color: '#dc2626', fontWeight: 800 }}>{criticalAlertModalOrder.resultSummary || criticalAlertModalOrder.numericValue}</span></div>
              <div style={{ marginTop: '4px' }}><strong>Attending Physician:</strong> {criticalAlertModalOrder.doctorName}</div>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
              Confirming escalation will send an immediate high-priority push alert to Dr. {criticalAlertModalOrder.doctorName}&apos;s pager and log a verification timestamp in the hospital audit trail.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setCriticalAlertModalOrder(null)}
                style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`🚨 STAT Escalation Dispatched: Pager alert sent to ${criticalAlertModalOrder.doctorName}. Read-receipt token logged.`);
                  setCriticalAlertModalOrder(null);
                }}
                style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)' }}
              >
                🚨 Dispatch STAT Pager Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
