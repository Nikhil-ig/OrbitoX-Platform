'use client';

import React from 'react';
import { InspectorSectionProps } from './InspectorSections';

export const SpacingSection: React.FC<InspectorSectionProps> = ({ node, sceneId, dispatch }) => {
  const padding = node.style.padding || '';
  const margin = node.style.margin || '';

  const updateStyle = (patch: any) => {
    dispatch({
      type: 'SG_UPDATE_STYLE', 
      sceneId, 
      nodeId: node.id,
      patch
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Spacing</h3>
      </div>

      <div className="flex items-center mb-2">
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <label className="text-xs text-gray-500 truncate">Padding</label>
        </div>
        <div className="flex-1 min-w-0">
          <input 
            type="text" 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={padding} 
            onChange={e => updateStyle({ padding: e.target.value })} 
            placeholder="e.g. 1rem 2rem"
          />
        </div>
      </div>
      
      <div className="flex items-center mb-2">
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <label className="text-xs text-gray-500 truncate">Margin</label>
        </div>
        <div className="flex-1 min-w-0">
          <input 
            type="text" 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={margin} 
            onChange={e => updateStyle({ margin: e.target.value })} 
            placeholder="e.g. 0 auto"
          />
        </div>
      </div>
    </div>
  );
};
