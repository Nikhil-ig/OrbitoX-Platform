'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tokens } from './tokens';

interface NavItem {
  id: string;
  label: string;
  href: string;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'overview', label: 'Overview', href: '/platform' },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { id: 'projects', label: 'Projects', href: '/platform/projects' },
      { id: 'packages', label: 'Packages', href: '/platform/packages' },
      { id: 'access', label: 'Access', href: '/platform/api-keys' },
    ],
  },
  {
    title: 'GOVERNANCE',
    items: [
      { id: 'security', label: 'Security', href: '/platform/security' },
      { id: 'approvals', label: 'Approvals', href: '/platform/approvals', badge: '1', badgeColor: tokens.colors.status.warning },
      { id: 'audit', label: 'Audit', href: '/platform/audit' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { id: 'configuration', label: 'Configuration', href: '/platform/configuration' },
      { id: 'operations', label: 'Operations', href: '/platform/operations' },
      { id: 'observability', label: 'Observability', href: '/platform/observability' },
      { id: 'verification', label: 'Verification', href: '/platform/tests' },
    ],
  },

  {
    title: 'DEVELOPER',
    items: [
      { id: 'explorer', label: 'API Explorer', href: '/platform/explorer' },
      { id: 'ai', label: 'AI & MCP', href: '/platform/ai' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings', href: '/platform/settings' },
    ],
  },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const [operatorMenuOpen, setOperatorMenuOpen] = useState(false);

  return (
    <aside
      style={{
        width: '224px',
        backgroundColor: tokens.colors.bg.sidebar,
        borderRight: `1px solid ${tokens.colors.border.subtle}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* 1. Brand Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          height: '58px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: tokens.radius.xs,
            backgroundColor: '#161822',
            border: `1px solid ${tokens.colors.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.colors.text.primary,
            fontWeight: tokens.typography.weight.bold,
            fontSize: '11px',
            letterSpacing: '0.02em',
          }}
        >
          O
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: tokens.typography.weight.bold,
              color: tokens.colors.text.primary,
              letterSpacing: '0.06em',
              lineHeight: 1.2,
            }}
          >
            ORBITOX
          </span>
          <span
            style={{
              fontSize: '10px',
              color: tokens.colors.text.muted,
              lineHeight: 1.2,
              marginTop: '1px',
            }}
          >
            Control Center
          </span>
        </div>
      </div>

      {/* 2. Navigation Items */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {navSections.map((section) => (
          <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {section.title && (
              <div
                style={{
                  fontSize: tokens.typography.size.micro,
                  fontWeight: tokens.typography.weight.semibold,
                  color: tokens.colors.text.muted,
                  letterSpacing: '0.08em',
                  padding: '3px 8px 6px 8px',
                  textTransform: 'uppercase',
                }}
              >
                {section.title}
              </div>
            )}

            {section.items.map((item) => {
              const isActive =
                item.href === '/platform'
                  ? pathname === '/platform'
                  : pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    position: 'relative',
                    padding: '6px 10px',
                    borderRadius: tokens.radius.xs,
                    fontSize: tokens.typography.size.base,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: isActive ? tokens.colors.text.primary : tokens.colors.text.secondary,
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.035)' : 'transparent',
                    fontWeight: isActive ? tokens.typography.weight.medium : tokens.typography.weight.regular,
                    transition: 'all 0.12s ease',
                  }}
                >
                  {/* Subtle left accent marker */}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '5px',
                        bottom: '5px',
                        width: '2px',
                        borderRadius: '1px',
                        backgroundColor: tokens.colors.accent.primary,
                      }}
                    />
                  )}

                  <span style={{ paddingLeft: isActive ? '4px' : '0px', transition: 'padding 0.12s ease' }}>
                    {item.label}
                  </span>

                  {item.badge && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: tokens.typography.weight.semibold,
                        padding: '1px 5px',
                        borderRadius: tokens.radius.xs,
                        backgroundColor: item.badgeColor ? `${item.badgeColor}18` : 'rgba(255,255,255,0.06)',
                        color: item.badgeColor || tokens.colors.text.secondary,
                        border: `1px solid ${item.badgeColor ? `${item.badgeColor}33` : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 3. Compact Operator Section at Bottom */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: `1px solid ${tokens.colors.border.subtle}`,
          position: 'relative',
        }}
      >
        <div
          onClick={() => setOperatorMenuOpen(!operatorMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 8px',
            borderRadius: tokens.radius.xs,
            cursor: 'pointer',
            backgroundColor: operatorMenuOpen ? tokens.colors.bg.surfaceRaised : 'transparent',
            transition: 'background-color 0.12s ease',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: tokens.radius.full,
              backgroundColor: '#1E212B',
              border: `1px solid ${tokens.colors.border.default}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: tokens.typography.weight.bold,
              color: tokens.colors.text.primary,
            }}
          >
            N
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: tokens.typography.weight.medium,
                color: tokens.colors.text.primary,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Nikhil
            </span>
            <span
              style={{
                fontSize: '10px',
                color: tokens.colors.text.muted,
                lineHeight: 1.2,
                marginTop: '1px',
              }}
            >
              SuperAdmin · Prod
            </span>
          </div>

          <span style={{ fontSize: '9px', color: tokens.colors.text.muted }}>
            {operatorMenuOpen ? '▴' : '▾'}
          </span>
        </div>

        {/* Popover Menu */}
        {operatorMenuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '56px',
              left: '12px',
              right: '12px',
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.strong}`,
              borderRadius: tokens.radius.md,
              boxShadow: tokens.shadow.modal,
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              zIndex: 50,
            }}
          >
            {[
              { label: 'Profile', action: () => setOperatorMenuOpen(false) },
              { label: 'Role & Capabilities', action: () => setOperatorMenuOpen(false) },
              { label: 'Security & Keys', action: () => setOperatorMenuOpen(false) },
              { label: 'Active Session', action: () => setOperatorMenuOpen(false) },
              { label: 'Sign out', action: () => setOperatorMenuOpen(false), danger: true },
            ].map((entry) => (
              <div
                key={entry.label}
                onClick={entry.action}
                style={{
                  padding: '7px 10px',
                  borderRadius: tokens.radius.xs,
                  fontSize: tokens.typography.size.sm,
                  color: entry.danger ? tokens.colors.status.danger : tokens.colors.text.primary,
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                }}
              >
                {entry.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
