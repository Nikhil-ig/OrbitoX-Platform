'use client';

import React from 'react';
import Link from 'next/link';

interface PluginComingSoonProps {
  pluginId: string;
  name: string;
}

export function PluginComingSoon({ pluginId, name }: PluginComingSoonProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#07080D',
        color: '#FFFFFF',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'linear-gradient(180deg, rgba(19, 24, 46, 0.85) 0%, rgba(13, 17, 34, 0.95) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '160px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(0, 0, 0, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.28)',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#F87171',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#F87171',
              boxShadow: '0 0 8px #F87171',
            }}
          />
          Architecture Modernization in Progress
        </div>

        {/* Plugin Title */}
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              margin: '0 0 10px 0',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {name}
          </h1>
          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#94A3B8',
              margin: 0,
              maxWidth: '540px',
            }}
          >
            Sample-data and in-memory runtimes have been completely purged from the production
            control plane. This plugin is undergoing rebuild to the <strong>HospitalOS multi-tenant standard</strong>.
          </p>
        </div>

        {/* Standards Grid */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            margin: '8px 0',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phase 2b-5
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
              Demo Data Purged
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Zero literal seed arrays in production
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phase 3
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
              Signed Grants
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Ed25519 verified entitlement tokens
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#A855F7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phase 4
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
              PostgreSQL RLS
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Dedicated schema & zero-leak guarantee
            </div>
          </div>
        </div>

        {/* Action Link */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          <Link
            href="/admin"
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
            }}
          >
            Return to Admin OS
          </Link>
          <Link
            href="/platform"
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94A3B8',
              fontSize: '12.5px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Platform Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
