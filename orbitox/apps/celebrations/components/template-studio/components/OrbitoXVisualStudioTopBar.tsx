import React, { useState } from 'react';
import { DeviceBreakpoint } from '../types/TemplateSchema';
import { Monitor, Tablet, Smartphone, Undo2, Redo2, Eye, Rocket, Command, Check, Share2, Sparkles, Maximize2, Minimize2, Plus, DownloadCloud } from 'lucide-react';

interface Props {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  mode: 'design' | 'motion' | 'prototype' | '3d';
  onModeChange: (mode: 'design' | 'motion' | 'prototype' | '3d') => void;
  viewport: DeviceBreakpoint;
  onViewportChange: (viewport: DeviceBreakpoint) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onPreview: () => void;
  onShare?: () => void;
  onPublish: () => void;
  onOpenCommandPalette: () => void;
  onOpenAiAssistant?: () => void;
  onOpenNewProject?: () => void;
  onOpenImport?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  expertMode: boolean;
  onToggleExpertMode: () => void;
}

export function OrbitoXVisualStudioTopBar({
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
  onOpenCommandPalette,
  onOpenAiAssistant,
  onOpenNewProject,
  onOpenImport,
  isFullscreen = false,
  onToggleFullscreen,
  expertMode,
  onToggleExpertMode,
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [isShareCopied, setIsShareCopied] = useState(false);

  const handleFinishEditingName = () => {
    setIsEditingName(false);
    if (tempName.trim()) {
      onProjectNameChange(tempName.trim());
    } else {
      setTempName(projectName);
    }
  };

  const handleShareClick = () => {
    if (onShare) {
      onShare();
    } else {
      if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(window.location.href);
        setIsShareCopied(true);
        setTimeout(() => setIsShareCopied(false), 2000);
      }
    }
  };

  return (
    <header
      style={{
        height: '52px',
        background: '#090D1A',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        zIndex: 50,
        userSelect: 'none',
      }}
    >
      {/* ── LEFT: Brand, Name & History ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Brandmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: '#060B1A',
            }}
          >
            🪐
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.06em', color: '#FFFFFF' }}>
            OrbitoX
          </span>
        </div>

        {onOpenNewProject && (
          <button
            id="orbitox-new-project-btn"
            onClick={onOpenNewProject}
            title="Create New Website / Project"
            style={{
              background: 'rgba(223, 186, 107, 0.12)',
              border: '1px solid rgba(223, 186, 107, 0.3)',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#DFBA6B',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={12} />
            <span>New</span>
          </button>
        )}

        <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.12)' }} />

        {/* Project Name (Inline Editable) */}
        {isEditingName ? (
          <input
            type="text"
            value={tempName}
            autoFocus
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleFinishEditingName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishEditingName();
              if (e.key === 'Escape') {
                setTempName(projectName);
                setIsEditingName(false);
              }
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid #DFBA6B',
              borderRadius: '6px',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '2px 8px',
              outline: 'none',
              width: '200px',
            }}
          />
        ) : (
          <span
            onClick={() => setIsEditingName(true)}
            title="Click to rename website"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {projectName || 'Untitled Website'}
          </span>
        )}

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              borderRadius: '4px',
              color: canUndo ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.25)',
              cursor: canUndo ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⇧⌘Z)"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              borderRadius: '4px',
              color: canRedo ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.25)',
              cursor: canRedo ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      {/* ── CENTER: Mode Switcher & Viewports ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Mode Switcher: Design | Motion | Prototype | 3D */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <button
            id="orbitox-mode-design"
            onClick={() => onModeChange('design')}
            style={{
              background: mode === 'design' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              border: 'none',
              color: mode === 'design' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
              fontWeight: mode === 'design' ? 600 : 500,
              fontSize: '0.78rem',
              padding: '4px 11px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Design
          </button>
          <button
            id="orbitox-mode-motion"
            onClick={() => onModeChange('motion')}
            style={{
              background: mode === 'motion' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
              border: 'none',
              color: mode === 'motion' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.55)',
              fontWeight: mode === 'motion' ? 600 : 500,
              fontSize: '0.78rem',
              padding: '4px 11px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Motion
          </button>
          <button
            id="orbitox-mode-prototype"
            onClick={() => onModeChange('prototype')}
            style={{
              background: mode === 'prototype' ? '#8B5CF6' : 'transparent',
              border: 'none',
              color: mode === 'prototype' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
              fontWeight: mode === 'prototype' ? 600 : 500,
              fontSize: '0.78rem',
              padding: '4px 11px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Prototype
          </button>
          <button
            id="orbitox-mode-3d"
            onClick={() => onModeChange('3d')}
            style={{
              background: mode === '3d' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
              border: 'none',
              color: mode === '3d' ? '#06B6D4' : 'rgba(255, 255, 255, 0.55)',
              fontWeight: mode === '3d' ? 600 : 500,
              fontSize: '0.78rem',
              padding: '4px 11px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            3D
          </button>
        </div>

        {/* Viewport Switcher */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <button
            id="orbitox-viewport-desktop"
            onClick={() => onViewportChange('desktop')}
            title="Desktop Viewport (1440px)"
            style={{
              background: viewport === 'desktop' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              border: 'none',
              color: viewport === 'desktop' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.55)',
              padding: '5px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.75rem',
            }}
          >
            <Monitor size={14} />
            <span>Desktop</span>
          </button>
          <button
            id="orbitox-viewport-tablet"
            onClick={() => onViewportChange('tablet')}
            title="Tablet Viewport (768px)"
            style={{
              background: viewport === 'tablet' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              border: 'none',
              color: viewport === 'tablet' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.55)',
              padding: '5px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.75rem',
            }}
          >
            <Tablet size={14} />
            <span>Tablet</span>
          </button>
          <button
            id="orbitox-viewport-mobile"
            onClick={() => onViewportChange('mobile')}
            title="Mobile Viewport (390px)"
            style={{
              background: viewport === 'mobile' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              border: 'none',
              color: viewport === 'mobile' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.55)',
              padding: '5px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.75rem',
            }}
          >
            <Smartphone size={14} />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* ── RIGHT: Save status, Cmd+K, Preview & Publish ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Expert Mode Toggle */}
        <div
          onClick={onToggleExpertMode}
          data-testid="expert-mode-toggle"
          title="Toggle Developer / Expert Mode"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '0.75rem', color: expertMode ? '#8B5CF6' : 'rgba(255, 255, 255, 0.5)', fontWeight: 600, cursor: 'pointer' }}>
            Expert
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={expertMode}
            aria-label="Toggle Expert Mode"
            style={{
              width: '32px',
              height: '18px',
              borderRadius: '9px',
              background: expertMode ? '#8B5CF6' : 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '7px',
                background: '#FFFFFF',
                position: 'absolute',
                top: '2px',
                left: expertMode ? '16px' : '2px',
                transition: 'left 0.2s ease',
              }}
            />
          </button>
        </div>

        {/* Save Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: saveStatus === 'saved' ? '#10B981' : saveStatus === 'saving' ? '#F59E0B' : '#EF4444',
            }}
          />
          <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
          </span>
        </div>

        {/* Command Palette Trigger (⌘K) */}
        <button
          onClick={onOpenCommandPalette}
          title="Command Palette (⌘K)"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '5px 8px',
            color: 'rgba(255, 255, 255, 0.65)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.72rem',
          }}
        >
          <Command size={12} />
          <span>K</span>
        </button>

        {/* Ask OrbitoX AI Assistant Button */}
        <button
          onClick={onOpenAiAssistant}
          title="Ask OrbitoX AI Design Assistant"
          style={{
            background: 'rgba(223, 186, 107, 0.1)',
            border: '1px solid rgba(223, 186, 107, 0.3)',
            borderRadius: '6px',
            padding: '5px 10px',
            color: '#DFBA6B',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(223, 186, 107, 0.2)';
            e.currentTarget.style.borderColor = '#DFBA6B';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(223, 186, 107, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(223, 186, 107, 0.3)';
          }}
        >
          <Sparkles size={13} />
          <span>Ask OrbitoX</span>
        </button>

        {/* Import Code Button */}
        {onOpenImport && (
          <button
            id="orbitox-import-btn"
            onClick={onOpenImport}
            title="Universal Import (HTML, Tailwind, React, SVG)"
            style={{
              background: 'rgba(223, 186, 107, 0.1)',
              border: '1px solid rgba(223, 186, 107, 0.25)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#DFBA6B',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(223, 186, 107, 0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(223, 186, 107, 0.1)')}
          >
            <DownloadCloud size={14} />
            <span>Import</span>
          </button>
        )}

        {/* Preview Button */}
        <button
          onClick={onPreview}
          title="Preview Website"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '6px',
            padding: '6px 14px',
            color: '#FFFFFF',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
        >
          <Eye size={14} />
          <span>Preview</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareClick}
          title="Share Project Link"
          style={{
            background: isShareCopied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            border: isShareCopied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: isShareCopied ? '#10B981' : '#FFFFFF',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isShareCopied) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            if (!isShareCopied) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          {isShareCopied ? <Check size={14} /> : <Share2 size={14} />}
          <span>{isShareCopied ? 'Copied!' : 'Share'}</span>
        </button>

        {/* Fullscreen Toggle (F) */}
        {onToggleFullscreen && (
          <button
            id="orbitox-fullscreen-btn"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (F / ESC)' : 'Fullscreen Canvas (F)'}
            style={{
              background: isFullscreen ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: isFullscreen ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '6px 8px',
              color: isFullscreen ? '#DFBA6B' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}

        {/* Publish Button */}
        <button
          id="orbitox-publish-btn"
          onClick={onPublish}
          title="Publish Live Website"
          style={{
            background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            color: '#060B1A',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 10px rgba(223, 186, 107, 0.25)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Rocket size={14} />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
}
