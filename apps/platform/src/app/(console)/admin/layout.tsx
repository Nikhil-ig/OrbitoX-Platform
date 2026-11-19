'use client';

import * as React from 'react';
import { AdminProvider } from './data/admin-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
