'use client';

import React from 'react';
import { InspectorSectionProps } from './InspectorSections';
import { TemplateSchema } from '../../types/TemplateSchema';

export const BindingSection: React.FC<InspectorSectionProps> = ({ node, sceneId, dispatch, schema }) => {
  const binding = node.binding || null;

  // Flatten the schema into available field paths for MVP
  const availableFields: { label: string; value: string }[] = [];
  if (schema) {
    schema.contentSchema.forEach(field => {
      availableFields.push({ label: `${(field as any).label || field.id} (${field.id})`, value: `celebrants.${field.id}` });
      // If it's a person/couple, we can expose celebrants[0].firstName etc, but for MVP we just list simple fields
    });
    // Add common fallback ones for testing if schema fields are sparse
    availableFields.push(
      { label: 'Celebrant 1 First Name', value: 'celebrants[0].firstName' },
      { label: 'Celebrant 2 First Name', value: 'celebrants[1].firstName' },
      { label: 'Celebration Date', value: 'celebration.date' },
      { label: 'Venue Name', value: 'celebration.venue.name' }
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Data Binding</h3>
        {binding?.fieldKey && (
          <span className="w-2 h-2 rounded-full bg-green-500" title="Bound" />
        )}
      </div>

      <div className="flex items-center mb-2">
        <div className="w-24 shrink-0 flex items-center gap-1.5">
          <label className="text-xs text-gray-500 truncate">Field</label>
        </div>
        <div className="flex-1 min-w-0 flex gap-2">
          <select 
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:border-blue-500 focus:outline-none"
            value={binding?.fieldKey || ''}
            onChange={(e) => {
              if (e.target.value === '') {
                dispatch({ type: 'SG_SET_BINDING', sceneId, nodeId: node.id, binding: null });
              } else {
                dispatch({
                  type: 'SG_SET_BINDING',
                  sceneId,
                  nodeId: node.id,
                  binding: { fieldKey: e.target.value, bindingType: 'content' }
                });
              }
            }}
          >
            <option value="">Unbound</option>
            {availableFields.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
