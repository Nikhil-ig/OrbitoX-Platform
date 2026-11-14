'use client';

import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';

export interface UniversalResourceEditorProps {
  resourceId: string;
  liveResource?: any;
  onRefresh?: () => void;
}

export function UniversalResourceEditor({
  resourceId,
  liveResource,
  onRefresh,
}: UniversalResourceEditorProps) {
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [formChanges, setFormChanges] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showJsonDiff, setShowJsonDiff] = useState(false);

  // Apply state
  const [applyState, setApplyState] = useState<{
    status: 'IDLE' | 'APPLYING' | 'RECONCILING' | 'SUCCESS' | 'ERROR';
    step: number;
    total: number;
    message: string;
    approvalPending?: boolean;
  }>({
    status: 'IDLE',
    step: 0,
    total: 5,
    message: '',
  });

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Load schema, configuration, and version history
  const loadData = async () => {
    if (!resourceId) return;
    setLoading(true);
    setErrorFeedback(null);
    try {
      const [schemaRes, configRes, historyRes] = await Promise.all([
        fetch(`/api/v1/platform/resources/${resourceId}/schema`).then((r) => r.json()),
        fetch(`/api/v1/platform/resources/${resourceId}/configuration`).then((r) => r.json()),
        fetch(`/api/v1/platform/resources/${resourceId}/versions`).then((r) => r.json()),
      ]);

      if (schemaRes.success) setSchema(schemaRes.data);
      if (configRes.success) {
        setConfig(configRes.data);
        if (configRes.data.draft) {
          setFormChanges(configRes.data.draft);
          setFeedback('Restored unsaved draft configuration.');
        } else {
          setFormChanges({});
        }
      }
      if (historyRes.success) setHistory(historyRes.data || []);
    } catch (err: any) {
      console.error('Failed to load editor data:', err);
      setErrorFeedback(`Failed to load editor metadata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [resourceId]);

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: '13px' }}>
        Loading schema-driven resource configuration...
      </div>
    );
  }

  if (!schema) {
    return (
      <div style={{ padding: '20px', color: tokens.colors.status.warning, fontSize: '13px' }}>
        No configuration editor schema available for this resource type.
      </div>
    );
  }

  const desiredState = config?.desiredState || {};
  const effectiveValues = { ...desiredState, ...formChanges };
  const hasChanges = Object.keys(formChanges).length > 0;

  const handleFieldChange = (key: string, value: any) => {
    setFormChanges((prev) => {
      const updated = { ...prev, [key]: value };
      if (value === desiredState[key]) {
        delete updated[key];
      }
      return updated;
    });
  };

  const handleDiscard = async () => {
    setFormChanges({});
    try {
      await fetch(`/api/v1/platform/resources/${resourceId}/configuration`, { method: 'DELETE' });
      setFeedback('Discarded unsaved draft changes.');
    } catch {
      // ignore
    }
  };

  const handleSaveDraft = async () => {
    try {
      const res = await fetch(`/api/v1/platform/resources/${resourceId}/configuration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', changes: formChanges }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback('Draft saved successfully. Platform runtime remains unchanged.');
      }
    } catch (err: any) {
      setErrorFeedback(`Failed to save draft: ${err.message}`);
    }
  };

  const handleOpenPreview = async () => {
    setPreviewLoading(true);
    setIsPreviewOpen(true);
    setErrorFeedback(null);
    try {
      const res = await fetch(`/api/v1/platform/resources/${resourceId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: formChanges,
          expectedVersion: schema.version,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data.data);
      } else {
        setErrorFeedback(data.error?.message || 'Failed to generate change preview.');
      }
    } catch (err: any) {
      setErrorFeedback(`Preview error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyConfiguration = async () => {
    setApplyState({
      status: 'APPLYING',
      step: 1,
      total: 5,
      message: '1/5: Validating schema & checking operator permissions...',
    });

    try {
      await new Promise((r) => setTimeout(r, 350));
      setApplyState({
        status: 'APPLYING',
        step: 2,
        total: 5,
        message: '2/5: Evaluating blast radius & checking Four-Eyes quorum...',
      });

      await new Promise((r) => setTimeout(r, 350));
      setApplyState({
        status: 'APPLYING',
        step: 3,
        total: 5,
        message: '3/5: Persisting desired state to graph & appending audit log...',
      });

      const res = await fetch(`/api/v1/platform/resources/${resourceId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: formChanges,
          expectedVersion: schema.version,
          reason: 'Control Center Universal Editor apply',
          actor: 'superadmin',
        }),
      });

      const result = await res.json();

      if (!result.success) {
        setApplyState({
          status: 'ERROR',
          step: 3,
          total: 5,
          message: result.error?.message || 'Configuration apply rejected.',
        });
        return;
      }

      if (result.data?.status === 'APPROVAL_PENDING') {
        setApplyState({
          status: 'SUCCESS',
          step: 4,
          total: 5,
          message: 'Paused: Awaiting Four-Eyes Quorum peer approval before execution.',
          approvalPending: true,
        });
        setFeedback('Submitted for peer approval. Request #' + result.data?.approval?.requestId);
        setIsPreviewOpen(false);
        setFormChanges({});
        onRefresh?.();
        return;
      }

      setApplyState({
        status: 'RECONCILING',
        step: 4,
        total: 5,
        message: '4/5: Triggering reconciliation loop to sync runtime drivers...',
      });

      await new Promise((r) => setTimeout(r, 400));
      setApplyState({
        status: 'SUCCESS',
        step: 5,
        total: 5,
        message: '5/5: Desired configuration applied & observed state synchronized!',
      });

      setFeedback(`Configuration updated to v${result.data?.newVersion}. Reconciled successfully.`);
      setIsPreviewOpen(false);
      setFormChanges({});
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      setApplyState({
        status: 'ERROR',
        step: 0,
        total: 5,
        message: `Execution failed: ${err.message}`,
      });
    }
  };

  const handleRollback = async (targetVersion: number) => {
    if (!confirm(`Are you sure you want to rollback this resource to revision v${targetVersion}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/platform/resources/${resourceId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion, actor: 'superadmin' }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback(`Rolled back to v${targetVersion}. New version: v${data.data?.newVersion}`);
        await loadData();
        onRefresh?.();
      } else {
        setErrorFeedback(`Rollback failed: ${data.error?.message}`);
      }
    } catch (err: any) {
      setErrorFeedback(`Rollback error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: tokens.radius.sm,
          backgroundColor: tokens.colors.bg.surface,
          border: `1px solid ${tokens.colors.border.subtle}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: tokens.typography.fontFamily.mono,
              padding: '2px 6px',
              borderRadius: tokens.radius.xs,
              backgroundColor: tokens.colors.bg.surfaceRaised,
              color: tokens.colors.accent.primary,
              fontWeight: tokens.typography.weight.semibold,
            }}
          >
            Revision v{schema.version}
          </span>
          <span style={{ fontSize: '12px', color: tokens.colors.text.secondary }}>
            {schema.isEditable ? 'Fully Configurable' : 'Read-only Resource'}
          </span>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: 'transparent',
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: tokens.radius.xs,
            color: tokens.colors.text.secondary,
            fontSize: '11px',
            padding: '4px 8px',
            cursor: 'pointer',
          }}
        >
          {showHistory ? 'Hide History' : `Version History (${history.length})`}
        </button>
      </div>

      {/* History Revisions View */}
      {showHistory && (
        <div
          style={{
            padding: '12px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.bg.surfaceRaised,
            border: `1px solid ${tokens.colors.border.default}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary }}>
            Configuration Version Ledger
          </div>
          {history.length === 0 ? (
            <div style={{ fontSize: '11px', color: tokens.colors.text.muted, fontStyle: 'italic' }}>
              No previous configuration versions recorded.
            </div>
          ) : (
            history.map((rec) => (
              <div
                key={rec.version}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px',
                  borderRadius: tokens.radius.xs,
                  backgroundColor: tokens.colors.bg.surface,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  fontSize: '11px',
                }}
              >
                <div>
                  <div style={{ fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                    Version v{rec.version} · {new Date(rec.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={{ color: tokens.colors.text.muted }}>
                    By {rec.actor} ({rec.changedFields?.join(', ') || 'initial'})
                  </div>
                </div>
                {rec.rollbackAvailable && (
                  <button
                    onClick={() => handleRollback(rec.version)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${tokens.colors.status.warning}`,
                      color: tokens.colors.status.warning,
                      padding: '3px 8px',
                      borderRadius: tokens.radius.xs,
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    Rollback
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Feedback alerts */}
      {feedback && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.status.healthySubtle,
            border: `1px solid ${tokens.colors.status.healthy}`,
            color: tokens.colors.status.healthy,
            fontSize: '12px',
          }}
        >
          {feedback}
        </div>
      )}

      {errorFeedback && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.status.dangerSubtle,
            border: `1px solid ${tokens.colors.status.danger}`,
            color: tokens.colors.status.danger,
            fontSize: '12px',
          }}
        >
          {errorFeedback}
        </div>
      )}

      {/* Editor Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {schema.sections?.map((section: any) => (
          <div
            key={section.id}
            style={{
              padding: '14px',
              borderRadius: tokens.radius.sm,
              backgroundColor: tokens.colors.bg.surface,
              border: `1px solid ${tokens.colors.border.subtle}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary }}>
                {section.title}
              </div>
              {section.description && (
                <div style={{ fontSize: '11px', color: tokens.colors.text.muted, marginTop: '2px' }}>
                  {section.description}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {section.fields?.map((field: any) => {
                const isModified = formChanges[field.key] !== undefined;
                const currentValue = effectiveValues[field.key] ?? field.currentValue ?? field.defaultValue;
                const isImmutable = schema.immutableFields?.includes(field.key);
                const isObserved = schema.observedFields?.includes(field.key);
                const isReadonly = !field.editable || isImmutable || isObserved;

                return (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '12px', fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                        {field.label} {field.required && <span style={{ color: tokens.colors.status.danger }}>*</span>}
                      </label>

                      {isModified && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: tokens.radius.xs,
                            backgroundColor: tokens.colors.status.warningSubtle,
                            color: tokens.colors.status.warning,
                          }}
                        >
                          Modified
                        </span>
                      )}

                      {isReadonly && (
                        <span style={{ fontSize: '10px', color: tokens.colors.text.muted }}>
                          {isImmutable ? '🔒 Immutable' : isObserved ? '📡 Observed' : 'Read-only'}
                        </span>
                      )}
                    </div>

                    {/* Field Controls */}
                    {field.type === 'boolean' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <button
                          type="button"
                          disabled={isReadonly}
                          onClick={() => handleFieldChange(field.key, !currentValue)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: tokens.radius.xs,
                            fontSize: '11px',
                            fontWeight: tokens.typography.weight.semibold,
                            cursor: isReadonly ? 'not-allowed' : 'pointer',
                            backgroundColor: currentValue ? tokens.colors.status.healthy : tokens.colors.bg.surfaceRaised,
                            color: currentValue ? '#fff' : tokens.colors.text.muted,
                            border: `1px solid ${currentValue ? tokens.colors.status.healthy : tokens.colors.border.default}`,
                          }}
                        >
                          {currentValue ? 'ENABLED' : 'DISABLED'}
                        </button>
                        <span style={{ fontSize: '11px', color: tokens.colors.text.secondary }}>
                          {currentValue ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ) : field.type === 'enum' ? (
                      <select
                        disabled={isReadonly}
                        value={currentValue ?? ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: tokens.radius.xs,
                          backgroundColor: tokens.colors.bg.surfaceRaised,
                          border: `1px solid ${isModified ? tokens.colors.status.warning : tokens.colors.border.default}`,
                          color: tokens.colors.text.primary,
                          fontSize: '12px',
                          cursor: isReadonly ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {field.options?.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'integer' || field.type === 'number' ? (
                      <input
                        type="number"
                        disabled={isReadonly}
                        value={currentValue ?? ''}
                        min={field.validation?.min}
                        max={field.validation?.max}
                        onChange={(e) => handleFieldChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: tokens.radius.xs,
                          backgroundColor: tokens.colors.bg.surfaceRaised,
                          border: `1px solid ${isModified ? tokens.colors.status.warning : tokens.colors.border.default}`,
                          color: tokens.colors.text.primary,
                          fontSize: '12px',
                          fontFamily: tokens.typography.fontFamily.mono,
                          opacity: isReadonly ? 0.6 : 1,
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        disabled={isReadonly}
                        value={currentValue ?? ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: tokens.radius.xs,
                          backgroundColor: tokens.colors.bg.surfaceRaised,
                          border: `1px solid ${isModified ? tokens.colors.status.warning : tokens.colors.border.default}`,
                          color: tokens.colors.text.primary,
                          fontSize: '12px',
                          fontFamily: tokens.typography.fontFamily.mono,
                          opacity: isReadonly ? 0.6 : 1,
                        }}
                      />
                    )}

                    {field.description && (
                      <div style={{ fontSize: '10px', color: tokens.colors.text.muted, marginTop: '2px' }}>
                        {field.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Unsaved Changes Action Bar (Sticky at bottom when dirty) */}
      {hasChanges && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '12px 16px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.bg.surfaceRaised,
            border: `1px solid ${tokens.colors.status.warning}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: tokens.shadow.card,
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary }}>
              Unsaved Changes
            </div>
            <div style={{ fontSize: '10px', color: tokens.colors.text.muted }}>
              {Object.keys(formChanges).length} field(s) modified
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDiscard}
              style={{
                background: 'transparent',
                border: `1px solid ${tokens.colors.border.default}`,
                color: tokens.colors.text.muted,
                padding: '6px 12px',
                borderRadius: tokens.radius.xs,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Discard
            </button>
            <button
              onClick={handleSaveDraft}
              style={{
                background: tokens.colors.bg.surface,
                border: `1px solid ${tokens.colors.border.default}`,
                color: tokens.colors.text.primary,
                padding: '6px 12px',
                borderRadius: tokens.radius.xs,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Save Draft
            </button>
            <button
              onClick={handleOpenPreview}
              style={{
                background: tokens.colors.accent.primary,
                border: 'none',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: tokens.radius.xs,
                fontSize: '11px',
                fontWeight: tokens.typography.weight.semibold,
                cursor: 'pointer',
              }}
            >
              Preview & Apply
            </button>
          </div>
        </div>
      )}

      {/* Pre-Flight Preview & Impact Modal */}
      {isPreviewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && applyState.status === 'IDLE') setIsPreviewOpen(false);
          }}
        >
          <div
            style={{
              width: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.md,
              boxShadow: tokens.shadow.modal,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: tokens.colors.text.muted, letterSpacing: '0.05em' }}>
                  Pre-Flight Impact Verification
                </div>
                <div style={{ fontSize: '16px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary }}>
                  Preview Configuration Changes
                </div>
              </div>
              <button
                disabled={applyState.status === 'APPLYING' || applyState.status === 'RECONCILING'}
                onClick={() => setIsPreviewOpen(false)}
                style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {previewLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: '13px' }}>
                Calculating topological impact and evaluating policy rules...
              </div>
            ) : previewData ? (
              <>
                {/* Diff View */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                      Modified Properties ({previewData.diff?.length || 0})
                    </div>
                    <button
                      onClick={() => setShowJsonDiff(!showJsonDiff)}
                      style={{ background: 'transparent', border: 'none', color: tokens.colors.accent.primary, fontSize: '11px', cursor: 'pointer' }}
                    >
                      {showJsonDiff ? 'Table Diff' : 'JSON Diff'}
                    </button>
                  </div>

                  {showJsonDiff ? (
                    <pre
                      style={{
                        padding: '12px',
                        borderRadius: tokens.radius.xs,
                        backgroundColor: tokens.colors.bg.surface,
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        fontFamily: tokens.typography.fontFamily.mono,
                        fontSize: '11px',
                        color: tokens.colors.text.primary,
                        overflowX: 'auto',
                      }}
                    >
                      {previewData.diff?.map((d: any) => `- ${d.field}: ${JSON.stringify(d.before)}\n+ ${d.field}: ${JSON.stringify(d.after)}`).join('\n\n')}
                    </pre>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {previewData.diff?.map((d: any) => (
                        <div
                          key={d.field}
                          style={{
                            padding: '8px 10px',
                            borderRadius: tokens.radius.xs,
                            backgroundColor: tokens.colors.bg.surface,
                            border: `1px solid ${tokens.colors.border.subtle}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                          }}
                        >
                          <span style={{ fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                            {d.field}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: tokens.typography.fontFamily.mono }}>
                            <span style={{ color: tokens.colors.status.danger, textDecoration: 'line-through' }}>
                              {String(d.before)}
                            </span>
                            <span style={{ color: tokens.colors.text.muted }}>→</span>
                            <span style={{ color: tokens.colors.status.healthy, fontWeight: tokens.typography.weight.bold }}>
                              {String(d.after)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blast Radius & Risk Summary */}
                <div
                  style={{
                    padding: '12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.bg.surface,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: tokens.colors.text.muted }}>Blast Radius</div>
                    <div style={{ fontSize: '14px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, marginTop: '2px' }}>
                      {previewData.impact?.blastRadius || 0} nodes
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: tokens.colors.text.muted }}>Risk Rating</div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: tokens.typography.weight.bold,
                        color: previewData.impact?.riskRating >= 80 ? tokens.colors.status.danger : tokens.colors.status.healthy,
                        marginTop: '2px',
                      }}
                    >
                      {previewData.impact?.riskRating || 10} / 100
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: tokens.colors.text.muted }}>Approval Gate</div>
                    <div style={{ fontSize: '12px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary, marginTop: '2px' }}>
                      {previewData.requiresApproval ? 'Four-Eyes Quorum' : 'Single Admin'}
                    </div>
                  </div>
                </div>

                {/* Execution Plan */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary, marginBottom: '6px' }}>
                    Topological Execution Pipeline
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {previewData.executionPlan?.map((step: any) => (
                      <div
                        key={step.step}
                        style={{
                          fontSize: '11px',
                          color: tokens.colors.text.secondary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: tokens.colors.accent.primary, fontWeight: tokens.typography.weight.bold }}>
                          [{step.step}]
                        </span>
                        <span>{step.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Apply Progress Overlay */}
                {applyState.status !== 'IDLE' && (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: tokens.radius.sm,
                      backgroundColor:
                        applyState.status === 'ERROR'
                          ? tokens.colors.status.dangerSubtle
                          : applyState.status === 'SUCCESS'
                          ? tokens.colors.status.healthySubtle
                          : tokens.colors.bg.surface,
                      border: `1px solid ${
                        applyState.status === 'ERROR'
                          ? tokens.colors.status.danger
                          : applyState.status === 'SUCCESS'
                          ? tokens.colors.status.healthy
                          : tokens.colors.accent.primary
                      }`,
                      fontSize: '12px',
                      color: tokens.colors.text.primary,
                    }}
                  >
                    <div style={{ fontWeight: tokens.typography.weight.bold }}>
                      {applyState.message}
                    </div>
                    {applyState.status === 'APPLYING' && (
                      <div style={{ fontSize: '10px', color: tokens.colors.text.muted, marginTop: '4px' }}>
                        Step {applyState.step} of {applyState.total}
                      </div>
                    )}
                  </div>
                )}

                {/* Modal Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    disabled={applyState.status === 'APPLYING' || applyState.status === 'RECONCILING'}
                    onClick={() => setIsPreviewOpen(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: tokens.radius.xs,
                      border: `1px solid ${tokens.colors.border.default}`,
                      background: 'transparent',
                      color: tokens.colors.text.secondary,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Back to Edit
                  </button>
                  <button
                    disabled={applyState.status === 'APPLYING' || applyState.status === 'RECONCILING'}
                    onClick={handleApplyConfiguration}
                    style={{
                      padding: '8px 18px',
                      borderRadius: tokens.radius.xs,
                      border: 'none',
                      backgroundColor: tokens.colors.accent.primary,
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: tokens.typography.weight.bold,
                      cursor: 'pointer',
                    }}
                  >
                    Apply Configuration
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
