'use client';

import React from 'react';
import { InspectorSectionProps } from './InspectorSections';

export const BorderSection: React.FC<InspectorSectionProps> = ({ node, sceneId, dispatch }) => {
  const border = node.style.border || {};

  const updateBorder = (patch: any) => {
    dispatch({
      type: 'SG_UPDATE_STYLE', 
      sceneId, 
      nodeId: node.id,
      patch: { border: { ...border, ...patch } }
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Border</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Width</label>
          <input 
            type="text" 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={border.width || ''} 
            onChange={e => updateBorder({ width: e.target.value })} 
            placeholder="e.g. 1px"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Style</label>
          <select 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:border-blue-500 focus:outline-none"
            value={border.style || 'none'} 
            onChange={e => updateBorder({ style: e.target.value })}
          >
            <option value="none">None</option>
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
      </div>

      {border.style && border.style !== 'none' && (
        <div className="flex items-center mb-2">
          <div className="w-24 shrink-0 flex items-center gap-1.5">
            <label className="text-xs text-gray-500 truncate">Color</label>
          </div>
          <div className="flex-1 min-w-0">
            <input 
              type="text" 
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
              value={border.color?.type === 'token' ? border.color.tokenPath : (border.color as any)?.value || ''} 
              onChange={e => updateBorder({ color: { type: 'solid', value: e.target.value } })} 
            />
          </div>
        </div>
      )}

      <div className="flex items-center mb-2 mt-3 pt-2 border-t border-dashed border-gray-100">
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <label className="text-xs text-gray-500 truncate">Radius</label>
        </div>
        <div className="flex-1 min-w-0">
          <input 
            type="text" 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            value={typeof border.radius === 'string' ? border.radius : ''} 
            onChange={e => updateBorder({ radius: e.target.value })} 
            placeholder="e.g. 8px"
          />
        </div>
      </div>
    </div>
  );
};
