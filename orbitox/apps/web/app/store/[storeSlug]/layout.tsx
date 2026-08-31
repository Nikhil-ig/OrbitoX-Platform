'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCommerceStorefront } from '@orbitox/commerce';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const rawSlug = params?.storeSlug;
  const storeSlug: string = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || 'punjabi-jutti';

  const { data, loading, error } = useCommerceStorefront(storeSlug);

  useEffect(() => {
    if (!data?.cssVariablesStyleString) return;
    let styleEl = document.getElementById('orb-dynamic-theme-vars') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'orb-dynamic-theme-vars';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = data.cssVariablesStyleString;
  }, [data?.cssVariablesStyleString]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '32px' }}>⏳</div>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.05em' }}>RESOLVING STOREFRONT CONFIGURATION...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Store Not Found</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            The requested store domain or slug <code>{storeSlug}</code> could not be resolved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--orb-bg, #0D0D0E)' }}>
      {children}
    </div>
  );
}
