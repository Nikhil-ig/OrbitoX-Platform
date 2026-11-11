'use client';

import React, { useState, useEffect } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';
import Link from 'next/link';

interface Appointment {
  id: string;
  patientName: string;
  doctor: string;
  type: string;
  time: string;
  date: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  room: string;
}

interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  status: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Toast Notification System
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string }[]>([]);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Custom Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    confirmVariant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  } | null>(null);

  // New Appointment Modal State
  const [showModal, setShowModal] = useState(false);
  const [patientMode, setPatientMode] = useState<'existing' | 'custom'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [customPatientName, setCustomPatientName] = useState('');
  const [doctor, setDoctor] = useState('Dr. Ashlynn Carder');
  const [type, setType] = useState('General Consultation');
  const [time, setTime] = useState('10:00 AM');
  const [date, setDate] = useState('Today');
  const [room, setRoom] = useState('Consultation Room 1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staff Doctors from Staff Directory
  const [staffDoctors, setStaffDoctors] = useState<any[]>([]);

  // Fetch real appointments directly from OrbitoX Database
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hospital/appointments');
      const data = await res.json();
      if (data.success && data.data) {
        setAppointments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patients for patient selector dropdown
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
          let defaultDocName = docs[0].name;
          const saved = localStorage.getItem('orbitox_active_clinical_staff');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const match = docs.find((d: any) => d.id === parsed.id || d.name === parsed.name);
              if (match) defaultDocName = match.name;
            } catch {}
          }
          setDoctor(defaultDocName);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff directory in appointments:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchStaffDoctors();

    const handleSessionChange = () => {
      fetchStaffDoctors();
    };

    window.addEventListener('orbitox_staff_session_changed', handleSessionChange);
    return () => window.removeEventListener('orbitox_staff_session_changed', handleSessionChange);
  }, []);

  // Update Appointment Status (e.g. Complete, Cancel, Confirm)
  const handleUpdateStatus = async (apptId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/hospital/appointments/${apptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Appointment Updated', `Status changed to ${newStatus}`);
        await fetchAppointments();
      } else {
        showToast('error', 'Update Failed', data.error || 'Failed to update appointment');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  // Delete Appointment with Custom Dialog
  const requestDeleteAppointment = (appt: Appointment) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel & Remove Appointment',
      description: `Are you sure you want to remove the ${appt.type} consultation for ${appt.patientName}?`,
      confirmText: 'Remove Appointment',
      confirmVariant: 'danger',
      action: async () => {
        const res = await fetch(`/api/hospital/appointments/${appt.id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          showToast('info', 'Appointment Removed', `Appointment for ${appt.patientName} has been cancelled and removed.`);
          await fetchAppointments();
        } else {
          showToast('error', 'Removal Failed', data.error || 'Failed to remove appointment');
        }
      }
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetName = customPatientName;
    if (patientMode === 'existing') {
      const p = patients.find(pat => pat.id === selectedPatientId);
      targetName = p ? p.name : 'Unknown Patient';
    }

    if (!targetName) {
      showToast('error', 'Patient Required', 'Please choose or type a patient name');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hospital/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: targetName,
          doctor,
          type,
          time,
          date,
          room,
          status: 'Confirmed'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Appointment Booked', `Scheduled ${type} for ${targetName} at ${time}.`);
        setShowModal(false);
        setCustomPatientName('');
        await fetchAppointments();
      } else {
        showToast('error', 'Booking Failed', data.error || 'Failed to schedule appointment');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to schedule appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter(a => {
    if (statusFilter !== 'All' && a.status !== statusFilter) return false;
    if (searchTerm) {
      const matchName = a.patientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDoc = a.doctor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = a.type.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchDoc && !matchType) return false;
    }
    return true;
  });

  const confirmedCount = appointments.filter(a => a.status === 'Confirmed').length;
  const pendingCount = appointments.filter(a => a.status === 'Pending').length;
  const completedCount = appointments.filter(a => a.status === 'Completed').length;

  return (
    <HospitalNavLayout
      headerTitle="Appointments & Schedule"
      headerSubtitle="Real-time clinical consultation schedule and booking engine from OrbitoX Database"
      actions={
        <button
          onClick={() => setShowModal(true)}
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
          <span>+</span> New Appointment
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
        
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

        {/* Top Summary Cards with Real Counts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '24px',
              padding: '20px 24px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05)'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Total Consultations</span>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{appointments.length}</div>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Real-time DB records</span>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '24px',
              padding: '20px 24px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05)'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Confirmed</span>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e60ff', marginTop: '6px' }}>{confirmedCount}</div>
            <span style={{ fontSize: '11px', color: '#1e60ff', fontWeight: 700 }}>Active clinic schedule</span>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '24px',
              padding: '20px 24px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05)'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Pending Reviews</span>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>{pendingCount}</div>
            <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>Awaiting clinician triage</span>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '24px',
              padding: '20px 24px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05)'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Completed</span>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>{completedCount}</div>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Finished & Billed</span>
          </div>
        </div>

        {/* Appointments Table Card */}
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
          {/* Filters Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Scheduled Consultations ({filteredAppointments.length})
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>Manage daily patient appointments & consult rooms</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(241, 245, 249, 0.9)', padding: '4px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                {(['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'] as const).map(s => (
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
                      cursor: 'pointer'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search patient, doctor..."
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
                onClick={fetchAppointments}
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
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Doctor</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Specialty / Type</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Time & Date</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Room</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      Loading real appointments from OrbitoX DB...
                    </td>
                  </tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      No scheduled appointments matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((apt) => {
                    const avatarColors = ['#fed7aa', '#bfdbfe', '#bbf7d0', '#fbcfe8', '#ddd6fe', '#fef08a'];
                    const avatarBg = avatarColors[Math.abs(apt.patientName.charCodeAt(0)) % avatarColors.length];

                    let badgeBg = 'rgba(16, 185, 129, 0.1)';
                    let badgeColor = '#10b981';
                    if (apt.status === 'Pending') {
                      badgeBg = 'rgba(245, 158, 11, 0.1)';
                      badgeColor = '#f59e0b';
                    } else if (apt.status === 'Completed') {
                      badgeBg = 'rgba(30, 96, 255, 0.1)';
                      badgeColor = '#1e60ff';
                    } else if (apt.status === 'Cancelled') {
                      badgeBg = 'rgba(239, 68, 68, 0.1)';
                      badgeColor = '#ef4444';
                    }

                    return (
                      <tr key={apt.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: avatarBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#1e293b'
                              }}
                            >
                              {apt.patientName[0]}
                            </div>
                            <Link
                              href="/hms/patients"
                              style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Open Patient EHR Record"
                            >
                              <span>{apt.patientName}</span>
                              <span style={{ fontSize: '11px', color: '#1e60ff' }}>↗</span>
                            </Link>
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#334155', fontWeight: 600 }}>{apt.doctor}</td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>{apt.type}</td>
                        <td style={{ padding: '16px', fontSize: '13px' }}>
                          <div style={{ color: '#1e60ff', fontWeight: 700 }}>{apt.time}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{apt.date || 'Today'}</div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>{apt.room}</td>
                        
                        {/* Interactive Status Dropdown */}
                        <td style={{ padding: '16px' }}>
                          <select
                            value={apt.status}
                            onChange={e => handleUpdateStatus(apt.id, e.target.value)}
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
                            <option value="Confirmed">🟢 Confirmed</option>
                            <option value="Pending">🟡 Pending</option>
                            <option value="Completed">🔵 Completed</option>
                            <option value="Cancelled">🔴 Cancelled</option>
                          </select>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                            <Link
                              href="/hms/pharmacy"
                              title="Prescribe Medication"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0',
                                background: '#f0fdf4',
                                color: '#16a34a',
                                fontSize: '11px',
                                fontWeight: 700,
                                textDecoration: 'none'
                              }}
                            >
                              💊 Rx
                            </Link>

                            <Link
                              href="/hms/labs"
                              title="Order Diagnostic Lab"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: '1px solid #e9d5ff',
                                background: '#faf5ff',
                                color: '#9333ea',
                                fontSize: '11px',
                                fontWeight: 700,
                                textDecoration: 'none'
                              }}
                            >
                              🔬 Lab
                            </Link>

                            {apt.status !== 'Completed' && (
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'Completed')}
                                title="Mark Completed"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #bfdbfe',
                                  background: '#eff6ff',
                                  color: '#1e60ff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ Done
                              </button>
                            )}

                            {apt.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'Cancelled')}
                                title="Cancel Appointment"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #fed7aa',
                                  background: '#fff7ed',
                                  color: '#c2410c',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                ✕ Cancel
                              </button>
                            )}

                            <button
                              onClick={() => requestDeleteAppointment(apt)}
                              title="Delete Appointment"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: '1px solid #fee2e2',
                                background: '#fff5f5',
                                color: '#ef4444',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
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

      {/* ─── CUSTOM CONFIRMATION POPUP ─── */}
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
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                🗑️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{confirmDialog.title}</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Action Confirmation</span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {confirmDialog.description}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await confirmDialog.action();
                  } finally {
                    setConfirmDialog(null);
                  }
                }}
                style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── NEW APPOINTMENT MODAL (SMART PATIENT SELECTOR) ─── */}
      {showModal && (
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
              maxWidth: '480px',
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
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>Book New Consultation</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Patient Selection Tabs */}
              <div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPatientMode('existing')}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: '10px',
                      border: 'none',
                      background: patientMode === 'existing' ? '#1e60ff' : '#f1f5f9',
                      color: patientMode === 'existing' ? '#fff' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Select Existing Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientMode('custom')}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: '10px',
                      border: 'none',
                      background: patientMode === 'custom' ? '#1e60ff' : '#f1f5f9',
                      color: patientMode === 'custom' ? '#fff' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Type New Name
                  </button>
                </div>

                {patientMode === 'existing' ? (
                  <select
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.age}y {p.gender}) — {p.status.toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wanda Maximoff"
                    value={customPatientName}
                    onChange={e => setCustomPatientName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Attending Physician</label>
                <select
                  value={doctor}
                  onChange={e => setDoctor(e.target.value)}
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
                      <option value="Dr. John Watson">Dr. John Watson (General)</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Consultation Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option>General Consultation</option>
                    <option>Cardiac Follow-up</option>
                    <option>Post-Op Review</option>
                    <option>Pre-Admission Assessment</option>
                    <option>Emergency Triage</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Consultation Room</label>
                  <select
                    value={room}
                    onChange={e => setRoom(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option>Consultation Room 1</option>
                    <option>Consultation Room 2</option>
                    <option>Cardiology Suite 3</option>
                    <option>Exam Room 4</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Time Slot</label>
                  <input
                    type="text"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Date</label>
                  <input
                    type="text"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '9px 22px', borderRadius: '10px', border: 'none', background: '#1e60ff', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
