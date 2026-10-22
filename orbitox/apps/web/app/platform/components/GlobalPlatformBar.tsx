'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePlatform, EnvironmentType } from './PlatformContext';
import { tokens } from './tokens';

export function GlobalPlatformBar() {
  const pathname = usePathname();
  const {
    activeEnvironment,
    setActiveEnvironment,
    setCommandPaletteOpen,
  } = usePlatform();

  const [envMenuOpen, setEnvMenuOpen] = useState(false);
  const [hasNotifications] = useState(true);

  // Generate clean breadcrumb
  const formatBreadcrumb = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return ['Platform', 'Overview'];
    return [
      'Platform',
      ...parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' ')),
    ];
  };

  const breadcrumbs = formatBreadcrumb();

  return (
    <header
      style={{
        height: '58px',
        backgroundColor: tokens.colors.bg.canvas,
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Left: Minimal Editorial Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: tokens.typography.size.base }}>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <span
              style={{
                color: idx === breadcrumbs.length - 1 ? tokens.colors.text.primary : tokens.colors.text.muted,
                fontWeight: idx === breadcrumbs.length - 1 ? tokens.typography.weight.medium : tokens.typography.weight.regular,
                letterSpacing: '-0.01em',
              }}
            >
              {crumb}
            </span>
            {idx < breadcrumbs.length - 1 && (
              <span style={{ color: tokens.colors.text.muted, fontSize: '11px', opacity: 0.6 }}>/</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 2. Center: Refined Application Search (Command-K) */}
      <div
        onClick={() => setCommandPaletteOpen(true)}
        style={{
          width: '320px',
          height: '32px',
          backgroundColor: tokens.colors.bg.input,
          border: `1px solid ${tokens.colors.border.default}`,
          borderRadius: tokens.radius.sm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          cursor: 'pointer',
          color: tokens.colors.text.muted,
          fontSize: tokens.typography.size.sm,
          transition: 'border-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Outline Vector Search Icon */}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: tokens.colors.text.muted }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ color: tokens.colors.text.muted, fontSize: tokens.typography.size.sm }}>
            Search projects, keys, packages...
          </span>
        </div>

        <kbd
          style={{
            fontSize: tokens.typography.size.micro,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${tokens.colors.border.subtle}`,
            padding: '1px 5px',
            borderRadius: tokens.radius.xs,
            color: tokens.colors.text.secondary,
            fontFamily: tokens.typography.fontFamily.mono,
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* 3. Right: Environment Selector & Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Environment Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setEnvMenuOpen(!envMenuOpen)}
            style={{
              height: '28px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.xs,
              padding: '0 9px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.sm,
              fontWeight: tokens.typography.weight.medium,
              cursor: 'pointer',
              transition: 'background-color 0.12s ease',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor:
                  activeEnvironment === 'production'
                    ? tokens.colors.status.healthy
                    : activeEnvironment === 'staging'
                    ? tokens.colors.status.warning
                    : tokens.colors.status.info,
              }}
            />
            <span style={{ textTransform: 'capitalize' }}>{activeEnvironment}</span>
            <span style={{ fontSize: '9px', color: tokens.colors.text.muted, marginLeft: '2px' }}>▾</span>
          </button>

          {envMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '34px',
                right: 0,
                width: '144px',
                backgroundColor: tokens.colors.bg.surfaceRaised,
                border: `1px solid ${tokens.colors.border.strong}`,
                borderRadius: tokens.radius.sm,
                boxShadow: tokens.shadow.modal,
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1px',
                zIndex: 50,
              }}
            >
              {(['production', 'staging', 'development'] as EnvironmentType[]).map((env) => (
                <div
                  key={env}
                  onClick={() => {
                    setActiveEnvironment(env);
                    setEnvMenuOpen(false);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: tokens.radius.xs,
                    fontSize: tokens.typography.size.sm,
                    color: activeEnvironment === env ? tokens.colors.text.primary : tokens.colors.text.secondary,
                    backgroundColor: activeEnvironment === env ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textTransform: 'capitalize',
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor:
                        env === 'production'
                          ? tokens.colors.status.healthy
                          : env === 'staging'
                          ? tokens.colors.status.warning
                          : tokens.colors.status.info,
                    }}
                  />
                  <span>{env}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <div
          style={{
            position: 'relative',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.colors.text.secondary,
            padding: '4px',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {hasNotifications && (
            <span
              style={{
                position: 'absolute',
                top: '3px',
                right: '3px',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: tokens.colors.status.warning,
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
