'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const StudioShell = dynamic(
  () => import('@/components/studio-zero').then((mod) => mod.StudioShell),
  { ssr: false }
);

export default function TemplateStudioPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0C0D10',
            color: '#F3F4F6',
            gap: '16px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#3B82F6',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span
            style={{
              fontSize: '0.74rem',
              fontFamily: 'monospace',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#9CA3AF',
            }}
          >
            Initializing OrbitoX Visual Studio Zero...
          </span>
        </div>
      }
    >
      <StudioShell />
    </Suspense>
  );
}
