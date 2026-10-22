'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  OrbitoxLogo,
  BarChartIcon,
  CpuIcon,
  KeyIcon,
  SlidersIcon,
  ShieldCheckIcon,
  PackageIcon,
  GlobeIcon,
  ShoppingBagIcon,
  BriefcaseIcon,
  ZapIcon,
  RocketIcon,
} from './icons';

interface NavGroup {
  group: string;
  items: {
    label: string;
    path: string;
    icon: React.ReactNode;
    exact?: boolean;
    badge?: string;
  }[];
}

export function AdminSidebar() {
  const pathname = usePathname();

  const isNavActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  const navGroups: NavGroup[] = [
    {
      group: 'COMMAND',
      items: [
        { label: 'Platform Home', path: '/admin', icon: <BarChartIcon size={16} />, exact: true },
        { label: 'Activity Stream', path: '/admin/audit', icon: <ZapIcon size={16} /> },
      ],
    },
    {
      group: 'BUILD',
      items: [
        { label: 'External Projects', path: '/admin/projects', icon: <RocketIcon size={16} /> },
        { label: 'Project Factory (+ Create)', path: '/admin/projects/create', icon: <PackageIcon size={16} /> },
        { label: 'Plugin Registry', path: '/admin/marketplace', icon: <CpuIcon size={16} /> },
        { label: 'Central API Registry', path: '/admin/developer-apis', icon: <ZapIcon size={16} /> },
      ],
    },
    {
      group: 'COMMERCE',
      items: [
        { label: 'Plans & Pricing', path: '/admin/quotas', icon: <SlidersIcon size={16} /> },
        { label: 'API Key Studio', path: '/admin/api-keys', icon: <KeyIcon size={16} /> },
      ],
    },
    {
      group: 'GOVERN & SYSTEM',
      items: [
        { label: 'Security & Cryptography', path: '/admin/system', icon: <ShieldCheckIcon size={16} /> },
        { label: 'Platform Services', path: '/admin/services', icon: <CpuIcon size={16} /> },
      ],
    },
  ];

  return (
    <aside
      style={{
        width: '270px',
        minWidth: '270px',
        background: 'rgba(9, 12, 21, 0.98)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(30px)',
        userSelect: 'none',
      }}
    >
      {/* Platform Branding Header */}
      <div
        style={{
          padding: '22px 20px 16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <Link href="/admin" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #5865F2 0%, #FF7A1A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 0 16px rgba(88, 101, 242, 0.4)',
              }}
            >
              <OrbitoxLogo size={22} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                OrbitoX
              </div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#818CF8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginTop: '1px',
                }}
              >
                CONTROL PLANE OS
              </div>
            </div>
          </div>
        </Link>

        {/* Authoritative Indicator */}
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '5px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            color: '#10B981',
            fontWeight: 800,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }}
          />
          <span>Authoritative Control Plane</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {navGroups.map((grp) => (
          <div key={grp.group}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#64748B',
                padding: '0 10px 8px 10px',
              }}
            >
              {grp.group}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {grp.items.map((item) => {
                const active = isNavActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: active ? 700 : 500,
                      color: active ? '#FFFFFF' : '#94A3B8',
                      background: active
                        ? 'rgba(99, 102, 241, 0.16)'
                        : 'transparent',
                      border: active
                        ? '1px solid rgba(99, 102, 241, 0.35)'
                        : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '7px',
                          background: active ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: active ? '#818CF8' : '#94A3B8',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {active && (
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: '#FF7A1A',
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* External OS Runtime Fleet Link Footer */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(7, 10, 16, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Managed External Runtimes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <a
            href="http://localhost:4010"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 122, 26, 0.08)',
              border: '1px solid rgba(255, 122, 26, 0.2)',
              color: '#FF9533',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>RestaurantOS (:4010)</span>
            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 800 }}>● ONLINE ↗</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
