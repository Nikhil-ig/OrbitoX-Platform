'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SceneGraph } from '../../engine/SceneGraphTypes';
import { SceneGraphRenderer } from '../../../renderer/SceneGraphRenderer';
import { CanvasInteractionLayer } from './CanvasInteractionLayer';
import { CommandPalette } from './CommandPalette';
import { DeviceBreakpoint, TemplateDesignTokens } from '../../types/TemplateSchema';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';

interface CanvasWorkspaceProps {
  sceneId: string;
  sceneGraph: SceneGraph | null;
  device: DeviceBreakpoint;
  tokens: TemplateDesignTokens;
  selectedNodeIds: string[];
  onSelectNodes: (nodeIds: string[]) => void;
  onUpdateGeometry: (nodeId: string, patch: any) => void;
  dispatch: (command: TemplateEditorCommand) => void;
  resolvedState?: any;
  schema?: any;
}

export function CanvasWorkspace({
  sceneId,
  sceneGraph,
  device,
  tokens,
  selectedNodeIds,
  onSelectNodes,
  onUpdateGeometry,
  dispatch,
  resolvedState,
  schema,
}: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Pan State
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Define artboard sizes based on device
  const artboardSizes = {
    mobile: { width: 375, height: 812 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 }
  };
  const artboard = artboardSizes[device];

  // Handle keyboard (Spacebar for pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle Wheel (Zoom / Scroll)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      // Zoom
      setZoom(z => Math.min(Math.max(0.1, z - e.deltaY * 0.01), 4));
    } else {
      // Pan
      setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  // Handle Pointer (Pan Drag)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isSpacePressed || e.button === 1 /* middle click */) {
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      // Clicked on empty canvas -> deselect all
      onSelectNodes([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (!sceneGraph) {
    return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">No scene graph selected</div>;
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-[#E5E5E5] overflow-hidden select-none outline-none ${isSpacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      tabIndex={0}
    >
      {/* Viewport Transform Layer */}
      <div 
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: 0, 
          height: 0
        }}
      >
        {/* Artboard Shadow / Frame */}
        <div 
          className="absolute bg-white shadow-xl overflow-hidden"
          style={{
            width: artboard.width,
            height: artboard.height,
            // Center the artboard initially if pan is 0,0 (MVP: just hardcode offset or let user pan)
            left: '50vw',
            top: '10vh',
            transform: 'translateX(-50%)'
          }}
        >
          {/* 
            SceneGraphRenderer acts as the visual source of truth.
            We render it in editor mode so it responds to clicks and resolves tokens.
          */}
          <SceneGraphRenderer
            sceneGraph={sceneGraph}
            device={device}
            tokens={tokens}
            isEditorMode={true}
            onNodeClick={(id) => onSelectNodes([id])}
            resolvedState={resolvedState}
            schema={schema}
          />

          {/* 
            CanvasInteractionLayer sits ON TOP of the renderer, 
            reading the same SceneGraph to draw handles and dispatch updates.
          */}
          <CanvasInteractionLayer
            sceneId={sceneId}
            sceneGraph={sceneGraph}
            selectedNodeIds={selectedNodeIds}
            onSelectNodes={onSelectNodes}
            onUpdateGeometry={onUpdateGeometry}
            dispatch={dispatch}
          />
        </div>
      </div>
      
      {/* Zoom Controls Overlay */}
      <div className="absolute bottom-4 right-4 bg-white shadow rounded-md px-3 py-1 flex gap-2 items-center text-xs">
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>-</button>
        <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.1))}>+</button>
      </div>
      
      {/* Canvas Command Palette & Copy/Paste listener */}
      <CommandPalette 
        sceneId={sceneId}
        sceneGraph={sceneGraph}
        selectedNodeIds={selectedNodeIds}
        dispatch={dispatch}
      />
    </div>
  );
}
