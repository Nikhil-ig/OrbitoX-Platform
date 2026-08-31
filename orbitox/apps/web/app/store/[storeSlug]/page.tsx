'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useCommerceStorefront } from '@orbitox/commerce';
import { StorefrontRenderer } from '@/components/storefront/storefront-renderer';

export default function StorefrontHomePage() {
  const params = useParams();
  const rawSlug = params?.storeSlug;
  const storeSlug: string = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || 'aura-luxury';

  const { data, loading } = useCommerceStorefront(storeSlug);

  if (loading || !data) return null;

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
