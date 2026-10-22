'use client';

import React, { useState } from 'react';
import { SceneGraph, SceneGraphNode } from '../../engine/SceneGraphTypes';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';

interface LayerPanelProps {
  sceneId: string;
  sceneGraph: SceneGraph;
  selectedNodeIds: string[];
  onSelectNodes: (nodeIds: string[]) => void;
  dispatch: (command: TemplateEditorCommand) => void;
}

const NodeKindIcon = ({ kind }: { kind: string }) => {
  // Simple MVP icons
  switch(kind) {
    case 'container': case 'stack': case 'group':
      return <span className="text-gray-400">□</span>;
    case 'text': case 'richtext':
      return <span className="text-blue-400">T</span>;
    case 'image':
      return <span className="text-green-400">img</span>;
    default:
      return <span className="text-gray-400">○</span>;
  }
};

export function LayerPanel({
  sceneId,
  sceneGraph,
  selectedNodeIds,
  onSelectNodes,
  dispatch
}: LayerPanelProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const toggleVisibility = (nodeId: string, hidden: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SG_UPDATE_NODE_PROPERTY', sceneId, nodeId, patch: { hidden: !hidden } });
  };

  const toggleLock = (nodeId: string, locked: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SG_UPDATE_NODE_PROPERTY', sceneId, nodeId, patch: { locked: !locked } });
  };

  const reorder = (nodeId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SG_REORDER_NODE', sceneId, nodeId, direction });
  };

  const renderNode = (nodeId: string, depth = 0) => {
    const node = sceneGraph.nodes[nodeId];
    if (!node) return null;

    const isSelected = selectedNodeIds.includes(nodeId);
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes.has(nodeId);

    return (
      <div key={nodeId}>
        <div 
          data-node-id={nodeId}
          className={`flex items-center group cursor-pointer select-none py-1 px-2 text-xs ${isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100 text-gray-700'}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={(e) => {
            if (e.metaKey || e.shiftKey) {
              // Basic multi-select toggle
              if (isSelected) onSelectNodes(selectedNodeIds.filter(id => id !== nodeId));
              else onSelectNodes([...selectedNodeIds, nodeId]);
            } else {
              onSelectNodes([nodeId]);
            }
          }}
        >
          <div className="w-4 h-4 flex items-center justify-center shrink-0 mr-1" onClick={(e) => hasChildren && toggleCollapse(nodeId, e)}>
            {hasChildren && (
              <span className="text-gray-400 transform transition-transform" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}>
                ▼
              </span>
            )}
          </div>
          
          <div className="w-4 h-4 flex items-center justify-center shrink-0 mr-1.5">
            <NodeKindIcon kind={node.kind} />
          </div>
          
          <span className={`truncate flex-1 ${node.hidden ? 'opacity-40' : ''}`}>
            {node.name} {node.binding?.fieldKey ? <span className="text-green-600 opacity-60">[*]</span> : null}
          </span>

          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button onClick={(e) => reorder(nodeId, 'up', e)} className="text-gray-400 hover:text-gray-700 font-bold" title="Move Up">↑</button>
            <button onClick={(e) => reorder(nodeId, 'down', e)} className="text-gray-400 hover:text-gray-700 font-bold" title="Move Down">↓</button>
            <button onClick={(e) => toggleLock(nodeId, node.locked || false, e)} className="text-gray-400 hover:text-gray-700 ml-1" title="Lock/Unlock">
              {node.locked ? '🔒' : '🔓'}
            </button>
            <button onClick={(e) => toggleVisibility(nodeId, node.hidden || false, e)} className="text-gray-400 hover:text-gray-700" title="Hide/Show">
              {node.hidden ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div>
            {node.children.map(childId => renderNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 overflow-y-auto w-64">
      <div className="px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Layers</h2>
      </div>
      <div className="py-2">
        {sceneGraph.renderOrder.map(rootId => {
          const rootNode = sceneGraph.nodes[rootId];
          if (rootNode && !rootNode.parentId) {
            return renderNode(rootId);
          }
          return null;
        })}
      </div>
    </div>
  );
}
