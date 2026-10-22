'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Layers,
  Building2,
  Heart,
  ShieldAlert,
  Menu,
  X,
  ChevronRight,
  Plus,
  ExternalLink,
  Users,
  Palette,
  BarChart3,
  CreditCard,
  Settings,
} from 'lucide-react';
import { useEcosystem, UserRole } from '../../lib/ecosystem-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentRole } = useEcosystem();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dedicated guest celebration view (/e/...), Celebration Studio (/create), and OrbitoX Visual Studio (/admin/template-studio)
  const isCleanStudioOrGuestView =
    pathname?.startsWith('/e/') || pathname === '/create' || pathname?.startsWith('/create') || pathname?.startsWith('/admin/template-studio');
  if (isCleanStudioOrGuestView) {
    return <>{children}</>;
  }

  // Define nav links tailored to each persona
  const getNavLinks = (role: UserRole) => {
    switch (role) {
      case 'AGENCY_PLANNER':
        return [
          { label: 'Overview', href: '/workspace', active: pathname === '/workspace' },
          { label: 'Clients', href: '/workspace/clients', active: pathname === '/workspace/clients' },
          { label: 'Celebrations', href: '/workspace/celebrations', active: pathname === '/workspace/celebrations' },
          { label: 'Templates', href: '/workspace/templates', active: pathname === '/workspace/templates' },
          { label: 'Analytics', href: '/workspace/analytics', active: pathname === '/workspace/analytics' },
          { label: 'Billing', href: '/workspace/billing', active: pathname === '/workspace/billing' },
        ];
      case 'PLATFORM_ADMIN':
        return [
          { label: 'Platform Hub', href: '/platform', active: pathname === '/platform' },
          { label: 'Organizations', href: '/platform/organizations', active: pathname === '/platform/organizations' },
          { label: 'Template Catalog', href: '/platform/templates', active: pathname === '/platform/templates' },
          { label: 'Plans & Pricing', href: '/platform/plans', active: pathname === '/platform/plans' },
          { label: 'Usage & Quotas', href: '/platform/usage', active: pathname === '/platform/usage' },
        ];
      case 'HOST_CONSUMER':
        return [
          { label: 'My Celebration', href: '/dashboard', active: pathname === '/dashboard' },
          { label: 'Themes & Styles', href: '/themes', active: pathname === '/themes' },
          { label: 'Occasions', href: '/explore', active: pathname === '/explore' },
          { label: 'Upgrade Plan', href: '/pricing', active: pathname === '/pricing' },
        ];
      case 'GUEST':
      default:
        return [
          { label: 'Product', href: '/#features', active: false },
          { label: 'Occasions', href: '/explore', active: pathname === '/explore' },
          { label: 'Themes', href: '/themes', active: pathname === '/themes' },
          { label: 'Pricing', href: '/pricing', active: pathname === '/pricing' },
          { label: 'For Agencies', href: '/workspace', active: pathname?.startsWith('/workspace') },
        ];
    }
  };

  const navLinks = getNavLinks(currentRole);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'AGENCY_PLANNER':
        return {
          name: 'Agency Workspace',
          icon: <Building2 size={12} color="#60a5fa" />,
          color: '#60a5fa',
          bg: 'rgba(96, 165, 250, 0.12)',
          border: 'rgba(96, 165, 250, 0.25)',
        };
      case 'PLATFORM_ADMIN':
        return {
          name: 'Platform Admin',
          icon: <ShieldAlert size={12} color="#f59e0b" />,
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.25)',
        };
      case 'HOST_CONSUMER':
        return {
          name: 'Consumer Host',
          icon: <Heart size={12} color="#f472b6" />,
          color: '#f472b6',
          bg: 'rgba(244, 114, 182, 0.12)',
          border: 'rgba(244, 114, 182, 0.25)',
        };
      default:
        return {
          name: 'Public Visitor',
          icon: <Sparkles size={12} color="#c4b5fd" />,
          color: '#c4b5fd',
          bg: 'rgba(124, 92, 252, 0.12)',
          border: 'rgba(124, 92, 252, 0.25)',
        };
    }
  };

  const roleMeta = getRoleBadge(currentRole);

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background: 'rgba(9, 9, 11, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          className="container-wide"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '68px',
            gap: '24px',
          }}
        >
          {/* Logo & Platform Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #a78bfa 0%, #7c5cfc 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(124, 92, 252, 0.35)',
                }}
              >
                <Sparkles size={17} color="#ffffff" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
                  OrbitoX
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: 600,
                  }}
                >
                  Celebrations
                </span>
              </div>
            </Link>

            {/* Persona context pill in header */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 9px',
                borderRadius: '999px',
                background: roleMeta.bg,
                border: `1px solid ${roleMeta.border}`,
                color: roleMeta.color,
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
              className="desktop-only"
            >
              {roleMeta.icon}
              <span>{roleMeta.name}</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            className="desktop-only"
          >
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.86rem',
                  fontWeight: item.active ? 700 : 500,
                  color: item.active ? '#ffffff' : 'rgba(255, 255, 255, 0.68)',
                  background: item.active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentRole === 'AGENCY_PLANNER' ? (
              <Link
                href="/create"
                className="btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.84rem',
                  gap: '6px',
                }}
              >
                <Plus size={15} />
                <span>New Client Event</span>
              </Link>
            ) : currentRole === 'PLATFORM_ADMIN' ? (
              <Link
                href="/platform/organizations"
                className="btn-secondary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.84rem',
                  gap: '6px',
                }}
              >
                <Building2 size={15} />
                <span>Manage Tenants</span>
              </Link>
            ) : currentRole === 'HOST_CONSUMER' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  href="/create"
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.84rem',
                    gap: '6px',
                  }}
                >
                  <Plus size={15} />
                  <span>Create Celebration</span>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link
                  href="/dashboard"
                  className="btn-ghost desktop-only"
                  style={{ fontSize: '0.85rem' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/create"
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                  }}
                >
                  Get Started Free
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-only"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: '16px 20px 24px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(10, 10, 14, 0.98)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: roleMeta.bg,
                color: roleMeta.color,
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {roleMeta.icon}
              <span>Active Persona: {roleMeta.name}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.92rem',
                    fontWeight: item.active ? 700 : 500,
                    color: item.active ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                    background: item.active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{item.label}</span>
                  <ChevronRight size={15} color="rgba(255, 255, 255, 0.3)" />
                </Link>
              ))}
            </div>

            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Link
                href="/create"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Launch Creation Studio
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main>{children}</main>
    </>
  );
}
