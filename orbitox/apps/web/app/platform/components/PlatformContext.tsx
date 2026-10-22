'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type EnvironmentType = 'production' | 'staging' | 'development';

export interface InspectorTarget {
  type: 'project' | 'environment' | 'key' | 'credential' | 'package' | 'audit' | 'approval' | 'node' | 'service' | 'universal' | string;
  data: any;
}

export interface PlatformContextState {
  activeEnvironment: EnvironmentType;
  setActiveEnvironment: (env: EnvironmentType) => void;
  systemHealth: 'OPERATIONAL' | 'DEGRADED';
  securityScore: number;
  clusterMode: 'standalone' | 'distributed';
  toggleClusterMode: () => void;
  operator: {
    name: string;
    role: string;
    email: string;
    avatar: string;
  };
  inspectorTarget: InspectorTarget | null;
  openInspector: (type: InspectorTarget['type'], data: any) => void;
  closeInspector: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const PlatformContext = createContext<PlatformContextState | undefined>(undefined);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [activeEnvironment, setActiveEnvironment] = useState<EnvironmentType>('production');
  const [systemHealth] = useState<'OPERATIONAL' | 'DEGRADED'>('OPERATIONAL');
  const [securityScore] = useState<number>(98);
  const [clusterMode, setClusterMode] = useState<'standalone' | 'distributed'>('standalone');
  const [inspectorTarget, setInspectorTarget] = useState<InspectorTarget | null>(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const operator = {
    name: 'Platform SuperAdmin',
    role: 'Root Mesh Operator',
    email: 'root@orbitox.io',
    avatar: '🪐',
  };

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const toggleClusterMode = async () => {
    const nextMode = clusterMode === 'standalone' ? 'distributed' : 'standalone';
    setClusterMode(nextMode);
    try {
      await fetch('/api/v1/system/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterMode: nextMode }),
      });
      triggerRefresh();
    } catch {
      // Ignored in offline fallback
    }
  };

  const openInspector = (type: InspectorTarget['type'], data: any) => {
    setInspectorTarget({ type, data });
  };

  const closeInspector = () => {
    setInspectorTarget(null);
  };

  // Keyboard shortcut for ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        if (inspectorTarget) closeInspector();
        if (isCommandPaletteOpen) setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectorTarget, isCommandPaletteOpen]);

  return (
    <PlatformContext.Provider
      value={{
        activeEnvironment,
        setActiveEnvironment,
        systemHealth,
        securityScore,
        clusterMode,
        toggleClusterMode,
        operator,
        inspectorTarget,
        openInspector,
        closeInspector,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
