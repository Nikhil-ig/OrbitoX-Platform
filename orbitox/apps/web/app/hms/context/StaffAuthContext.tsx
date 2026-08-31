'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export interface StaffProfile {
  id: string;
  name: string;
  role: string;
  customTitle?: string;
  departmentId: string;
  departmentName?: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  accessPin?: string;
  shiftSchedule: 'day' | 'night' | 'rotating';
  isOnDuty: boolean;
  contextId: string;
  contextType?: string;
  contextName?: string;
  status?: string;
  permissions?: string[];
  effectivePermissions?: string[];
  roleDisplayName?: string;
  roleCategory?: string;
  scope?: string;
  lastActive?: string;
  lastLogin?: string;
}

export interface BreakGlassState {
  isActive: boolean;
  reason?: string;
  token?: string;
  elevatedAt?: string;
}

interface StaffAuthContextType {
  currentStaff: StaffProfile | null;
  allStaff: StaffProfile[];
  loading: boolean;
  breakGlass: BreakGlassState;
  login: (identifier: string, pinOrPassword: string) => Promise<{ success: boolean; error?: string }>;
  switchStaff: (staff: StaffProfile) => void;
  logout: () => void;
  can: (permission: string) => boolean;
  isDoctor: boolean;
  isNurse: boolean;
  isPharmacist: boolean;
  isLabTech: boolean;
  isDirector: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  triggerBreakGlass: (reason: string) => Promise<{ success: boolean; token?: string }>;
  clearBreakGlass: () => void;
  toggleDutyStatus: () => Promise<void>;
  refreshStaffList: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'orbitox_active_clinical_staff';
const BREAK_GLASS_KEY = 'orbitox_break_glass_session';

export const StaffAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStaff, setCurrentStaff] = useState<StaffProfile | null>(null);
  const [allStaff, setAllStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakGlass, setBreakGlass] = useState<BreakGlassState>({ isActive: false });
  const router = useRouter();

  const fetchAllStaff = async (): Promise<StaffProfile[]> => {
    try {
      const res = await fetch('/api/hospital/security/staff');
      const data = await res.json();
      if (data.success && data.data) {
        setAllStaff(data.data);
        return data.data as StaffProfile[];
      }
      return [];
    } catch (err) {
      console.error('Failed to load clinical staff directory:', err);
      return [];
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const staffList = await fetchAllStaff();

      // Check localStorage for saved active staff
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const fresh = staffList.find(s => s.id === parsed.id) || parsed;
          setCurrentStaff(fresh);
        } catch {
          if (staffList.length > 0 && staffList[0]) setCurrentStaff(staffList[0]);
        }
      } else if (staffList.length > 0 && staffList[0]) {
        // Default to Dr. Stephen Strange (Cardiology MD) or Nurse Clara (Bedside RN)
        const defaultStaff = staffList.find(s => s.id === 'dr_strange_01' || s.id === 'nurse_clara_02' || s.id === 'dr_ashlynn_01') || staffList[0];
        setCurrentStaff(defaultStaff);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStaff));
      }

      // Check break-glass session
      const bgSaved = localStorage.getItem(BREAK_GLASS_KEY);
      if (bgSaved) {
        try {
          const parsedBg = JSON.parse(bgSaved);
          setBreakGlass(parsedBg);
        } catch {}
      }

      setLoading(false);
    };

    initAuth();

    const handleSessionChange = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCurrentStaff(parsed);
        } catch {}
      }
      const bgSaved = localStorage.getItem(BREAK_GLASS_KEY);
      if (bgSaved) {
        try {
          setBreakGlass(JSON.parse(bgSaved));
        } catch {}
      } else {
        setBreakGlass({ isActive: false });
      }
    };

    window.addEventListener('orbitox_staff_session_changed', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    return () => {
      window.removeEventListener('orbitox_staff_session_changed', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, []);

  const login = async (identifier: string, pinOrPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/hospital/security/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, pinOrPassword })
      });

      const data = await res.json();
      if (data.success && data.staff) {
        setCurrentStaff(data.staff);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.staff));
        window.dispatchEvent(new Event('orbitox_staff_session_changed'));
        await fetchAllStaff();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Authentication failed' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const switchStaff = (staff: StaffProfile) => {
    setCurrentStaff(staff);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
    window.dispatchEvent(new Event('orbitox_staff_session_changed'));
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BREAK_GLASS_KEY);
    setBreakGlass({ isActive: false });
    setCurrentStaff(null);
    window.dispatchEvent(new Event('orbitox_staff_session_changed'));
    router.push('/hms/login');
  };

  const can = (permission: string): boolean => {
    if (!currentStaff) return false;
    if (currentStaff.role === 'super_admin' || currentStaff.role === 'facility_director') return true;
    if (breakGlass.isActive) return true; // Emergency clinical elevation

    const perms = currentStaff.effectivePermissions || currentStaff.permissions || [];
    return perms.includes('*.*') || perms.includes(permission);
  };

  // Role Category Helpers
  const role = currentStaff?.role || '';
  const isDoctor = useMemo(() => ['attending_doctor', 'specialist_doctor', 'department_head'].includes(role), [role]);
  const isNurse = useMemo(() => ['head_nurse', 'staff_nurse'].includes(role), [role]);
  const isPharmacist = useMemo(() => role === 'pharmacist', [role]);
  const isLabTech = useMemo(() => role === 'lab_technician', [role]);
  const isDirector = useMemo(() => role === 'facility_director', [role]);
  const isSuperAdmin = useMemo(() => role === 'super_admin', [role]);
  const isAdmin = useMemo(() => isSuperAdmin || isDirector, [isSuperAdmin, isDirector]);

  const triggerBreakGlass = async (reason: string): Promise<{ success: boolean; token?: string }> => {
    if (!currentStaff) return { success: false };
    const token = `BG-EMERGENCY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newState: BreakGlassState = {
      isActive: true,
      reason,
      token,
      elevatedAt: new Date().toISOString()
    };
    setBreakGlass(newState);
    localStorage.setItem(BREAK_GLASS_KEY, JSON.stringify(newState));

    try {
      await fetch('/api/hospital/security/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentStaff.id,
          staffName: currentStaff.name,
          staffRole: currentStaff.role,
          reason,
          token
        })
      });
    } catch {}

    window.dispatchEvent(new Event('orbitox_staff_session_changed'));
    return { success: true, token };
  };

  const clearBreakGlass = () => {
    setBreakGlass({ isActive: false });
    localStorage.removeItem(BREAK_GLASS_KEY);
    window.dispatchEvent(new Event('orbitox_staff_session_changed'));
  };

  const toggleDutyStatus = async () => {
    if (!currentStaff) return;
    const updated: StaffProfile = {
      ...currentStaff,
      isOnDuty: !currentStaff.isOnDuty
    };
    setCurrentStaff(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('orbitox_staff_session_changed'));
  };

  return (
    <StaffAuthContext.Provider
      value={{
        currentStaff,
        allStaff,
        loading,
        breakGlass,
        login,
        switchStaff,
        logout,
        can,
        isDoctor,
        isNurse,
        isPharmacist,
        isLabTech,
        isDirector,
        isAdmin,
        isSuperAdmin,
        triggerBreakGlass,
        clearBreakGlass,
        toggleDutyStatus,
        refreshStaffList: async () => { await fetchAllStaff(); }
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
};

export const useStaffAuth = () => {
  const context = useContext(StaffAuthContext);
  if (!context) {
    // Resilient fallback for standalone rendering / initial hydration
    let savedStaff: StaffProfile | null = null;
    let savedBg: BreakGlassState = { isActive: false };
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('orbitox_active_clinical_staff');
        if (raw) savedStaff = JSON.parse(raw);
        const rawBg = localStorage.getItem(BREAK_GLASS_KEY);
        if (rawBg) savedBg = JSON.parse(rawBg);
      } catch {}
    }

    const r = savedStaff?.role || '';
    const isDoc = ['attending_doctor', 'specialist_doctor', 'department_head'].includes(r);
    const isNur = ['head_nurse', 'staff_nurse'].includes(r);
    const isPharm = r === 'pharmacist';
    const isLab = r === 'lab_technician';
    const isDir = r === 'facility_director';
    const isSup = r === 'super_admin';

    return {
      currentStaff: savedStaff,
      allStaff: savedStaff ? [savedStaff] : [],
      loading: false,
      breakGlass: savedBg,
      login: async () => ({ success: false, error: 'StaffAuthProvider not mounted' }),
      switchStaff: (staff: StaffProfile) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('orbitox_active_clinical_staff', JSON.stringify(staff));
          window.dispatchEvent(new Event('orbitox_staff_session_changed'));
        }
      },
      logout: () => {},
      can: (permission: string) => {
        if (!savedStaff) return false;
        if (savedStaff.role === 'super_admin' || savedStaff.role === 'facility_director') return true;
        if (savedBg.isActive) return true;
        const perms = savedStaff.effectivePermissions || savedStaff.permissions || [];
        return perms.includes('*.*') || perms.includes(permission);
      },
      isDoctor: isDoc,
      isNurse: isNur,
      isPharmacist: isPharm,
      isLabTech: isLab,
      isDirector: isDir,
      isAdmin: isSup || isDir,
      isSuperAdmin: isSup,
      triggerBreakGlass: async () => ({ success: false }),
      clearBreakGlass: () => {},
      toggleDutyStatus: async () => {},
      refreshStaffList: async () => {}
    };
  }
  return context;
};
