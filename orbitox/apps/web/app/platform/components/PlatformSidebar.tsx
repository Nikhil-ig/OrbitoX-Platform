'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlatform } from './PlatformContext';
import { useTheme } from '@orbitox/ui';
import styles from './sidebar.module.css';

interface NavItem {
  id: string;
  label: string;
  href: string;
  badge?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Control Plane',
    items: [
      { id: 'overview', label: 'Overview', href: '/platform' },
      { id: 'fleet', label: 'Fleet', href: '/platform/fleet' },
      { id: 'connect', label: 'Connect Project', href: '/platform/connect' },
    ],
  },
  {
    title: 'System & Security',
    items: [
      { id: 'settings', label: 'Settings', href: '/platform/settings' },
      { id: 'security', label: 'Security', href: '/platform/security' },
      { id: 'audit', label: 'Audit Trail', href: '/platform/audit' },
      { id: 'explorer', label: 'API Explorer', href: '/platform/explorer' },
    ],
  },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const { mobileSidebarOpen, setMobileSidebarOpen } = usePlatform();
  const { themeMode, toggleThemeMode } = useTheme();

  const handleLinkClick = () => {
    if (mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarOpen : ''}`} aria-label="Sidebar navigation">
        {/* Brand Header */}
        <div className={styles.header}>
          <Link href="/platform" className={styles.brand} onClick={handleLinkClick}>
            <div className={styles.brandIcon}>🪐</div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>ORBITOX</span>
              <span className={styles.brandSub}>Control Plane</span>
            </div>
          </Link>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={styles.nav}>
          {navSections.map((section) => (
            <div key={section.title} className={styles.section}>
              {section.title && <div className={styles.sectionTitle}>{section.title}</div>}

              {section.items.map((item) => {
                const isActive =
                  item.href === '/platform'
                    ? pathname === '/platform'
                    : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  >
                    {isActive && <span className={styles.activeIndicator} />}
                    <span>{item.label}</span>
                    {item.badge && <span className={styles.badge}>{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer with Theme Toggle and Operator Profile */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleThemeMode}
            aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span>{themeMode === 'dark' ? '🌙 Dark mode' : '☀️ Light mode'}</span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>Toggle</span>
          </button>

          <div className={styles.userCard}>
            <div className={styles.avatar}>A</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>Administrator</span>
              <span className={styles.userRole}>Control Operator</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
