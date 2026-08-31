'use client';

import React, { useState, useEffect } from 'react';
import {
  FlowGraph,
  FlowNode,
  FlowConnection,
  FlowNodeType,
  LogicEvaluationContext,
  commerceEngine,
} from '@orbitox/commerce';

export interface FlowCanvasProps {
  graph?: FlowGraph;
  onChange: (updatedGraph: FlowGraph) => void;
  sectionName?: string;
  context?: LogicEvaluationContext;
}

export function FlowCanvas({
  graph,
  onChange,
  sectionName = 'Section',
  context: initialContext,
}: FlowCanvasProps) {
  // Initialize graph state
  const [activeGraph, setActiveGraph] = useState<FlowGraph>(() => {
    if (graph && graph.nodes && graph.nodes.length > 0) return graph;
    return commerceEngine.flows.createDefaultFlow(sectionName);
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nodeInitialPos, setNodeInitialPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pan & Zoom
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 40 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Wiring State
  const [isWiring, setIsWiring] = useState<boolean>(false);
  const [wireSource, setWireSource] = useState<{ nodeId: string; portId: string } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive Live Simulation Sandbox Dock State
  const [simCartSubtotal, setSimCartSubtotal] = useState<number>(120);
  const [simSegment, setSimSegment] = useState<'vip' | 'guest' | 'first_time' | 'all'>('vip');
  const [simDevice, setSimDevice] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');

  // AI Prompt Modal
  const [aiPromptOpen, setAiPromptOpen] = useState<boolean>(false);
  const [aiPromptInput, setAiPromptInput] = useState<string>('Apply 20% discount if customer is VIP and cart > $100');

  // Add Node Modal
  const [addNodeOpen, setAddNodeOpen] = useState<boolean>(false);

  // Live simulation execution context
  const activeSimContext: LogicEvaluationContext = {
    cartSubtotal: simCartSubtotal,
    cartItemCount: simCartSubtotal > 0 ? 2 : 0,
    customerSegment: simSegment,
    deviceType: simDevice,
    countryCode: 'US',
  };

  const executionResult = commerceEngine.flows.executeFlow(activeGraph, activeSimContext);

  // Notify parent
  const updateGraphState = (newGraph: FlowGraph) => {
    setActiveGraph(newGraph);
    onChange(newGraph);
  };

  // Node Drag Handlers
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggedNodeId(nodeId);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    const n = activeGraph.nodes.find((item) => item.id === nodeId);
    if (n) setNodeInitialPos({ x: n.position.x, y: n.position.y });
  };

  // Canvas Pan Handlers
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNodeId(null);
    }
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      setCursorPos({ x: (e.clientX - pan.x) / zoom, y: (e.clientY - pan.y) / zoom });

      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      } else if (draggedNodeId) {
        const dx = (e.clientX - dragStartPos.x) / zoom;
        const dy = (e.clientY - dragStartPos.y) / zoom;

        const updatedNodes = activeGraph.nodes.map((n) => {
          if (n.id === draggedNodeId) {
            return {
              ...n,
              position: {
                x: Math.round((nodeInitialPos.x + dx) / 10) * 10,
                y: Math.round((nodeInitialPos.y + dy) / 10) * 10,
              },
            };
          }
          return n;
        });

        updateGraphState({ ...activeGraph, nodes: updatedNodes });
      }
    };

    const handlePointerUp = () => {
      setIsPanning(false);
      setDraggedNodeId(null);
      if (isWiring) {
        setIsWiring(false);
        setWireSource(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isPanning, draggedNodeId, isWiring, pan, zoom, dragStartPos, nodeInitialPos, activeGraph]);

  // Wire Connection Handlers
  const handleStartWire = (e: React.PointerEvent, nodeId: string, portId: string) => {
    e.stopPropagation();
    setIsWiring(true);
    setWireSource({ nodeId, portId });
  };

  const handleCompleteWire = (e: React.PointerEvent, targetNodeId: string, targetPortId: string) => {
    e.stopPropagation();
    if (!wireSource || wireSource.nodeId === targetNodeId) return;

    const exists = activeGraph.connections.some(
      (c) =>
        c.fromNodeId === wireSource.nodeId &&
        c.fromPortId === wireSource.portId &&
        c.toNodeId === targetNodeId &&
        c.toPortId === targetPortId
    );

    if (!exists) {
      const newConn: FlowConnection = {
        id: `conn_${Date.now()}`,
        fromNodeId: wireSource.nodeId,
        fromPortId: wireSource.portId,
        toNodeId: targetNodeId,
        toPortId: targetPortId,
      };

      updateGraphState({
        ...activeGraph,
        connections: [...activeGraph.connections, newConn],
      });
    }

    setIsWiring(false);
    setWireSource(null);
  };

  const handleDeleteWire = (connId: string) => {
    updateGraphState({
      ...activeGraph,
      connections: activeGraph.connections.filter((c) => c.id !== connId),
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    updateGraphState({
      ...activeGraph,
      nodes: activeGraph.nodes.filter((n) => n.id !== nodeId),
      connections: activeGraph.connections.filter(
        (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
      ),
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleAddNode = (type: FlowNodeType, label: string, icon: string, config: any = {}) => {
    const newNodeId = `node_${type.replace(':', '_')}_${Date.now()}`;
    const newNode: FlowNode = {
      id: newNodeId,
      type,
      label,
      icon,
      position: { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 },
      config,
      inputs: type.startsWith('trigger:')
        ? []
        : [{ id: 'in_flow', label: 'In', dataType: 'flow', type: 'input' }],
      outputs: type.startsWith('condition:')
        ? [
            { id: 'out_true', label: 'True', dataType: 'flow', type: 'output' },
            { id: 'out_false', label: 'False', dataType: 'flow', type: 'output' },
          ]
        : type.startsWith('action:')
        ? []
        : [{ id: 'out_default', label: 'Flow', dataType: 'flow', type: 'output' }],
    };

    updateGraphState({
      ...activeGraph,
      nodes: [...activeGraph.nodes, newNode],
    });
    setSelectedNodeId(newNodeId);
    setAddNodeOpen(false);
  };

  const handleAiGenerateFlow = () => {
    const generated = commerceEngine.flows.generateFlowFromPrompt(aiPromptInput, sectionName);
    updateGraphState(generated);
    setAiPromptOpen(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '520px',
        background: '#09090C',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ─── CANVAS TOP TOOLBAR ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 40,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 15, 18, 0.92)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#8B5CF6' }}>
            ⚡ n8n Flow: {activeGraph.name}
          </span>
          <button
            type="button"
            onClick={() => setAddNodeOpen(true)}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '11px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>+</span>
            <span>Add Node</span>
          </button>
          <button
            type="button"
            onClick={() => setAiPromptOpen(true)}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              background: 'rgba(212, 175, 55, 0.15)',
              color: '#D4AF37',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🤖</span>
            <span>AI Prompt</span>
          </button>
        </div>

        {/* Live Simulation Indicator Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '999px',
            background: executionResult.isVisible
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            border: executionResult.isVisible
              ? '1px solid rgba(34, 197, 94, 0.4)'
              : '1px solid rgba(239, 68, 68, 0.4)',
            color: executionResult.isVisible ? '#4ADE80' : '#EF4444',
            fontSize: '11px',
            fontWeight: 800,
          }}
        >
          <span>{executionResult.isVisible ? '🟢 Section VISIBLE' : '🔴 Section HIDDEN'}</span>
        </div>
      </div>

      {/* ─── INTERACTIVE NODE GRAPH CANVAS ─────────────────────── */}
      <div
        onPointerDown={handleCanvasPointerDown}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: isPanning ? 'grabbing' : 'grab',
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* SVG Bezier Connection Wires Layer */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {activeGraph.connections.map((conn) => {
            const fromNode = activeGraph.nodes.find((n) => n.id === conn.fromNodeId);
            const toNode = activeGraph.nodes.find((n) => n.id === conn.toNodeId);
            if (!fromNode || !toNode) return null;

            const isTrueBranch = conn.fromPortId === 'out_true';
            const isFalseBranch = conn.fromPortId === 'out_false';

            const startX = fromNode.position.x + 200;
            const startY =
              fromNode.position.y + (isTrueBranch ? 32 : isFalseBranch ? 58 : 42);
            const endX = toNode.position.x;
            const endY = toNode.position.y + 42;

            const dx = Math.max(60, (endX - startX) * 0.5);
            const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${
              endX - dx
            } ${endY}, ${endX} ${endY}`;

            const isExecuted =
              executionResult.executionPath.includes(fromNode.id) &&
              executionResult.executionPath.includes(toNode.id);

            const wireColor = isTrueBranch
              ? '#22C55E'
              : isFalseBranch
              ? '#EF4444'
              : isExecuted
              ? '#8B5CF6'
              : 'rgba(255, 255, 255, 0.3)';

            return (
              <g key={conn.id}>
                {/* Clickable Wider Path for deleting connection */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={() => handleDeleteWire(conn.id)}
                />
                {/* Visual Animated Wire with Energy Pulse */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={wireColor}
                  strokeWidth={isExecuted ? '3.5' : '2'}
                  strokeDasharray={isExecuted ? '8 4' : undefined}
                  style={{
                    filter: isExecuted ? `drop-shadow(0 0 8px ${wireColor})` : undefined,
                    animation: isExecuted ? 'dash 0.8s linear infinite' : undefined,
                  }}
                />
              </g>
            );
          })}

          {/* Active Wiring Cursor Follower */}
          {isWiring && wireSource && (
            <path
              d={`M ${(activeGraph.nodes.find((n) => n.id === wireSource.nodeId)?.position.x || 0) + 200} ${
                (activeGraph.nodes.find((n) => n.id === wireSource.nodeId)?.position.y || 0) + 42
              } C ${(activeGraph.nodes.find((n) => n.id === wireSource.nodeId)?.position.x || 0) + 280} ${
                (activeGraph.nodes.find((n) => n.id === wireSource.nodeId)?.position.y || 0) + 42
              }, ${cursorPos.x - 60} ${cursorPos.y}, ${cursorPos.x} ${cursorPos.y}`}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {/* Nodes Layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
          }}
        >
          {activeGraph.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isExecuted = executionResult.executionPath.includes(node.id);

            const headerBg = node.type.startsWith('trigger:')
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : node.type.startsWith('condition:')
              ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
              : node.type.startsWith('action:')
              ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
              : 'linear-gradient(135deg, #F59E0B, #D97706)';

            return (
              <div
                key={node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                style={{
                  position: 'absolute',
                  left: node.position.x,
                  top: node.position.y,
                  width: '200px',
                  borderRadius: '10px',
                  background: 'rgba(18, 18, 22, 0.95)',
                  border: isSelected
                    ? '2px solid #D4AF37'
                    : isExecuted
                    ? '1.5px solid #8B5CF6'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(212, 175, 55, 0.4)'
                    : isExecuted
                    ? '0 0 16px rgba(139, 92, 246, 0.3)'
                    : '0 6px 16px rgba(0, 0, 0, 0.5)',
                  pointerEvents: 'auto',
                  cursor: 'grab',
                  userSelect: 'none',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Node Header */}
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px 8px 0 0',
                    background: headerBg,
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px' }}>{node.icon}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {node.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                    style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '10px', opacity: 0.8 }}
                  >
                    ✕
                  </button>
                </div>

                {/* Input Ports (Left) */}
                {node.inputs.map((port) => (
                  <div
                    key={port.id}
                    onPointerUp={(e) => handleCompleteWire(e, node.id, port.id)}
                    title={`Input: ${port.label}`}
                    style={{
                      position: 'absolute',
                      left: '-8px',
                      top: '36px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '999px',
                      background: '#3B82F6',
                      border: '2px solid #FFF',
                      cursor: 'crosshair',
                      boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
                    }}
                  />
                ))}

                {/* Output Ports (Right) */}
                {node.outputs.map((port, pIdx) => {
                  const portTop = node.outputs.length === 1 ? 36 : pIdx === 0 ? 26 : 52;
                  const portBg =
                    port.id === 'out_true'
                      ? '#22C55E'
                      : port.id === 'out_false'
                      ? '#EF4444'
                      : '#8B5CF6';

                  return (
                    <div
                      key={port.id}
                      onPointerDown={(e) => handleStartWire(e, node.id, port.id)}
                      title={`Output: ${port.label} (Drag to connect)`}
                      style={{
                        position: 'absolute',
                        right: '-8px',
                        top: `${portTop}px`,
                        width: '14px',
                        height: '14px',
                        borderRadius: '999px',
                        background: portBg,
                        border: '2px solid #FFF',
                        cursor: 'crosshair',
                        boxShadow: `0 0 8px ${portBg}`,
                      }}
                    />
                  );
                })}

                {/* Node Body Details */}
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Type: {node.type.split(':')[1]}
                  </span>
                  {node.config.threshold && (
                    <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 700 }}>
                      Threshold: ${node.config.threshold}
                    </span>
                  )}
                  {node.config.segment && (
                    <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 700 }}>
                      Segment: {node.config.segment}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DOCKED BOTTOM SIMULATION SANDBOX TOOLBAR ──────────────── */}
      <div
        style={{
          padding: '8px 14px',
          background: 'rgba(12, 12, 16, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#8B5CF6' }}>
            🧪 Live Simulator:
          </span>
        </div>

        {/* Customer Segment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#AAA' }}>Audience:</span>
          <select
            value={simSegment}
            onChange={(e) => setSimSegment(e.target.value as any)}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              background: '#000',
              border: '1px solid #444',
              color: '#FFF',
              fontSize: '11px',
            }}
          >
            <option value="vip">👑 VIP Member</option>
            <option value="first_time">✨ First-Time</option>
            <option value="guest">👤 Guest</option>
          </select>
        </div>

        {/* Cart Subtotal Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#AAA' }}>Cart:</span>
          <input
            type="range"
            min="0"
            max="300"
            step="10"
            value={simCartSubtotal}
            onChange={(e) => setSimCartSubtotal(Number(e.target.value))}
            style={{ width: '90px' }}
          />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#D4AF37' }}>
            ${simCartSubtotal}
          </span>
        </div>

        {/* Device Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(['desktop', 'mobile'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSimDevice(d)}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: 'none',
                background: simDevice === d ? '#8B5CF6' : 'rgba(255,255,255,0.05)',
                color: '#FFF',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {d === 'desktop' ? '🖥️ PC' : '📱 Mobile'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── AI FLOW PROMPT MODAL ──────────────────────────────── */}
      {aiPromptOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '440px',
              background: '#16161A',
              borderRadius: '12px',
              border: '1px solid #D4AF37',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#D4AF37' }}>
              🤖 AI Flow Synthesizer
            </span>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              Describe what business logic you want to wire (e.g. discount rules, VIP gates, device variants).
            </p>
            <textarea
              rows={3}
              value={aiPromptInput}
              onChange={(e) => setAiPromptInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#FFF',
                fontSize: '12px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAiPromptOpen(false)}
                style={{ padding: '6px 12px', borderRadius: '6px', background: 'none', border: '1px solid #444', color: '#FFF', fontSize: '11px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAiGenerateFlow}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #D4AF37, #F59E0B)',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ⚡ Generate Flow Graph
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD NODE MODAL ────────────────────────────────────── */}
      {addNodeOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '420px',
              background: '#16161A',
              borderRadius: '12px',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#8B5CF6' }}>
                ⚡ Select Logic Node to Insert
              </span>
              <button
                type="button"
                onClick={() => setAddNodeOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {/* Conditions */}
              <span style={{ fontSize: '10px', color: '#3B82F6', fontWeight: 800, textTransform: 'uppercase' }}>
                Conditions (Branching)
              </span>
              {[
                { type: 'condition:customer-segment', label: '👑 Customer Segment (VIP / Guest)', icon: '👑', config: { segment: 'vip' } },
                { type: 'condition:cart-value', label: '🛒 Cart Subtotal Threshold (≥ $100)', icon: '🛒', config: { threshold: 100 } },
                { type: 'condition:device-type', label: '📱 Device Type (Mobile / Tablet / PC)', icon: '📱', config: { device: 'mobile' } },
                { type: 'condition:time-of-day', label: '🌙 Night Owl Flash Window (8 PM - 4 AM)', icon: '🌙', config: { startHour: 20, endHour: 4 } },
                { type: 'condition:ab-split', label: '🔀 50/50 A/B Traffic Split', icon: '🔀', config: { trafficWeight: 50 } },
                { type: 'condition:custom-expression', label: '💻 Custom JavaScript Expression', icon: '💻', config: { expression: 'cartSubtotal > 150' } },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddNode(item.type as any, item.label, item.icon, item.config)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}

              {/* Actions */}
              <span style={{ fontSize: '10px', color: '#8B5CF6', fontWeight: 800, textTransform: 'uppercase', marginTop: '6px' }}>
                Actions (Outcomes)
              </span>
              {[
                { type: 'action:show-section', label: '👁️ Show Section', icon: '👁️' },
                { type: 'action:hide-section', label: '🙈 Hide Section', icon: '🙈' },
                { type: 'action:apply-discount', label: '🏷️ Auto-Apply 20% Off Promo Code', icon: '🏷️', config: { code: 'VIP20' } },
                { type: 'action:show-toast', label: '💬 Trigger Floating VIP Concierge Banner', icon: '💬' },
                { type: 'action:open-drawer', label: '🛍️ Automatically Open Cart Drawer', icon: '🛍️' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddNode(item.type as any, item.label, item.icon, item.config)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
