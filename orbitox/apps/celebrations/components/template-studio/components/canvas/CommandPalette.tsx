'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';
import { SceneGraph } from '../../engine/SceneGraphTypes';
import { NodeDefaults } from '../../engine/NodeDefaults';

interface CommandPaletteProps {
  sceneId: string;
  sceneGraph: SceneGraph;
  selectedNodeIds: string[];
  dispatch: (command: TemplateEditorCommand) => void;
}

export function CommandPalette({ sceneId, sceneGraph, selectedNodeIds, dispatch }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Command Registry
  const commands = [
    {
      name: 'Wrap in Container',
      shortcut: '⌘G',
      action: () => {
        if (selectedNodeIds.length > 0) {
          dispatch({ type: 'SG_WRAP_NODES', sceneId, nodeIds: selectedNodeIds });
        }
      }
    },
    {
      name: 'Unwrap Container',
      shortcut: '⌘⇧G',
      action: () => {
        const firstId = selectedNodeIds[0];
        if (firstId && selectedNodeIds.length === 1) {
          dispatch({ type: 'SG_UNWRAP', sceneId, containerId: firstId });
        }
      }
    },
    {
      name: 'Flatten Children',
      shortcut: '⌘E',
      action: () => {
        const firstId = selectedNodeIds[0];
        if (firstId && selectedNodeIds.length === 1) {
          dispatch({ type: 'SG_FLATTEN', sceneId, nodeId: firstId });
        }
      }
    },
    {
      name: 'Duplicate Node',
      shortcut: '⌘D',
      action: () => {
        const firstId = selectedNodeIds[0];
        if (firstId) {
          dispatch({ type: 'SG_DUPLICATE_NODE', sceneId, nodeId: firstId });
        }
      }
    },
    {
      name: 'Delete Node',
      shortcut: 'Backspace',
      action: () => {
        if (selectedNodeIds.length > 0) {
          dispatch({ type: 'SG_MULTI_DELETE', sceneId, nodeIds: selectedNodeIds });
        }
      }
    },
    {
      name: 'Cut Subtree',
      shortcut: '⌘X',
      action: () => {
        if (selectedNodeIds.length > 0) {
          dispatch({ type: 'SG_CUT_NODES', sceneId, nodeIds: selectedNodeIds });
        }
      }
    },
    {
      name: 'Copy Subtree',
      shortcut: '⌘C',
      action: () => {
        if (selectedNodeIds.length > 0) {
          dispatch({ type: 'SG_COPY_NODES', sceneId, nodeIds: selectedNodeIds });
        }
      }
    },
    {
      name: 'Paste Subtree',
      shortcut: '⌘V',
      action: () => {
        // Paste into first selected node, or root
        const targetParentId = selectedNodeIds[0] || sceneGraph.rootNodeId;
        dispatch({ type: 'SG_PASTE_NODES', sceneId, targetParentId });
      }
    },
    {
      name: 'Insert Text',
      shortcut: 'T',
      action: () => {
        dispatch({
          type: 'SG_CREATE_NODE', sceneId, kind: 'text',
          parentId: selectedNodeIds[0] || undefined,
          defaults: NodeDefaults.create('text')
        });
      }
    },
    {
      name: 'Insert Container',
      shortcut: 'F',
      action: () => {
        dispatch({
          type: 'SG_CREATE_NODE', sceneId, kind: 'container',
          parentId: selectedNodeIds[0] || undefined,
          defaults: NodeDefaults.create('container')
        });
      }
    },
    {
      name: 'Toggle Auto Layout',
      shortcut: 'Shift+A',
      action: () => {
        const firstId = selectedNodeIds[0];
        if (firstId) {
          const node = sceneGraph.nodes[firstId];
          const isFlex = node?.layoutMode === 'flex' || node?.layoutMode === 'stack';
          dispatch({ 
            type: 'SG_SET_LAYOUT_MODE', 
            sceneId, 
            nodeId: firstId, 
            layoutMode: isFlex ? 'freeform' : 'flex' 
          });
        }
      }
    }
  ];

  const filteredCommands = commands.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setQuery('');
        setSelectedIndex(0);
        return;
      }
      
      // Global Shortcuts (only if not typing in input)
      if (!isOpen && document.activeElement?.tagName !== 'INPUT') {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'g') {
          e.preventDefault();
          commands.find(c => c.name === 'Unwrap Container')?.action();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
          e.preventDefault();
          commands.find(c => c.name === 'Wrap in Container')?.action();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
          e.preventDefault();
          commands.find(c => c.name === 'Flatten Children')?.action();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
          e.preventDefault();
          commands.find(c => c.name === 'Duplicate Node')?.action();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          commands.find(c => c.name === 'Delete Node')?.action();
        } else if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          commands.find(c => c.name === 'Insert Text')?.action();
        } else if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          commands.find(c => c.name === 'Insert Container')?.action();
        } else if (e.shiftKey && (e.key === 'a' || e.key === 'A')) {
          e.preventDefault();
          commands.find(c => c.name === 'Toggle Auto Layout')?.action();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
          commands.find(c => c.name === 'Cut Subtree')?.action();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
          commands.find(c => c.name === 'Copy Subtree')?.action();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
          commands.find(c => c.name === 'Paste Subtree')?.action();
        }
      }

      // Handle interactions inside palette
      if (isOpen) {
        if (e.key === 'Escape') {
          setIsOpen(false);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, commands]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/20">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <span className="text-gray-400 mr-3">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 outline-none text-base text-gray-900 bg-transparent placeholder-gray-400"
            placeholder="What do you want to do?"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>
        
        <div className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">No commands found.</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.name}
                className={`px-4 py-2.5 flex items-center justify-between cursor-pointer ${
                  idx === selectedIndex ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                }}
              >
                <span className="text-sm font-medium">{cmd.name}</span>
                {cmd.shortcut && (
                  <span className={`text-xs ${idx === selectedIndex ? 'text-blue-200' : 'text-gray-400'}`}>
                    {cmd.shortcut}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
