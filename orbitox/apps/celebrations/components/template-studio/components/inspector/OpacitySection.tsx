'use client';

import React from 'react';
import { InspectorSectionProps } from './InspectorSections';

export const OpacitySection: React.FC<InspectorSectionProps> = ({ node, sceneId, dispatch }) => {
  const opacity = node.geometry.opacity ?? 1;
  const blendMode = node.style.mixBlendMode || 'normal';

  const updateOpacity = (val: number) => {
    dispatch({
      type: 'SG_UPDATE_GEOMETRY', 
      sceneId, 
      nodeId: node.id,
      patch: { opacity: val }
    });
  };

  const updateBlendMode = (val: string) => {
    dispatch({
      type: 'SG_UPDATE_STYLE', 
      sceneId, 
      nodeId: node.id,
      patch: { mixBlendMode: val }
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Opacity & Blend</h3>
      </div>

      <div className="flex items-center mb-2">
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <label className="text-xs text-gray-500 truncate">Opacity</label>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input 
            type="range" 
            min="0" max="1" step="0.05"
            className="w-full"
            value={opacity} 
            onChange={e => updateOpacity(Number(e.target.value))} 
          />
          <span className="text-xs text-gray-500 w-8 text-right">{Math.round(opacity * 100)}%</span>
        </div>
      </div>
      
      <div className="flex items-center mb-2">
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <label className="text-xs text-gray-500 truncate">Blend Mode</label>
        </div>
        <div className="flex-1 min-w-0">
          <select 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:border-blue-500 focus:outline-none"
            value={blendMode} 
            onChange={e => updateBlendMode(e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
            <option value="color-dodge">Color Dodge</option>
            <option value="color-burn">Color Burn</option>
            <option value="hard-light">Hard Light</option>
            <option value="soft-light">Soft Light</option>
            <option value="difference">Difference</option>
            <option value="exclusion">Exclusion</option>
          </select>
        </div>
      </div>
    </div>
  );
};
