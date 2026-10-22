'use client';

import React from 'react';
import { SceneGraph, SceneGraphNode } from '../../engine/SceneGraphTypes';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';
import { TemplateSchema } from '../../types/TemplateSchema';
import { LayoutSection, AutoLayoutSection, TypographySection, BackgroundSection, AnimationSection, InteractionSection } from './InspectorSections';
import { BindingSection } from './BindingSection';
import { BorderSection } from './BorderSection';
import { ShadowSection } from './ShadowSection';
import { EffectsSection } from './EffectsSection';
import { OpacitySection } from './OpacitySection';
import { SpacingSection } from './SpacingSection';
import { NodeActionsBar } from './NodeActionsBar';
import { InsertPanel } from './InsertPanel';

interface SceneGraphInspectorProps {
  sceneId: string;
  selectedNodeIds: string[];
  sceneGraph: SceneGraph;
  schema?: TemplateSchema;
  dispatch: (command: TemplateEditorCommand) => void;
}

export function SceneGraphInspector({
  sceneId,
  selectedNodeIds,
  sceneGraph,
  schema,
  dispatch,
}: SceneGraphInspectorProps) {
  const [activeTab, setActiveTab] = React.useState<'design' | 'insert'>('design');

  const nodeId = selectedNodeIds[0];
  const node = nodeId ? sceneGraph.nodes[nodeId] : null;

  if (activeTab === 'insert') {
    return (
      <div className="flex flex-col h-full bg-white border-l border-gray-200 overflow-y-auto w-72">
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10 text-xs">
          <button onClick={() => setActiveTab('design')} className="flex-1 py-3 font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent">Design</button>
          <button onClick={() => setActiveTab('insert')} className="flex-1 py-3 font-medium text-blue-600 border-b-2 border-blue-600">Insert</button>
        </div>
        <InsertPanel sceneId={sceneId} selectedNodeId={nodeId || null} dispatch={dispatch} />
      </div>
    );
  }

  if (!nodeId || !node) {
    return (
      <div className="flex flex-col h-full bg-white border-l border-gray-200 w-72">
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10 text-xs">
          <button onClick={() => setActiveTab('design')} className="flex-1 py-3 font-medium text-blue-600 border-b-2 border-blue-600">Design</button>
          <button onClick={() => setActiveTab('insert')} className="flex-1 py-3 font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent">Insert</button>
        </div>
        <div className="p-4 text-sm text-gray-500">
          Select a node to inspect its properties.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 overflow-y-auto w-72 text-sm">
      <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10 text-xs bg-white/95 backdrop-blur">
        <button onClick={() => setActiveTab('design')} className="flex-1 py-3 font-medium text-blue-600 border-b-2 border-blue-600">Design</button>
        <button onClick={() => setActiveTab('insert')} className="flex-1 py-3 font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent">Insert</button>
      </div>

      <div className="p-4">
        <NodeActionsBar node={node} sceneId={sceneId} dispatch={dispatch} />
        
        <BindingSection node={node} sceneId={sceneId} dispatch={dispatch} schema={schema} />
        <LayoutSection node={node} sceneId={sceneId} dispatch={dispatch} />
        <AutoLayoutSection node={node} sceneId={sceneId} dispatch={dispatch} />
        <SpacingSection node={node} sceneId={sceneId} dispatch={dispatch} />
        <TypographySection node={node} sceneId={sceneId} dispatch={dispatch} />
        <BackgroundSection node={node} sceneId={sceneId} dispatch={dispatch} />
        <BorderSection node={node} sceneId={sceneId} dispatch={dispatch} />
        <ShadowSection node={node} sceneId={sceneId} dispatch={dispatch} />
        <OpacitySection node={node} sceneId={sceneId} dispatch={dispatch} />
        <EffectsSection node={node} sceneId={sceneId} dispatch={dispatch} />
        <AnimationSection node={node} sceneId={sceneId} dispatch={dispatch} />
        <InteractionSection node={node} sceneId={sceneId} dispatch={dispatch} />

        {/* Customer Experience toggle for MVP */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={node.customerEditable || false}
              onChange={(e) => {
                dispatch({
                  type: 'SG_UPDATE_NODE_PROPERTY',
                  sceneId,
                  nodeId,
                  patch: { customerEditable: e.target.checked }
                } as any);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700">Customer Editable</span>
          </label>
        </div>
      </div>
    </div>
  );
}
