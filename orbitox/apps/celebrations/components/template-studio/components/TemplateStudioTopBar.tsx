'use client';

import React from 'react';
import Link from 'next/link';
import {
  TemplateSchema,
  DeviceBreakpoint,
  TemplateStatus,
  OrientationMode,
} from '../types/TemplateSchema';
import {
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Eye,
  Sparkles,
  Rocket,
  ShieldCheck,
  ChevronDown,
  Layers,
  ArrowLeft,
  Flame,
  UserCheck,
  Check,
} from 'lucide-react';

interface TemplateStudioTopBarProps {
  schema: TemplateSchema;
  selectedSceneId?: string | null;
  viewport: DeviceBreakpoint;
  onViewportChange: (viewport: DeviceBreakpoint) => void;
  orientation: OrientationMode;
  onOrientationChange: (orientation: OrientationMode) => void;
  previewMode: 'admin' | 'customer' | 'guest';
  onPreviewModeChange: (mode: 'admin' | 'customer' | 'guest') => void;
  isStressTest: boolean;
  onToggleStressTest: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenVersions: () => void;
  onOpenPublish: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSmartAssistant?: () => void;
  smartAssistantCount?: number;
  onOpenCreateScene?: () => void;
  onStatusChange: (status: TemplateStatus) => void;
}

