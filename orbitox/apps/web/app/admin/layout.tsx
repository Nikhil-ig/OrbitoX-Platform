'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminProvider } from './data/admin-context';
import { AdminSidebar } from './components/admin-sidebar';
import { ApiKeyModal } from './components/api-key-modal';
import { CommandPalette } from './components/command-palette';
import { DemoBanner } from './components/demo-banner';

import { KeyIcon, SearchIcon } from './components/icons';

function AdminTopNav({
  onOpenNewKey,
  onOpenPalette,
}: {
  onOpenNewKey: () => void;
  onOpenPalette: () => void;
}) {
  const [clusterMode, setClusterMode] = useState<'standalone' | 'distributed'>('standalone');

  useEffect(() => {
    fetch('/api/v1/system/cluster')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.architecture?.currentMode) {
          setClusterMode(data.data.architecture.currentMode);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 36px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        background: 'rgba(10, 13, 24, 0.85)',
        backdropFilter: 'blur(28px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        gap: '24px',
      }}
    >
      {/* Left: Live Platform Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 800,
            color: '#10B981',
            letterSpacing: '0.2px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 10px #10B981',
            }}
          />
          <span>Universal Control Center</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
          <span style={{ color: '#FFFFFF' }}>9/9 Active Engines</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#A3AED0',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '5px 12px',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span>Multi-Tenant Engine:</span>
          <span style={{ color: '#5865F2', fontWeight: 800, fontFamily: 'monospace' }}>AsyncLocalStorage OK</span>
        </div>

        <Link
          href="/admin/system"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: clusterMode === 'distributed' ? '#38BDF8' : '#F59E0B',
            background: clusterMode === 'distributed' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            padding: '5px 12px',
            borderRadius: '999px',
            border: `1px solid ${clusterMode === 'distributed' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
            textDecoration: 'none',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
          title="Click to inspect Dual-Engine Architecture in System Health"
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: clusterMode === 'distributed' ? '#38BDF8' : '#F59E0B',
              boxShadow: `0 0 6px ${clusterMode === 'distributed' ? '#38BDF8' : '#F59E0B'}`,
            }}
          />
          <span>Arch:</span>
          <span style={{ fontFamily: 'monospace' }}>
            {clusterMode === 'distributed' ? 'Distributed Mesh (Multi-Node)' : 'Standalone (Single Node)'}
          </span>
        </Link>
      </div>

      {/* Center: Command Palette Trigger Pill Bar */}
      <div style={{ flex: 1, maxWidth: '440px', minWidth: '220px' }}>
        <button
          type="button"
          onClick={onOpenPalette}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 18px',
            borderRadius: '999px',
            background: '#13172B',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: '#A3AED0',
            fontSize: '12.5px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(88, 101, 242, 0.5)';
            e.currentTarget.style.background = '#181E38';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.background = '#13172B';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SearchIcon size={15} color="#5865F2" />
            <span>Search engines, vertical providers (⌘K)...</span>
          </div>
          <kbd
            style={{
              background: 'rgba(88, 101, 242, 0.18)',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '10.5px',
              fontFamily: 'monospace',
              fontWeight: 800,
              color: '#818CF8',
              border: '1px solid rgba(88, 101, 242, 0.3)',
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onOpenNewKey}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #5865F2 0%, #FF7A1A 100%)',
            border: 'none',
            borderRadius: '999px',
            padding: '9px 18px',
            color: '#FFFFFF',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(88, 101, 242, 0.4), 0 2px 10px rgba(255, 122, 26, 0.25)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(88, 101, 242, 0.55), 0 4px 14px rgba(255, 122, 26, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 18px rgba(88, 101, 242, 0.4), 0 2px 10px rgba(255, 122, 26, 0.25)';
          }}
        >
          <KeyIcon size={15} color="#FFFFFF" />
          <span>Issue API Key</span>
        </button>
      </div>
    </header>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#0A0D18',
        color: '#FFFFFF',
        position: 'relative',
      }}
    >
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden', position: 'relative' }}>
        {/* Ambient Cosmic Canvas Radial Glow */}
        <div className="cosmic-canvas-glow" />

        <AdminTopNav
          onOpenNewKey={() => setIsKeyModalOpen(true)}
          onOpenPalette={() => setIsPaletteOpen(true)}
        />
        <main
          style={{
            flex: 1,
            padding: '32px 38px 60px 38px',
            overflowY: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <DemoBanner />
          {children}
        </main>
      </div>

      {/* Global API Key Generator Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />

      {/* Global Cmd+K Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
      />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminProvider>
  );
}
