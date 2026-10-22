'use client';

import React, { useState } from 'react';
import {
  TemplateSchema,
  TemplateVersionRecord,
} from '../types/TemplateSchema';
import {
  History,
  GitBranch,
  CheckCircle2,
  RotateCcw,
  Plus,
  Rocket,
  ShieldAlert,
} from 'lucide-react';

interface VersionsPanelProps {
  schema: TemplateSchema;
  onCreateDraft: (version: string, changelog: string) => void;
  onRollback: (version: string) => void;
}

export function VersionsPanel({ schema, onCreateDraft, onRollback }: VersionsPanelProps) {
  const [showNewDraftModal, setShowNewDraftModal] = useState(false);
  const [newVersion, setNewVersion] = useState('1.1.0');
  const [newChangelog, setNewChangelog] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim()) return;
    onCreateDraft(newVersion.trim(), newChangelog.trim() || 'Incremental draft enhancements');
    setShowNewDraftModal(false);
    setNewChangelog('');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            Version Governance & History
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
            Never mutate live published templates in-place. Create versioned drafts, test changes thoroughly, and publish immutable releases to preserve backward compatibility for existing celebrations.
          </p>
        </div>

        <button
          onClick={() => setShowNewDraftModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #DFBA6B, #C29B47)',
            border: 'none',
            color: '#050B14',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          <span>New Version Draft</span>
        </button>
      </div>

      {/* Version Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {schema.versionHistory.map((ver, idx) => {
          const isCurrent = ver.version === schema.activeVersion;

          return (
            <div
              key={ver.version}
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: isCurrent ? 'rgba(223, 186, 107, 0.1)' : 'rgba(13, 20, 41, 0.5)',
                border: isCurrent ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <code style={{ fontSize: '0.95rem', fontWeight: 800, color: '#DFBA6B' }}>
                    v{ver.version}
                  </code>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: ver.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: ver.status === 'PUBLISHED' ? '#10B981' : '#FBBF24',
                      fontWeight: 800,
                    }}
                  >
                    {ver.status}
                  </span>
                  {isCurrent && (
                    <span style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 700 }}>
                      ● Active Template
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--cel-text-secondary, #CBD5E1)', margin: '0 0 6px 0' }}>
                  {ver.changeLog}
                </p>

                <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
                  Created by {ver.author} on {new Date(ver.createdAt).toLocaleDateString()}
                  {ver.publishedAt && ` • Published ${new Date(ver.publishedAt).toLocaleDateString()}`}
                </div>
              </div>

              {!isCurrent && (
                <button
                  onClick={() => onRollback(ver.version)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: '#CBD5E1',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Rollback to this</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: New Version Draft */}
      {showNewDraftModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#0D1429',
              border: '1px solid rgba(223, 186, 107, 0.3)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DFBA6B', margin: '0 0 16px 0' }}>
              Create New Version Draft
            </h3>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
                  Version Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1.2.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#070B16',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
                  Release Notes / Change Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what changes are introduced in this version..."
                  value={newChangelog}
                  onChange={(e) => setNewChangelog(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#070B16',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewDraftModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#CBD5E1',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #DFBA6B, #C29B47)',
                    border: 'none',
                    color: '#050B14',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Create Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
