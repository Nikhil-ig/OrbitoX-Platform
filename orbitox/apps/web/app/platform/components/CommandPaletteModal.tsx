'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlatform } from './PlatformContext';
import { tokens } from './tokens';

interface CommandItem {
  id: string;
  category: string;
  title: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPaletteModal() {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setActiveEnvironment,
  } = usePlatform();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global ⌘K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-overview',
      category: 'Navigation',
      title: 'Platform Overview',
      action: () => { router.push('/platform'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-projects',
      category: 'Navigation',
      title: 'Projects & Environments',
      action: () => { router.push('/platform/projects'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-keys',
      category: 'Navigation',
      title: 'API Keys',
      action: () => { router.push('/platform/api-keys'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-vault',
      category: 'Navigation',
      title: 'Credentials Vault',
      action: () => { router.push('/platform/credentials'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-packages',
      category: 'Navigation',
      title: 'Packages & Supply Chain',
      action: () => { router.push('/platform/packages'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-security',
      category: 'Navigation',
      title: 'Security Posture',
      action: () => { router.push('/platform/security'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-audit',
      category: 'Navigation',
      title: 'Audit Log & Merkle Ledger',
      action: () => { router.push('/platform/audit'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-approvals',
      category: 'Navigation',
      title: 'Four-Eyes Approvals Queue',
      action: () => { router.push('/platform/approvals'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-tests',
      category: 'Navigation',
      title: 'Verification Center & Tests',
      action: () => { router.push('/platform/tests'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-explorer',
      category: 'Navigation',
      title: 'API Explorer',
      action: () => { router.push('/platform/explorer'); setCommandPaletteOpen(false); },
    },
    {
      id: 'nav-ai',
      category: 'Navigation',
      title: 'AI & MCP Gateway',
      action: () => { router.push('/platform/ai'); setCommandPaletteOpen(false); },
    },
    // Quick Actions
    {
      id: 'act-new-key',
      category: 'Actions',
      title: 'Create API Key',
      action: () => { router.push('/platform/api-keys'); setCommandPaletteOpen(false); },
    },
    {
      id: 'act-new-cred',
      category: 'Actions',
      title: 'Store Credential in Vault',
      action: () => { router.push('/platform/credentials'); setCommandPaletteOpen(false); },
    },
    {
      id: 'act-new-proj',
      category: 'Actions',
      title: 'Provision Project',
      action: () => { router.push('/platform/projects'); setCommandPaletteOpen(false); },
    },
    {
      id: 'act-sweep',
      category: 'Actions',
      title: 'Verify Audit Ledger Integrity',
      action: () => { router.push('/platform/audit'); setCommandPaletteOpen(false); },
    },
    // Environment
    {
      id: 'env-prod',
      category: 'Environment',
      title: 'Switch to Production',
      action: () => { setActiveEnvironment('production'); setCommandPaletteOpen(false); },
    },
    {
      id: 'env-stag',
      category: 'Environment',
      title: 'Switch to Staging',
      action: () => { setActiveEnvironment('staging'); setCommandPaletteOpen(false); },
    },
    {
      id: 'env-dev',
      category: 'Environment',
      title: 'Switch to Development',
      action: () => { setActiveEnvironment('development'); setCommandPaletteOpen(false); },
    },
  ], [router, setActiveEnvironment, setCommandPaletteOpen]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) => c.title.toLowerCase().includes(lower) || c.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.70)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '120px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: tokens.colors.bg.surfaceRaised,
          border: `1px solid ${tokens.colors.border.strong}`,
          borderRadius: tokens.radius.lg,
          boxShadow: tokens.shadow.modal,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Input */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '14px', color: tokens.colors.text.muted }}>🔍</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tokens.colors.text.primary,
              fontSize: '14px',
              fontFamily: tokens.typography.fontFamily.sans,
            }}
          />
          <kbd
            style={{
              fontSize: '11px',
              backgroundColor: tokens.colors.bg.surface,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.xs,
              padding: '2px 6px',
              color: tokens.colors.text.muted,
              fontFamily: tokens.typography.fontFamily.mono,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px' }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: '13px' }}>
              No matching commands or resources found.
            </div>
          ) : (
            filteredCommands.map((item, idx) => (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: '9px 12px',
                  borderRadius: tokens.radius.sm,
                  backgroundColor: selectedIndex === idx ? tokens.colors.bg.surfaceHover : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: tokens.colors.text.muted, fontWeight: tokens.typography.weight.semibold, width: '75px' }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: '13px', color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
                    {item.title}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: tokens.colors.text.muted }}>↵</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
