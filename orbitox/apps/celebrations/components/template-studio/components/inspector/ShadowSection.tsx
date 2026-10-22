'use client';

import React from 'react';
import { InspectorSectionProps } from './InspectorSections';

export const ShadowSection: React.FC<InspectorSectionProps> = ({ node, sceneId, dispatch }) => {
  const shadow = node.style.shadow || {};

  const updateShadow = (patch: any) => {
    dispatch({
      type: 'SG_UPDATE_STYLE', 
      sceneId, 
      nodeId: node.id,
      patch: { shadow: { ...shadow, ...patch } }
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Shadow</h3>
      </div>

      <div className="flex items-center mb-2">
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <label className="text-xs text-gray-500 truncate">Box Shadow</label>
        </div>
        <div className="flex-1 min-w-0">
          <input 
            type="text" 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={shadow.boxShadow || ''} 
            onChange={e => updateShadow({ boxShadow: e.target.value })} 
            placeholder="0 4px 6px rgba(0,0,0,0.1)"
          />
        </div>
      </div>
      
      <div className="flex items-center mb-2">
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <label className="text-xs text-gray-500 truncate">Drop Shadow</label>
        </div>
        <div className="flex-1 min-w-0">
          <input 
            type="text" 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={shadow.dropShadow || ''} 
            onChange={e => updateShadow({ dropShadow: e.target.value })} 
            placeholder="0 2px 4px rgba(0,0,0,0.5)"
          />
        </div>
      </div>
    </div>
  );
};
