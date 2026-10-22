'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Heart, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border)',
        background: 'rgba(9, 9, 11, 0.98)',
        padding: '72px 0 36px 0',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '40px',
            marginBottom: '60px',
          }}
        >
          {/* Brand Col */}
          <div style={{ gridColumn: 'span 2' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #a78bfa 0%, #7c5cfc 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={16} color="#ffffff" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
                  OrbitoX
                </span>
                <span style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Celebrations
                </span>
              </div>
            </Link>

            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                maxWidth: '340px',
                marginBottom: '20px',
              }}
            >
              The definitive multi-sided SaaS platform for modern digital celebrations. Combining editorial aesthetics,
              seamless guest interactivity, and zero-trust multi-tenant security.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#10b981' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>OrbitoX Core Services 100% Operational</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ffffff', marginBottom: '16px' }}>
              Product
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <Link href="/explore" style={{ color: 'var(--color-text-secondary)' }}>Occasions Catalog</Link>
              <Link href="/themes" style={{ color: 'var(--color-text-secondary)' }}>Theme Worlds</Link>
              <Link href="/create" style={{ color: 'var(--color-text-secondary)' }}>Creation Studio</Link>
              <Link href="/e/vikram-ananya-wedding" target="_blank" style={{ color: 'var(--color-text-secondary)' }}>Guest Portal Demo</Link>
              <Link href="/pricing" style={{ color: 'var(--color-text-secondary)' }}>Pricing & Plans</Link>
            </div>
          </div>

          {/* Solutions Links */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ffffff', marginBottom: '16px' }}>
              Solutions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <Link href="/create" style={{ color: 'var(--color-text-secondary)' }}>Couples & Hosts (C2C)</Link>
              <Link href="/workspace" style={{ color: 'var(--color-text-secondary)' }}>Agency Workspace (B2B)</Link>
              <Link href="/platform" style={{ color: 'var(--color-text-secondary)' }}>Platform Operators</Link>
              <Link href="/dashboard" style={{ color: 'var(--color-text-secondary)' }}>Personal Dashboard</Link>
              <Link href="/workspace/clients" style={{ color: 'var(--color-text-secondary)' }}>Client CRM</Link>
            </div>
          </div>

          {/* Technology & Trust */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ffffff', marginBottom: '16px' }}>
              Architecture
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} color="#3b82f6" />
                Zero-Trust Kernel
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>Ed25519 Signatures</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>Custom Wildcard SSL</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>Apple Wallet Passes</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>AsyncLocalStorage Scoping</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div
          style={{
            paddingTop: '28px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.8rem',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <div>
            © {new Date().getFullYear()} OrbitoX Celebrations Platform. Built with @orbitox-io plugins & packages.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/pricing" style={{ color: 'var(--color-text-tertiary)' }}>Terms</Link>
            <Link href="/pricing" style={{ color: 'var(--color-text-tertiary)' }}>Privacy</Link>
            <Link href="/pricing" style={{ color: 'var(--color-text-tertiary)' }}>Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
