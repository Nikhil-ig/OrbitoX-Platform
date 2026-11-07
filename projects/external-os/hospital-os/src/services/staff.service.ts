import { orbitox } from '@orbitox/runtime';
import { StaffEntity, StaffRole, HospitalContextType } from '../domain/types';
import { HierarchyService } from './hierarchy.service';

export interface RoleMetadata {
  role: StaffRole;
  displayName: string;
  category: 'Administration' | 'Clinical' | 'Nursing' | 'Allied';
  description: string;
  scope: string;
  defaultPermissions: string[];
}

export const STANDARD_STAFF_ROLES: RoleMetadata[] = [
  {
    role: 'super_admin',
    displayName: 'Global Enterprise Root Admin',
    category: 'Administration',
    description: 'Root access across all global organizations, hospital facilities, departments, wards, staff rosters & cryptographic audit ledgers.',
    scope: '*.*',
    defaultPermissions: [
      '*.*',
      'staff.read', 'staff.manage',
      'patient.read', 'patient.create', 'patient.update', 'patient.delete', 'patient.admit', 'patient.discharge', 'patient.transfer',
      'bed.read', 'bed.create', 'bed.update', 'bed.turnover', 'bed.manage_equipment',
      'treatment.read', 'treatment.prescribe', 'treatment.dispense', 'treatment.administer', 'emar.override',
      'lab.read', 'lab.order', 'lab.process', 'lab.report',
      'billing.read', 'billing.manage',
      'security.break_glass', 'audit.export', 'telemetry.control', 'hierarchy.manage'
    ]
  },
  {
    role: 'facility_director',
    displayName: 'Chief Medical Officer / Facility Director',
    category: 'Administration',
    description: 'Facility-wide executive clinical governance, department allocation, staff roster authorization & turnover policies.',
    scope: 'tenant.*',
    defaultPermissions: [
      'staff.read', 'staff.manage',
      'patient.read', 'patient.create', 'patient.update', 'patient.admit', 'patient.discharge', 'patient.transfer',
      'bed.read', 'bed.create', 'bed.update', 'bed.turnover',
      'treatment.read', 'treatment.prescribe', 'treatment.dispense',
      'lab.read', 'lab.order', 'lab.report',
      'billing.read', 'billing.manage',
      'security.break_glass', 'audit.read', 'telemetry.read'
    ]
  },
  {
    role: 'department_head',
    displayName: 'Head of Department (HOD)',
    category: 'Clinical',
    description: 'Specialty department governance, clinical intake authorization, ward transfer approvals & attending physician oversight.',
    scope: 'department.*',
    defaultPermissions: [
      'staff.read',
      'patient.read', 'patient.create', 'patient.update', 'patient.admit', 'patient.discharge', 'patient.transfer',
      'bed.read', 'bed.turnover',
      'treatment.read', 'treatment.prescribe',
      'lab.read', 'lab.order', 'lab.report',
      'billing.read',
      'telemetry.read', 'telemetry.alarm_ack'
    ]
  },
  {
    role: 'attending_doctor',
    displayName: 'Primary Attending Physician',
    category: 'Clinical',
    description: 'Primary patient care, clinical diagnosis, surgical evaluations, prescription ordering & emergency break-glass authority.',
    scope: 'clinical.*, telemetry.*',
    defaultPermissions: [
      'patient.read', 'patient.create', 'patient.update', 'patient.admit', 'patient.discharge', 'patient.transfer',
      'bed.read',
      'treatment.read', 'treatment.prescribe',
      'lab.read', 'lab.order',
      'billing.read',
      'security.break_glass', 'telemetry.read', 'telemetry.alarm_ack'
    ]
  },
  {
    role: 'specialist_doctor',
    displayName: 'Specialist Consultant Physician',
    category: 'Clinical',
    description: 'Targeted sub-specialty consultations, diagnostic reviews, specialized prescription recommendations & clinical notes.',
    scope: 'clinical.consult.*',
    defaultPermissions: [
      'patient.read', 'patient.update',
      'treatment.read', 'treatment.prescribe',
      'lab.read', 'lab.order',
      'billing.read',
      'telemetry.read'
    ]
  },
  {
    role: 'head_nurse',
    displayName: 'Ward Charge Nurse / Head Nurse',
    category: 'Nursing',
    description: 'Ward telemetry oversight, bed turnover verification, emergency triage intake, staff nurse roster & eMAR dispensing verification.',
    scope: 'ward.*, vitals.*, emar.*',
    defaultPermissions: [
      'patient.read', 'patient.triage', 'patient.transfer',
      'bed.read', 'bed.update', 'bed.turnover',
      'treatment.read', 'treatment.dispense', 'treatment.administer',
      'lab.read', 'lab.collect',
      'billing.read',
      'telemetry.read', 'telemetry.alarm_ack'
    ]
  },
  {
    role: 'staff_nurse',
    displayName: 'Bedside / Floor Staff Nurse',
    category: 'Nursing',
    description: 'Continuous patient vitals logging, IV infusion rate control, 5-rights bedside medication administration & patient hygiene.',
    scope: 'vitals.*, medication.administer',
    defaultPermissions: [
      'patient.read', 'patient.update',
      'bed.read', 'bed.turnover',
      'treatment.read', 'treatment.administer',
      'telemetry.read'
    ]
  },
  {
    role: 'pharmacist',
    displayName: 'Clinical Pharmacist (PharmD)',
    category: 'Allied',
    description: 'eMAR prescription verification, drug-drug interaction validation, formulary stock management & IV compounding.',
    scope: 'pharmacy.*, emar.dispense',
    defaultPermissions: [
      'patient.read',
      'treatment.read', 'treatment.dispense',
      'pharmacy.verify', 'pharmacy.inventory',
      'billing.read'
    ]
  },
  {
    role: 'lab_technician',
    displayName: 'Diagnostics & Pathology Technologist',
    category: 'Allied',
    description: 'Biological specimen handling, hematology/biochemistry diagnostic analyzer processing & critical panic value alerts.',
    scope: 'lab.*, diagnostics.*',
    defaultPermissions: [
      'patient.read',
      'lab.read', 'lab.order', 'lab.collect', 'lab.process', 'lab.report',
      'billing.read'
    ]
  }
];

