'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlatform } from './PlatformContext';
import { useTheme } from '@orbitox/ui';
import styles from './globalbar.module.css';

export function GlobalPlatformBar() {
  const pathname = usePathname();
  const { setCommandPaletteOpen, toggleMobileSidebar } = usePlatform();
  const { themeMode, toggleThemeMode } = useTheme();

  // Generate clean breadcrumbs
  const formatBreadcrumb = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return [{ label: 'Overview', href: '/platform' }];
    const crumbs = [{ label: 'Platform', href: '/platform' }];
    let curr = '/platform';
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]!;
      curr += `/${part}`;
      const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      crumbs.push({ label, href: curr });
    }
    return crumbs;
  };

  const breadcrumbs = formatBreadcrumb();

  return (
    <header className={styles.bar}>
      {/* Left: Mobile hamburger menu & Breadcrumbs */}
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={toggleMobileSidebar}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.href}>
                {isLast ? (
                  <span className={styles.crumbActive} aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className={styles.crumbLink}>
                    {crumb.label}
                  </Link>
                )}
                {!isLast && <span className={styles.sep}>/</span>}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Search button (⌘K) & Theme Toggle */}
      <div className={styles.right}>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className={styles.searchBtn}
          aria-label="Quick search (Command-K)"
        >
          <div className={styles.searchInner}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search fleet, commands, settings…</span>
          </div>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleThemeMode}
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}
