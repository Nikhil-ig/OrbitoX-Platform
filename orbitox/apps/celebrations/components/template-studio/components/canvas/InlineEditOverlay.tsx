'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SceneGraphNode } from '../../engine/SceneGraphTypes';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';

interface InlineEditOverlayProps {
  sceneId: string;
  nodeId: string;
  node: SceneGraphNode;
  rect: DOMRect;
  dispatch: (command: TemplateEditorCommand) => void;
  onClose: () => void;
}

export function InlineEditOverlay({ sceneId, nodeId, node, rect, dispatch, onClose }: InlineEditOverlayProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Resolve initial content
  const [initialContent] = useState(() => {
    return node.textContent || node.name || 'Text Node';
  });

  useEffect(() => {
    if (contentRef.current) {
      // Focus and select all text
      contentRef.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  const handleBlur = () => {
    saveAndClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveAndClose();
    }
  };

  const saveAndClose = () => {
    if (contentRef.current) {
      const newContent = contentRef.current.innerText || '';
      if (newContent !== initialContent) {
        dispatch({
          type: 'SG_UPDATE_NODE_PROPERTY',
          sceneId,
          nodeId,
          patch: { textContent: newContent }
        });
      }
    }
    onClose();
  };

  return (
    <div 
      className="absolute bg-white/10 backdrop-blur-sm shadow-xl border border-blue-400 z-[100]"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        padding: 0,
        margin: 0,
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        className="w-full h-full outline-none text-gray-900"
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => e.stopPropagation()} // Prevent dragging while editing
        style={{
          // For MVP, we apply basic typography inheritance, but ideally we match the exact node style
          fontFamily: node.style.typography?.fontFamily || 'inherit',
          fontSize: node.style.typography?.fontSize as string || 'inherit',
          fontWeight: node.style.typography?.fontWeight || 'inherit',
          textAlign: (node.style.typography?.textAlign as any) || 'left',
          color: 'black', // High contrast for editing
          lineHeight: node.style.typography?.lineHeight as string || 'inherit',
          width: '100%',
          height: '100%',
          padding: node.style.padding || '0',
          overflow: 'hidden'
        }}
      >
        {initialContent}
      </div>
    </div>
  );
}
