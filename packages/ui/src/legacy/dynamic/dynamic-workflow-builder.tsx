'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '../components/button';
import { Card } from '../components/card';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'delay' | 'branch';
  title: string;
  config?: any;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export function DynamicWorkflowBuilder() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: 'trigger_1', type: 'trigger', title: 'On Lead Created', x: 50, y: 50 },
  ]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<{ sourceId: string; x: number; y: number } | null>(null);

  const handleDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setIsDragging(nodeId);
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setNodes(nodes.map(n => 
        n.id === isDragging 
          ? { ...n, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
          : n
      ));
    }
    if (connecting) {
      setConnecting({ ...connecting, x: e.clientX, y: e.clientY });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(null);
    setConnecting(null);
  };

  const handleConnectionStart = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === sourceId);
    if (!node) return;
    setConnecting({ sourceId, x: e.clientX, y: e.clientY });
  };

  const handleConnectionEnd = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (connecting && connecting.sourceId !== targetId) {
      const newEdge: WorkflowEdge = {
        id: `e_${connecting.sourceId}_${targetId}`,
        source: connecting.sourceId,
        target: targetId,
      };
      if (!edges.find(e => e.source === newEdge.source && e.target === newEdge.target)) {
        setEdges([...edges, newEdge]);
      }
    }
    setConnecting(null);
  };

  const addNode = (type: 'action' | 'delay' | 'branch') => {
    const newNode: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      title: type === 'action' ? 'Convert Lead' : type === 'delay' ? 'Wait 2 Days' : 'If Amount > 500',
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
    };
    setNodes([...nodes, newNode]);
  };

  const renderNode = (node: WorkflowNode) => {
    const isTrigger = node.type === 'trigger';
    const bgColor = isTrigger ? 'var(--info)' : node.type === 'action' ? 'var(--success)' : node.type === 'delay' ? 'var(--warning)' : 'var(--accent-primary)';
    
    return (
      <div
        key={node.id}
        onMouseDown={(e) => handleDragStart(e, node.id)}
        onMouseUp={(e) => handleConnectionEnd(e, node.id)}
        style={{
          position: 'absolute',
          left: node.x,
          top: node.y,
          width: '180px',
          padding: '12px',
          backgroundColor: 'var(--bg-secondary)',
          border: `2px solid ${bgColor}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          cursor: isDragging === node.id ? 'grabbing' : 'grab',
          zIndex: isDragging === node.id ? 10 : 1,
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: '12px', color: bgColor, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
          {node.type}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
          {node.title}
        </div>
        
        {/* Output port */}
        <div 
          onMouseDown={(e) => handleConnectionStart(e, node.id)}
          style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '12px',
            height: '12px',
            backgroundColor: bgColor,
            borderRadius: '50%',
            cursor: 'crosshair',
          }}
        />
        {/* Input port */}
        {!isTrigger && (
          <div 
            style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--border-strong)',
              borderRadius: '50%',
            }}
          />
        )}
      </div>
    );
  };

  const cardAction = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button variant="secondary" onClick={() => addNode('action')}>+ Action</Button>
      <Button variant="secondary" onClick={() => addNode('delay')}>+ Delay</Button>
      <Button variant="secondary" onClick={() => addNode('branch')}>+ Branch</Button>
      <Button variant="primary">Save Workflow</Button>
    </div>
  );

  return (
    <div style={{ height: '700px', display: 'flex', flexDirection: 'column' }}>
      <Card title="Workflow Automation Builder" action={cardAction} className="workflow-card">
        <div style={{ position: 'relative', width: '100%', height: '560px', overflow: 'hidden', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
          <div 
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {/* SVG Canvas for Edges */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
              {edges.map(edge => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (!source || !target) return null;
                
                const startX = source.x + 90;
                const startY = source.y + 60; // Approximate bottom center
                const endX = target.x + 90;
                const endY = target.y - 6; // Approximate top center
                
                const controlY = (startY + endY) / 2;
                
                return (
                  <path
                    key={edge.id}
                    d={`M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`}
                    fill="none"
                    stroke="var(--border-strong)"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              
              {/* Draw active connecting edge */}
              {connecting && (
                (() => {
                  const source = nodes.find(n => n.id === connecting.sourceId);
                  if (!source) return null;
                  const startX = source.x + 90;
                  const startY = source.y + 60;
                  
                  // Need to offset by the Card position, but for simplicity we'll just draw to mouse
                  // In a real app we'd calculate relative to container
                  
                  return (
                    <line 
                      x1={startX} 
                      y1={startY} 
                      x2={connecting.x - 300} // Rough offset for sidebar etc
                      y2={connecting.y - 200} // Rough offset for header
                      stroke="var(--accent-primary)" 
                      strokeWidth="2" 
                      strokeDasharray="5,5" 
                    />
                  );
                })()
              )}
              
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-strong)" />
                </marker>
              </defs>
            </svg>

            {nodes.map(renderNode)}
          </div>
        </div>
      </Card>
    </div>
  );
}
