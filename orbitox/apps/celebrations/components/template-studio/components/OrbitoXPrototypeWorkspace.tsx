'use client';

import React, { useState } from 'react';
import {
  Play, Zap, ArrowRight, CheckCircle2, Sliders, ExternalLink,
  Volume2, Eye, EyeOff, Layers, Sparkles, X, Plus, Trash2
} from 'lucide-react';
import { SceneGraphNode, NodeInteraction } from '../engine/SceneGraphTypes';
import { TemplateSceneDefinition } from '../types/TemplateSchema';

interface Props {
  selectedNode: SceneGraphNode | null;
  activeScene: TemplateSceneDefinition;
  onUpdateNode: (nodeId: string, patch: Partial<SceneGraphNode>) => void;
  onClose: () => void;
}

export function OrbitoXPrototypeWorkspace({
  selectedNode,
  activeScene,
  onUpdateNode,
  onClose,
}: Props) {
  const currentInteractions = selectedNode?.interactions || [];
  const activeInteraction: NodeInteraction = currentInteractions[0] || {
    trigger: 'onTap',
    action: 'navigate',
    payload: { url: '#features' },
  };

  const [trigger, setTrigger] = useState<string>(activeInteraction.trigger || 'onTap');
  const [condition, setCondition] = useState<string>('always');
  const [action, setAction] = useState<string>(activeInteraction.action || 'navigate');
  const [payloadVal, setPayloadVal] = useState<string>(
    activeInteraction.payload?.url || activeInteraction.payload?.modalId || '#explore'
  );
  const [transition, setTransition] = useState<string>('spring');
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  const handleSaveInteraction = (newTrigger = trigger, newAction = action, newVal = payloadVal) => {
    if (!selectedNode) return;
    const payload: any = {};
    if (newAction === 'navigate') payload.url = newVal;
    if (newAction === 'openModal') payload.modalId = newVal;
    if (newAction === 'animate') payload.animation = 'spring-bounce';
    if (newAction === 'setVariable') payload.variable = 'selectedTab';

    const updated: NodeInteraction[] = [
      {
        trigger: newTrigger as any,
        action: newAction as any,
        payload,
      },
    ];

    onUpdateNode(selectedNode.id, { interactions: updated });
  };

  const handleTestFlow = () => {
    setTestSuccess(`Fired "${trigger}" ➔ "${action}" [${transition}]!`);
    setTimeout(() => setTestSuccess(null), 2400);
  };

  return (
    <div
      id="orbitox-prototype-workspace"
      style={{
        height: '240px',
        background: '#090D1A',
        borderTop: '1px solid rgba(139, 92, 246, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.7)',
        userSelect: 'none',
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* ── TOP HEADER ── */}
      <div
        style={{
          height: '42px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#8B5CF6',
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.04em',
            }}
          >
            <Zap size={15} />
            <span>PROTOTYPE WORKSPACE</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.12)' }} />

          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Target:{' '}
            <span style={{ color: selectedNode ? '#DFBA6B' : '#8B5CF6', fontWeight: 600 }}>
              {selectedNode ? `${selectedNode.name || selectedNode.kind} (${selectedNode.id})` : `Page: ${activeScene.name}`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {testSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                color: '#4ADE80',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={12} />
              <span>{testSuccess}</span>
            </div>
          )}

          <button
            id="orbitox-test-trigger-flow-btn"
            onClick={handleTestFlow}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Play size={12} fill="#FFFFFF" />
            <span>Test Trigger Flow</span>
          </button>

          <button
            onClick={onClose}
            title="Close Prototype Workspace"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── FLOW GRAPH CANVAS: TRIGGER ➔ CONDITION ➔ ACTION ➔ STATE ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 24px',
          gap: '16px',
          overflowX: 'auto',
        }}
      >
        {!selectedNode ? (
          <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>
            Click any button, card, or text layer on the canvas above to attach visual state flows.
          </div>
        ) : (
          <>
            {/* STEP 1: TRIGGER */}
            <div
              style={{
                width: '180px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B5CF6', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Zap size={13} />
                <span>1. Trigger</span>
              </div>
              <select
                value={trigger}
                onChange={(e) => {
                  setTrigger(e.target.value);
                  handleSaveInteraction(e.target.value, action, payloadVal);
                }}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  padding: '6px 8px',
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              >
                <option value="onTap" style={{ background: '#090D1A' }}>On Tap / Click</option>
                <option value="onHover" style={{ background: '#090D1A' }}>On Hover In</option>
                <option value="onScrollProgress" style={{ background: '#090D1A' }}>On Scroll Progress</option>
                <option value="onTimer" style={{ background: '#090D1A' }}>On Timer (2.5s)</option>
                <option value="onSubmit" style={{ background: '#090D1A' }}>On Form Submit</option>
              </select>
            </div>

            {/* CONNECTOR 1 */}
            <ArrowRight size={16} style={{ color: 'rgba(139, 92, 246, 0.5)' }} />

            {/* STEP 2: CONDITION */}
            <div
              style={{
                width: '170px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Sliders size={13} />
                <span>2. Condition</span>
              </div>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  padding: '6px 8px',
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              >
                <option value="always" style={{ background: '#090D1A' }}>Always (Unconditional)</option>
                <option value="loggedIn" style={{ background: '#090D1A' }}>If User Logged In</option>
                <option value="formValid" style={{ background: '#090D1A' }}>If Form Valid</option>
                <option value="menuClosed" style={{ background: '#090D1A' }}>If Menu Closed</option>
              </select>
            </div>

            {/* CONNECTOR 2 */}
            <ArrowRight size={16} style={{ color: 'rgba(139, 92, 246, 0.5)' }} />

            {/* STEP 3: ACTION */}
            <div
              style={{
                width: '210px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(223, 186, 107, 0.4)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DFBA6B', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Play size={13} />
                <span>3. Action</span>
              </div>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  handleSaveInteraction(trigger, e.target.value, payloadVal);
                }}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  padding: '6px 8px',
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              >
                <option value="navigate" style={{ background: '#090D1A' }}>Navigate Page / URL</option>
                <option value="openModal" style={{ background: '#090D1A' }}>Open Modal Dialog</option>
                <option value="animate" style={{ background: '#090D1A' }}>Trigger Micro-Animation</option>
                <option value="setVariable" style={{ background: '#090D1A' }}>Set Dynamic Variable</option>
              </select>

              <input
                type="text"
                value={payloadVal}
                placeholder={action === 'navigate' ? 'https://... or #pricing' : 'Target identifier'}
                onChange={(e) => {
                  setPayloadVal(e.target.value);
                  handleSaveInteraction(trigger, action, e.target.value);
                }}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: '#FFFFFF',
                  padding: '4px 6px',
                  fontSize: '0.72rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* CONNECTOR 3 */}
            <ArrowRight size={16} style={{ color: 'rgba(139, 92, 246, 0.5)' }} />

            {/* STEP 4: STATE TRANSITION */}
            <div
              style={{
                width: '180px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Sparkles size={13} />
                <span>4. Transition</span>
              </div>
              <select
                value={transition}
                onChange={(e) => setTransition(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  padding: '6px 8px',
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              >
                <option value="spring" style={{ background: '#090D1A' }}>Spring Physics (60 FPS)</option>
                <option value="dissolve" style={{ background: '#090D1A' }}>Dissolve (300ms)</option>
                <option value="slideUp" style={{ background: '#090D1A' }}>Slide Up (400ms)</option>
                <option value="instant" style={{ background: '#090D1A' }}>Instant (0ms)</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
