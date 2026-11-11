'use client';

import React, { useState, useEffect } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';
import { useStaffAuth } from '../context/StaffAuthContext';

interface StaffEntity {
  id: string;
  name: string;
  role: string;
  customTitle?: string;
  departmentId: string;
  departmentName?: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  shiftSchedule: 'day' | 'night' | 'rotating';
  isOnDuty: boolean;
  contextId: string;
  contextType?: string;
  contextName?: string;
  status: 'active' | 'on_leave' | 'suspended' | 'deactivated';
  permissions?: string[];
  effectivePermissions?: string[];
  roleDisplayName?: string;
  roleCategory?: string;
  scope?: string;
  lastActive?: string;
}

interface RoleMetadata {
  role: string;
  displayName: string;
  category: string;
  description: string;
  scope: string;
  defaultPermissions: string[];
}

interface HierarchyItem {
  id: string;
  name: string;
  type: string;
  parentId?: string;
  departmentId?: string;
  departmentName?: string;
}

interface CapabilityItem {
  id: string;
  name: string;
  category: 'Clinical' | 'Pharmacy' | 'Infrastructure' | 'Diagnostics' | 'Telemetry' | 'Security' | 'Administration';
  desc: string;
}

const ALL_CAPABILITIES: CapabilityItem[] = [
  { id: 'patient.read', name: 'View Patient Records', category: 'Clinical', desc: 'Read clinical charts, vitals history & diagnosis' },
  { id: 'patient.create', name: 'Register New Patient', category: 'Clinical', desc: 'Create initial patient intake files' },
  { id: 'patient.update', name: 'Update Clinical Notes', category: 'Clinical', desc: 'Edit diagnoses, vitals & care plans' },
  { id: 'patient.admit', name: 'Admit Patient to Bay/Ward', category: 'Clinical', desc: 'Assign patient to active inpatient bed' },
  { id: 'patient.transfer', name: 'Transfer Patient / Bay', category: 'Clinical', desc: 'Move patient between wards or rooms' },
  { id: 'patient.discharge', name: 'Discharge & Finalize Care', category: 'Clinical', desc: 'Complete clinical clearance and discharge' },
  { id: 'patient.triage', name: 'Emergency Triage Assessment', category: 'Clinical', desc: 'Assign ESI triage severity levels' },

  { id: 'treatment.read', name: 'View Prescriptions & eMAR', category: 'Pharmacy', desc: 'Inspect medication administration records' },
  { id: 'treatment.prescribe', name: 'Prescribe Medications / Orders', category: 'Pharmacy', desc: 'Order pharmaceutical compounds & doses' },
  { id: 'treatment.dispense', name: 'Dispense Pharmacy Medications', category: 'Pharmacy', desc: 'Dispense formulary stock from pharmacy' },
  { id: 'treatment.administer', name: '5-Rights Bedside Administration', category: 'Pharmacy', desc: 'Barcode scan and administer medications' },
  { id: 'emar.override', name: 'eMAR Emergency Root Override', category: 'Security', desc: 'Bypass pharmacy approval during trauma' },

  { id: 'bed.read', name: 'Inspect Bed Matrix', category: 'Infrastructure', desc: 'View floor plans and bed occupancies' },
  { id: 'bed.turnover', name: 'Fast Bed Turnover (Clean)', category: 'Infrastructure', desc: 'Mark sanitizing beds as ready & available' },
  { id: 'bed.manage', name: 'Add/Decommission Bed Slots', category: 'Infrastructure', desc: 'Configure physical room layout & equipment' },

  { id: 'lab.read', name: 'View Diagnostic Results', category: 'Diagnostics', desc: 'Access hematology, radiology & pathology results' },
  { id: 'lab.order', name: 'Order Diagnostic Lab Tests', category: 'Diagnostics', desc: 'Order blood, urine, cardiac & metabolic panels' },
  { id: 'lab.collect', name: 'Collect Diagnostic Specimen', category: 'Diagnostics', desc: 'Sample draw & barcoded vial preparation' },
  { id: 'lab.process', name: 'Process Pathology Specimen', category: 'Diagnostics', desc: 'Run clinical analyzers & enter numeric values' },
  { id: 'lab.report', name: 'Publish Findings & Critical Alerts', category: 'Diagnostics', desc: 'Validate lab reports and broadcast STAT critical alarms' },

  { id: 'billing.read', name: 'View Inpatient Statements & Claims', category: 'Administration', desc: 'Read itemized charges, insurance coverage & balances' },
  { id: 'billing.manage', name: 'Generate Bills & Settle Payments', category: 'Administration', desc: 'Calculate discharge bills, apply discounts & process payments' },

  { id: 'telemetry.read', name: 'Monitor Live IoT Telemetry', category: 'Telemetry', desc: 'Real-time SpO2, HR, BP vital streams' },
  { id: 'telemetry.alarm_ack', name: 'Acknowledge Critical Alarms', category: 'Telemetry', desc: 'Silence or acknowledge Arrhythmia alarms' },
  { id: 'telemetry.control', name: 'Device Configuration Control', category: 'Telemetry', desc: 'Configure ventilator & monitor telemetry rate' },

  { id: 'staff.read', name: 'View Staff Directory', category: 'Administration', desc: 'View rosters and on-duty physician lists' },
  { id: 'staff.manage', name: 'Manage Staff Roles & RBAC', category: 'Administration', desc: 'Create, edit and delegate staff permissions' },
  { id: 'security.break_glass', name: 'Issue Break-Glass Tokens', category: 'Security', desc: '30-minute trauma emergency access tokens' },
  { id: 'audit.export', name: 'Export SHA-256 Audit Ledger', category: 'Security', desc: 'Cryptographic compliance export' },
  { id: 'hierarchy.manage', name: '6-Tier Hierarchy Architect', category: 'Administration', desc: 'Create organizations, hospitals & wards' }
];

