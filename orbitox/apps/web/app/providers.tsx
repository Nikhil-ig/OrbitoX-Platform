'use client';

import React from 'react';
import { ThemeProvider } from '@orbitox/ui';
import { AdminProvider } from './admin/data/admin-context';

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider initialThemeId="cosmic-obsidian">
      <AdminProvider>
        {children}
      </AdminProvider>
    </ThemeProvider>
  );
}