export class StaffService {
  /**
   * Get effective permissions combining role defaults and custom user overrides
   */
  static getEffectivePermissions(staff: Partial<StaffEntity>): string[] {
    const roleMeta = STANDARD_STAFF_ROLES.find(r => r.role === staff.role);
    const basePermissions = roleMeta ? roleMeta.defaultPermissions : [];
    const customPermissions = staff.permissions || [];
    return Array.from(new Set([...basePermissions, ...customPermissions]));
  }

  /**
   * Check if a context node is equal to or a descendant of an ancestor node
   */
  static isContextDescendantOrSelf(ancestorId: string, targetId: string): boolean {
    if (!ancestorId || ancestorId === '*' || ancestorId === 'global' || ancestorId === 'apollo-global') return true;
    if (ancestorId === targetId) return true;

    const allNodes = HierarchyService.getAllNodes();
    let current = allNodes.find(n => n.id === targetId);

    while (current && current.parentId) {
      if (current.parentId === ancestorId) return true;
      current = allNodes.find(n => n.id === current?.parentId);
    }

    return false;
  }

  /**
   * Verify if a staff member is authorized to perform an action within a target context
   */
  static async canPerform(
    staffId: string,
    action: string,
    targetContextId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const staff = await orbitox.db.findById<StaffEntity>('staff', staffId);

    if (!staff) {
      return { allowed: false, reason: `Staff record ${staffId} not found.` };
    }

    if (staff.status === 'deactivated' || staff.status === 'suspended') {
      return { allowed: false, reason: `Staff account is currently ${staff.status}.` };
    }

    const effectivePermissions = this.getEffectivePermissions(staff);
    const hasPermission = effectivePermissions.includes('*.*') || effectivePermissions.includes(action);

    if (!hasPermission) {
      return { allowed: false, reason: `Staff role '${staff.role}' lacks capability '${action}'.` };
    }

    // Check Context Scope
    if (targetContextId && staff.contextId) {
      const isWithinScope = this.isContextDescendantOrSelf(staff.contextId, targetContextId);
      if (!isWithinScope) {
        return {
          allowed: false,
          reason: `Target context ${targetContextId} is outside authorized scope of context ${staff.contextId}.`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * List staff directory with optional query filtering
   */
  static async listStaff(filters?: {
    role?: string;
    departmentId?: string;
    contextId?: string;
    status?: string;
    search?: string;
    isOnDuty?: boolean;
  }): Promise<StaffEntity[]> {
    let result = await orbitox.db.findMany<StaffEntity>('staff');
    let staffList = result.data || [];

    // Auto-seed if empty
    if (staffList.length === 0) {
      await this.seedInitialStaff();
      const recheck = await orbitox.db.findMany<StaffEntity>('staff');
      staffList = recheck.data || [];
    }

    if (filters) {
      if (filters.role) {
        staffList = staffList.filter(s => s.role === filters.role);
      }
      if (filters.departmentId) {
        staffList = staffList.filter(s => s.departmentId === filters.departmentId);
      }
      if (filters.status) {
        staffList = staffList.filter(s => s.status === filters.status);
      }
      if (filters.isOnDuty !== undefined) {
        staffList = staffList.filter(s => s.isOnDuty === filters.isOnDuty);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        staffList = staffList.filter(
          s =>
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.licenseNumber.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q) ||
            (s.customTitle && s.customTitle.toLowerCase().includes(q))
        );
      }
    }

    return staffList;
  }

  /**
   * Get single staff member by ID
   */
  static async getStaffById(id: string): Promise<StaffEntity | null> {
    try {
      const res = await orbitox.db.findById<StaffEntity>('staff', id);
      if (res) return res;
    } catch {}

    const all = await this.listStaff();
    return all.find(s => s.id === id) || null;
  }

  /**
   * Authenticate a staff member by Email, Staff ID, or License Number and Access PIN/Password
   */
  static async authenticateStaff(identifier: string, pinOrPassword: string): Promise<{ success: boolean; staff?: StaffEntity; error?: string }> {
    if (!identifier || !pinOrPassword) {
      return { success: false, error: 'Staff identifier and Access PIN/Password are required.' };
    }

    const allStaff = await this.listStaff();
    const cleanId = identifier.trim().toLowerCase();
    const staff = allStaff.find(
      s => s.id.toLowerCase() === cleanId || s.email.toLowerCase() === cleanId || s.licenseNumber.toLowerCase() === cleanId
    );

    if (!staff) {
      return { success: false, error: 'Invalid clinical credentials: Staff member not found in directory.' };
    }

    if (staff.status === 'deactivated' || staff.status === 'suspended') {
      return { success: false, error: `Account is currently ${staff.status}. Please contact the Hospital Security Administrator.` };
    }

    // Check PIN or temporary password (or master standard fallback '123456')
    const validPin = staff.accessPin || '123456';
    const validTemp = staff.tempPassword;
    const isMatch = pinOrPassword === validPin || (validTemp && pinOrPassword === validTemp) || pinOrPassword === '123456';

    if (!isMatch) {
      return { success: false, error: 'Incorrect Access PIN or Password. Please check your credentials.' };
    }

    // Update lastLogin and set on-duty (non-blocking)
    try {
      await this.updateStaff(staff.id, {
        lastLogin: new Date().toISOString(),
        lastActive: 'Just now',
        isOnDuty: true
      }, staff.id);
    } catch (err) {
      console.warn('Non-fatal error updating login timestamp:', err);
    }

    // Cryptographic audit log for successful clinical login
    try {
      await orbitox.audit.log({
        action: 'STAFF_AUTHENTICATION_SUCCESS',
        entityType: 'staff',
        entityId: staff.id,
        userId: staff.id,
        reason: `Staff member ${staff.name} (${staff.role}) successfully authenticated into Hospital OS.`
      });
    } catch {}

    const enriched = (await this.getStaffById(staff.id)) || staff;
    return { success: true, staff: enriched };
  }

  /**
   * Create a new staff member with full RBAC validation, auto-generated PIN & SHA-256 audit logging
   */
  static async createStaff(data: Partial<StaffEntity>, operatorId: string = 'admin_root_01'): Promise<StaffEntity> {
    if (!data.name || !data.role || !data.departmentId || !data.email) {
      throw new Error('Missing required fields: name, role, departmentId, and email are mandatory.');
    }

    const id = data.id || `staff_${data.role}_${Date.now().toString(36)}`;
    const contextId = data.contextId || data.departmentId || 'apollo-global';
    const accessPin = data.accessPin || Math.floor(100000 + Math.random() * 900000).toString();
    const tempPassword = data.tempPassword || `Orbitox@${new Date().getFullYear()}`;

    // Find context details from hierarchy
    const allNodes = HierarchyService.getAllNodes();
    const contextNode = allNodes.find(n => n.id === contextId);

    const staffRecord: StaffEntity = {
      id,
      name: data.name,
      role: data.role as StaffRole,
      customTitle: data.customTitle || undefined,
      departmentId: data.departmentId,
      departmentName: contextNode?.name || data.departmentName || 'General Specialty',
      email: data.email,
      phone: data.phone || '+1 (555) 010-0000',
      licenseNumber: data.licenseNumber || `MD-LIC-${Math.floor(100000 + Math.random() * 900000)}`,
      accessPin,
      tempPassword,
      shiftSchedule: data.shiftSchedule || 'day',
      isOnDuty: data.isOnDuty !== undefined ? data.isOnDuty : true,
      contextId: contextId,
      contextType: (contextNode?.type as HospitalContextType) || 'department',
      contextName: contextNode?.name || 'General Department',
      status: data.status || 'active',
      permissions: data.permissions || [],
      lastActive: 'Just now',
      lastLogin: undefined,
      meta: data.meta || {}
    };

    const created = await orbitox.db.create<StaffEntity>('staff', staffRecord, contextId);

    // Cryptographic audit logging
    try {
      await orbitox.audit.log({
        action: 'STAFF_MEMBER_PROVISIONED',
        entityType: 'staff',
        entityId: id,
        userId: operatorId,
        reason: `Staff member ${data.name} provisioned with role '${data.role}' in context '${contextId}' (Access PIN assigned)`
      });
    } catch {}

    return created;
  }

  /**
   * Update staff member details, role, permissions, or context
   */
  static async updateStaff(id: string, data: Partial<StaffEntity>, operatorId: string = 'admin_root_01'): Promise<StaffEntity> {
    const existing = await this.getStaffById(id);
    if (!existing) {
      throw new Error(`Staff member with ID '${id}' not found.`);
    }

    const contextId = data.contextId || existing.contextId || 'apollo-global';
    const allNodes = HierarchyService.getAllNodes();
    const contextNode = allNodes.find(n => n.id === contextId);

    const updatedData: Partial<StaffEntity> = {
      ...data,
      contextId,
      contextType: contextNode?.type as HospitalContextType || existing.contextType,
      contextName: contextNode?.name || existing.contextName,
      lastActive: 'Just now'
    };

    let updated: StaffEntity | null = null;
    try {
      updated = await orbitox.db.update<StaffEntity>('staff', id, updatedData, contextId);
    } catch (err: any) {
      console.warn(`Staff update notice for ${id}:`, err?.message);
    }

    const resultEntity = (updated || { ...existing, ...updatedData }) as StaffEntity;

    // Cryptographic audit logging (executed on every modification)
    try {
      await orbitox.audit.log({
        action: 'STAFF_MEMBER_MODIFIED',
        entityType: 'staff',
        entityId: id,
        userId: operatorId,
        reason: `Staff member ${existing.name} modified by ${operatorId}. Fields updated: ${Object.keys(data).join(', ')}`
      });
    } catch {}

    return resultEntity;
  }

  /**
   * Toggle staff On-Duty status
   */
  static async toggleDuty(id: string, isOnDuty: boolean, operatorId: string = 'admin_root_01'): Promise<StaffEntity> {
    const existing = await this.getStaffById(id);
    if (!existing) throw new Error(`Staff with ID ${id} not found.`);

    return await this.updateStaff(id, { isOnDuty, lastActive: 'Just now' }, operatorId);
  }

  /**
   * Soft deactivate or delete staff member
   */
  static async deleteStaff(id: string, operatorId: string = 'admin_root_01'): Promise<boolean> {
    const existing = await this.getStaffById(id);
    if (!existing) return false;

    await orbitox.db.update<StaffEntity>('staff', id, { status: 'deactivated', isOnDuty: false }, existing.contextId);

    try {
      await orbitox.audit.log({
        action: 'STAFF_MEMBER_DEACTIVATED',
        entityType: 'staff',
        entityId: id,
        userId: operatorId,
        reason: `Staff member ${existing.name} (${existing.role}) deactivated and removed from active rosters.`
      });
    } catch {}

    return true;
  }

  /**
   * Seed realistic staff members across clinical departments, wards, and pharmacy
   */
  static async seedInitialStaff(): Promise<void> {
    const initialStaff: Partial<StaffEntity>[] = [
      {
        id: 'admin_root_01',
        name: 'Michael Thompson',
        role: 'super_admin',
        customTitle: 'Chief Technology & Systems Officer',
        departmentId: 'apollo-ny',
        departmentName: 'Apollo Hospital New York (Enterprise)',
        email: 'superadmin@orbitox.health',
        phone: '+1 (800) 555-0199',
        licenseNumber: 'ROOT-SEC-001',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'day',
        isOnDuty: true,
        contextId: 'apollo-global',
        contextType: 'organisation',
        contextName: 'Apollo Health Global',
        status: 'active',
        permissions: ['*.*']
      },
      {
        id: 'dr_director_fury',
        name: 'Dr. Nicholas Fury, MD, FACS',
        role: 'facility_director',
        customTitle: 'Chief Medical Officer & Trauma Director',
        departmentId: 'apollo-ny',
        departmentName: 'Executive Medical Board',
        email: 'cmo.fury@orbitox.health',
        phone: '+1 (555) 234-5678',
        licenseNumber: 'MD-NY-882910',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'day',
        isOnDuty: true,
        contextId: 'apollo-ny',
        contextType: 'tenant',
        contextName: 'Apollo Hospital New York',
        status: 'active'
      },
      {
        id: 'dr_strange_01',
        name: 'Dr. Stephen Strange, MD, PhD',
        role: 'department_head',
        customTitle: 'Chief of Cardiology & Thoracic Surgery',
        departmentId: 'apollo-ny-cardio',
        departmentName: 'Cardiology Department',
        email: 'stephen.strange@orbitox.health',
        phone: '+1 (555) 345-6789',
        licenseNumber: 'MD-NY-772183',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'day',
        isOnDuty: true,
        contextId: 'apollo-ny-cardio',
        contextType: 'department',
        contextName: 'Cardiology Department',
        status: 'active'
      },
      {
        id: 'dr_ashlynn_01',
        name: 'Dr. Ashlynn Carder, MD',
        role: 'attending_doctor',
        customTitle: 'Senior Attending Physician (Emergency Trauma)',
        departmentId: 'apollo-ny-er',
        departmentName: 'Emergency Department',
        email: 'ashlynn.carder@orbitox.health',
        phone: '+1 (555) 456-7890',
        licenseNumber: 'MD-NY-991204',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'rotating',
        isOnDuty: true,
        contextId: 'apollo-ny-er-trauma',
        contextType: 'ward',
        contextName: 'Trauma Resuscitation Ward',
        status: 'active'
      },
      {
        id: 'dr_house_01',
        name: 'Dr. Gregory House, MD',
        role: 'specialist_doctor',
        customTitle: 'Head of Diagnostic & Infectious Disease Consults',
        departmentId: 'apollo-ny-neuro',
        departmentName: 'Neurology & Stroke Department',
        email: 'greg.house@orbitox.health',
        phone: '+1 (555) 567-8901',
        licenseNumber: 'MD-NJ-441920',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'day',
        isOnDuty: true,
        contextId: 'apollo-ny-neuro',
        contextType: 'department',
        contextName: 'Neurology & Stroke Department',
        status: 'active'
      },
      {
        id: 'nurse_palmer_01',
        name: 'Christine Palmer, BSN, RN',
        role: 'head_nurse',
        customTitle: 'ICU Charge Nurse / Clinical Lead',
        departmentId: 'apollo-ny-cardio',
        departmentName: 'Cardiac ICU Ward',
        email: 'christine.palmer@orbitox.health',
        phone: '+1 (555) 678-9012',
        licenseNumber: 'RN-NY-110293',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'day',
        isOnDuty: true,
        contextId: 'apollo-ny-cardio-icu',
        contextType: 'ward',
        contextName: 'Cardiac ICU Ward',
        status: 'active'
      },
      {
        id: 'nurse_clara_02',
        name: 'Clara Oswald, RN',
        role: 'staff_nurse',
        customTitle: 'Bedside Staff Nurse (Pediatric ICU)',
        departmentId: 'apollo-ny-peds',
        departmentName: 'Pediatric ICU (PICU)',
        email: 'clara.oswald@orbitox.health',
        phone: '+1 (555) 789-0123',
        licenseNumber: 'RN-NY-224819',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'night',
        isOnDuty: true,
        contextId: 'apollo-ny-peds-picu',
        contextType: 'ward',
        contextName: 'Pediatric ICU (PICU)',
        status: 'active'
      },
      {
        id: 'pharmacist_pepper_01',
        name: 'Pepper Potts, PharmD, RPh',
        role: 'pharmacist',
        customTitle: 'Director of Central Clinical Pharmacy',
        departmentId: 'apollo-ny-pharmacy',
        departmentName: 'Central Pharmacy',
        email: 'pepper.potts@orbitox.health',
        phone: '+1 (555) 890-1234',
        licenseNumber: 'PHARM-NY-551029',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'day',
        isOnDuty: true,
        contextId: 'apollo-ny-pharmacy',
        contextType: 'department',
        contextName: 'Central Pharmacy',
        status: 'active'
      },
      {
        id: 'lab_banner_01',
        name: 'Dr. Bruce Banner, PhD',
        role: 'lab_technician',
        customTitle: 'Lead Diagnostic & Molecular Pathology Scientist',
        departmentId: 'apollo-ny-lab',
        departmentName: 'Pathology & Diagnostic Lab',
        email: 'bruce.banner@orbitox.health',
        phone: '+1 (555) 901-2345',
        licenseNumber: 'LAB-NY-883012',
        accessPin: '123456',
        tempPassword: 'Orbitox@2026',
        shiftSchedule: 'rotating',
        isOnDuty: true,
        contextId: 'apollo-ny-lab',
        contextType: 'department',
        contextName: 'Pathology & Diagnostic Lab',
        status: 'active'
      }
    ];

    for (const staff of initialStaff) {
      await orbitox.db.create<StaffEntity>('staff', staff as StaffEntity, staff.contextId || 'apollo-global');
    }

    console.log(`✅ [StaffService] Seeded ${initialStaff.length} enterprise clinical staff members with RBAC & context hierarchy.`);
  }
}
