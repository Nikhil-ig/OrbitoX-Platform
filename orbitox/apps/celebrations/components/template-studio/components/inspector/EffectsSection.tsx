'use client';

import React from 'react';
import { InspectorSectionProps } from './InspectorSections';

export const EffectsSection: React.FC<InspectorSectionProps> = ({ node, sceneId, dispatch }) => {
  const effects = node.style.effects || {};

  const updateEffects = (patch: any) => {
    dispatch({
      type: 'SG_UPDATE_STYLE', 
      sceneId, 
      nodeId: node.id,
      patch: { effects: { ...effects, ...patch } }
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Effects</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Blur</label>
          <input 
            type="text" 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={effects.blur || ''} 
            onChange={e => updateEffects({ blur: e.target.value })} 
            placeholder="e.g. 4px"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Backdrop Blur</label>
          <input 
            type="text" 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={effects.backdropBlur || ''} 
            onChange={e => updateEffects({ backdropBlur: e.target.value })} 
            placeholder="e.g. 10px"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Brightness</label>
          <input 
            type="number" 
            step="0.1"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={effects.brightness ?? ''} 
            onChange={e => updateEffects({ brightness: e.target.value ? Number(e.target.value) : undefined })} 
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Contrast</label>
          <input 
            type="number" 
            step="0.1"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={effects.contrast ?? ''} 
            onChange={e => updateEffects({ contrast: e.target.value ? Number(e.target.value) : undefined })} 
          />
        </div>
      </div>
    </div>
  );
};