export default function StaffManagementPage() {
  const { currentStaff, can } = useStaffAuth();
  const [staffList, setStaffList] = useState<StaffEntity[]>([]);
  const [roles, setRoles] = useState<RoleMetadata[]>([]);
  const [departments, setDepartments] = useState<HierarchyItem[]>([]);
  const [wards, setWards] = useState<HierarchyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [dutyFilter, setDutyFilter] = useState<'ALL' | 'ON_DUTY' | 'OFF_DUTY'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleMatrixModal, setShowRoleMatrixModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffEntity | null>(null);
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState<any | null>(null);

  // Custom Confirmation Modal Dialog (Replaces native browser popup)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    staff?: StaffEntity;
    confirmText: string;
    confirmVariant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
    isProcessing?: boolean;
  } | null>(null);

  // Modal Permission Category Filter & Search
  const [modalPermCategory, setModalPermCategory] = useState<string>('ALL');
  const [modalPermSearch, setModalPermSearch] = useState<string>('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    role: string;
    customTitle: string;
    departmentId: string;
    email: string;
    phone: string;
    licenseNumber: string;
    shiftSchedule: 'day' | 'night' | 'rotating';
    isOnDuty: boolean;
    contextId: string;
    permissions: string[];
  }>({
    name: '',
    role: 'attending_doctor',
    customTitle: '',
    departmentId: 'apollo-ny-cardio',
    email: '',
    phone: '',
    licenseNumber: '',
    shiftSchedule: 'day',
    isOnDuty: true,
    contextId: 'apollo-ny-cardio',
    permissions: []
  });

  // Floating Toasts
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string }[]>([]);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch staff, roles, and hierarchy
  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, rolesRes, deptRes] = await Promise.all([
        fetch('/api/hospital/security/staff'),
        fetch('/api/hospital/security/roles'),
        fetch('/api/hospital/departments')
      ]);

      const [staffData, rolesData, deptData] = await Promise.all([
        staffRes.json(),
        rolesRes.json(),
        deptRes.json()
      ]);

      if (staffData.success) {
        setStaffList(staffData.data);
      }
      if (rolesData.success) {
        setRoles(rolesData.data);
      }
      if (deptData.success) {
        setDepartments(deptData.departments || []);
        setWards(deptData.wards || []);
      }
    } catch (err: any) {
      showToast('error', 'Data Load Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Toggle On-Duty
  const handleToggleDuty = async (staff: StaffEntity) => {
    const nextState = !staff.isOnDuty;
    try {
      const res = await fetch(`/api/hospital/security/staff/${staff.id}/toggle-duty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnDuty: nextState })
      });
      const data = await res.json();
      if (data.success) {
        setStaffList(prev => prev.map(s => (s.id === staff.id ? { ...s, isOnDuty: nextState } : s)));
        showToast('success', 'Duty Updated', `${staff.name} is now ${nextState ? 'ON DUTY 🟢' : 'OFF DUTY ⚪'}`);
      } else {
        showToast('error', 'Update Failed', data.error);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  // Helper to get Role metadata for currently selected role in modal
  const getCurrentRoleMeta = (roleKey: string) => {
    return roles.find(r => r.role === roleKey) || null;
  };

  // Helper to check if capability is inherited from Role
  const isCapabilityInheritedFromRole = (capId: string, roleKey: string): boolean => {
    const roleMeta = getCurrentRoleMeta(roleKey);
    if (!roleMeta) return false;
    if (roleMeta.role === 'super_admin' || roleMeta.defaultPermissions.includes('*.*')) return true;
    return roleMeta.defaultPermissions.includes(capId);
  };

  // Helper to check if capability is effective (either from role OR custom override)
  const isCapabilityEffective = (capId: string, roleKey: string, customPerms: string[] = []): boolean => {
    if (customPerms.includes('*.*') || customPerms.includes(capId)) return true;
    return isCapabilityInheritedFromRole(capId, roleKey);
  };

  // Generate random license number formatted by role
  const generateLicenseNumber = (role: string) => {
    let prefix = 'MD-NY';
    if (role === 'super_admin' || role === 'facility_director') prefix = 'EXEC-NY';
    else if (role.includes('doctor') || role === 'department_head') prefix = 'MD-NY';
    else if (role.includes('nurse')) prefix = 'RN-NY';
    else if (role === 'pharmacist') prefix = 'PHARM-NY';
    else if (role === 'lab_technician') prefix = 'LAB-NY';
    return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  };

  // Generate suggested email from full name
  const generateSuggestedEmail = (fullName: string) => {
    if (!fullName) return '';
    const clean = fullName
      .replace(/^(Dr\.|Prof\.|Doctor)\s+/i, '')
      .replace(/,\s*(MD|PhD|FACS|BSN|RN|PharmD|RPh|DO|MS)\b/gi, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.');
    return clean ? `${clean}@orbitox.health` : '';
  };

  // Default custom title per role
  const getDefaultTitleForRole = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Chief Technology & Systems Officer';
      case 'facility_director': return 'Chief Medical Officer & Facility Director';
      case 'department_head': return 'Head of Department (Clinical Lead)';
      case 'attending_doctor': return 'Senior Attending Physician';
      case 'specialist_doctor': return 'Consultant Specialist Physician';
      case 'head_nurse': return 'Ward Charge Nurse / Clinical Supervisor';
      case 'staff_nurse': return 'Bedside Staff Nurse';
      case 'pharmacist': return 'Clinical Pharmacist (PharmD)';
      case 'lab_technician': return 'Diagnostic & Pathology Technologist';
      default: return 'Healthcare Professional';
    }
  };

  // Open Create Staff Modal
  const handleOpenAdd = () => {
    const defaultDept = departments[0]?.id || 'apollo-ny-cardio';
    const deptWards = wards.filter(w => w.departmentId === defaultDept);
    const defaultWard = (deptWards.length > 0 && deptWards[0]?.id) ? deptWards[0].id : defaultDept;
    const defaultRole = 'attending_doctor';

    setFormData({
      name: '',
      role: defaultRole,
      customTitle: getDefaultTitleForRole(defaultRole),
      departmentId: defaultDept,
      email: '',
      phone: '+1 (555) 019-9000',
      licenseNumber: generateLicenseNumber(defaultRole),
      shiftSchedule: 'day',
      isOnDuty: true,
      contextId: defaultWard,
      permissions: []
    });
    setModalPermCategory('ALL');
    setModalPermSearch('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (staff: StaffEntity) => {
    setSelectedStaff(staff);
    setFormData({
      id: staff.id,
      name: staff.name,
      role: staff.role,
      customTitle: staff.customTitle || '',
      departmentId: staff.departmentId,
      email: staff.email,
      phone: staff.phone || '',
      licenseNumber: staff.licenseNumber,
      shiftSchedule: staff.shiftSchedule,
      isOnDuty: staff.isOnDuty,
      contextId: staff.contextId,
      permissions: staff.permissions || []
    });
    setModalPermCategory('ALL');
    setModalPermSearch('');
    setShowEditModal(true);
  };

  // Submit Create Staff
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Validation Error', 'Please enter staff full name & credentials.');
      return;
    }
    if (!formData.email.trim()) {
      showToast('error', 'Validation Error', 'Email address is required.');
      return;
    }

    try {
      const res = await fetch('/api/hospital/security/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success && data.data) {
        showToast('success', 'Staff Provisioned', `${formData.name} successfully registered in clinical directory.`);
        setShowAddModal(false);
        setCreatedStaffCredentials({
          id: data.data.id,
          name: data.data.name,
          role: data.data.role,
          customTitle: data.data.customTitle,
          email: data.data.email,
          accessPin: data.data.accessPin || '123456',
          licenseNumber: data.data.licenseNumber,
          contextName: data.data.contextName || data.data.departmentName || 'General Specialty'
        });
        await fetchData();
      } else {
        showToast('error', 'Creation Failed', data.error);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  // Submit Edit Staff
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      const res = await fetch(`/api/hospital/security/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Staff Updated', `${formData.name} credentials and RBAC scope updated.`);
        setShowEditModal(false);
        await fetchData();
      } else {
        showToast('error', 'Update Failed', data.error);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  // Deactivate Staff using Custom Confirmation Dialog
  const handleDeactivate = (staff: StaffEntity) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate Clinical Staff Member',
      description: `Are you sure you want to deactivate ${staff.name} (${staff.customTitle || staff.roleDisplayName || staff.role})? This will immediately revoke active clinical authority and active session privileges.`,
      staff,
      confirmText: 'Confirm Deactivation',
      confirmVariant: 'danger',
      action: async () => {
        try {
          const res = await fetch(`/api/hospital/security/staff/${staff.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('info', 'Staff Deactivated', `${staff.name} has been deactivated.`);
            fetchData();
          } else {
            showToast('error', 'Action Failed', data.error);
          }
        } catch (err: any) {
          showToast('error', 'Error', err.message);
        }
      }
    });
  };

  // Smart Toggle Permission Capability
  const handleToggleCapability = (capId: string) => {
    const isInherited = isCapabilityInheritedFromRole(capId, formData.role);
    const customList = formData.permissions || [];

    if (isInherited) {
      // It is already part of the base role. If they clicked it, provide feedback or allow explicit toggle
      showToast('info', 'Role Inherited Capability', `This permission is already granted by default via the ${formData.role} role.`);
      return;
    }

    // Toggle custom explicit grant
    if (customList.includes(capId)) {
      setFormData(prev => ({ ...prev, permissions: (prev.permissions || []).filter(p => p !== capId) }));
      showToast('info', 'Custom Grant Removed', `Removed custom override for ${capId}`);
    } else {
      setFormData(prev => ({ ...prev, permissions: [...(prev.permissions || []), capId] }));
      showToast('success', 'Custom Capability Added', `Added explicit grant: ${capId}`);
    }
  };

  // Quick Action: Reset to Role Defaults
  const handleResetToRoleDefaults = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
    showToast('info', 'Reset Complete', `Reset permissions to ${formData.role} standard defaults.`);
  };

  // Quick Action: Grant All
  const handleGrantAll = () => {
    setFormData(prev => ({ ...prev, permissions: ['*.*'] }));
    showToast('success', 'Root Access Granted', `Granted unrestricted (*.*) omni-capabilities.`);
  };

  // Filtering calculations for Main Staff Table
  const filteredStaff = staffList.filter(s => {
    if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
    if (deptFilter !== 'ALL' && s.departmentId !== deptFilter && s.contextId !== deptFilter) return false;
    if (dutyFilter === 'ON_DUTY' && !s.isOnDuty) return false;
    if (dutyFilter === 'OFF_DUTY' && s.isOnDuty) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.licenseNumber.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.customTitle && s.customTitle.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Pagination calculations
  const totalFiltered = filteredStaff.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  const totalHeadcount = staffList.length;
  const onDutyCount = staffList.filter(s => s.isOnDuty).length;
  const doctorCount = staffList.filter(s => s.role.includes('doctor') || s.role === 'department_head' || s.role === 'facility_director').length;
  const nurseCount = staffList.filter(s => s.role.includes('nurse')).length;

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'super_admin':
        return { background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#92400e', border: '1px solid #f59e0b' };
      case 'facility_director':
        return { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' };
      case 'department_head':
        return { background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc' };
      case 'attending_doctor':
      case 'specialist_doctor':
        return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
      case 'head_nurse':
      case 'staff_nurse':
        return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
      case 'pharmacist':
        return { background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' };
      case 'lab_technician':
        return { background: '#fce7f3', color: '#9d174d', border: '1px solid #f9a8d4' };
      default:
        return { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' };
    }
  };

  // Modal Permission Item Renderer Component
  const renderPermissionSelector = () => {
    const activeRoleMeta = getCurrentRoleMeta(formData.role);
    const customList = formData.permissions || [];
    const isSuperAdmin = formData.role === 'super_admin' || activeRoleMeta?.defaultPermissions.includes('*.*') || customList.includes('*.*');

    // Filter capabilities by category and search
    const displayedCapabilities = ALL_CAPABILITIES.filter(cap => {
      if (modalPermCategory !== 'ALL') {
        if (modalPermCategory === 'GRANTED') {
          const isGranted = isCapabilityEffective(cap.id, formData.role, customList);
          if (!isGranted) return false;
        } else if (cap.category !== modalPermCategory) {
          return false;
        }
      }
      if (modalPermSearch) {
        const q = modalPermSearch.toLowerCase();
        const match = cap.name.toLowerCase().includes(q) || cap.id.toLowerCase().includes(q) || cap.desc.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const totalInherited = ALL_CAPABILITIES.filter(c => isCapabilityInheritedFromRole(c.id, formData.role)).length;
    const totalCustom = customList.filter(c => c !== '*.*' && !isCapabilityInheritedFromRole(c, formData.role)).length;
    const totalEffective = isSuperAdmin ? ALL_CAPABILITIES.length : ALL_CAPABILITIES.filter(c => isCapabilityEffective(c.id, formData.role, customList)).length;

    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}
      >
        {/* Header with Live Stats & Quick Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🛡️</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Permissions & Capabilities Explorer
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: isSuperAdmin ? '#fef3c7' : '#eff6ff',
                  color: isSuperAdmin ? '#92400e' : '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: isSuperAdmin ? '1px solid #f59e0b' : '1px solid #bfdbfe'
                }}
              >
                {totalEffective} / {ALL_CAPABILITIES.length} Active
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
              Pre-selected blue badges are <strong>inherited from the {activeRoleMeta?.displayName || formData.role}</strong> role. Check boxes below to add custom grants.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResetToRoleDefaults}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
              title="Revert custom overrides to default role permissions"
            >
              🔄 Reset to Role Defaults
            </button>
            <button
              type="button"
              onClick={handleGrantAll}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                fontSize: '11px',
                fontWeight: 700,
                color: '#92400e',
                cursor: 'pointer'
              }}
              title="Grant full enterprise root access"
            >
              👑 Grant Omni (*.*)
            </button>
          </div>
        </div>

        {/* Live Metrics Pill Strip */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
            <span style={{ color: '#64748b' }}>Role Defaults:</span>
            <strong style={{ color: '#0f172a' }}>{isSuperAdmin ? 'ALL (*.*)' : totalInherited}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ color: '#64748b' }}>Custom Overrides:</span>
            <strong style={{ color: '#10b981' }}>{totalCustom} Added</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginLeft: 'auto' }}>
            <span style={{ color: '#64748b' }}>Selected Role Scope:</span>
            <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
              {activeRoleMeta?.scope || 'department.*'}
            </span>
          </div>
        </div>

        {/* Search & Category Filter Pills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All (21)' },
              { id: 'GRANTED', label: `🟢 Granted (${totalEffective})` },
              { id: 'Clinical', label: 'Clinical' },
              { id: 'Pharmacy', label: 'Pharmacy' },
              { id: 'Infrastructure', label: 'Beds' },
              { id: 'Diagnostics', label: 'Diagnostics' },
              { id: 'Telemetry', label: 'IoT Telemetry' },
              { id: 'Security', label: 'Security' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setModalPermCategory(cat.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: modalPermCategory === cat.id ? '#0f172a' : '#f1f5f9',
                  color: modalPermCategory === cat.id ? '#ffffff' : '#64748b'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '180px' }}>
            <input
              type="text"
              placeholder="Search capabilities..."
              value={modalPermSearch}
              onChange={e => setModalPermSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ position: 'absolute', left: '8px', top: '7px', fontSize: '12px', color: '#94a3b8' }}>🔍</span>
          </div>
        </div>

        {/* Capabilities Grid with Real-time Checkboxes & Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '10px',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '2px'
          }}
        >
          {displayedCapabilities.map(cap => {
            const isInherited = isCapabilityInheritedFromRole(cap.id, formData.role);
            const isCustom = customList.includes(cap.id) && !isInherited;
            const isOmni = customList.includes('*.*') || (activeRoleMeta?.role === 'super_admin');
            const isChecked = isInherited || isCustom || isOmni;

            return (
              <div
                key={cap.id}
                onClick={() => handleToggleCapability(cap.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: isChecked
                    ? isInherited
                      ? '1.5px solid #93c5fd'
                      : '1.5px solid #86efac'
                    : '1px solid #e2e8f0',
                  background: isChecked
                    ? isInherited
                      ? 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)'
                      : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                    : '#f8fafc',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: isInherited ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}
              >
                <div style={{ marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: isInherited ? '#2563eb' : '#16a34a',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{cap.name}</span>
                    {isInherited ? (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '6px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        🛡️ Role Default
                      </span>
                    ) : isCustom ? (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '6px',
                          background: '#bbf7d0',
                          color: '#166534',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        ⚡ Custom Added
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{cap.category}</span>
                    )}
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.3 }}>{cap.desc}</div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8', marginTop: '3px' }}>
                    id: <code>{cap.id}</code>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <HospitalNavLayout
      headerTitle="Staff Directory & Fine-Grained RBAC"
      headerSubtitle="Manage clinical credentials, 6-tier context assignments, and granular operational permissions across Apollo Health Global."
      actions={
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowRoleMatrixModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <span>🛡️</span> RBAC Matrix
          </button>
          {can('staff.manage') && (
            <button
              onClick={handleOpenAdd}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}
            >
              <span>➕</span> Provision Staff
            </button>
          )}
        </div>
      }
    >
      {/* Floating Toast Notifications */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              background: t.type === 'success' ? '#0f172a' : t.type === 'error' ? '#7f1d1d' : '#1e293b',
              color: '#ffffff',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
              border: t.type === 'success' ? '1px solid #10b981' : t.type === 'error' ? '1px solid #ef4444' : '1px solid #818cf8',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <span style={{ fontSize: '20px' }}>{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{t.title}</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>{t.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Stat Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px',
          marginBottom: '24px'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Staff</span>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>Active Roster</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{totalHeadcount}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Across all 6 clinical departments</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid #bbf7d0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinicians On Duty</span>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>🟢 Live Floor</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#166534' }}>{onDutyCount}</div>
          <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>Ready for trauma & bedside response</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doctors & Chiefs</span>
            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>Physicians</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{doctorCount}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Surgeons, Attending & Specialists</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nursing & Floor</span>
            <span style={{ background: '#fdf2f8', color: '#db2777', padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>Ward Care</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{nurseCount}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Charge Nurses & Bedside RNs</div>
        </div>
      </div>

      {/* Main Glassmorphic Staff Container */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden'
        }}
      >
        {/* Search & Filter Bar */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', flex: 1, minWidth: '280px', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search staff by name, license number, role, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: '14px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', left: '16px', top: '12px', fontSize: '16px', color: '#94a3b8' }}>🔍</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                outline: 'none'
              }}
            >
              <option value="ALL">All Roles ({roles.length})</option>
              {roles.map(r => (
                <option key={r.role} value={r.role}>
                  {r.displayName}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                outline: 'none'
              }}
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Duty Status Filter */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
              <button
                onClick={() => setDutyFilter('ALL')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: dutyFilter === 'ALL' ? '#ffffff' : 'transparent',
                  color: dutyFilter === 'ALL' ? '#0f172a' : '#64748b',
                  boxShadow: dutyFilter === 'ALL' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                All
              </button>
              <button
                onClick={() => setDutyFilter('ON_DUTY')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: dutyFilter === 'ON_DUTY' ? '#dcfce7' : 'transparent',
                  color: dutyFilter === 'ON_DUTY' ? '#15803d' : '#64748b',
                  boxShadow: dutyFilter === 'ON_DUTY' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                🟢 On Duty
              </button>
              <button
                onClick={() => setDutyFilter('OFF_DUTY')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: dutyFilter === 'OFF_DUTY' ? '#ffffff' : 'transparent',
                  color: dutyFilter === 'OFF_DUTY' ? '#64748b' : '#64748b',
                  boxShadow: dutyFilter === 'OFF_DUTY' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                ⚪ Off
              </button>
            </div>

            {/* View Mode Switcher */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#2563eb' : '#64748b'
                }}
                title="Table View"
              >
                📑
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  color: viewMode === 'grid' ? '#2563eb' : '#64748b'
                }}
                title="Grid Cards View"
              >
                🔲
              </button>
            </div>
          </div>
        </div>

        {/* Staff Content: Table or Grid */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
            <div>Syncing Enterprise Staff & RBAC Tree...</div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>No staff members match the current filter</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Try clearing your search query or selecting another role category.</div>
          </div>
        ) : viewMode === 'table' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                  <th style={{ padding: '14px 24px' }}>Staff Member</th>
                  <th style={{ padding: '14px 16px' }}>Role & Title</th>
                  <th style={{ padding: '14px 16px' }}>Context Scope (Hierarchy)</th>
                  <th style={{ padding: '14px 16px' }}>Shift & Duty</th>
                  <th style={{ padding: '14px 16px' }}>Effective RBAC Capabilities</th>
                  <th style={{ padding: '14px 24px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map((staff, idx) => {
                  const roleStyle = getRoleBadgeStyle(staff.role);
                  return (
                    <tr
                      key={staff.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      {/* Name & Contact */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '12px',
                              background: staff.role === 'super_admin' ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : '#e2e8f0',
                              color: staff.role === 'super_admin' ? '#ffffff' : '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '15px',
                              position: 'relative'
                            }}
                          >
                            {staff.name.charAt(0)}
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: staff.isOnDuty ? '#10b981' : '#94a3b8',
                                border: '2px solid #ffffff'
                              }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{staff.name}</div>
                            <div style={{ color: '#64748b', fontSize: '12px' }}>{staff.email}</div>
                            <div style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>LIC: {staff.licenseNumber}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Title */}
                      <td style={{ padding: '16px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                            marginBottom: '4px',
                            ...roleStyle
                          }}
                        >
                          {staff.roleDisplayName || staff.role}
                        </span>
                        {staff.customTitle && (
                          <div style={{ color: '#475569', fontSize: '12px', fontWeight: 500 }}>
                            {staff.customTitle}
                          </div>
                        )}
                      </td>

                      {/* Context Scope */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>🏛️</span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{staff.contextName || staff.departmentName || 'Global'}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                              Tier: {staff.contextType || 'department'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift & Duty Status */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={() => handleToggleDuty(staff)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: 'none',
                              background: staff.isOnDuty ? '#dcfce7' : '#f1f5f9',
                              color: staff.isOnDuty ? '#15803d' : '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: staff.isOnDuty ? '#16a34a' : '#94a3b8' }} />
                            {staff.isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                          </button>
                          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>({staff.shiftSchedule})</span>
                        </div>
                      </td>

                      {/* Effective Capabilities */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
                          {(staff.effectivePermissions || []).slice(0, 3).map((perm, pIdx) => (
                            <span
                              key={pIdx}
                              style={{
                                background: perm === '*.*' ? '#fef3c7' : '#f1f5f9',
                                color: perm === '*.*' ? '#92400e' : '#334155',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontFamily: 'monospace'
                              }}
                            >
                              {perm}
                            </span>
                          ))}
                          {(staff.effectivePermissions || []).length > 3 && (
                            <span
                              style={{
                                background: '#e2e8f0',
                                color: '#475569',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              +{(staff.effectivePermissions || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {can('staff.manage') ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(staff)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title="Edit Role & Permissions"
                              >
                                ✏️ Edit RBAC
                              </button>
                              <button
                                onClick={() => handleDeactivate(staff)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  background: '#fff1f2',
                                  color: '#e11d48',
                                  border: '1px solid #fecdd3',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title="Deactivate Staff"
                              >
                                🗑️
                              </button>
                            </>
                          ) : (
                            <span
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: '#f1f5f9',
                                color: '#94a3b8',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                            >
                              🔒 Read Only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View Mode */
          <div
            style={{
              padding: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}
          >
            {paginatedStaff.map(staff => {
              const roleStyle = getRoleBadgeStyle(staff.role);
              return (
                <div
                  key={staff.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: staff.role === 'super_admin' ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : '#e2e8f0',
                            color: staff.role === 'super_admin' ? '#ffffff' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '18px'
                          }}
                        >
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{staff.name}</div>
                          <div style={{ color: '#64748b', fontSize: '12px' }}>{staff.email}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          ...roleStyle
                        }}
                      >
                        {staff.roleDisplayName || staff.role}
                      </span>
                    </div>

                    {staff.customTitle && (
                      <div style={{ color: '#334155', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                        {staff.customTitle}
                      </div>
                    )}

                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Context Scope:</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{staff.contextName || staff.departmentName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>License:</span>
                        <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{staff.licenseNumber}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>Shift:</span>
                        <span style={{ textTransform: 'capitalize', color: '#0f172a' }}>{staff.shiftSchedule} Shift</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                        Effective Capabilities ({staff.effectivePermissions?.length || 0}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(staff.effectivePermissions || []).slice(0, 4).map((p, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontFamily: 'monospace'
                            }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                    <button
                      onClick={() => handleToggleDuty(staff)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: 'none',
                        background: staff.isOnDuty ? '#dcfce7' : '#f1f5f9',
                        color: staff.isOnDuty ? '#15803d' : '#64748b'
                      }}
                    >
                      {staff.isOnDuty ? '🟢 ON DUTY' : '⚪ OFF DUTY'}
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeactivate(staff)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: '#fff1f2',
                          color: '#e11d48',
                          border: '1px solid #fecdd3',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── PAGINATION BAR ─── */}
        {filteredStaff.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#fcfdfe',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              fontSize: '13px'
            }}
          >
            {/* Left: Summary Count */}
            <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>
                Showing <strong style={{ color: '#0f172a' }}>{startIndex + 1}</strong> to{' '}
                <strong style={{ color: '#0f172a' }}>{endIndex}</strong> of{' '}
                <strong style={{ color: '#0f172a' }}>{totalFiltered}</strong> staff members
              </span>
              {totalFiltered < totalHeadcount && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  (filtered from {totalHeadcount} total)
                </span>
              )}
            </div>

            {/* Middle & Right: Rows per page selector and Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              {/* Rows Per Page */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                <span style={{ fontSize: '12px' }}>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page Number Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* First Page */}
                <button
                  type="button"
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: validCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
                    color: validCurrentPage <= 1 ? '#cbd5e1' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="First Page"
                >
                  «
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: validCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
                    color: validCurrentPage <= 1 ? '#cbd5e1' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ‹ Prev
                </button>

                {/* Numbered Page Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => {
                  const isActive = pageNumber === validCurrentPage;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      style={{
                        minWidth: '32px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                        background: isActive ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#ffffff',
                        color: isActive ? '#ffffff' : '#334155',
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none'
                      }}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                {/* Next Page */}
                <button
                  type="button"
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: validCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
                    color: validCurrentPage >= totalPages ? '#cbd5e1' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next ›
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: validCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
                    color: validCurrentPage >= totalPages ? '#cbd5e1' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                  }}
                  title="Last Page"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── PROVISION STAFF MODAL ─── */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '32px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>➕ Provision New Clinical Staff</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Register physicians, specialists, nurses, or pharmacists with fine-grained RBAC and context scope.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Live Interactive Badge Preview Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                border: '1px solid #dbeafe',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '17px',
                    fontWeight: 800
                  }}
                >
                  {formData.name
                    ? formData.name
                        .replace(/^(Dr\.|Prof\.|Doctor)\s+/i, '')
                        .split(' ')
                        .filter(Boolean)
                        .map(p => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'DR'
                    : '➕'}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '13px',
                      height: '13px',
                      borderRadius: '50%',
                      background: formData.isOnDuty ? '#10b981' : '#94a3b8',
                      border: '2px solid #ffffff'
                    }}
                    title={formData.isOnDuty ? 'On Duty' : 'Off Duty'}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                      {formData.name || 'New Staff Member'}
                    </strong>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '8px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      {roles.find(r => r.role === formData.role)?.displayName || formData.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>📋 {formData.customTitle || 'General Clinical'}</span>
                    <span>•</span>
                    <span>📍 {wards.find(w => w.id === formData.contextId)?.name || departments.find(d => d.id === formData.departmentId)?.name || 'General Dept'}</span>
                    <span>•</span>
                    <span>🪪 {formData.licenseNumber || 'MD-LIC-PENDING'}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#334155'
                  }}
                >
                  🛡️ {formData.role === 'super_admin' ? 'ALL (*.*)' : isCapabilityEffective('*.*', formData.role, formData.permissions) ? 'ALL (*.*)' : 'RBAC Configured'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitCreate}>
              {/* Row 1: Name and Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Full Name & Clinical Credentials *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Meredith Grey, MD"
                    value={formData.name}
                    onChange={e => {
                      const newName = e.target.value;
                      const suggested = generateSuggestedEmail(newName);
                      setFormData(prev => ({
                        ...prev,
                        name: newName,
                        email: prev.email && !prev.email.includes('@orbitox.health') ? prev.email : suggested
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Standard Clinical Role (Inherits Base Capabilities) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        role: newRole,
                        customTitle: getDefaultTitleForRole(newRole),
                        licenseNumber: generateLicenseNumber(newRole)
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                  >
                    {roles.map(r => (
                      <option key={r.role} value={r.role}>
                        {r.displayName} ({r.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Custom Title & Cascading Department */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Custom Title / Clinical Specialty
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Cardiothoracic Surgeon"
                    value={formData.customTitle}
                    onChange={e => setFormData({ ...formData, customTitle: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    1. Primary Department / Facility *
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={e => {
                      const newDept = e.target.value;
                      const childWards = wards.filter(w => w.departmentId === newDept);
                      const newContext = (childWards.length > 0 && childWards[0]?.id) ? childWards[0].id : newDept;
                      setFormData(prev => ({
                        ...prev,
                        departmentId: newDept,
                        contextId: newContext
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <optgroup label="Enterprise Facilities">
                      <option value="apollo-global">Apollo Health Global (Global Org)</option>
                      <option value="apollo-ny">Apollo Hospital New York (Hospital Branch)</option>
                    </optgroup>
                    <optgroup label="Clinical Departments">
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>
                          🩺 {d.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Row 3: Scoped Ward Cascade & License Generator */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    2. Ward / Unit (Scoped within chosen Department) *
                  </label>
                  <select
                    value={formData.contextId}
                    onChange={e => setFormData({ ...formData, contextId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={formData.departmentId}>
                      🏢 Department-Wide Scope (All Wards / Whole Department)
                    </option>
                    {wards
                      .filter(w => w.departmentId === formData.departmentId)
                      .map(w => (
                        <option key={w.id} value={w.id}>
                          🛏️ {w.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      License / Board Registration Number *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, licenseNumber: generateLicenseNumber(prev.role) }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✨ Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.licenseNumber}
                    onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Email and Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Enterprise Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@orbitox.health"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Direct Phone / Pager
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 019-9000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 5: Shift Schedule & Duty Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Shift Schedule
                  </label>
                  <select
                    value={formData.shiftSchedule}
                    onChange={e => setFormData({ ...formData, shiftSchedule: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="day">Day Shift (07:00 - 15:30)</option>
                    <option value="night">Night Shift (23:00 - 07:30)</option>
                    <option value="rotating">Rotating / On-Call 24/7</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Initial Duty Status
                  </label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dutyStatusAdd"
                        checked={formData.isOnDuty}
                        onChange={() => setFormData({ ...formData, isOnDuty: true })}
                      />
                      🟢 On Duty
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dutyStatusAdd"
                        checked={!formData.isOnDuty}
                        onChange={() => setFormData({ ...formData, isOnDuty: false })}
                      />
                      ⚪ Off Duty
                    </label>
                  </div>
                </div>
              </div>

              {/* Dynamic Inherited + Custom Capabilities Explorer */}
              {renderPermissionSelector()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  Provision Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATED STAFF CREDENTIAL BADGE RECEIPT MODAL ─── */}
      {createdStaffCredentials && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
              border: '1px solid #e2e8f0',
              padding: '32px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginBottom: '16px',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
              }}
            >
              ✓
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Staff Account Provisioned!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
              Clinical credentials and secure 6-digit access PIN generated. Issue badge to clinician.
            </p>

            {/* Credential Badge Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '20px',
                padding: '20px',
                color: '#ffffff',
                textAlign: 'left',
                marginBottom: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🏥</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#93c5fd' }}>
                    ORBITOX CLINICAL BADGE
                  </span>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    fontSize: '10px',
                    fontWeight: 800,
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  ACTIVE BADGE
                </span>
              </div>

              <div style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
                {createdStaffCredentials.name}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                {createdStaffCredentials.customTitle || createdStaffCredentials.role} • 📍 {createdStaffCredentials.contextName}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>STAFF ID / LOGIN</span>
                  <strong style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace' }}>
                    {createdStaffCredentials.id}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>ACCESS PIN (6-DIGIT)</span>
                  <strong style={{ fontSize: '14px', color: '#34d399', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                    {createdStaffCredentials.accessPin}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>CLINICAL EMAIL</span>
                  <span style={{ fontSize: '11px', color: '#e2e8f0', wordBreak: 'break-all' }}>
                    {createdStaffCredentials.email}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>LICENSE NUMBER</span>
                  <span style={{ fontSize: '11px', color: '#e2e8f0', fontFamily: 'monospace' }}>
                    {createdStaffCredentials.licenseNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const text = `OrbitoX Clinical Credentials:\nName: ${createdStaffCredentials.name}\nRole: ${createdStaffCredentials.role}\nStaff ID: ${createdStaffCredentials.id}\nEmail: ${createdStaffCredentials.email}\nBadge Access PIN: ${createdStaffCredentials.accessPin}\nLicense: ${createdStaffCredentials.licenseNumber}`;
                    navigator.clipboard?.writeText(text);
                    showToast('success', 'Credentials Copied', 'Copied credentials and access PIN to clipboard.');
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📋 Copy Credentials
                </button>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('orbitox_active_clinical_staff', JSON.stringify(createdStaffCredentials));
                    window.dispatchEvent(new Event('orbitox_staff_session_changed'));
                    setCreatedStaffCredentials(null);
                    showToast('success', 'Shift Active', `Logged in as ${createdStaffCredentials.name}`);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  🚀 Immediate Shift Login
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCreatedStaffCredentials(null)}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Dismiss & Return to Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT STAFF MODAL ─── */}
      {showEditModal && selectedStaff && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '32px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>✏️ Edit Staff & RBAC Scope</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Modify roles, department & ward context, credentials, and custom capability overrides.</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Live Interactive Preview Card for Edit Modal */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                border: '1px solid #dbeafe',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '17px',
                    fontWeight: 800
                  }}
                >
                  {formData.name
                    ? formData.name
                        .replace(/^(Dr\.|Prof\.|Doctor)\s+/i, '')
                        .split(' ')
                        .filter(Boolean)
                        .map(p => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'DR'
                    : '👤'}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '13px',
                      height: '13px',
                      borderRadius: '50%',
                      background: formData.isOnDuty ? '#10b981' : '#94a3b8',
                      border: '2px solid #ffffff'
                    }}
                    title={formData.isOnDuty ? 'On Duty' : 'Off Duty'}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                      {formData.name || 'Staff Member'}
                    </strong>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '8px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      {roles.find(r => r.role === formData.role)?.displayName || formData.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>📋 {formData.customTitle || 'General Clinical'}</span>
                    <span>•</span>
                    <span>📍 {wards.find(w => w.id === formData.contextId)?.name || departments.find(d => d.id === formData.departmentId)?.name || 'General Dept'}</span>
                    <span>•</span>
                    <span>🪪 {formData.licenseNumber || 'MD-LIC-PENDING'}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#334155'
                  }}
                >
                  🛡️ {formData.role === 'super_admin' ? 'ALL (*.*)' : isCapabilityEffective('*.*', formData.role, formData.permissions) ? 'ALL (*.*)' : 'RBAC Active'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitEdit}>
              {/* Row 1: Name and Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Full Name & Clinical Credentials *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Staff Role (Pre-sets Base Capabilities) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                  >
                    {roles.map(r => (
                      <option key={r.role} value={r.role}>
                        {r.displayName} ({r.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Custom Title & Department Cascade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Custom Title / Clinical Specialty
                  </label>
                  <input
                    type="text"
                    value={formData.customTitle}
                    onChange={e => setFormData({ ...formData, customTitle: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    1. Primary Department / Facility *
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={e => {
                      const newDept = e.target.value;
                      const childWards = wards.filter(w => w.departmentId === newDept);
                      const newContext = (childWards.length > 0 && childWards[0]?.id) ? childWards[0].id : newDept;
                      setFormData(prev => ({
                        ...prev,
                        departmentId: newDept,
                        contextId: newContext
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <optgroup label="Enterprise Facilities">
                      <option value="apollo-global">Apollo Health Global (Global Org)</option>
                      <option value="apollo-ny">Apollo Hospital New York (Hospital Branch)</option>
                    </optgroup>
                    <optgroup label="Clinical Departments">
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>
                          🩺 {d.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Row 3: Scoped Ward & License */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    2. Ward / Unit (Scoped within chosen Department) *
                  </label>
                  <select
                    value={formData.contextId}
                    onChange={e => setFormData({ ...formData, contextId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={formData.departmentId}>
                      🏢 Department-Wide Scope (All Wards / Whole Department)
                    </option>
                    {wards
                      .filter(w => w.departmentId === formData.departmentId)
                      .map(w => (
                        <option key={w.id} value={w.id}>
                          🛏️ {w.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    License / Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.licenseNumber}
                    onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Email & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Phone / Pager
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 5: Shift Schedule & Duty Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Shift Schedule
                  </label>
                  <select
                    value={formData.shiftSchedule}
                    onChange={e => setFormData({ ...formData, shiftSchedule: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="day">Day Shift (07:00 - 15:30)</option>
                    <option value="night">Night Shift (23:00 - 07:30)</option>
                    <option value="rotating">Rotating / On-Call 24/7</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Duty Status
                  </label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dutyStatusEdit"
                        checked={formData.isOnDuty}
                        onChange={() => setFormData({ ...formData, isOnDuty: true })}
                      />
                      🟢 On Duty
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dutyStatusEdit"
                        checked={!formData.isOnDuty}
                        onChange={() => setFormData({ ...formData, isOnDuty: false })}
                      />
                      ⚪ Off Duty
                    </label>
                  </div>
                </div>
              </div>

              {/* Dynamic Inherited + Custom Capabilities Explorer */}
              {renderPermissionSelector()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RBAC MATRIX MODAL ─── */}
      {showRoleMatrixModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '880px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '32px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>🛡️ Standard RBAC Roles & Capabilities Matrix</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Overview of predefined clinical scopes and default capability boundaries.</p>
              </div>
              <button
                onClick={() => setShowRoleMatrixModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {roles.map(r => {
                const roleStyle = getRoleBadgeStyle(r.role);
                return (
                  <div
                    key={r.role}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px 20px',
                      background: '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, ...roleStyle }}>
                          {r.displayName}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          Scope: {r.scope}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{r.category}</span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#475569', margin: '6px 0 10px 0', lineHeight: 1.4 }}>
                      {r.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {r.defaultPermissions.map((perm, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: perm === '*.*' ? '#fef3c7' : '#ffffff',
                            color: perm === '*.*' ? '#92400e' : '#334155',
                            border: '1px solid #e2e8f0',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowRoleMatrixModal(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── CUSTOM CONFIRMATION POPUP MODAL ─── */}
      {confirmDialog && confirmDialog.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px 32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: confirmDialog.confirmVariant === 'danger' ? '#fee2e2' : '#fef3c7',
                  color: confirmDialog.confirmVariant === 'danger' ? '#dc2626' : '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
              >
                ⚠️
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{confirmDialog.title}</h4>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Enterprise Security Governance Action</div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {confirmDialog.description}
            </p>

            {confirmDialog.staff && (
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                <div><strong>Staff Member:</strong> {confirmDialog.staff.name}</div>
                <div><strong>Role & License:</strong> {confirmDialog.staff.customTitle || confirmDialog.staff.roleDisplayName || confirmDialog.staff.role} ({confirmDialog.staff.licenseNumber})</div>
                <div><strong>Hierarchy Scope:</strong> {confirmDialog.staff.contextName || confirmDialog.staff.departmentName || 'Global'}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmDialog.isProcessing}
                onClick={async () => {
                  setConfirmDialog(prev => (prev ? { ...prev, isProcessing: true } : null));
                  await confirmDialog.action();
                  setConfirmDialog(null);
                }}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: confirmDialog.confirmVariant === 'danger' ? '#dc2626' : '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: confirmDialog.confirmVariant === 'danger' ? '0 4px 12px rgba(220, 38, 38, 0.25)' : '0 4px 12px rgba(37, 99, 235, 0.25)'
                }}
              >
                {confirmDialog.isProcessing ? 'Executing...' : confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
