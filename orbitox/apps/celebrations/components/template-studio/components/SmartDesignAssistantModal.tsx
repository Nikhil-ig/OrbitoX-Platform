'use client';

import React, { useState } from 'react';
import { Sparkles, Check, AlertTriangle, Info, X, ArrowRight, Eye } from 'lucide-react';
import { SmartDesignSuggestion } from '../services/SmartDesignAssistance';
import { TemplateEditorCommand } from '../engine/TemplateEditorCommands';

interface SmartDesignAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: SmartDesignSuggestion[];
  onSelectNode: (nodeId: string, sceneId: string) => void;
  dispatch: (command: TemplateEditorCommand) => void;
}

export function SmartDesignAssistantModal({
  isOpen,
  onClose,
  suggestions,
  onSelectNode,
  dispatch,
}: SmartDesignAssistantModalProps) {
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = (sug: SmartDesignSuggestion) => {
    dispatch(sug.fixCommand);
    setAppliedIds((prev) => new Set([...prev, sug.id]));
  };

  const getSeverityBadge = (severity: SmartDesignSuggestion['severity']) => {
    switch (severity) {
      case 'warning':
        return {
          icon: <AlertTriangle size={13} color="#F59E0B" />,
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          color: '#F59E0B',
          label: 'Warning',
        };
      case 'suggestion':
        return {
          icon: <Sparkles size={13} color="#DFBA6B" />,
          bg: 'rgba(223, 186, 107, 0.12)',
          border: 'rgba(223, 186, 107, 0.3)',
          color: '#DFBA6B',
          label: 'Design Suggestion',
        };
      case 'info':
      default:
        return {
          icon: <Info size={13} color="#38BDF8" />,
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.3)',
          color: '#38BDF8',
          label: 'Optimization',
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 7, 17, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#090D1A',
          border: '1px solid rgba(223, 186, 107, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(223, 186, 107, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(223, 186, 107, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(223, 186, 107, 0.35)',
              }}
            >
              <Sparkles size={16} color="#DFBA6B" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#DFBA6B' }}>
                Smart Design Assistant
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                Proactive intelligence for layout, alignment, typography, and performance
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <Check size={24} color="#10B981" />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#fff', fontWeight: 700 }}>
                Flawless Design Architecture
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                All safe areas, alignments, typography tokens, and motion budgets pass high-luxury criteria.
              </p>
            </div>
          ) : (
            suggestions.map((sug) => {
              const isApplied = appliedIds.has(sug.id);
              const badge = getSeverityBadge(sug.severity);
              const isPreview = previewingId === sug.id;

              return (
                <div
                  key={sug.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: isApplied ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: isApplied
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : isPreview
                      ? '1px solid #DFBA6B'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                        }}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                        {sug.title}
                      </h4>
                    </div>

                    {isApplied && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#10B981',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        <Check size={13} />
                        <span>Applied</span>
                      </span>
                    )}
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.5 }}>
                    {sug.description}
                  </p>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {sug.nodeId && (
                        <button
                          onClick={() => {
                            onSelectNode(sug.nodeId!, sug.sceneId);
                            onClose();
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#CBD5E1',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={12} />
                          <span>Inspect Node</span>
                        </button>
                      )}

                      <button
                        onClick={() => setPreviewingId(isPreview ? null : sug.id)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: isPreview ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: isPreview ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isPreview ? '#DFBA6B' : '#94A3B8',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isPreview ? 'Hide Preview' : 'Preview Fix'}
                      </button>
                    </div>

                    {!isApplied && (
                      <button
                        onClick={() => handleApply(sug)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          background: '#DFBA6B',
                          color: '#07090E',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 14px rgba(223, 186, 107, 0.25)',
                        }}
                      >
                        <span>Apply Fix</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>

                  {/* Preview Detail Expansion */}
                  {isPreview && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px dashed rgba(223, 186, 107, 0.4)',
                        fontSize: '0.72rem',
                        color: '#E2E8F0',
                      }}
                    >
                      <span style={{ color: '#DFBA6B', fontWeight: 700 }}>Previewed Action: </span>
                      <span>{sug.previewLabel}</span>
                      <pre style={{ margin: '6px 0 0 0', fontSize: '0.65rem', color: '#94A3B8', overflowX: 'auto' }}>
                        {JSON.stringify(sug.fixCommand, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.74rem',
            color: '#64748B',
          }}
        >
          <span>Non-destructive AI design guardrails • No silent overrides</span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
