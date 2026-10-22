'use client';

import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  Share2,
  Rocket,
  Maximize2,
  Minimize2,
  Sparkles,
  Command,
  Check,
  ChevronDown,
  Compass,
  Zap,
  DownloadCloud,
} from 'lucide-react';
import { DeviceBreakpoint } from '@/components/template-studio/types/TemplateSchema';
import { StudioMode } from './types';

interface StudioTopBarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  viewport: DeviceBreakpoint;
  onViewportChange: (viewport: DeviceBreakpoint) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onPreview: () => void;
  onShare: () => void;
  onPublish: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenCommandPalette: () => void;
  onOpenAi: () => void;
  onOpenImport?: () => void;
  onOpenTemplates?: () => void;
  onOpenPerformance?: () => void;
  performanceScore?: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetFit: () => void;
}

export function StudioTopBar({
  projectName,
  onProjectNameChange,
  mode,
  onModeChange,
  viewport,
  onViewportChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveStatus,
  onPreview,
  onShare,
  onPublish,
  isFullscreen,
  onToggleFullscreen,
  onOpenCommandPalette,
  onOpenAi,
  onOpenImport,
  onOpenTemplates,
  onOpenPerformance,
  performanceScore,
  zoom,
  onZoomChange,
  onResetFit,
}: StudioTopBarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(projectName);
  const [isShareCopied, setIsShareCopied] = useState(false);

  const handleNameSubmit = () => {
    setIsEditingName(false);
    if (nameValue.trim() && nameValue !== projectName) {
      onProjectNameChange(nameValue.trim());
    }
  };

  const handleShareClick = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsShareCopied(true);
      setTimeout(() => setIsShareCopied(false), 2000);
    }
    onShare();
  };

  return (
    <header
      id="sz-top-bar"
      style={{
        height: '48px',
        background: '#121317',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        color: '#F3F4F6',
        zIndex: 50,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* ── LEFT: BRAND & PROJECT NAME & HISTORY ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Sleek OrbitoX Glyph */}
        <div
          title="OrbitoX Visual Studio"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
          onClick={onOpenCommandPalette}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            OrbitoX
          </span>
        </div>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Project Name editable */}
        {isEditingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            autoFocus
            style={{
              background: '#1C1E25',
              border: '1px solid #3B82F6',
              borderRadius: '5px',
              padding: '2px 8px',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 500,
              outline: 'none',
              width: '180px',
            }}
          />
        ) : (
          <div
            onClick={() => {
              setNameValue(projectName);
              setIsEditingName(true);
            }}
            title="Click to rename project"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: '5px',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#E5E7EB',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span>{projectName || 'Untitled Project'}</span>
            <span
              style={{
                fontSize: '0.65rem',
                color: saveStatus === 'saving' ? '#F59E0B' : saveStatus === 'unsaved' ? '#9CA3AF' : '#10B981',
              }}
            >
              • {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Edited' : 'Saved'}
            </span>
          </div>
        )}

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            id="sz-undo-btn"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '5px',
              padding: '5px',
              color: canUndo ? '#9CA3AF' : '#4B5563',
              cursor: canUndo ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (canUndo) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⇧⌘Z)"
            id="sz-redo-btn"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '5px',
              padding: '5px',
              color: canRedo ? '#9CA3AF' : '#4B5563',
              cursor: canRedo ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (canRedo) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Redo2 size={15} />
          </button>
        </div>
        {/* Templates Button */}
        {onOpenTemplates && (
          <button
            onClick={onOpenTemplates}
            id="sz-topbar-templates-btn"
            title="Browse All Site Templates (13 Categories)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#E5E7EB',
              fontSize: '0.74rem',
              fontWeight: 500,
              cursor: 'pointer',
              marginLeft: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#E5E7EB';
            }}
          >
            <Compass size={13} style={{ color: '#9CA3AF' }} />
            <span>Templates</span>
          </button>
        )}
      </div>

      {/* ── CENTER: MODE SWITCHER (Build | Style | Motion | Prototype | 3D) ── */}
      <div
        id="sz-mode-switcher"
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#1A1C22',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '7px',
          padding: '2px',
        }}
      >
        {(['build', 'style', 'motion', 'prototype', '3d'] as StudioMode[]).map((m) => {
          const isActive = mode === m || (m === 'build' && (mode as any) === 'design');
          const label = m === '3d' ? '3D' : m.charAt(0).toUpperCase() + m.slice(1);
          return (
            <button
              key={m}
              id={`sz-mode-btn-${m}`}
              onClick={() => onModeChange(m)}
              style={{
                background: isActive ? '#2A2D37' : 'transparent',
                border: 'none',
                borderRadius: '5px',
                padding: '4px 12px',
                fontSize: '0.74rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── RIGHT: RESPONSIVE, ZOOM, PREVIEW, SHARE, PUBLISH ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Performance Audit Pill */}
        {onOpenPerformance && (
          <button
            onClick={onOpenPerformance}
            id="sz-topbar-perf-btn"
            title="Project Health & Performance Audit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34D399',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')}
          >
            <Zap size={12} />
            <span>{performanceScore || 100}% Health</span>
          </button>
        )}
        {/* Responsive Device Selector */}
        <div
          id="sz-responsive-selector"
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#1A1C22',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '2px',
          }}
        >
          <button
            onClick={() => onViewportChange('desktop')}
            title="Desktop View (1440px)"
            id="sz-viewport-desktop"
            style={{
              background: viewport === 'desktop' ? '#2A2D37' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 7px',
              color: viewport === 'desktop' ? '#3B82F6' : '#9CA3AF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => onViewportChange('tablet')}
            title="Tablet View (768px)"
            id="sz-viewport-tablet"
            style={{
              background: viewport === 'tablet' ? '#2A2D37' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 7px',
              color: viewport === 'tablet' ? '#3B82F6' : '#9CA3AF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Tablet size={14} />
          </button>
          <button
            onClick={() => onViewportChange('mobile')}
            title="Mobile View (390px)"
            id="sz-viewport-mobile"
            style={{
              background: viewport === 'mobile' ? '#2A2D37' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 7px',
              color: viewport === 'mobile' ? '#3B82F6' : '#9CA3AF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Smartphone size={14} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#1A1C22',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '2px 6px',
            gap: '4px',
          }}
        >
          <button
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))}
            title="Zoom out"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              fontSize: '0.8rem',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            -
          </button>
          <button
            onClick={onResetFit}
            title="Fit to canvas"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#F3F4F6',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 4px',
              fontFamily: 'monospace',
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
            title="Zoom in"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              fontSize: '0.8rem',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            +
          </button>
        </div>

        {/* Ask AI button */}
        <button
          onClick={onOpenAi}
          id="sz-ask-ai-topbar"
          title="Ask OrbitoX AI"
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '6px',
            padding: '5px 10px',
            color: '#60A5FA',
            fontSize: '0.74rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
          }}
        >
          <Sparkles size={13} />
          <span>Ask AI</span>
        </button>

        {/* Universal Import button */}
        {onOpenImport && (
          <button
            onClick={onOpenImport}
            id="orbitox-import-btn"
            title="Universal Import (HTML, Tailwind, React, SVG)"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '5px 10px',
              color: '#9CA3AF',
              fontSize: '0.74rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <DownloadCloud size={13} />
            <span>Import</span>
          </button>
        )}

        {/* Preview Button */}
        <button
          onClick={onPreview}
          id="sz-preview-btn"
          title="Live Multi-Device Preview"
          style={{
            background: '#1A1C22',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '5px 10px',
            color: '#F3F4F6',
            fontSize: '0.74rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Eye size={13} />
          <span>Preview</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareClick}
          id="sz-share-btn"
          title="Share Project Link"
          style={{
            background: '#1A1C22',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '5px 8px',
            color: isShareCopied ? '#10B981' : '#9CA3AF',
            fontSize: '0.74rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isShareCopied ? <Check size={13} /> : <Share2 size={13} />}
        </button>

        {/* Publish Button */}
        <button
          onClick={onPublish}
          id="sz-publish-btn"
          title="Publish to Edge CDN"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 14px',
            color: '#FFFFFF',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Rocket size={13} />
          <span>Publish</span>
        </button>

        {/* Fullscreen Canvas Toggle */}
        <button
          onClick={onToggleFullscreen}
          id="sz-fullscreen-btn"
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Canvas (F)'}
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            padding: '5px',
            color: '#9CA3AF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </header>
  );
}
