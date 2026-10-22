'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Type,
  Square,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Wand2,
  Columns,
  Grid,
  Image as ImageIcon,
  Play,
  RotateCw,
  Link2,
  Unlink,
  Layers,
  ArrowUpRight,
  Check,
  Zap,
  Move,
  Code2,
  Activity,
  Upload,
  RotateCcw,
  ArrowUpCircle,
  Boxes,
  Plus,
  Component as ComponentIcon,
  Clock,
  Send,
  MapPin,
  Video as VideoIcon,
  Box,
} from 'lucide-react';
import { SceneGraphNode, SceneNodeKind } from '@/components/template-studio/engine/SceneGraphTypes';
import { StyleResolver } from '@/components/template-studio/engine/StyleResolver';
import { FileUploadService } from '../template-studio/services/FileUploadService';
import { TemplateSceneDefinition, TemplateDesignTokens, DeviceBreakpoint } from '@/components/template-studio/types/TemplateSchema';
import { InspectorTab, DepthPlane } from './types';
import { BoxModelControl } from './inspectors/BoxModelControl';
import { CornerRadiusControl } from './inspectors/CornerRadiusControl';

interface PropertiesPanelProps {
  selectedNode: SceneGraphNode | null;
  activeScene: TemplateSceneDefinition;
  designTokens?: TemplateDesignTokens;
  activeViewport: DeviceBreakpoint;
  onUpdateNode: (nodeId: string, patch: Partial<SceneGraphNode>) => void;
  onUpdateGeometry: (nodeId: string, patch: any) => void;
  onUpdateStyle: (nodeId: string, patch: any) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onToggleHide: (nodeId: string) => void;
  onUpdateScene: (sceneId: string, patch: Partial<TemplateSceneDefinition>) => void;
  onOpenRemix?: () => void;
  onOpenAi?: () => void;
  onOpenAssetPicker?: () => void;
  onCreateComponent?: (nodeId: string, name?: string) => void;
  onInstantiateComponent?: (masterId: string) => void;
  onResetOverrides?: (nodeId: string, propertyKey?: string) => void;
  onPushToMaster?: (nodeId: string) => void;
  onDetachInstance?: (nodeId: string) => void;
  onResetResponsiveOverride?: (nodeId: string, device: DeviceBreakpoint, propertyKey?: string) => void;
}

