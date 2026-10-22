'use client';

import React, { useState } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function PlatformSettingsPage() {
  const { clusterMode, toggleClusterMode, operator } = usePlatform();
  const [rateLimitPolicy, setRateLimitPolicy] = useState('10000');
  const [replayWindowSeconds, setReplayWindowSeconds] = useState('300');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '780px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
          Platform Settings
        </h1>
        <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
          Root mesh configuration, operator access, and global rate limit policies.
        </p>
      </div>

      {saved && (
        <div style={{ padding: '10px 14px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.status.healthySubtle, border: `1px solid ${tokens.colors.status.healthy}`, color: tokens.colors.status.healthy, fontSize: tokens.typography.size.base }}>
          Settings saved successfully.
        </div>
      )}

      {/* Cluster Mode */}
      <div style={{ backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}`, borderRadius: tokens.radius.md, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: tokens.typography.size.base, fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
              Cluster Deployment Topology
            </div>
            <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginTop: '2px' }}>
              Current mode: <span style={{ color: tokens.colors.accent.brand, textTransform: 'capitalize' }}>{clusterMode}</span>
            </div>
          </div>
          <button
            onClick={toggleClusterMode}
            style={{
              padding: '6px 12px',
              borderRadius: tokens.radius.sm,
              backgroundColor: tokens.colors.bg.surfaceHover,
              border: `1px solid ${tokens.colors.border.default}`,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.xs,
              cursor: 'pointer',
            }}
          >
            Toggle to {clusterMode === 'standalone' ? 'Distributed' : 'Standalone'}
          </button>
        </div>
      </div>

      {/* Global Policies Form */}
      <form onSubmit={handleSave} style={{ backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}`, borderRadius: tokens.radius.md, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: tokens.typography.size.base, fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
          Perimeter Policies
        </div>

        <div>
          <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
            Default Key Rate Limit (requests / min)
          </label>
          <input
            type="number"
            value={rateLimitPolicy}
            onChange={(e) => setRateLimitPolicy(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: tokens.colors.bg.input,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.base,
              fontFamily: tokens.typography.fontFamily.mono,
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
            Replay Attack Clock Drift Tolerance (seconds)
          </label>
          <input
            type="number"
            value={replayWindowSeconds}
            onChange={(e) => setReplayWindowSeconds(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: tokens.colors.bg.input,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.base,
              fontFamily: tokens.typography.fontFamily.mono,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="submit"
            style={{
              padding: '7px 14px',
              borderRadius: tokens.radius.sm,
              backgroundColor: tokens.colors.text.primary,
              color: tokens.colors.text.inverted,
              fontWeight: tokens.typography.weight.semibold,
              fontSize: tokens.typography.size.base,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
