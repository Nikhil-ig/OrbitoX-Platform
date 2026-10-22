'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Type,
  Square,
  Image as ImageIcon,
  MousePointer,
  Box,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Component as ComponentIcon,
  Sparkles,
} from 'lucide-react';
import { InspectorSharedProps } from './types';
import { SectionInspector } from './SectionInspector';
import { TextInspector } from './TextInspector';
import { FrameInspector } from './FrameInspector';
import { ImageInspector } from './ImageInspector';
import { ButtonInspector } from './ButtonInspector';
import { ThreeDInspector } from './ThreeDInspector';
import { SceneGraphNode } from '@/components/template-studio/engine/SceneGraphTypes';

export interface InspectorHostProps extends InspectorSharedProps {
  selectedNode: SceneGraphNode | null;
}

export function InspectorHost(props: InspectorHostProps) {
  const {
    selectedNode,
    activeScene,
    onUpdateNode,
    onDuplicateNode,
    onDeleteNode,
    onToggleLock,
    onToggleHide,
    onCreateComponent,
    onOpenAi,
    onUpdateStyle,
  } = props;

  const [activeTab, setActiveTab] = useState<'design' | 'behavior' | 'code'>('design');

  // If no node selected: route to SectionInspector
  if (!selectedNode) {
    return <SectionInspector {...props} />;
  }

  const is3D =
    (selectedNode.kind as string) === 'threed' ||
    selectedNode.smartComponent === 'ThreeDViewport' ||
    selectedNode.smartComponent === 'threed';

  // Kind Icon Helper
  const getKindIcon = () => {
    if (is3D) return <Box size={14} style={{ color: '#A78BFA' }} />;
    switch (selectedNode.kind) {
      case 'text':
      case 'richtext':
        return <Type size={14} style={{ color: '#60A5FA' }} />;
      case 'image':
      case 'video':
        return <ImageIcon size={14} style={{ color: '#F472B6' }} />;
      case 'button':
        return <MousePointer size={14} style={{ color: '#34D399' }} />;
      case 'frame':
      case 'stack':
      case 'grid':
      default:
        return <Square size={14} style={{ color: '#A78BFA' }} />;
    }
  };

  // Render contextual body based on node kind
  const renderKindInspector = () => {
    const nodeProps = { ...props, selectedNode };
    if (is3D) return <ThreeDInspector {...nodeProps} />;
    switch (selectedNode.kind) {
      case 'text':
      case 'richtext':
        return <TextInspector {...nodeProps} />;
      case 'image':
      case 'video':
        return <ImageInspector {...nodeProps} />;
      case 'button':
        return <ButtonInspector {...nodeProps} />;
      case 'frame':
      case 'stack':
      case 'grid':
      default:
        return <FrameInspector {...nodeProps} />;
    }
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
          {getKindIcon()}
          <input
            type="text"
            value={selectedNode.name || selectedNode.kind}
            onChange={(e) => onUpdateNode(selectedNode.id, { name: e.target.value })}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 700,
              outline: 'none',
              width: '130px',
              textOverflow: 'ellipsis',
            }}
          />
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {onCreateComponent && !selectedNode.component?.isMaster && (
            <button
              onClick={() => onCreateComponent(selectedNode.id)}
              title="Create Master Component (❖)"
              style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '3px' }}
            >
              <ComponentIcon size={13} />
            </button>
          )}

          <button
            onClick={() => onToggleHide(selectedNode.id)}
            title={selectedNode.hidden ? 'Unhide Layer' : 'Hide Layer'}
            style={{
              background: 'transparent',
              border: 'none',
              color: selectedNode.hidden ? '#EF4444' : '#9CA3AF',
              cursor: 'pointer',
              padding: '3px',
            }}
          >
            {selectedNode.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>

          <button
            onClick={() => onToggleLock(selectedNode.id)}
            title={selectedNode.locked ? 'Unlock Layer' : 'Lock Layer'}
            style={{
              background: 'transparent',
              border: 'none',
              color: selectedNode.locked ? '#F59E0B' : '#9CA3AF',
              cursor: 'pointer',
              padding: '3px',
            }}
          >
            {selectedNode.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>

          <button
            onClick={() => onDuplicateNode(selectedNode.id)}
            title="Duplicate Layer (⌘D)"
            style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '3px' }}
          >
            <Copy size={13} />
          </button>

          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            title="Delete Layer (Del)"
            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '3px' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── 2. INSPECTOR TABS ── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#14161B',
        }}
      >
        {(['design', 'behavior', 'code'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                color: isActive ? '#3B82F6' : '#9CA3AF',
                fontSize: '0.72rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.1s ease',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── 3. TAB CONTENT ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {activeTab === 'design' && renderKindInspector()}

        {activeTab === 'behavior' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(() => {
              const depthPlane = selectedNode.motion?.parallax?.depthPlane ?? selectedNode.style?.depthPlane ?? 0;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Parallax Depth Plane</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="1"
                      value={depthPlane}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        onUpdateNode(selectedNode.id, {
                          motion: {
                            ...(selectedNode.motion || {}),
                            parallax: {
                              ...(selectedNode.motion?.parallax || {}),
                              depthPlane: val,
                            },
                          },
                        });
                        onUpdateStyle(selectedNode.id, { depthPlane: val });
                      }}
                      style={{ flex: 1, accentColor: '#8B5CF6' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#A78BFA', width: '25px', textAlign: 'right' }}>
                      {depthPlane}
                    </span>
                  </div>
                </div>
              );
            })()}

            {onOpenAi && (
              <button
                onClick={onOpenAi}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))',
                  border: '1px solid rgba(147, 51, 234, 0.3)',
                  borderRadius: '6px',
                  color: '#C084FC',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '10px',
                }}
              >
                <Sparkles size={13} />
                <span>Ask AI About This Layer</span>
              </button>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>AST Node JSON</label>
            <pre
              style={{
                background: '#111317',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                padding: '10px',
                color: '#A5B4FC',
                fontSize: '0.65rem',
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: '300px',
              }}
            >
              {JSON.stringify(selectedNode, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
}
