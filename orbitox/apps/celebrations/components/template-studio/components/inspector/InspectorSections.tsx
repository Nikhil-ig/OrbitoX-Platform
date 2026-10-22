'use client';

import React from 'react';
import { SceneGraphNode, AutoLayoutConfig } from '../../engine/SceneGraphTypes';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';
import { TemplateSchema } from '../../types/TemplateSchema';

export interface InspectorSectionProps {
  node: SceneGraphNode;
  sceneId: string;
  dispatch: (command: TemplateEditorCommand) => void;
  schema?: TemplateSchema;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT HELPERS
// ─────────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
    <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">{title}</h3>
  </div>
);

const PropertyRow = ({ label, children, source = 'local' }: { label: string, children: React.ReactNode, source?: 'local' | 'token' | 'responsive' | 'inherited' | 'bound' }) => {
  const getSourceColor = () => {
    switch(source) {
      case 'token': return 'bg-blue-400';
      case 'responsive': return 'bg-purple-400';
      case 'inherited': return 'bg-yellow-400';
      case 'bound': return 'bg-green-400';
      default: return 'bg-transparent';
    }
  };

  return (
    <div className="flex items-center mb-2">
      <div className="w-24 shrink-0 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${getSourceColor()}`} title={`Source: ${source}`} />
        <label className="text-xs text-gray-500 truncate">{label}</label>
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none" />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:border-blue-500 focus:outline-none">
    {props.children}
  </select>
);

// ─────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────

export const LayoutSection = ({ node, sceneId, dispatch }: InspectorSectionProps) => {
  const updateLayoutMode = (mode: any) => {
    dispatch({ type: 'SG_SET_LAYOUT_MODE', sceneId, nodeId: node.id, layoutMode: mode });
  };
  
  const updateGeom = (key: string, value: any) => {
    dispatch({ type: 'SG_UPDATE_GEOMETRY', sceneId, nodeId: node.id, patch: { [key]: value } });
  };

  return (
    <div className="mb-6">
      <SectionHeader title="Layout" />
      <PropertyRow label="Position">
        <Select value={node.geometry.position} onChange={e => updateGeom('position', e.target.value)}>
          <option value="flow">Flow (Auto)</option>
          <option value="absolute">Absolute</option>
        </Select>
      </PropertyRow>
      
      {node.geometry.position === 'absolute' && (
        <div className="grid grid-cols-2 gap-x-2">
          <PropertyRow label="X"><Input type="text" value={node.geometry.x} onChange={e => updateGeom('x', e.target.value)} /></PropertyRow>
          <PropertyRow label="Y"><Input type="text" value={node.geometry.y} onChange={e => updateGeom('y', e.target.value)} /></PropertyRow>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-x-2">
        <PropertyRow label="Width"><Input type="text" value={node.geometry.width} onChange={e => updateGeom('width', e.target.value)} /></PropertyRow>
        <PropertyRow label="Height"><Input type="text" value={node.geometry.height} onChange={e => updateGeom('height', e.target.value)} /></PropertyRow>
      </div>
      
      <PropertyRow label="Rotation">
        <Input type="number" value={node.geometry.rotation || 0} onChange={e => updateGeom('rotation', Number(e.target.value))} />
      </PropertyRow>
      
      <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
        <PropertyRow label="Layout Mode">
          <Select value={node.layoutMode || 'freeform'} onChange={e => updateLayoutMode(e.target.value)}>
            <option value="freeform">Freeform</option>
            <option value="flex">Flex / Auto Layout</option>
            <option value="stack">Stack</option>
            <option value="grid">Grid</option>
          </Select>
        </PropertyRow>
      </div>
    </div>
  );
};

export const AutoLayoutSection = ({ node, sceneId, dispatch }: InspectorSectionProps) => {
  if (!['flex', 'stack', 'grid'].includes(node.layoutMode || '')) return null;
  
  const config = (node.layoutConfig as AutoLayoutConfig) || {};
  
  const updateConfig = (patch: any) => {
    dispatch({ type: 'SG_UPDATE_LAYOUT_CONFIG', sceneId, nodeId: node.id, patch });
  };

  return (
    <div className="mb-6">
      <SectionHeader title="Auto Layout" />
      <PropertyRow label="Direction">
        <Select value={config.direction || 'horizontal'} onChange={e => updateConfig({ direction: e.target.value })}>
          <option value="horizontal">Horizontal (Row)</option>
          <option value="vertical">Vertical (Col)</option>
          <option value="wrap">Wrap</option>
        </Select>
      </PropertyRow>
      
      <PropertyRow label="Gap">
        <Input type="text" value={config.gap || ''} onChange={e => updateConfig({ gap: e.target.value })} placeholder="e.g. 1rem" />
      </PropertyRow>
      
      <PropertyRow label="Primary Align">
        <Select value={config.alignment?.primary || 'start'} onChange={e => updateConfig({ alignment: { ...config.alignment, primary: e.target.value } })}>
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
          <option value="space-between">Space Between</option>
        </Select>
      </PropertyRow>
      
      <PropertyRow label="Cross Align">
        <Select value={config.alignment?.cross || 'stretch'} onChange={e => updateConfig({ alignment: { ...config.alignment, cross: e.target.value } })}>
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
          <option value="stretch">Stretch</option>
        </Select>
      </PropertyRow>
    </div>
  );
};

export const TypographySection = ({ node, sceneId, dispatch }: InspectorSectionProps) => {
  if (node.kind !== 'text' && node.kind !== 'richtext') return null;

  const updateStyle = (key: string, value: any) => {
    dispatch({
      type: 'SG_UPDATE_STYLE', sceneId, nodeId: node.id,
      patch: { typography: { ...(node.style.typography || {}), [key]: value } }
    });
  };
  
  // Example of identifying token vs local (simplified for MVP)
  const isColorToken = node.style.typography?.color?.type === 'token';
  const colorSource = isColorToken ? 'token' : 'local';

  return (
    <div className="mb-6">
      <SectionHeader title="Typography" />
      <PropertyRow label="Font Family">
        <Input type="text" value={node.style.typography?.fontFamily || ''} onChange={e => updateStyle('fontFamily', e.target.value)} />
      </PropertyRow>
      
      <div className="grid grid-cols-2 gap-x-2">
        <PropertyRow label="Size">
          <Input type="text" value={node.style.typography?.fontSize || ''} onChange={e => updateStyle('fontSize', e.target.value)} />
        </PropertyRow>
        <PropertyRow label="Weight">
          <Select value={node.style.typography?.fontWeight || ''} onChange={e => updateStyle('fontWeight', e.target.value)}>
            <option value="">Default</option>
            <option value="300">Light</option>
            <option value="400">Regular</option>
            <option value="500">Medium</option>
            <option value="600">SemiBold</option>
            <option value="700">Bold</option>
          </Select>
        </PropertyRow>
      </div>

      <PropertyRow label="Align">
        <Select value={node.style.typography?.textAlign || 'left'} onChange={e => updateStyle('textAlign', e.target.value)}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </Select>
      </PropertyRow>
      
      <PropertyRow label="Color" source={colorSource}>
        <div className="flex gap-1">
          <Input 
            type="text" 
            value={node.style.typography?.color?.type === 'token' ? node.style.typography.color.tokenPath : ((node.style.typography?.color as any)?.value || '')} 
            onChange={e => updateStyle('color', { type: 'solid', value: e.target.value })} 
          />
        </div>
      </PropertyRow>
    </div>
  );
};

export const BackgroundSection = ({ node, sceneId, dispatch }: InspectorSectionProps) => {
  const updateBg = (patch: any) => {
    dispatch({
      type: 'SG_UPDATE_STYLE', sceneId, nodeId: node.id,
      patch: { background: { ...(node.style.background || {}), ...patch } }
    });
  };

  return (
    <div className="mb-6">
      <SectionHeader title="Background" />
      <PropertyRow label="Type">
        <Select value={node.style.background?.type || 'none'} onChange={e => updateBg({ type: e.target.value })}>
          <option value="none">None</option>
          <option value="solid">Solid Color</option>
          <option value="image">Image</option>
          <option value="gradient">Gradient</option>
        </Select>
      </PropertyRow>
      
      {node.style.background?.type === 'solid' && (
        <PropertyRow label="Color">
          <Input 
            type="text" 
            value={(node.style.background?.color as any)?.value || ''} 
            onChange={e => updateBg({ color: { type: 'solid', value: e.target.value } })} 
          />
        </PropertyRow>
      )}
      
      {node.style.background?.type === 'image' && (
        <PropertyRow label="URL">
          <Input 
            type="text" 
            value={node.style.background?.image || ''} 
            onChange={e => updateBg({ image: e.target.value })} 
          />
        </PropertyRow>
      )}
    </div>
  );
};

export const AnimationSection: React.FC<InspectorSectionProps> = ({ node, sceneId, dispatch }) => {
  const motion = node.motion || {};
  const entrance = motion.in || { type: 'none', duration: 800, delay: 0, easing: 'ease' };

  return (
    <div className="mb-6">
      <SectionHeader title="Animation (Motion)" />
      
      <PropertyRow label="Entrance">
        <Select
          value={entrance.type}
          onChange={(e) => dispatch({ type: 'SG_UPDATE_MOTION', sceneId, nodeId: node.id, patch: { in: { ...entrance, type: e.target.value as any } } })}
        >
          <option value="none">None</option>
          <option value="fade">Fade In</option>
          <option value="slide-up">Slide Up</option>
          <option value="slide-down">Slide Down</option>
          <option value="zoom-in">Zoom In</option>
        </Select>
      </PropertyRow>

      {entrance.type !== 'none' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <PropertyRow label="Duration (ms)">
            <Input
              type="number"
              value={entrance.duration.toString()}
              onChange={(e) => dispatch({ type: 'SG_UPDATE_MOTION', sceneId, nodeId: node.id, patch: { in: { ...entrance, duration: parseInt(e.target.value) } } })}
            />
          </PropertyRow>
          <PropertyRow label="Delay (ms)">
            <Input
              type="number"
              value={entrance.delay.toString()}
              onChange={(e) => dispatch({ type: 'SG_UPDATE_MOTION', sceneId, nodeId: node.id, patch: { in: { ...entrance, delay: parseInt(e.target.value) } } })}
            />
          </PropertyRow>
        </div>
      )}
    </div>
  );
};

export const InteractionSection: React.FC<InspectorSectionProps> = ({ node, sceneId, dispatch }) => {
  const interactions = node.interactions || [];
  const onClick = interactions.find((i: any) => i.onClick)?.onClick || { action: 'none' };

  return (
    <div className="mb-6">
      <SectionHeader title="Interactions" />
      
      <PropertyRow label="On Click">
        <Select
          value={onClick.action}
          onChange={(e) => dispatch({ 
            type: 'SG_UPDATE_INTERACTION', 
            sceneId, 
            nodeId: node.id, 
            interactions: [{ onClick: { ...onClick, action: e.target.value as any } }] 
          })}
        >
          <option value="none">None</option>
          <option value="navigate">Navigate to URL</option>
          <option value="open_modal">Open Modal</option>
          <option value="submit">Submit Form</option>
        </Select>
      </PropertyRow>

      {onClick.action === 'navigate' && (
        <div className="mt-2">
          <PropertyRow label="URL">
            <Input
              type="text"
              placeholder="https://..."
              value={onClick.url || ''}
              onChange={(e) => dispatch({ 
                type: 'SG_UPDATE_INTERACTION', 
                sceneId, 
                nodeId: node.id, 
                interactions: [{ onClick: { ...onClick, url: e.target.value } }] 
              })}
            />
          </PropertyRow>
        </div>
      )}
    </div>
  );
};
