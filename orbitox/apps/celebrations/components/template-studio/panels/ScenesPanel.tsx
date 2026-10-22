'use client';

import React, { useState } from 'react';
import {
  TemplateSchema,
  TemplateSceneDefinition,
  SceneStructureLayer,
} from '../types/TemplateSchema';
import {
  Layers,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Move,
  Type,
  Image,
  Sparkles,
  Link,
  Settings2,
} from 'lucide-react';

interface ScenesPanelProps {
  schema: TemplateSchema;
  selectedSceneId: string | null;
  selectedLayerId: string | null;
  onSelectScene: (sceneId: string) => void;
  onSelectLayer: (layerId: string, sceneId?: string) => void;
  onUpdateScene: (sceneId: string, patch: Partial<TemplateSceneDefinition>) => void;
}

export function ScenesPanel({
  schema,
  selectedSceneId,
  selectedLayerId,
  onSelectScene,
  onSelectLayer,
  onUpdateScene,
}: ScenesPanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'lay_souls_group': true,
  });

  const activeScene =
    schema.scenes.find((s) => s.id === selectedSceneId) || schema.scenes[0]!;

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getLayerIcon = (layerType: SceneStructureLayer['layerType']) => {
    switch (layerType) {
      case 'atmosphere':
        return Sparkles;
      case 'portrait_group':
      case 'media':
        return Image;
      case 'typography':
        return Type;
      case 'interactive':
        return Link;
      default:
        return Layers;
    }
  };

  const renderLayerTree = (layer: SceneStructureLayer, depth: number = 0) => {
    const isSelected = selectedLayerId === layer.id;
    const hasChildren = layer.children && layer.children.length > 0;
    const isExpanded = expandedNodes[layer.id] ?? true;
    const Icon = getLayerIcon(layer.layerType);

    return (
      <div key={layer.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          onClick={() => onSelectLayer(layer.id, activeScene.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            paddingLeft: `${12 + depth * 20}px`,
            borderRadius: '6px',
            background: isSelected ? 'rgba(223, 186, 107, 0.16)' : 'transparent',
            border: isSelected ? '1px solid rgba(223, 186, 107, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.1s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(layer.id, e)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--cel-text-dim, #64748B)',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span style={{ width: '14px' }} />
            )}

            <Icon size={14} color={isSelected ? '#DFBA6B' : 'var(--cel-text-dim, #64748B)'} />

            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? '#DFBA6B' : '#E2E8F0',
              }}
            >
              {layer.name}
            </span>

            {layer.semanticRole && (
              <code style={{ fontSize: '0.66rem', color: 'var(--cel-text-dim, #64748B)' }}>
                ({layer.semanticRole})
              </code>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {layer.isCustomerEditable ? (
              <span style={{ fontSize: '0.66rem', color: '#10B981', fontWeight: 700 }}>Customer</span>
            ) : (
              <span style={{ fontSize: '0.66rem', color: 'var(--cel-text-dim, #64748B)' }}>Locked</span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            {layer.children!.map((child) => renderLayerTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const getAuthorityMode = (scene: TemplateSceneDefinition): 'GRAPH_NATIVE' | 'HYBRID' | 'LEGACY' => {
    if (scene.sceneGraph && scene.renderMode === 'graph') return 'GRAPH_NATIVE';
    if (scene.renderMode === 'hybrid') return 'HYBRID';
    return 'LEGACY';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '880px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            Scene Builder & Layer Hierarchy
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)' }}>
            Semantic layer composition. Select visual elements to inspect properties and customize slots.
          </span>
        </div>

        {/* Scene Selector Pill */}
        <select
          value={activeScene.id}
          onChange={(e) => onSelectScene(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: '#0D1429',
            border: '1px solid rgba(223, 186, 107, 0.3)',
            color: '#DFBA6B',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {schema.scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.order}. {s.name} [{getAuthorityMode(s)}]
            </option>
          ))}
        </select>
      </div>

      {/* Active Scene Summary Banner */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'rgba(13, 20, 41, 0.6)',
          border: '1px solid rgba(223, 186, 107, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#DFBA6B', fontWeight: 800, textTransform: 'uppercase' }}>
              SCENE {activeScene.order} • {activeScene.sceneType.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                background: getAuthorityMode(activeScene) === 'GRAPH_NATIVE' ? 'rgba(16, 185, 129, 0.15)' : getAuthorityMode(activeScene) === 'HYBRID' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                border: getAuthorityMode(activeScene) === 'GRAPH_NATIVE' ? '1px solid rgba(16, 185, 129, 0.4)' : getAuthorityMode(activeScene) === 'HYBRID' ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(148, 163, 184, 0.3)',
                color: getAuthorityMode(activeScene) === 'GRAPH_NATIVE' ? '#10B981' : getAuthorityMode(activeScene) === 'HYBRID' ? '#FBBF24' : '#94A3B8',
                letterSpacing: '0.04em',
              }}
            >
              {getAuthorityMode(activeScene)}
            </span>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            {activeScene.name}
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--cel-text-muted, #94A3B8)', margin: '4px 0 0 0' }}>
            {activeScene.purpose}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', fontSize: '0.74rem' }}>
          <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#CBD5E1' }}>
            Scroll: {activeScene.scrollMode}
          </span>
          <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#CBD5E1' }}>
            Motion: {activeScene.motionPreset}
          </span>
        </div>
      </div>

      {/* Semantic Layers Tree Container */}
      <div
        style={{
          borderRadius: '12px',
          background: 'rgba(7, 11, 22, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            padding: '6px 12px',
            fontSize: '0.68rem',
            color: 'var(--cel-text-dim, #64748B)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Semantic Structure Tree ({activeScene.layers.length} Layers)
        </div>

        {activeScene.layers.map((layer) => renderLayerTree(layer, 0))}
      </div>
    </div>
  );
}