export function TemplateStudioTopBar({
  schema,
  selectedSceneId,
  viewport,
  onViewportChange,
  orientation,
  onOrientationChange,
  previewMode,
  onPreviewModeChange,
  isStressTest,
  onToggleStressTest,
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenVersions,
  onOpenPublish,
  onOpenCommandPalette,
  onOpenSmartAssistant,
  smartAssistantCount = 0,
  onOpenCreateScene,
  onStatusChange,
}: TemplateStudioTopBarProps) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false);

  const activeScene = schema.scenes.find((s) => s.id === selectedSceneId) || schema.scenes[0];
  const authorityMode: 'GRAPH_NATIVE' | 'HYBRID' | 'LEGACY' =
    activeScene?.sceneGraph && activeScene.renderMode === 'graph'
      ? 'GRAPH_NATIVE'
      : activeScene?.renderMode === 'hybrid'
      ? 'HYBRID'
      : 'LEGACY';

  const authorityMeta = {
    GRAPH_NATIVE: {
      bg: 'rgba(16, 185, 129, 0.15)',
      text: '#10B981',
      border: 'rgba(16, 185, 129, 0.4)',
      label: 'GRAPH NATIVE',
      tooltip: 'SceneGraph is the visual source of truth (Prompt #45)',
    },
    HYBRID: {
      bg: 'rgba(234, 179, 8, 0.15)',
      text: '#FBBF24',
      border: 'rgba(234, 179, 8, 0.4)',
      label: 'HYBRID',
      tooltip: 'SceneGraph structure with specialized React components (Prompt #45)',
    },
    LEGACY: {
      bg: 'rgba(148, 163, 184, 0.12)',
      text: '#94A3B8',
      border: 'rgba(148, 163, 184, 0.3)',
      label: 'LEGACY',
      tooltip: 'Static React JSX is layout source of truth (Prompt #45)',
    },
  }[authorityMode];

  const statusColors: Record<TemplateStatus, { bg: string; text: string; border: string }> = {
    DRAFT: { bg: 'rgba(234, 179, 8, 0.12)', text: '#FBBF24', border: 'rgba(234, 179, 8, 0.3)' },
    IN_REVIEW: { bg: 'rgba(56, 189, 248, 0.12)', text: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' },
    PUBLISHED: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
    ARCHIVED: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' },
  };

  const statusMeta = statusColors[schema.status] || statusColors.DRAFT;

  return (
    <header
      style={{
        height: '60px',
        background: '#090D1A',
        borderBottom: '1px solid rgba(223, 186, 107, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* LEFT: Breadcrumb & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link
          href="/admin"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--cel-text-muted, #94A3B8)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <ArrowLeft size={13} />
          <span>Catalog</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>Celebrations</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>/</span>
          <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>Templates</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>/</span>
          <strong style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.02em' }}>
            {schema.name}
          </strong>
        </div>

        {/* Status Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: statusMeta.bg,
              border: `1px solid ${statusMeta.border}`,
              color: statusMeta.text,
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: statusMeta.text,
              }}
            />
            <span>{schema.status.replace('_', ' ')}</span>
            <ChevronDown size={12} />
          </button>

          {isStatusDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                background: '#0D1429',
                border: '1px solid rgba(223, 186, 107, 0.3)',
                borderRadius: '8px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                padding: '6px',
                minWidth: '140px',
                zIndex: 60,
              }}
            >
              {(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'] as TemplateStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    onStatusChange(st);
                    setIsStatusDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    borderRadius: '5px',
                    background: schema.status === st ? 'rgba(223, 186, 107, 0.15)' : 'transparent',
                    border: 'none',
                    color: schema.status === st ? '#DFBA6B' : '#CBD5E1',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{st.replace('_', ' ')}</span>
                  {schema.status === st && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Version Pill */}
        <span
          style={{
            fontSize: '0.72rem',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--cel-text-muted, #94A3B8)',
            fontFamily: 'monospace',
          }}
        >
          v{schema.activeVersion}
        </span>

        {/* Scene Runtime Authority Mode Badge (Prompt #45) */}
        <div
          title={authorityMeta.tooltip}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: authorityMeta.bg,
            border: `1px solid ${authorityMeta.border}`,
            color: authorityMeta.text,
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'default',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: authorityMeta.text,
              boxShadow: authorityMode === 'GRAPH_NATIVE' ? '0 0 8px #10B981' : 'none',
            }}
          />
          <span>{authorityMeta.label}</span>
        </div>
      </div>

      {/* CENTER: Mode Selector & Device Viewport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Mode Selector */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={() => onPreviewModeChange('admin')}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: previewMode === 'admin' ? 'rgba(223, 186, 107, 0.22)' : 'transparent',
              color: previewMode === 'admin' ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={13} />
            <span>Design</span>
          </button>

          <button
            onClick={() => onPreviewModeChange('customer')}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: previewMode === 'customer' ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
              color: previewMode === 'customer' ? '#38BDF8' : 'var(--cel-text-muted, #94A3B8)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <UserCheck size={13} />
            <span>Customer</span>
          </button>

          <button
            onClick={() => onPreviewModeChange('guest')}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: previewMode === 'guest' ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
              color: previewMode === 'guest' ? '#10B981' : 'var(--cel-text-muted, #94A3B8)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Eye size={13} />
            <span>Guest</span>
          </button>
        </div>

        {/* Breakpoint Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={() => onViewportChange('desktop')}
            title="Desktop Canvas (1280px)"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: viewport === 'desktop' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: viewport === 'desktop' ? '#fff' : 'var(--cel-text-dim, #64748B)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <Monitor size={14} />
            <span>Desktop</span>
          </button>

          <button
            onClick={() => onViewportChange('tablet')}
            title="Tablet Canvas (768px)"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: viewport === 'tablet' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: viewport === 'tablet' ? '#fff' : 'var(--cel-text-dim, #64748B)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <Tablet size={14} />
            <span>Tablet</span>
          </button>

          <button
            onClick={() => onViewportChange('mobile')}
            title="Mobile Canvas (390px)"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: viewport === 'mobile' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: viewport === 'mobile' ? '#fff' : 'var(--cel-text-dim, #64748B)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <Smartphone size={14} />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* RIGHT: Stress Test, Health, Undo/Redo, Versions, Publish */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Smart Design Assistant Button (Prompt #46) */}
        {onOpenSmartAssistant && (
          <button
            onClick={onOpenSmartAssistant}
            title="Open Smart Design Assistant (Layout, Alignment & Performance)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              background: smartAssistantCount > 0 ? 'rgba(223, 186, 107, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: smartAssistantCount > 0 ? '1px solid rgba(223, 186, 107, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: smartAssistantCount > 0 ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Sparkles size={13} color={smartAssistantCount > 0 ? '#DFBA6B' : undefined} />
            <span>Assistant</span>
            {smartAssistantCount > 0 && (
              <span
                style={{
                  background: '#DFBA6B',
                  color: '#07090E',
                  borderRadius: '9999px',
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  marginLeft: '2px',
                }}
              >
                {smartAssistantCount}
              </span>
            )}
          </button>
        )}

        {/* Quick Add Scene Button (Prompt #4) */}
        {onOpenCreateScene && (
          <button
            onClick={onOpenCreateScene}
            title="Create a brand-new SceneGraph scene without React editing"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38BDF8',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>+ Scene</span>
          </button>
        )}

        {/* Stress Test Toggle */}
        <button
          onClick={onToggleStressTest}
          title="Simulate long customer text, edge cases & 6+ events"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '7px',
            background: isStressTest ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: isStressTest ? '1px solid #F43F5E' : '1px solid rgba(255, 255, 255, 0.08)',
            color: isStressTest ? '#FDA4AF' : 'var(--cel-text-muted, #94A3B8)',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Flame size={13} color={isStressTest ? '#F43F5E' : undefined} />
          <span>{isStressTest ? 'Stress Test Active' : 'Test Data'}</span>
        </button>

        {/* Template Health Pill */}
        <button
          onClick={onOpenPublish}
          title="Open Template Health & Validation Report"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '7px',
            background: schema.healthReport?.isPublishable
              ? 'rgba(16, 185, 129, 0.12)'
              : 'rgba(239, 68, 68, 0.12)',
            border: schema.healthReport?.isPublishable
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : '1px solid rgba(239, 68, 68, 0.3)',
            color: schema.healthReport?.isPublishable ? '#10B981' : '#EF4444',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {schema.healthReport?.isPublishable ? (
            <CheckCircle2 size={13} />
          ) : (
            <AlertTriangle size={13} />
          )}
          <span>{schema.healthReport?.score ?? 100}% Health</span>
        </button>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: canUndo ? '#fff' : 'rgba(255, 255, 255, 0.2)',
              cursor: canUndo ? 'pointer' : 'not-allowed',
            }}
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⇧⌘Z)"
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: canRedo ? '#fff' : 'rgba(255, 255, 255, 0.2)',
              cursor: canRedo ? 'pointer' : 'not-allowed',
            }}
          >
            <RotateCw size={13} />
          </button>
        </div>

        {/* Autosave Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: saveStatus === 'saving' ? '#F59E0B' : '#10B981',
            }}
          />
          <span>{saveStatus === 'saving' ? 'Saving...' : 'Autosaved'}</span>
        </div>

        {/* Version History Button */}
        <button
          onClick={onOpenVersions}
          style={{
            padding: '6px 12px',
            borderRadius: '7px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: '#CBD5E1',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Versions
        </button>

        {/* Command Palette ⌘K Trigger */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            title="Open Command Palette (⌘K)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '7px',
              border: '1px solid rgba(223, 186, 107, 0.25)',
              background: 'rgba(223, 186, 107, 0.08)',
              color: '#DFBA6B',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Quick Actions</span>
            <kbd
              style={{
                fontSize: '0.66rem',
                padding: '1px 4px',
                borderRadius: '3px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(223, 186, 107, 0.3)',
                color: '#DFBA6B',
                fontFamily: 'monospace',
              }}
            >
              ⌘K
            </kbd>
          </button>
        )}

        {/* Publish Action Button */}
        <button
          onClick={onOpenPublish}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #DFBA6B, #C29B47)',
            border: 'none',
            color: '#050B14',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(223, 186, 107, 0.35)',
          }}
        >
          <Rocket size={14} />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
}
