'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEcosystem, UserRole } from '../../lib/ecosystem-context';
import { useResponsiveDevice } from '../../hooks/useResponsiveDevice';
import {
  ShieldAlert,
  Building2,
  Heart,
  Mail,
  ChevronDown,
  ChevronUp,
  Sliders,
  Layers,
  Sparkles,
  ExternalLink,
  RotateCcw,
  X,
} from 'lucide-react';

export function RoleSwitcherDock() {
  const { currentRole, setRole, visibleTemplates, templates, hostCelebration, resetEcosystemDefaults } =
    useEcosystem();
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const { isMobile } = useResponsiveDevice();

  // Hide dock on immersive guest celebration view, creation studio, and OrbitoX Visual Studio
  const isStudioOrGuest = pathname?.startsWith('/e/') || pathname === '/create' || pathname?.startsWith('/create') || pathname?.startsWith('/admin/template-studio');

  // Listen to global open event triggered from mobile header or bottom nav
  useEffect(() => {
    const handleOpen = () => setIsExpanded(true);
    const handleToggle = () => setIsExpanded((prev) => !prev);
    window.addEventListener('orbitox-open-role-switcher', handleOpen);
    window.addEventListener('orbitox-toggle-role-switcher', handleToggle);
    return () => {
      window.removeEventListener('orbitox-open-role-switcher', handleOpen);
      window.removeEventListener('orbitox-toggle-role-switcher', handleToggle);
    };
  }, []);

  if (isStudioOrGuest) return null;

  const ROLES_CONFIG: {
    id: UserRole;
    label: string;
    badge: string;
    description: string;
    icon: React.ReactNode;
    primaryActionLabel: string;
    primaryActionHref: string;
  }[] = [
    {
      id: 'PLATFORM_ADMIN',
      label: 'Platform Admin',
      badge: 'Super Governance',
      description: 'Show/hide templates, set per-template pricing, configure free trials & subscriptions',
      icon: <ShieldAlert size={16} color="#DFBA6B" />,
      primaryActionLabel: 'Platform Governance Studio',
      primaryActionHref: '/platform',
    },
    {
      id: 'AGENCY_PLANNER',
      label: 'O2O2B Agency Planner',
      badge: 'Atelier Portfolio',
      description: 'Multi-client weddings, wholesale template rates, offline door staff QR check-in',
      icon: <Building2 size={16} color="#60A5FA" />,
      primaryActionLabel: 'Agency Atelier Cockpit',
      primaryActionHref: '/workspace',
    },
    {
      id: 'HOST_CONSUMER',
      label: 'C2C Host / Couple',
      badge: 'Consumer Host',
      description: 'Direct self-serve celebration creation, free trial pass, guest list & Shagun tracker',
      icon: <Heart size={16} color="#F472B6" />,
      primaryActionLabel: 'My Celebration Hub',
      primaryActionHref: '/dashboard',
    },
    {
      id: 'GUEST',
      label: 'Invited Guest',
      badge: 'Guest Experience',
      description: 'Cinematic 3D invitation viewer, interactive RSVP, venue radar & dietary response',
      icon: <Mail size={16} color="#34D399" />,
      primaryActionLabel: 'Live Celebration Demo',
      primaryActionHref: '/e/royal-wedding-demo',
    },
  ];

  const activeConfig = (ROLES_CONFIG.find((r) => r.id === currentRole) || ROLES_CONFIG[0])!;
  const hiddenCount = templates.length - visibleTemplates.length;

  const roleSelectionContent = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {ROLES_CONFIG.map((role) => {
          const isSelected = currentRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => {
                setRole(role.id);
                if (isMobile) setIsExpanded(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(223, 186, 107, 0.18), rgba(223, 186, 107, 0.06))'
                  : 'rgba(255, 255, 255, 0.02)',
                border: isSelected
                  ? '1px solid rgba(223, 186, 107, 0.45)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  background: isSelected ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {role.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.82)',
                    }}
                  >
                    {role.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.64rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isSelected ? 'rgba(223, 186, 107, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                      color: isSelected ? 'var(--cel-gold-light)' : 'rgba(255, 255, 255, 0.5)',
                      fontWeight: 700,
                    }}
                  >
                    {role.badge}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.74rem',
                    color: 'rgba(255, 255, 255, 0.52)',
                    margin: 0,
                    lineHeight: 1.35,
                  }}
                >
                  {role.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Context Action */}
      <div
        style={{
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <Link
          href={activeConfig.primaryActionHref}
          onClick={() => setIsExpanded(false)}
          className="btn-maison-primary"
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '0.82rem',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          <span>{activeConfig.primaryActionLabel}</span>
          <ExternalLink size={13} />
        </Link>

        <button
          onClick={() => {
            resetEcosystemDefaults();
            setIsExpanded(false);
          }}
          title="Reset Ecosystem Defaults"
          style={{
            padding: '10px 12px',
            borderRadius: '9px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
          }}
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>
    </>
  );

  // 1. Mobile Experience: Native Slide-up Bottom Sheet Modal
  if (isMobile) {
    if (!isExpanded) return null; // Triggered from bottom nav or top status pill

    return (
      <div
        className="mobile-bottom-sheet-backdrop"
        onClick={() => setIsExpanded(false)}
      >
        <div
          className="mobile-bottom-sheet-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bottom-sheet-drag-handle" />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#DFBA6B" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Switch Workspace Persona
              </h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {roleSelectionContent}
        </div>
      </div>
    );
  }

  // 2. Desktop & Tablet Experience: Sleek Floating Glass Pill Dock
  return (
    <aside
      aria-label="Ecosystem Persona Controller"
      className="desktop-and-tablet"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Expanded Persona Switcher Modal / Tray */}
      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '56px',
            left: '0',
            width: '380px',
            maxWidth: 'calc(100vw - 48px)',
            background: 'rgba(9, 13, 23, 0.96)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(223, 186, 107, 0.3)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(223, 186, 107, 0.15)',
            marginBottom: '10px',
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#DFBA6B" />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.2px' }}>
                Role & Ecosystem Switcher
              </span>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                color: 'var(--cel-gold)',
                background: 'rgba(223, 186, 107, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              LIVE MESH
            </span>
          </div>

          {roleSelectionContent}
        </div>
      )}

      {/* Persistent Dock Trigger Pill */}
      <button
        id="persona-dock-trigger-button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px 8px 10px',
          background: 'rgba(9, 13, 23, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(223, 186, 107, 0.35)',
          borderRadius: '9999px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(223, 186, 107, 0.12)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F5E5C9, #DFBA6B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#07090E',
            boxShadow: '0 0 10px rgba(223, 186, 107, 0.4)',
          }}
        >
          {activeConfig.icon}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>
              {activeConfig.label}
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                color: 'var(--cel-gold)',
                background: 'rgba(223, 186, 107, 0.15)',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              {activeConfig.badge}
            </span>
          </div>
        </div>

        <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginLeft: '2px' }}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>
    </aside>
  );
}
