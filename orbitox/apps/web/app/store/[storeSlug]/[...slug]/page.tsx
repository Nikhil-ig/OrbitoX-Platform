'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useCommerceStorefront } from '@orbitox/commerce';
import { StorefrontRenderer } from '@/components/storefront/storefront-renderer';
import Link from 'next/link';

export default function DynamicStorefrontSubpage() {
  const params = useParams();
  const rawStoreSlug = params?.storeSlug;
  const storeSlug: string = (Array.isArray(rawStoreSlug) ? rawStoreSlug[0] : rawStoreSlug) || 'aura-luxury';

  const rawSlug = params?.slug;
  const slugParts = Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug] : [];
  const pageSlug = '/' + slugParts.join('/');

  const { data, loading, error } = useCommerceStorefront(storeSlug, pageSlug);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
        <div style={{ fontSize: '18px', fontWeight: 800 }}>Loading Storefront...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#09090B',
          color: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '48px' }}>🔍</span>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Page Not Found</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '460px', margin: 0 }}>
          The page <code style={{ color: '#D4AF37' }}>{pageSlug}</code> does not exist or has not been published yet.
        </p>
        <Link
          href={`/store/${storeSlug}`}
          style={{
            marginTop: '12px',
            padding: '12px 24px',
            borderRadius: '8px',
            background: '#D4AF37',
            color: '#000',
            fontWeight: 800,
            textDecoration: 'none',
            fontSize: '13px',
          }}
        >
          Return to Store Homepage
        </Link>
      </div>
    );
  }

  return (
    <StorefrontRenderer
      storeSlug={storeSlug}
      storeId={data.store.id}
      storeName={data.store.name}
      theme={data.theme}
      sections={data.sections}
    />
  );
}