export function PropertiesPanel({
  selectedNode,
  activeScene,
  designTokens,
  activeViewport,
  onUpdateNode,
  onUpdateGeometry,
  onUpdateStyle,
  onDuplicateNode,
  onDeleteNode,
  onToggleLock,
  onToggleHide,
  onUpdateScene,
  onOpenRemix,
  onOpenAi,
  onOpenAssetPicker,
  onCreateComponent,
  onInstantiateComponent,
  onResetOverrides,
  onPushToMaster,
  onDetachInstance,
  onResetResponsiveOverride,
}: PropertiesPanelProps) {
  // Active Inspector Tab
  const [activeTab, setActiveTab] = useState<InspectorTab>('essentials');

  // Developer / Expert Mode Diagnostics Toggle
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false);

  // Linked corner radius state
  const [isRadiusLinked, setIsRadiusLinked] = useState<boolean>(true);

  // ─── IF NO NODE IS SELECTED: SCENE / PAGE LEVEL INSPECTOR ───
  if (!selectedNode) {
    return (
      <aside
        id="sz-properties-panel"
        style={{
          width: '310px',
          background: '#16181D',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          zIndex: 35,
          userSelect: 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#181A20',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={14} style={{ color: '#3B82F6' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F3F4F6' }}>Section Inspector</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            {activeScene.name || 'Section'}
          </span>
        </div>

        <div className="sz-custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Section Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Section Name</label>
            <input
              type="text"
              value={activeScene.name}
              onChange={(e) => onUpdateScene(activeScene.id, { name: e.target.value })}
              style={{
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Navigation Label */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Navigation Anchor / Title</label>
            <input
              type="text"
              value={activeScene.navigationLabel || activeScene.name}
              onChange={(e) => onUpdateScene(activeScene.id, { navigationLabel: e.target.value })}
              style={{
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Section Remix Art Direction */}
          {onOpenRemix && (
            <button
              onClick={onOpenRemix}
              id="sz-remix-section-btn"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.25) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#60A5FA',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)')}
            >
              <Wand2 size={14} />
              <span>Remix Section Art Direction</span>
            </button>
          )}

          {/* Page Transition */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Page Transition Preset</label>
            <select
              id="sz-inspector-scene-transition"
              value={activeScene.transitionToNext?.type || 'crossfade'}
              onChange={(e) =>
                onUpdateScene(activeScene.id, {
                  transitionToNext: {
                    type: e.target.value as any,
                    durationMs: 600,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  },
                })
              }
              style={{
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: '#FFFFFF',
                fontSize: '0.76rem',
                outline: 'none',
              }}
            >
              <option value="crossfade">Smooth Crossfade (0.6s)</option>
              <option value="depth_zoom">Cinematic Depth Zoom</option>
              <option value="horizontal_travel">Horizontal Slide</option>
              <option value="fade">Instant / Simple Fade</option>
            </select>
          </div>

          {/* Helpful Guidance */}
          <div
            style={{
              padding: '12px',
              background: '#131418',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.72rem',
              color: '#9CA3AF',
              lineHeight: 1.45,
            }}
          >
            Click any layer on the canvas to inspect and edit its Essentials, Design, Behavior, and Responsive rules.
          </div>
        </div>
      </aside>
    );
  }

  const kind = selectedNode.kind;
  const isMasterComponent = Boolean(selectedNode.component?.isMaster);
  const isInstance = Boolean(selectedNode.component?.masterComponentId && !selectedNode.component?.isMaster);
  const instanceOverrides = selectedNode.component?.instanceOverrides || {};
  const overrideCount = Object.keys(instanceOverrides).length;

  const isText = kind === 'text' || kind === 'richtext';
  const isImage = kind === 'image';
  const isButton = kind === 'button';
  const isCountdown = kind === 'countdown' || selectedNode.name?.toLowerCase().includes('countdown') || selectedNode.name?.toLowerCase().includes('clock');
  const isForm = (kind as string) === 'rsvpform' || (kind as string) === 'rsvp' || selectedNode.name?.toLowerCase().includes('form') || selectedNode.name?.toLowerCase().includes('rsvp');
  const isMap = (kind as string) === 'venue' || selectedNode.name?.toLowerCase().includes('venue') || selectedNode.name?.toLowerCase().includes('map') || selectedNode.name?.toLowerCase().includes('sanctuary');
  const isThreeD = (kind as string) === 'interactive_object' || (kind as string) === 'threed' || selectedNode.name?.toLowerCase().includes('3d') || selectedNode.name?.toLowerCase().includes('spatial') || selectedNode.name?.toLowerCase().includes('astrolabe');
  const isVideo = kind === 'video' || selectedNode.name?.toLowerCase().includes('video');
  const isGallery = (kind as string) === 'gallery' || selectedNode.name?.toLowerCase().includes('gallery');
  const isFrame = kind === 'frame' || kind === 'stack' || kind === 'grid';
  const isSemantic = selectedNode.name?.toLowerCase().includes('hero') || selectedNode.name?.toLowerCase().includes('grid') || selectedNode.name?.toLowerCase().includes('card');

  // Resolve effective style and geometry via Breakpoint Cascade (Desktop -> Tablet -> Mobile)
  const resolved = StyleResolver.resolveForDevice(selectedNode, activeViewport, designTokens || ({} as any));
  const geom = resolved.geometry || {};
  const style = (resolved.style || {}) as any;
  const typo = (style.typography || {}) as any;
  const layout = (selectedNode.layoutConfig || {}) as any;

  // Responsive Inheritance & Override Checker
  const isPropertyOverridden = (propertyKey: string, subPath?: 'style' | 'geometry' | 'typography') => {
    if (activeViewport === 'desktop') return false;
    const dev = (selectedNode.responsive as any)?.[activeViewport];
    if (!dev) return false;
    if (dev[propertyKey] !== undefined) return true;
    if (dev.style?.[propertyKey] !== undefined) return true;
    if (dev.geometry?.[propertyKey] !== undefined) return true;
    if (dev.style?.typography?.[propertyKey] !== undefined) return true;
    if (subPath && dev[subPath]?.[propertyKey] !== undefined) return true;
    return false;
  };

  // Helper for Responsive indicator badge
  const BreakpointIndicator = ({ propertyKey, subPath }: { propertyKey?: string; subPath?: 'style' | 'geometry' | 'typography' } = {}) => {
    if (activeViewport === 'desktop') return null;

    const deviceName = activeViewport === 'mobile' ? 'Mobile' : activeViewport === 'tablet' ? 'Tablet' : activeViewport;
    const isOverridden = propertyKey
      ? isPropertyOverridden(propertyKey, subPath)
      : Boolean((selectedNode.responsive as any)?.[activeViewport]);

    const parentDevice = activeViewport === 'mobile' && (selectedNode.responsive as any)?.tablet ? 'Tablet' : 'Desktop';

    if (isOverridden) {
      return (
        <div
          className="sz-responsive-badge sz-override-badge"
          data-viewport={activeViewport}
          data-property={propertyKey || 'all'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.62rem',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(245, 158, 11, 0.14)',
            color: '#FBBF24',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}
          title={`Overridden specifically on ${deviceName}. Click reset to restore inherited value.`}
        >
          <span>✦ {deviceName} Override</span>
          {propertyKey && onResetResponsiveOverride && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResetResponsiveOverride(selectedNode.id, activeViewport, propertyKey);
              }}
              title={`Reset ${propertyKey} to inherited value`}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FBBF24',
                cursor: 'pointer',
                padding: '0 1px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        className="sz-responsive-badge sz-inherited-badge"
        data-viewport={activeViewport}
        data-property={propertyKey || 'all'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.62rem',
          fontWeight: 500,
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'rgba(255, 255, 255, 0.04)',
          color: '#9CA3AF',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        title={`Inherited from ${parentDevice}`}
      >
        <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>●</span>
        <span>Inherited from {parentDevice}</span>
      </div>
    );
  };

  // Helper to parse 4 sides from string or explicit props
  const getSpacingSides = (shorthand?: string, top?: any, right?: any, bottom?: any, left?: any) => {
    if (top !== undefined || right !== undefined || bottom !== undefined || left !== undefined) {
      return {
        top: top !== undefined ? String(top) : '0',
        right: right !== undefined ? String(right) : '0',
        bottom: bottom !== undefined ? String(bottom) : '0',
        left: left !== undefined ? String(left) : '0',
      };
    }
    if (!shorthand || typeof shorthand !== 'string') {
      return { top: '0', right: '0', bottom: '0', left: '0' };
    }
    const parts = shorthand.trim().split(/\s+/);
    if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    if (parts.length >= 4) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    return { top: '0', right: '0', bottom: '0', left: '0' };
  };

  const padSides = getSpacingSides(style.padding, style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft);
  const marSides = getSpacingSides(style.margin, style.marginTop, style.marginRight, style.marginBottom, style.marginLeft);

  const handlePaddingChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    const propMap = {
      top: 'paddingTop',
      right: 'paddingRight',
      bottom: 'paddingBottom',
      left: 'paddingLeft',
    };
    onUpdateStyle(selectedNode.id, {
      [propMap[side]]: val,
    });
  };

  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    const propMap = {
      top: 'marginTop',
      right: 'marginRight',
      bottom: 'marginBottom',
      left: 'marginLeft',
    };
    onUpdateStyle(selectedNode.id, {
      [propMap[side]]: val,
    });
  };

  return (
    <aside
      id="sz-properties-panel"
      style={{
        width: '310px',
        background: '#16181D',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
      }}
    >
      {/* ── 1. SELECTED OBJECT HEADER ── */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#181A20',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: isMasterComponent
                ? 'rgba(139, 92, 246, 0.2)'
                : isInstance
                ? 'rgba(59, 130, 246, 0.2)'
                : 'rgba(59, 130, 246, 0.15)',
              color: isMasterComponent ? '#C4B5FD' : isInstance ? '#93C5FD' : '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isMasterComponent ? (
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>❖</span>
            ) : isInstance ? (
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>◇</span>
            ) : isText ? (
              <Type size={14} />
            ) : isImage ? (
              <ImageIcon size={14} />
            ) : (
              <Square size={14} />
            )}
          </div>
          <input
            id="sz-inspector-node-title"
            type="text"
            value={selectedNode.name || kind}
            onChange={(e) => onUpdateNode(selectedNode.id, { name: e.target.value })}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 600,
              outline: 'none',
              width: '120px',
            }}
          />
        </div>

        {/* Quick Node Actions: Lock, Hide, Duplicate, Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => onToggleLock(selectedNode.id)}
            title={selectedNode.locked ? 'Unlock' : 'Lock'}
            style={{
              background: 'transparent',
              border: 'none',
              color: selectedNode.locked ? '#F59E0B' : '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {selectedNode.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button
            onClick={() => onToggleHide(selectedNode.id)}
            title={selectedNode.hidden ? 'Show' : 'Hide'}
            style={{
              background: 'transparent',
              border: 'none',
              color: selectedNode.hidden ? '#EF4444' : '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {selectedNode.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            onClick={() => onDuplicateNode(selectedNode.id)}
            title="Duplicate (⌘D)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            title="Delete (Backspace)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <Trash2 size={13} />
          </button>
          {onCreateComponent && !isMasterComponent && !isInstance && (
            <button
              id="sz-create-component-btn"
              onClick={() => onCreateComponent(selectedNode.id, selectedNode.name)}
              title="Convert into reusable Master Component (❖)"
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#C4B5FD',
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                marginLeft: '4px',
              }}
            >
              <span>❖</span>
              <span>Component</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 1.5 COMPONENT MASTER / INSTANCE BANNER ── */}
      {isMasterComponent && (
        <div
          id="sz-master-component-badge"
          style={{
            margin: '8px 12px 4px',
            padding: '7px 10px',
            borderRadius: '6px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#C4B5FD', fontSize: '0.74rem', fontWeight: 600 }}>
            <span style={{ fontSize: '0.85rem' }}>❖</span>
            <span>Master Component</span>
          </div>
          {onInstantiateComponent && (
            <button
              id="sz-inspector-instantiate-btn"
              onClick={() => onInstantiateComponent(selectedNode.component?.masterComponentId || selectedNode.id)}
              style={{
                background: '#8B5CF6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Plus size={10} />
              <span>Add Instance</span>
            </button>
          )}
        </div>
      )}

      {isInstance && (
        <div
          id="sz-instance-component-banner"
          style={{
            margin: '8px 12px 4px',
            padding: '8px 10px',
            borderRadius: '6px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93C5FD', fontSize: '0.74rem', fontWeight: 600 }}>
              <span style={{ fontSize: '0.85rem' }}>◇</span>
              <span>Component Instance</span>
            </div>
            {overrideCount > 0 ? (
              <span
                id="sz-instance-override-count"
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FBBF24',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  fontSize: '0.66rem',
                  fontWeight: 600,
                }}
              >
                {overrideCount} {overrideCount === 1 ? 'override' : 'overrides'}
              </span>
            ) : (
              <span style={{ color: '#6B7280', fontSize: '0.66rem' }}>Synced with master</span>
            )}
          </div>

          {/* Instance Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <button
              id="sz-reset-overrides-btn"
              onClick={() => onResetOverrides?.(selectedNode.id)}
              disabled={overrideCount === 0}
              style={{
                flex: 1,
                background: overrideCount > 0 ? '#1F2430' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid ' + (overrideCount > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.08)'),
                color: overrideCount > 0 ? '#FBBF24' : '#6B7280',
                borderRadius: '4px',
                padding: '4px 6px',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: overrideCount > 0 ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
              title="Reset all instance overrides to match master component"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>

            <button
              id="sz-push-to-master-btn"
              onClick={() => onPushToMaster?.(selectedNode.id)}
              style={{
                flex: 1,
                background: '#1F2430',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#C4B5FD',
                borderRadius: '4px',
                padding: '4px 6px',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
              title="Push instance changes to master component and propagate to other instances"
            >
              <ArrowUpCircle size={10} />
              <span>Push to Master</span>
            </button>

            <button
              id="sz-detach-instance-btn"
              onClick={() => onDetachInstance?.(selectedNode.id)}
              style={{
                background: '#1F2430',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                borderRadius: '4px',
                padding: '4px 6px',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
              }}
              title="Detach instance into independent layer"
            >
              <Unlink size={10} />
              <span>Detach</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 2. STUDIO 2.0 TABS: ESSENTIALS | DESIGN | BEHAVIOR | ADVANCED ── */}
      <div
        id="sz-inspector-tabs"
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#14151B',
        }}
      >
        {[
          { id: 'essentials', label: 'Essentials' },
          { id: 'design', label: 'Design' },
          { id: 'behavior', label: 'Behavior' },
          { id: 'advanced', label: 'Advanced' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`sz-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as InspectorTab)}
              style={{
                flex: 1,
                padding: '9px 0',
                background: isActive ? '#1A1C22' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                fontSize: '0.72rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 3. TAB CONTENT WORKSPACE ── */}
      <div className="sz-custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* ══════════ TAB 1: ESSENTIALS ══════════ */}
        {activeTab === 'essentials' && (
          <>
            {/* TEXT ESSENTIALS */}
            {isText && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Text Content</label>
                    {isInstance && instanceOverrides.textContent !== undefined && (
                      <span
                        id="sz-override-indicator-textContent"
                        style={{
                          fontSize: '0.62rem',
                          color: '#FBBF24',
                          background: 'rgba(245, 158, 11, 0.15)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        Overridden
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isInstance && instanceOverrides.textContent !== undefined && onResetOverrides && (
                      <button
                        id="sz-reset-override-textContent"
                        onClick={() => onResetOverrides(selectedNode.id, 'textContent')}
                        title="Reset text to master value"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#FBBF24',
                          cursor: 'pointer',
                          padding: '1px 3px',
                        }}
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}
                    <BreakpointIndicator />
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={selectedNode.textContent || ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { textContent: e.target.value })}
                  style={{
                    background: '#1F2229',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            )}

            {/* IMAGE ESSENTIALS */}
            {isImage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Image Source</label>
                  <button
                    onClick={onOpenAssetPicker}
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60A5FA',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                    }}
                  >
                    Browse Library
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    id="sz-inspector-image-url-input"
                    type="text"
                    value={selectedNode.smartProps?.url || (selectedNode as any).src || (selectedNode as any).imageUrl || ''}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), url: newUrl },
                        src: newUrl,
                      } as any);
                    }}
                    placeholder="https://..."
                    style={{
                      flex: 1,
                      background: '#1F2229',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                  <label
                    id="sz-inspector-image-upload-label"
                    title="Upload Local Image"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#2A2D37',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={13} />
                    <input
                      id="sz-inspector-upload-image"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const asset = await FileUploadService.uploadFile(file);
                          onUpdateNode(selectedNode.id, {
                            smartProps: { ...(selectedNode.smartProps || {}), url: asset.url, assetId: asset.id },
                            src: asset.url,
                          } as any);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Fit Mode */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Object Fit</label>
                  <div style={{ display: 'flex', gap: '3px', background: '#1F2229', borderRadius: '5px', padding: '2px' }}>
                    {(['cover', 'contain', 'fill'] as const).map((fit) => (
                      <button
                        key={fit}
                        id={`sz-inspector-fit-${fit}`}
                        onClick={() =>
                          onUpdateStyle(selectedNode.id, {
                            objectFit: fit,
                          })
                        }
                        style={{
                          background: style.objectFit === fit ? '#2A2D37' : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          color: style.objectFit === fit ? '#3B82F6' : '#9CA3AF',
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Aspect Ratio</label>
                    <span style={{ fontSize: '0.64rem', color: '#60A5FA' }}>
                      {style.aspectRatio || 'Auto'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px' }}>
                    {[
                      { label: 'Auto', val: undefined },
                      { label: '16:9', val: '16 / 9' },
                      { label: '4:3', val: '4 / 3' },
                      { label: '1:1', val: '1 / 1' },
                      { label: '3:4', val: '3 / 4' },
                      { label: '9:16', val: '9 / 16' },
                    ].map((ar) => (
                      <button
                        key={ar.label}
                        id={`sz-aspect-ratio-${ar.label.replace(':', '-')}`}
                        onClick={() =>
                          onUpdateStyle(selectedNode.id, {
                            aspectRatio: ar.val,
                          })
                        }
                        style={{
                          background: style.aspectRatio === ar.val ? '#2563EB' : '#1F2229',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 0',
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          color: style.aspectRatio === ar.val ? '#FFFFFF' : '#9CA3AF',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Focal Point Picker (Rule of Thirds) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Focal Point & Center</label>
                    <span style={{ fontSize: '0.64rem', color: '#60A5FA' }}>
                      {style.focalPoint ? `${style.focalPoint.x}% ${style.focalPoint.y}%` : '50% 50%'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* 3x3 Interactive Anchor Matrix */}
                    <div
                      id="sz-focal-point-matrix"
                      style={{
                        width: '74px',
                        height: '74px',
                        background: '#121418',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gridTemplateRows: 'repeat(3, 1fr)',
                        padding: '3px',
                        gap: '3px',
                        position: 'relative',
                        flexShrink: 0,
                      }}
                    >
                      {[
                        { x: 0, y: 0, label: 'top-left' },
                        { x: 50, y: 0, label: 'top-center' },
                        { x: 100, y: 0, label: 'top-right' },
                        { x: 0, y: 50, label: 'center-left' },
                        { x: 50, y: 50, label: 'center-center' },
                        { x: 100, y: 50, label: 'center-right' },
                        { x: 0, y: 100, label: 'bottom-left' },
                        { x: 50, y: 100, label: 'bottom-center' },
                        { x: 100, y: 100, label: 'bottom-right' },
                      ].map((pt) => {
                        const currentX = style.focalPoint?.x ?? 50;
                        const currentY = style.focalPoint?.y ?? 50;
                        const isSelected = currentX === pt.x && currentY === pt.y;

                        return (
                          <button
                            key={pt.label}
                            id={`sz-focal-btn-${pt.label}`}
                            onClick={() =>
                              onUpdateStyle(selectedNode.id, {
                                focalPoint: { x: pt.x, y: pt.y },
                                objectPosition: `${pt.x}% ${pt.y}%`,
                              })
                            }
                            title={`${pt.label} (${pt.x}%, ${pt.y}%)`}
                            style={{
                              background: isSelected ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)',
                              border: isSelected ? '1px solid #60A5FA' : 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              boxShadow: isSelected ? '0 0 6px rgba(59, 130, 246, 0.6)' : undefined,
                            }}
                          >
                            <span
                              style={{
                                width: isSelected ? '5px' : '3px',
                                height: isSelected ? '5px' : '3px',
                                borderRadius: '50%',
                                background: isSelected ? '#FFFFFF' : '#6B7280',
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* Fine-Tuning Coordinate Sliders */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.62rem', color: '#6B7280', width: '12px' }}>X</span>
                        <input
                          id="sz-focal-x-slider"
                          type="range"
                          min="0"
                          max="100"
                          value={style.focalPoint?.x ?? 50}
                          onChange={(e) => {
                            const newX = Number(e.target.value);
                            const currentY = style.focalPoint?.y ?? 50;
                            onUpdateStyle(selectedNode.id, {
                              focalPoint: { x: newX, y: currentY },
                              objectPosition: `${newX}% ${currentY}%`,
                            });
                          }}
                          style={{ flex: 1, height: '4px', accentColor: '#3B82F6' }}
                        />
                        <span style={{ fontSize: '0.62rem', color: '#9CA3AF', width: '28px', textAlign: 'right' }}>
                          {style.focalPoint?.x ?? 50}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.62rem', color: '#6B7280', width: '12px' }}>Y</span>
                        <input
                          id="sz-focal-y-slider"
                          type="range"
                          min="0"
                          max="100"
                          value={style.focalPoint?.y ?? 50}
                          onChange={(e) => {
                            const newY = Number(e.target.value);
                            const currentX = style.focalPoint?.x ?? 50;
                            onUpdateStyle(selectedNode.id, {
                              focalPoint: { x: currentX, y: newY },
                              objectPosition: `${currentX}% ${newY}%`,
                            });
                          }}
                          style={{ flex: 1, height: '4px', accentColor: '#3B82F6' }}
                        />
                        <span style={{ fontSize: '0.62rem', color: '#9CA3AF', width: '28px', textAlign: 'right' }}>
                          {style.focalPoint?.y ?? 50}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Filters & Adjustments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Image Adjustments</label>
                    {style.filter && (
                      <button
                        onClick={() => onUpdateStyle(selectedNode.id, { filter: undefined })}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '0.62rem', cursor: 'pointer' }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {[
                      { label: 'Normal', filter: undefined },
                      { label: 'B&W', filter: 'grayscale(100%)' },
                      { label: 'Warm Gold', filter: 'sepia(30%) brightness(105%)' },
                      { label: 'Vibrant', filter: 'saturate(140%) contrast(110%)' },
                      { label: 'Cinematic', filter: 'contrast(120%) brightness(95%)' },
                      { label: 'Dreamy', filter: 'blur(1px) brightness(110%)' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => onUpdateStyle(selectedNode.id, { filter: preset.filter })}
                        style={{
                          background: style.filter === preset.filter ? '#2563EB' : '#1F2229',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 0',
                          fontSize: '0.62rem',
                          color: style.filter === preset.filter ? '#FFFFFF' : '#9CA3AF',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BUTTON ESSENTIALS */}
            {isButton && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Button Label</label>
                <input
                  type="text"
                  value={selectedNode.textContent || 'Click Here'}
                  onChange={(e) => onUpdateNode(selectedNode.id, { textContent: e.target.value })}
                  style={{
                    background: '#1F2229',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.76rem',
                    outline: 'none',
                  }}
                />

                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', marginTop: '4px' }}>
                  Destination Link
                </label>
                <input
                  id="sz-inspector-button-link"
                  type="text"
                  value={selectedNode.smartProps?.href || (selectedNode.interactions?.[0]?.onClick as any)?.url || ''}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      smartProps: { ...(selectedNode.smartProps || {}), href: e.target.value },
                      interactions: [
                        {
                          trigger: 'onTap',
                          action: 'navigate',
                          payload: { url: e.target.value },
                          onClick: { action: 'navigate', url: e.target.value },
                        },
                      ],
                    })
                  }
                  placeholder="#section or https://..."
                  style={{
                    background: '#1F2229',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.74rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* COUNTDOWN CHRONOMETER ESSENTIALS */}
            {isCountdown && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#191C24', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} style={{ color: '#F59E0B' }} /> Event Countdown
                  </label>
                  <span style={{ fontSize: '0.62rem', color: '#F59E0B', fontWeight: 600 }}>Astrolabe Sync</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Target Date & Time</label>
                  <input
                    id="sz-inspector-countdown-date"
                    type="datetime-local"
                    value={selectedNode.smartProps?.targetDate || '2026-12-31T18:00'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), targetDate: e.target.value },
                      })
                    }
                    style={{
                      background: '#121418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Display Style</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {(['cosmic', 'editorial', 'minimal', 'cards'] as const).map((cstyle) => {
                      const active = (selectedNode.smartProps?.displayStyle || 'cosmic') === cstyle;
                      return (
                        <button
                          key={cstyle}
                          id={`sz-inspector-countdown-style-${cstyle}`}
                          onClick={() =>
                            onUpdateNode(selectedNode.id, {
                              smartProps: { ...(selectedNode.smartProps || {}), displayStyle: cstyle },
                            })
                          }
                          style={{
                            background: active ? '#2563EB' : '#121418',
                            border: active ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '4px',
                            padding: '3px 0',
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            color: active ? '#FFFFFF' : '#9CA3AF',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {cstyle}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#D1D5DB' }}>Show Unit Labels (Days/Hrs/Min/Sec)</span>
                  <input
                    id="sz-inspector-countdown-labels-toggle"
                    type="checkbox"
                    checked={selectedNode.smartProps?.showLabels !== false}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), showLabels: e.target.checked },
                      })
                    }
                    style={{ accentColor: '#3B82F6', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {/* FORM / RSVP ESSENTIALS */}
            {isForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#191C24', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6EE7B7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Send size={12} style={{ color: '#10B981' }} /> Interactive RSVP Form
                  </label>
                  <span style={{ fontSize: '0.62rem', color: '#10B981', fontWeight: 600 }}>Zero-Trust Lead Flow</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Form Submission Action</label>
                  <select
                    id="sz-inspector-form-action-select"
                    value={selectedNode.smartProps?.formAction || 'crm_lead'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), formAction: e.target.value },
                      })
                    }
                    style={{
                      background: '#121418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  >
                    <option value="crm_lead">OrbitoX CRM (Auto-create Lead)</option>
                    <option value="email">Email Notification</option>
                    <option value="webhook">Custom Webhook Endpoint</option>
                    <option value="spreadsheet">Connected Spreadsheet</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Submit Button Label</label>
                  <input
                    id="sz-inspector-form-submit-label"
                    type="text"
                    value={selectedNode.smartProps?.submitLabel || 'Confirm Attendance'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), submitLabel: e.target.value },
                      })
                    }
                    style={{
                      background: '#121418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Success Confirmation Message</label>
                  <input
                    id="sz-inspector-form-success-msg"
                    type="text"
                    value={selectedNode.smartProps?.successMessage || 'Thank you! Your response has been securely recorded.'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), successMessage: e.target.value },
                      })
                    }
                    style={{
                      background: '#121418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {/* MAP / VENUE ESSENTIALS */}
            {isMap && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#191C24', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F472B6', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={12} style={{ color: '#EC4899' }} /> Venue & Interactive Map
                  </label>
                  <span style={{ fontSize: '0.62rem', color: '#EC4899', fontWeight: 600 }}>Wayfinding</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Venue / Sanctuary Name</label>
                  <input
                    id="sz-inspector-map-venue-name"
                    type="text"
                    value={selectedNode.smartProps?.venueName || 'The Celestial Sanctuary Estate'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), venueName: e.target.value },
                      })
                    }
                    style={{
                      background: '#121418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Physical Address</label>
                  <input
                    id="sz-inspector-map-address"
                    type="text"
                    value={selectedNode.smartProps?.address || 'Villa Balbianello, Via Como, Tremezzina, Lake Como, Italy'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), address: e.target.value },
                      })
                    }
                    style={{
                      background: '#121418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Coordinates (Lat, Lng)</label>
                    <input
                      id="sz-inspector-map-coords"
                      type="text"
                      value={selectedNode.smartProps?.coordinates || '45.9868, 9.2572'}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), coordinates: e.target.value },
                        })
                      }
                      style={{
                        background: '#121418',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '5px',
                        padding: '4px 6px',
                        color: '#FFFFFF',
                        fontSize: '0.74rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Map Zoom</label>
                      <span style={{ fontSize: '0.64rem', color: '#EC4899', fontWeight: 600 }}>{selectedNode.smartProps?.zoomLevel || 15}x</span>
                    </div>
                    <input
                      id="sz-inspector-map-zoom-slider"
                      type="range"
                      min="1"
                      max="20"
                      value={selectedNode.smartProps?.zoomLevel || 15}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), zoomLevel: Number(e.target.value) },
                        })
                      }
                      style={{ height: '4px', accentColor: '#EC4899', marginTop: '6px' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3D SPATIAL COMPUTING ESSENTIALS */}
            {isThreeD && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#191C24', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C4B5FD', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Box size={12} style={{ color: '#8B5CF6' }} /> 3D Spatial Geometry
                  </label>
                  <span style={{ fontSize: '0.62rem', color: '#8B5CF6', fontWeight: 600 }}>WebGL 60 FPS</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>3D Mesh Primitive</label>
                  <select
                    id="sz-inspector-3d-mesh-select"
                    value={selectedNode.smartProps?.meshShape || 'orbital_rings'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), meshShape: e.target.value },
                      })
                    }
                    style={{
                      background: '#121418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  >
                    <option value="orbital_rings">Astrolabe Orbital Rings</option>
                    <option value="torus_knot">Celestial Torus Knot</option>
                    <option value="sphere">Gravitational Sphere</option>
                    <option value="starlight_cloud">Starlight Particle Cloud</option>
                    <option value="cylinder">Prismatic Cylinder</option>
                    <option value="custom_gltf">Custom GLTF / GLB Model</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Rotation Speed</label>
                    <span style={{ fontSize: '0.64rem', color: '#8B5CF6', fontWeight: 600 }}>
                      {(selectedNode.smartProps?.rotationSpeed || 1.0).toFixed(1)}x
                    </span>
                  </div>
                  <input
                    id="sz-inspector-3d-speed-slider"
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={selectedNode.smartProps?.rotationSpeed ?? 1.0}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), rotationSpeed: Number(e.target.value) },
                      })
                    }
                    style={{ height: '4px', accentColor: '#8B5CF6' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#D1D5DB', cursor: 'pointer' }}>
                    <input
                      id="sz-inspector-3d-wireframe-toggle"
                      type="checkbox"
                      checked={Boolean(selectedNode.smartProps?.wireframe)}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), wireframe: e.target.checked },
                        })
                      }
                      style={{ accentColor: '#8B5CF6' }}
                    />
                    <span>Wireframe Mode</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#D1D5DB', cursor: 'pointer' }}>
                    <input
                      id="sz-inspector-3d-interactive-toggle"
                      type="checkbox"
                      checked={selectedNode.smartProps?.interactiveTilt !== false}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), interactiveTilt: e.target.checked },
                        })
                      }
                      style={{ accentColor: '#8B5CF6' }}
                    />
                    <span>Cursor Gyro Tilt</span>
                  </label>
                </div>
              </div>
            )}

            {/* VIDEO ESSENTIALS */}
            {isVideo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#191C24', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#67E8F9', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <VideoIcon size={12} style={{ color: '#06B6D4' }} /> Video Stream
                  </label>
                  <span style={{ fontSize: '0.62rem', color: '#06B6D4', fontWeight: 600 }}>HTML5 Video</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Video Source URL</label>
                  <input
                    id="sz-inspector-video-url-input"
                    type="text"
                    value={selectedNode.smartProps?.url || (selectedNode as any).src || ''}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        smartProps: { ...(selectedNode.smartProps || {}), url: e.target.value },
                        src: e.target.value,
                      } as any)
                    }
                    placeholder="https://... (mp4 or webm)"
                    style={{
                      background: '#121418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#D1D5DB', cursor: 'pointer' }}>
                    <input
                      id="sz-inspector-video-autoplay"
                      type="checkbox"
                      checked={selectedNode.smartProps?.autoplay !== false}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), autoplay: e.target.checked },
                        })
                      }
                      style={{ accentColor: '#06B6D4' }}
                    />
                    <span>Autoplay</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#D1D5DB', cursor: 'pointer' }}>
                    <input
                      id="sz-inspector-video-muted"
                      type="checkbox"
                      checked={selectedNode.smartProps?.muted !== false}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), muted: e.target.checked },
                        })
                      }
                      style={{ accentColor: '#06B6D4' }}
                    />
                    <span>Muted</span>
                  </label>
                </div>
              </div>
            )}

            {/* GALLERY ESSENTIALS */}
            {isGallery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#191C24', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FDE047', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ImageIcon size={12} style={{ color: '#EAB308' }} /> Curated Media Gallery
                  </label>
                  <span style={{ fontSize: '0.62rem', color: '#EAB308', fontWeight: 600 }}>Lightbox Active</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Layout Presentation</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {(['grid', 'masonry', 'carousel'] as const).map((glayout) => {
                      const active = (selectedNode.smartProps?.layout || 'grid') === glayout;
                      return (
                        <button
                          key={glayout}
                          id={`sz-inspector-gallery-layout-${glayout}`}
                          onClick={() =>
                            onUpdateNode(selectedNode.id, {
                              smartProps: { ...(selectedNode.smartProps || {}), layout: glayout },
                            })
                          }
                          style={{
                            background: active ? '#2563EB' : '#121418',
                            border: active ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '4px',
                            padding: '3px 0',
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            color: active ? '#FFFFFF' : '#9CA3AF',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {glayout}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Columns (Desktop)</label>
                    <select
                      id="sz-inspector-gallery-cols-select"
                      value={selectedNode.smartProps?.columns || 3}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), columns: Number(e.target.value) },
                        })
                      }
                      style={{
                        background: '#121418',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '5px',
                        padding: '4px 6px',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        outline: 'none',
                      }}
                    >
                      <option value={2}>2 Columns</option>
                      <option value={3}>3 Columns</option>
                      <option value={4}>4 Columns</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Item Gap</label>
                    <input
                      id="sz-inspector-gallery-gap-input"
                      type="text"
                      value={selectedNode.smartProps?.gap || '16px'}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), gap: e.target.value },
                        })
                      }
                      style={{
                        background: '#121418',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '5px',
                        padding: '4px 6px',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DIMENSIONS (Width / Height) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Dimensions</label>
                <BreakpointIndicator propertyKey="width" subPath="geometry" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#1F2229', borderRadius: '6px', padding: '2px 8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#6B7280', marginRight: '6px' }}>W</span>
                  <input
                    type="text"
                    value={geom.width || 'auto'}
                    onChange={(e) => onUpdateGeometry(selectedNode.id, { width: e.target.value })}
                    style={{ background: 'transparent', border: 'none', color: '#FFFFFF', fontSize: '0.76rem', width: '100%', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', background: '#1F2229', borderRadius: '6px', padding: '2px 8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#6B7280', marginRight: '6px' }}>H</span>
                  <input
                    type="text"
                    value={geom.height || 'auto'}
                    onChange={(e) => onUpdateGeometry(selectedNode.id, { height: e.target.value })}
                    style={{ background: 'transparent', border: 'none', color: '#FFFFFF', fontSize: '0.76rem', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* LAYOUT ENGINE (Flex / Grid / Flow) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Layout Direction</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {[
                  { id: 'horizontal', label: 'Row ➔' },
                  { id: 'vertical', label: 'Column ⬇' },
                  { id: 'grid', label: 'Grid ☷' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() =>
                      onUpdateNode(selectedNode.id, {
                        layoutConfig: { ...layout, direction: l.id as any } as any,
                      })
                    }
                    style={{
                      background: layout.direction === l.id ? '#2A2D37' : '#1F2229',
                      border: layout.direction === l.id ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '5px',
                      padding: '6px',
                      color: layout.direction === l.id ? '#FFFFFF' : '#9CA3AF',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════ TAB 2: DESIGN ══════════ */}
        {activeTab === 'design' && (
          <>
            {/* TYPOGRAPHY SPECIMEN PICKER (If text) */}
            {isText && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Font Family</label>
                  <BreakpointIndicator propertyKey="fontFamily" subPath="typography" />
                </div>
                <select
                  value={typo.fontFamily || 'Inter'}
                  onChange={(e) =>
                    onUpdateStyle(selectedNode.id, {
                      typography: { ...typo, fontFamily: e.target.value },
                    })
                  }
                  style={{
                    background: '#1F2229',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.76rem',
                    outline: 'none',
                  }}
                >
                  <option value="Inter">Inter (Sans Modern)</option>
                  <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                  <option value="Cinzel">Cinzel (Royal Classical)</option>
                  <option value="Space Grotesk">Space Grotesk (Tech Monospace)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Clean Minimal)</option>
                  <option value="Outfit">Outfit (Geometric Brand)</option>
                </select>

                {/* Size & Weight */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Size</label>
                    <input
                      type="text"
                      value={typo.fontSize || '1rem'}
                      onChange={(e) =>
                        onUpdateStyle(selectedNode.id, {
                          typography: { ...typo, fontSize: e.target.value },
                        })
                      }
                      style={{
                        background: '#1F2229',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        color: '#FFFFFF',
                        fontSize: '0.74rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Weight</label>
                    <select
                      value={typo.fontWeight || '400'}
                      onChange={(e) =>
                        onUpdateStyle(selectedNode.id, {
                          typography: { ...typo, fontWeight: e.target.value },
                        })
                      }
                      style={{
                        background: '#1F2229',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        color: '#FFFFFF',
                        fontSize: '0.74rem',
                        outline: 'none',
                      }}
                    >
                      <option value="300">Light (300)</option>
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semibold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Black (800)</option>
                    </select>
                  </div>
                </div>

                {/* Text Alignment */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Align</label>
                  <div style={{ display: 'flex', gap: '2px', background: '#1F2229', borderRadius: '5px', padding: '2px' }}>
                    {(['left', 'center', 'right', 'justify'] as const).map((align) => {
                      const isCur = typo.textAlign === align || (align === 'left' && !typo.textAlign);
                      return (
                        <button
                          key={align}
                          onClick={() =>
                            onUpdateStyle(selectedNode.id, {
                              typography: { ...typo, textAlign: align },
                            })
                          }
                          style={{
                            background: isCur ? '#2A2D37' : 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px',
                            color: isCur ? '#3B82F6' : '#9CA3AF',
                            cursor: 'pointer',
                          }}
                        >
                          {align === 'left' && <AlignLeft size={13} />}
                          {align === 'center' && <AlignCenter size={13} />}
                          {align === 'right' && <AlignRight size={13} />}
                          {align === 'justify' && <AlignJustify size={13} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VISUAL BOX MODEL (4-SIDED MARGIN & PADDING) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Box Model (Margin & Padding)</label>
                <BreakpointIndicator propertyKey="padding" />
              </div>

              {/* Concentric Box Model Diagram */}
              <div
                id="sz-box-model-container"
                style={{
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  position: 'relative',
                }}
              >
                {/* MARGIN HEADER & TOP INPUT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '0.62rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Margin
                  </span>
                  <input
                    id="sz-box-margin-top"
                    type="text"
                    value={marSides.top}
                    onChange={(e) => handleMarginChange('top', e.target.value)}
                    placeholder="0"
                    style={{
                      width: '44px',
                      background: '#1F2229',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      color: '#FDE68A',
                      fontSize: '0.68rem',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  <span style={{ width: '36px' }} />
                </div>

                {/* MIDDLE ROW: MARGIN LEFT, PADDING BOX, MARGIN RIGHT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                  <input
                    id="sz-box-margin-left"
                    type="text"
                    value={marSides.left}
                    onChange={(e) => handleMarginChange('left', e.target.value)}
                    placeholder="0"
                    style={{
                      width: '40px',
                      background: '#1F2229',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      color: '#FDE68A',
                      fontSize: '0.68rem',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />

                  {/* INNER PADDING BOX (BLUE) */}
                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px dashed rgba(59, 130, 246, 0.45)',
                      borderRadius: '6px',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {/* PADDING HEADER & TOP INPUT */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '0.58rem', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Padding
                      </span>
                      <input
                        id="sz-box-padding-top"
                        type="text"
                        value={padSides.top}
                        onChange={(e) => handlePaddingChange('top', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '40px',
                          background: '#191C24',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          padding: '2px 4px',
                          color: '#93C5FD',
                          fontSize: '0.68rem',
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                      <span style={{ width: '32px' }} />
                    </div>

                    {/* MIDDLE PADDING ROW: PADDING LEFT, CONTENT PILL, PADDING RIGHT */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '4px' }}>
                      <input
                        id="sz-box-padding-left"
                        type="text"
                        value={padSides.left}
                        onChange={(e) => handlePaddingChange('left', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '36px',
                          background: '#191C24',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          padding: '2px 4px',
                          color: '#93C5FD',
                          fontSize: '0.68rem',
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />

                      {/* CENTER CONTENT DIMENSIONS PILL */}
                      <div
                        id="sz-box-content-dimensions"
                        style={{
                          background: '#22252F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '0.66rem',
                          color: '#E5E7EB',
                          fontWeight: 600,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {geom.width || 'auto'} × {geom.height || 'auto'}
                      </div>

                      <input
                        id="sz-box-padding-right"
                        type="text"
                        value={padSides.right}
                        onChange={(e) => handlePaddingChange('right', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '36px',
                          background: '#191C24',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          padding: '2px 4px',
                          color: '#93C5FD',
                          fontSize: '0.68rem',
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* PADDING BOTTOM INPUT */}
                    <input
                      id="sz-box-padding-bottom"
                      type="text"
                      value={padSides.bottom}
                      onChange={(e) => handlePaddingChange('bottom', e.target.value)}
                      placeholder="0"
                      style={{
                        width: '40px',
                        background: '#191C24',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '4px',
                        padding: '2px 4px',
                        color: '#93C5FD',
                        fontSize: '0.68rem',
                        textAlign: 'center',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <input
                    id="sz-box-margin-right"
                    type="text"
                    value={marSides.right}
                    onChange={(e) => handleMarginChange('right', e.target.value)}
                    placeholder="0"
                    style={{
                      width: '40px',
                      background: '#1F2229',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      color: '#FDE68A',
                      fontSize: '0.68rem',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* MARGIN BOTTOM INPUT */}
                <input
                  id="sz-box-margin-bottom"
                  type="text"
                  value={marSides.bottom}
                  onChange={(e) => handleMarginChange('bottom', e.target.value)}
                  placeholder="0"
                  style={{
                    width: '44px',
                    background: '#1F2229',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    color: '#FDE68A',
                    fontSize: '0.68rem',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />

                {/* Direct Padding Quick Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.62rem', color: '#6B7280' }}>Padding X</span>
                    <input
                      id="sz-inspector-padding-x"
                      type="text"
                      placeholder="1.5rem"
                      value={style.paddingX || padSides.left || ''}
                      onChange={(e) => {
                        const px = e.target.value;
                        const py = style.paddingY || padSides.top || '0';
                        onUpdateStyle(selectedNode.id, {
                          paddingX: px,
                          paddingLeft: px,
                          paddingRight: px,
                          padding: `${py} ${px}`,
                        });
                      }}
                      style={{ background: '#1F2229', border: 'none', borderRadius: '4px', padding: '3px 6px', color: '#FFFFFF', fontSize: '0.72rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.62rem', color: '#6B7280' }}>Padding Y</span>
                    <input
                      id="sz-inspector-padding-y"
                      type="text"
                      placeholder="1rem"
                      value={style.paddingY || padSides.top || ''}
                      onChange={(e) => {
                        const py = e.target.value;
                        const px = style.paddingX || padSides.left || '0';
                        onUpdateStyle(selectedNode.id, {
                          paddingY: py,
                          paddingTop: py,
                          paddingBottom: py,
                          padding: `${py} ${px}`,
                        });
                      }}
                      style={{ background: '#1F2229', border: 'none', borderRadius: '4px', padding: '3px 6px', color: '#FFFFFF', fontSize: '0.72rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CORNER RADIUS (Linked & Decoupled) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Corner Radius</label>
                <button
                  onClick={() => setIsRadiusLinked(!isRadiusLinked)}
                  title={isRadiusLinked ? 'Unlink 4 Corners' : 'Link All Corners'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isRadiusLinked ? '#3B82F6' : '#9CA3AF',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  {isRadiusLinked ? <Link2 size={13} /> : <Unlink size={13} />}
                </button>
              </div>

              {isRadiusLinked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={
                      parseInt(
                        style.borderRadius?.all ||
                        (typeof style.border?.radius === 'object' ? (style.border.radius as any)?.all || (style.border.radius as any)?.tl : (style.border?.radius as string)) ||
                        '0'
                      ) || 0
                    }
                    onChange={(e) => {
                      const v = `${e.target.value}px`;
                      onUpdateStyle(selectedNode.id, {
                        border: {
                          ...(style.border || {}),
                          radius: { tl: v, tr: v, br: v, bl: v, all: v },
                        },
                        borderRadius: { all: v, tl: v, tr: v, br: v, bl: v },
                      });
                    }}
                    style={{ flex: 1, accentColor: '#3B82F6' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#FFFFFF', width: '35px', textAlign: 'right' }}>
                    {style.borderRadius?.all ||
                      (typeof style.border?.radius === 'object' ? (style.border.radius as any)?.all || (style.border.radius as any)?.tl : (style.border?.radius as string)) ||
                      '0px'}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {(['TL', 'TR', 'BR', 'BL'] as const).map((corner) => {
                    const cornerKey = corner === 'TL' ? 'tl' : corner === 'TR' ? 'tr' : corner === 'BR' ? 'br' : 'bl';
                    const curVal =
                      typeof style.border?.radius === 'object'
                        ? (style.border.radius as any)[cornerKey] || ''
                        : style.borderRadius?.[cornerKey] || '';
                    return (
                      <input
                        key={corner}
                        id={`sz-inspector-radius-${cornerKey}`}
                        type="text"
                        placeholder={corner}
                        value={curVal}
                        onChange={(e) => {
                          const v = e.target.value;
                          const existing = typeof style.border?.radius === 'object' ? style.border.radius : {};
                          onUpdateStyle(selectedNode.id, {
                            border: {
                              ...(style.border || {}),
                              radius: { ...existing, [cornerKey]: v },
                            },
                            borderRadius: {
                              ...(style.borderRadius || {}),
                              [cornerKey]: v,
                            },
                          });
                        }}
                        style={{
                          background: '#1F2229',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '4px',
                          padding: '4px',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          textAlign: 'center',
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* OPACITY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Opacity</label>
                <span style={{ fontSize: '0.72rem', color: '#FFFFFF' }}>
                  {Math.round((geom.opacity !== undefined ? geom.opacity : 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round((geom.opacity !== undefined ? geom.opacity : 1) * 100)}
                onChange={(e) => onUpdateGeometry(selectedNode.id, { opacity: Number(e.target.value) / 100 })}
                style={{ width: '100%', accentColor: '#3B82F6' }}
              />
            </div>
          </>
        )}

        {/* ══════════ TAB 3: BEHAVIOR ══════════ */}
        {activeTab === 'behavior' && (
          <>
            {/* PARALLAX DEPTH PLANE (-5 to +5) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Parallax Depth Plane</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    id="sz-inspector-depth-value"
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: (style.depthPlane ?? 0) === 0 ? '#9CA3AF' : (style.depthPlane ?? 0) > 0 ? '#60A5FA' : '#F59E0B',
                      background: '#1F2229',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {(style.depthPlane ?? 0) > 0 ? `+${style.depthPlane}` : (style.depthPlane ?? 0)}
                  </span>
                  <BreakpointIndicator propertyKey="depthPlane" />
                </div>
              </div>

              {/* Depth Slider (-5 to +5) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                  id="sz-inspector-depth-slider"
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={style.depthPlane ?? 0}
                  onChange={(e) => {
                    const depthVal = parseInt(e.target.value, 10);
                    onUpdateStyle(selectedNode.id, { depthPlane: depthVal });
                  }}
                  style={{
                    width: '100%',
                    accentColor: '#3B82F6',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#6B7280' }}>
                  <span>-5 (Deep BG)</span>
                  <span>0 (Neutral)</span>
                  <span>+5 (Foreground)</span>
                </div>
              </div>

              {/* Quick Plane Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {[
                  { depth: -4, id: 'background', label: 'Deep BG (-4)' },
                  { depth: -2, id: 'atmosphere', label: 'Atmosphere (-2)' },
                  { depth: 0, id: 'neutral', label: 'Canvas (0)' },
                  { depth: 2, id: 'midground', label: 'Midground (+2)' },
                  { depth: 4, id: 'foreground', label: 'Foreground (+4)' },
                  { depth: 5, id: 'ui', label: 'Float UI (+5)' },
                ].map((plane) => {
                  const isCurrent = (style.depthPlane ?? 0) === plane.depth;
                  return (
                    <button
                      key={plane.id}
                      id={`sz-inspector-plane-${plane.id}`}
                      onClick={() => {
                        onUpdateStyle(selectedNode.id, { depthPlane: plane.depth });
                        onUpdateNode(selectedNode.id, {
                          smartProps: { ...(selectedNode.smartProps || {}), depthPlane: plane.id },
                        });
                      }}
                      style={{
                        background: isCurrent ? 'rgba(59, 130, 246, 0.2)' : '#1F2229',
                        border: isCurrent ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '5px',
                        padding: '6px',
                        color: isCurrent ? '#60A5FA' : '#9CA3AF',
                        fontSize: '0.64rem',
                        cursor: 'pointer',
                        fontWeight: isCurrent ? 600 : 400,
                      }}
                    >
                      {plane.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MOTION PRESET SELECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Entrance Motion Preset</label>
                <span style={{ fontSize: '0.62rem', color: '#DFBA6B', fontWeight: 600 }}>GSAP / CSS</span>
              </div>
              <select
                id="sz-inspector-entrance-motion"
                value={selectedNode.motion?.in?.type || 'none'}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    motion: {
                      ...(selectedNode.motion || {}),
                      in: {
                        type: e.target.value as any,
                        duration: selectedNode.motion?.in?.duration || 600,
                        delay: selectedNode.motion?.in?.delay || 0,
                        easing: selectedNode.motion?.in?.easing || 'ease-out',
                      },
                    },
                  })
                }
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  color: '#FFFFFF',
                  fontSize: '0.76rem',
                  outline: 'none',
                }}
              >
                <option value="none">None (Static)</option>
                <option value="fade">Fade Reveal</option>
                <option value="slide-up">Slide Up & Fade</option>
                <option value="slide-down">Slide Down & Fade</option>
                <option value="zoom-in">Depth Zoom In</option>
                <option value="spring">Spring Physics Pop</option>
              </select>
            </div>

            {/* TIMELINE CONTROLS (When Entrance Motion Active) */}
            {selectedNode.motion?.in?.type && selectedNode.motion.in.type !== 'none' && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF' }}>Timeline Duration</span>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#DFBA6B' }}>
                    {selectedNode.motion.in.duration ?? 600}ms
                  </span>
                </div>
                <input
                  id="sz-inspector-motion-duration"
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={selectedNode.motion.in.duration ?? 600}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      motion: {
                        ...(selectedNode.motion || {}),
                        in: {
                          ...(selectedNode.motion?.in || { type: 'fade', delay: 0, easing: 'ease-out' }),
                          duration: parseInt(e.target.value, 10),
                        },
                      },
                    })
                  }
                  style={{ width: '100%', accentColor: '#DFBA6B', cursor: 'pointer' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF' }}>Stagger / Delay</span>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#DFBA6B' }}>
                    {selectedNode.motion.in.delay ?? 0}ms
                  </span>
                </div>
                <input
                  id="sz-inspector-motion-delay"
                  type="range"
                  min="0"
                  max="1500"
                  step="50"
                  value={selectedNode.motion.in.delay ?? 0}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      motion: {
                        ...(selectedNode.motion || {}),
                        in: {
                          ...(selectedNode.motion?.in || { type: 'fade', duration: 600, easing: 'ease-out' }),
                          delay: parseInt(e.target.value, 10),
                        },
                      },
                    })
                  }
                  style={{ width: '100%', accentColor: '#DFBA6B', cursor: 'pointer' }}
                />

                {/* Easing Curve Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF' }}>Easing Curve</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {(['ease-out', 'ease-in-out', 'spring', 'linear'] as const).map((curve) => {
                      const isCurve = (selectedNode.motion?.in?.easing || 'ease-out') === curve;
                      return (
                        <button
                          key={curve}
                          onClick={() =>
                            onUpdateNode(selectedNode.id, {
                              motion: {
                                ...(selectedNode.motion || {}),
                                in: {
                                  ...(selectedNode.motion?.in || { type: 'fade', duration: 600, delay: 0 }),
                                  easing: curve,
                                },
                              },
                            })
                          }
                          style={{
                            background: isCurve ? 'rgba(223, 186, 107, 0.2)' : '#1F2229',
                            border: isCurve ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '4px',
                            padding: '4px 2px',
                            color: isCurve ? '#DFBA6B' : '#9CA3AF',
                            fontSize: '0.62rem',
                            fontWeight: isCurve ? 600 : 400,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {curve === 'ease-in-out' ? 'In-Out' : curve === 'ease-out' ? 'Out' : curve}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* HOVER MICRO-ANIMATION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Hover Micro-Interaction</label>
              <select
                id="sz-inspector-hover-motion"
                value={selectedNode.motion?.hover?.scale ? 'lift' : (selectedNode.smartProps?.hoverEffect || 'none')}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateNode(selectedNode.id, {
                    smartProps: { ...(selectedNode.smartProps || {}), hoverEffect: val },
                    motion: {
                      ...(selectedNode.motion || {}),
                      hover:
                        val === 'lift'
                          ? { scale: 1.03, y: -4, duration: 200 }
                          : val === 'glow'
                          ? { opacity: 1, duration: 200 }
                          : undefined,
                    },
                  });
                }}
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  color: '#FFFFFF',
                  fontSize: '0.76rem',
                  outline: 'none',
                }}
              >
                <option value="none">None</option>
                <option value="lift">Scale 1.03 & Lift Y</option>
                <option value="glow">Specular Rim Glow</option>
                <option value="tilt">3D Perspective Tilt</option>
              </select>
            </div>

            {/* CLICK & INTERACTION TRIGGERS */}
            {(() => {
              const primaryClick = selectedNode.interactions?.find((i) => i.onClick)?.onClick;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Click Interaction Action</label>
                  <select
                    id="sz-inspector-click-action"
                    value={primaryClick?.action || 'none'}
                    onChange={(e) => {
                      const action = e.target.value as any;
                      onUpdateNode(selectedNode.id, {
                        interactions: [
                          {
                            trigger: 'onTap',
                            onClick: {
                              action,
                              url: primaryClick?.url || '',
                              modalId: primaryClick?.modalId || '',
                            },
                          },
                        ],
                      });
                    }}
                    style={{
                      background: '#1F2229',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      padding: '7px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.76rem',
                      outline: 'none',
                    }}
                  >
                    <option value="none">None (Static)</option>
                    <option value="navigate">Navigate to URL / Route</option>
                    <option value="open_modal">Open Modal Dialog</option>
                    <option value="submit">Submit Form / Lead</option>
                  </select>

                  {primaryClick?.action === 'navigate' && (
                    <input
                      id="sz-inspector-click-url"
                      type="text"
                      placeholder="https://... or /contact"
                      value={primaryClick.url || ''}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          interactions: [
                            {
                              trigger: 'onTap',
                              onClick: {
                                action: 'navigate',
                                url: e.target.value,
                              },
                            },
                          ],
                        })
                      }
                      style={{
                        background: '#1F2229',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        outline: 'none',
                      }}
                    />
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* ══════════ TAB 4: ADVANCED ══════════ */}
        {activeTab === 'advanced' && (
          <>
            {/* CMS / DATA BINDING */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Data Variable Binding</label>
              <select
                id="sz-inspector-data-binding"
                value={selectedNode.binding?.fieldKey || ''}
                onChange={(e) => {
                  const fieldKey = e.target.value;
                  onUpdateNode(selectedNode.id, {
                    binding: fieldKey
                      ? { fieldKey, bindingType: isImage ? 'media' : 'content' }
                      : undefined,
                  });
                }}
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  color: '#FFFFFF',
                  fontSize: '0.76rem',
                  outline: 'none',
                }}
              >
                <option value="">None (Static Value)</option>
                <option value="siteTitle">siteTitle (&quot;OrbitoX Platform&quot;)</option>
                <option value="eventName">eventName (&quot;Global Summit&quot;)</option>
                <option value="ticketPrice">ticketPrice (&quot;$499&quot;)</option>
                <option value="primaryHeroImage">primaryHeroImage (Media URL)</option>
              </select>
            </div>

            {/* HTML / SEO SEMANTIC TAG */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Semantic HTML Tag</label>
              <select
                id="sz-inspector-semantic-tag"
                value={selectedNode.smartProps?.semanticTag || 'auto'}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    smartProps: { ...(selectedNode.smartProps || {}), semanticTag: e.target.value },
                  })
                }
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  color: '#FFFFFF',
                  fontSize: '0.76rem',
                  outline: 'none',
                }}
              >
                <option value="auto">Auto (Default)</option>
                <option value="h1">Heading 1 (&lt;h1&gt;)</option>
                <option value="h2">Heading 2 (&lt;h2&gt;)</option>
                <option value="h3">Heading 3 (&lt;h3&gt;)</option>
                <option value="p">Paragraph (&lt;p&gt;)</option>
                <option value="section">Section (&lt;section&gt;)</option>
                <option value="article">Article (&lt;article&gt;)</option>
              </select>
            </div>

            {/* EXPERT / DEVELOPER MODE TOGGLE */}
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: '#14161C',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Code2 size={13} style={{ color: isExpertMode ? '#3B82F6' : '#6B7280' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#D1D5DB' }}>Developer Mode</span>
                </div>
                <input
                  type="checkbox"
                  checked={isExpertMode}
                  onChange={(e) => setIsExpertMode(e.target.checked)}
                  style={{ accentColor: '#3B82F6', cursor: 'pointer' }}
                />
              </div>

              {isExpertMode && (
                <div style={{ fontSize: '0.66rem', color: '#9CA3AF', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '6px' }}>
                  <div>Node ID: {selectedNode.id}</div>
                  <div>Kind: {selectedNode.kind}</div>
                  <div>Z-Index: {geom.zIndex || 0}</div>
                  <div>Transform: x={geom.x || 0}, y={geom.y || 0}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* QUICK AI ACTION BUTTON */}
        {onOpenAi && (
          <button
            onClick={onOpenAi}
            id="sz-inspector-ai-btn"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.15) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '9px 12px',
              color: '#93C5FD',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            <Sparkles size={13} />
            <span>Ask AI About This Layer</span>
          </button>
        )}
      </div>
    </aside>
  );
}
