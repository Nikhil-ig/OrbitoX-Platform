'use client';

import React from 'react';
import Link from 'next/link';

export default function RestaurantAdminRedirectPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#090C15', color: '#F8FAFC', padding: 40, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 40 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 122, 26, 0.1)', border: '1px solid rgba(255, 122, 26, 0.3)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 800, color: '#FF7A1A', marginBottom: 20 }}>
          <span>DECOUPLED ARCHITECTURE BOUNDARY</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
          RestaurantOS is an Independent Runtime Product
        </h1>

        <p style={{ fontSize: 15, color: '#94A3B8', lineHeight: 1.6, marginBottom: 32 }}>
          Per the OrbitoX Platform architecture, restaurant operational workflows (Floor Canvas, Touch KDS, and Diner Mobile PWA) are maintained in the decoupled external project located at <code>projects/external-os/restaurant-os</code>, executing independently on port <strong>4010</strong>.
          <br /><br />
          OrbitoX Platform operates purely as the <strong>Authoritative Control Plane</strong>. You can govern desired-state configuration, revisions, plugins, APIs, plans, and commands from the Project Control Center.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link
            href="/admin/projects/project_restaurant_os"
            style={{
              padding: '12px 24px',
              background: '#5865F2',
              color: '#fff',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Open Project Control Center →
          </Link>

          <a
            href="http://localhost:4010"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '12px 24px',
              background: 'rgba(255, 122, 26, 0.15)',
              border: '1px solid rgba(255, 122, 26, 0.4)',
              color: '#FF9533',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Launch Standalone Runtime (Port 4010) ↗
          </a>
        </div>
      </div>
    </div>
  );
}
