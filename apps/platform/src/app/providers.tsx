'use client';

import React from 'react';
import { ToastProvider } from '@orbitox-io/ui';

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
