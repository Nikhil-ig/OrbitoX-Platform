'use client';

import React from 'react';
import { AdminProvider } from './admin/data/admin-context';

export default function ConsoleGroupLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
