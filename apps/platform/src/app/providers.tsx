'use client';

import React from 'react';
import { ThemeProvider, ToastProvider } from '@orbitox-io/ui';
import { AdminProvider } from './admin/data/admin-context';

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider initialThemeId="cosmic-obsidian">
      <ToastProvider>
        <AdminProvider>
          {children}
        </AdminProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
