'use client';

import React, { useState } from 'react';
import {
  Zap,
  Play,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  MousePointer,
  Clock,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { SceneGraphNode } from '@/components/template-studio/engine/SceneGraphTypes';
import { TemplateSceneDefinition } from '@/components/template-studio/types/TemplateSchema';

interface PrototypeWorkspaceProps {
  selectedNode: SceneGraphNode | null;
  activeScene: TemplateSceneDefinition;
  onUpdateNode: (nodeId: string, patch: any) => void;
  onClose?: () => void;
}

interface InteractionFlow {
  id: string;
  trigger: 'click' | 'hover' | 'scroll' | 'timer';
  action: 'navigate' | 'modal' | 'animate' | 'setVariable';
  target: string;
  durationMs: number;
}

export function PrototypeWorkspace({
  selectedNode,
  activeScene,
  onUpdateNode,
  onClose,
}: PrototypeWorkspaceProps) {
  const [flows, setFlows] = useState<InteractionFlow[]>([
    {
      id: 'f1',
      trigger: 'click',
      action: 'navigate',
      target: 'Features Section',
      durationMs: 600,
    },
    {
      id: 'f2',
      trigger: 'hover',
      action: 'animate',
      target: 'Scale 1.05 & Glow',
      durationMs: 250,
    },
  ]);

  const [testResult, setTestResult] = useState<string | null>(null);

  const handleAddFlow = () => {
    setFlows((prev) => [
      ...prev,
      {
        id: `f_${Date.now()}`,
        trigger: 'click',
        action: 'modal',
        target: 'RSVP Dialog',
        durationMs: 400,
      },
    ]);
  };

  const handleDeleteFlow = (id: string) => {
    setFlows((prev) => prev.filter((f) => f.id !== id));
  };

  const handleTestTrigger = (flow: InteractionFlow) => {
    setTestResult(`Fired [${flow.trigger.toUpperCase()}] → Action: ${flow.action} (${flow.target}) in ${flow.durationMs}ms`);
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div
      id="sz-prototype-workspace"
      style={{
        height: '240px',
        background: '#121317',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        userSelect: 'none',
        color: '#F3F4F6',
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          height: '40px',
          background: '#16181D',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={14} style={{ color: '#3B82F6' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F3F4F6' }}>Interaction & Prototype Graph</span>
          <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
            Target: <strong style={{ color: '#FFFFFF' }}>{selectedNode?.name || activeScene.name}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {testResult && (
            <div
              style={{
                fontSize: '0.72rem',
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Check size={11} />
              <span>{testResult}</span>
            </div>
          )}

          <button
            onClick={handleAddFlow}
            style={{
              background: '#2563EB',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 10px',
              color: '#FFFFFF',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={12} />
            <span>Add Interaction</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── FLOW GRAPH NODES ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        {flows.map((flow) => (
          <div
            key={flow.id}
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              minWidth: '380px',
            }}
          >
            {/* Trigger Pill */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <span style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>
                Trigger
              </span>
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: '#60A5FA',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <MousePointer size={12} />
                <span>{flow.trigger}</span>
              </div>
            </div>

            <ArrowRight size={14} style={{ color: '#6B7280' }} />

            {/* Action Pill */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                flex: 1,
              }}
            >
              <span style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>
                Action
              </span>
              <div
                style={{
                  background: '#2A2D37',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: '#F3F4F6',
                  fontSize: '0.74rem',
                }}
              >
                <strong>{flow.action}</strong>: {flow.target}
              </div>
            </div>

            {/* Test Button */}
            <button
              onClick={() => handleTestTrigger(flow)}
              title="Test trigger"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                padding: '5px 8px',
                color: '#34D399',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Play size={10} />
              <span>Test</span>
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDeleteFlow(flow.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                padding: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
