'use client';

import React, { Suspense, use } from 'react';
import { TemplateStudio } from '@/components/template-studio/TemplateStudio';

export default function TemplateSlugStudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#040711', color: '#DFBA6B', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(223, 186, 107, 0.2)', borderTopColor: '#DFBA6B', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#94A3B8' }}>
            Loading Template Schema...
          </span>
        </div>
      }
    >
      <TemplateStudio slug={resolvedParams.slug} />
    </Suspense>
  );
}
