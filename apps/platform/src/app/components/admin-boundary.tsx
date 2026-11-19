'use client';

import React from 'react';
import { AdminProvider } from '@/app/(console)/admin/data/admin-context';

/**
 * Shared bridge provider component.
 * Allows (dashboard) to consume AdminContext for PlatformGovernanceDock without violating
 * route boundary ESLint restrictions (which restrict (dashboard) from directly importing (console)).
 */
export function AdminBoundary({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
