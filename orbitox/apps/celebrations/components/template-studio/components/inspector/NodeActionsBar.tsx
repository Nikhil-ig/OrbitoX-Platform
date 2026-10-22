'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SceneGraphNode } from '../../engine/SceneGraphTypes';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';

interface NodeActionsBarProps {
  node: SceneGraphNode;
  sceneId: string;
  dispatch: (command: TemplateEditorCommand) => void;
}

export const NodeActionsBar: React.FC<NodeActionsBarProps> = ({ node, sceneId, dispatch }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const saveName = () => {
    if (nameInputRef.current) {
      const newName = nameInputRef.current.value.trim();
      if (newName && newName !== node.name) {
        dispatch({
          type: 'SG_UPDATE_NODE_PROPERTY',
          sceneId,
          nodeId: node.id,
          patch: { name: newName }
        });
      }
    }
    setIsEditingName(false);
  };

  return (
    <div className="flex flex-col mb-4 bg-gray-50 p-3 rounded-md border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            className="text-sm font-medium text-gray-900 bg-white border border-blue-500 rounded px-1 w-full mr-2 outline-none"
            defaultValue={node.name}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
          />
        ) : (
          <div 
            className="text-sm font-medium text-gray-900 truncate cursor-text hover:bg-gray-200 px-1 rounded flex-1"
            onClick={() => setIsEditingName(true)}
            title="Click to rename"
          >
            {node.name}
          </div>
        )}
        <div className="text-xs text-gray-500 uppercase tracking-wider shrink-0 bg-gray-200 px-1.5 py-0.5 rounded ml-2">
          {node.kind}
        </div>
      </div>

      <div className="flex gap-2 text-gray-500">
        <button 
          onClick={() => dispatch({ type: 'SG_DUPLICATE_NODE', sceneId, nodeId: node.id })}
          className="flex-1 flex justify-center items-center py-1 hover:bg-gray-200 rounded transition-colors text-xs font-medium"
          title="Duplicate"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button 
          onClick={() => dispatch({ type: 'SG_LOCK_NODE', sceneId, nodeId: node.id, locked: !node.locked })}
          className={`flex-1 flex justify-center items-center py-1 hover:bg-gray-200 rounded transition-colors text-xs font-medium ${node.locked ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : ''}`}
          title={node.locked ? 'Unlock' : 'Lock'}
        >
          {node.locked ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
          )}
        </button>
        <button 
          onClick={() => dispatch({ type: 'SG_HIDE_NODE', sceneId, nodeId: node.id, hidden: !node.hidden })}
          className={`flex-1 flex justify-center items-center py-1 hover:bg-gray-200 rounded transition-colors text-xs font-medium ${node.hidden ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : ''}`}
          title={node.hidden ? 'Show' : 'Hide'}
        >
          {node.hidden ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          )}
        </button>
        <button 
          onClick={() => dispatch({ type: 'SG_DELETE_NODE', sceneId, nodeId: node.id })}
          className="flex-1 flex justify-center items-center py-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors text-xs font-medium"
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
        {(node.smartComponent || node.kind === 'smart') && (
          <button 
            onClick={() => dispatch({ type: 'SG_DETACH_INSTANCE', sceneId, nodeId: node.id })}
            className="flex-1 flex justify-center items-center py-1 hover:bg-amber-50 hover:text-amber-600 rounded transition-colors text-xs font-bold"
            title="Detach Instance into editable nodes (Prompt #14)"
          >
            Detach
          </button>
        )}
      </div>
    </div>
  );
};
