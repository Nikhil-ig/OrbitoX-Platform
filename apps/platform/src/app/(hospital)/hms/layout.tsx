'use client';

import React from 'react';
import { StaffAuthProvider } from './context/StaffAuthContext';

export default function HMSLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffAuthProvider>
      {children}
    </StaffAuthProvider>
  );
}
