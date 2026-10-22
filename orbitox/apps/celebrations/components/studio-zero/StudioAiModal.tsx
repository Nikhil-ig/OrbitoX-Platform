'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  Wand2,
  Check,
  Send,
  RotateCcw,
  Sliders,
  Type,
  Layers,
  Box,
  Smartphone,
} from 'lucide-react';
import { SceneGraphNode } from '@/components/template-studio/engine/SceneGraphTypes';
import { TemplateSceneDefinition, TemplateSchema } from '@/components/template-studio/types/TemplateSchema';
import { AIDesignEngine } from '@/components/template-studio/engine/AIDesignEngine';

interface StudioAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: SceneGraphNode | null;
  activeScene: TemplateSceneDefinition;
  schema?: TemplateSchema;
  onExecuteAiCommand: (command: string, targetId?: string) => void;
  onUndo?: () => void;
}

export function StudioAiModal({
  isOpen,
  onClose,
  selectedNode,
  activeScene,
  schema,
  onExecuteAiCommand,
  onUndo,
}: StudioAiModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);

  // Live plan preview as user types
  const planPreview = useMemo(() => {
    if (!prompt.trim() || !schema) return null;
    return AIDesignEngine.planPrompt(prompt.trim(), schema, selectedNode?.id, activeScene.id);
  }, [prompt, schema, selectedNode?.id, activeScene.id]);

  if (!isOpen) return null;

  const presets = [
    { id: 'sz-ai-preset-luxury', label: 'Apply luxury editorial', desc: 'High-fashion serif headlines, tracked letter-spacing, champagne tones' },
    { id: 'sz-ai-preset-glass', label: 'Add glass effect', desc: 'Apply frosted glassmorphism backdrop-filter with specular rim border' },
    { id: 'sz-ai-preset-copy', label: 'Refine headline copy', desc: 'Craft royal romantic poetry and elegant ceremonial headline wording' },
    { id: 'sz-ai-preset-mobile', label: 'Make this mobile-first', desc: 'Adapt typography scale, hug content padding, and single-column flex' },
    { id: 'sz-ai-preset-parallax', label: 'Add subtle parallax', desc: 'Configure multi-plane scroll depth on background and content layers' },
    { id: 'sz-ai-preset-cinematic', label: 'Make this cinematic', desc: 'Deep dramatic contrast, dark vignette, and smooth drift motion' },
  ];

  const handleRun = (text: string) => {
    setIsProcessing(true);
    setLastExecuted(text);
    setTimeout(() => {
      onExecuteAiCommand(text, selectedNode?.id);
      setIsProcessing(false);
      setHasApplied(true);
    }, 400);
  };

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
      setHasApplied(false);
      setLastExecuted(null);
    }
  };

  return (
    <div
      id="sz-ai-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(14px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        id="sz-ai-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          background: '#16181F',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '18px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.85), 0 0 40px rgba(59, 130, 246, 0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.18)',
                color: '#60A5FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                Ask OrbitoX AI Designer
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#9CA3AF' }}>
                Target: {selectedNode ? `Layer "${selectedNode.name || selectedNode.kind}"` : `Section "${activeScene.name}"`}
              </p>
            </div>
          </div>
          <button
            id="sz-ai-modal-close-btn"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '6px',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Input area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1F222B',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            padding: '8px 12px',
          }}
        >
          <input
            id="sz-ai-modal-input"
            type="text"
            placeholder="Type instructions or select an architectural preset below..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && prompt.trim()) handleRun(prompt.trim());
            }}
            autoFocus
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              outline: 'none',
              flex: 1,
            }}
          />
          <button
            id="sz-ai-modal-submit-btn"
            onClick={() => prompt.trim() && handleRun(prompt.trim())}
            disabled={!prompt.trim() || isProcessing}
            style={{
              background: prompt.trim() ? '#2563EB' : 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 14px',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: prompt.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isProcessing ? 'Applying...' : <Send size={13} />}
            <span>{isProcessing ? 'Applying...' : 'Apply'}</span>
          </button>
        </div>

        {/* Live Plan Preview (when typing custom prompt) */}
        {planPreview && (
          <div
            id="sz-ai-plan-preview"
            style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.74rem',
              color: '#93C5FD',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Wand2 size={15} style={{ flexShrink: 0, color: '#60A5FA' }} />
            <div>
              <strong>AI Plan:</strong> {planPreview.summary} ({planPreview.nodePatches.length} node mutations)
            </div>
          </div>
        )}

        {/* Presets Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Instant Architectural Commands
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {presets.map((p) => (
              <button
                key={p.id}
                id={p.id}
                onClick={() => handleRun(p.label)}
                disabled={isProcessing}
                style={{
                  background: '#1F222B',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#282C37';
                  e.currentTarget.style.borderColor = '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1F222B';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF' }}>{p.label}</div>
                <div style={{ fontSize: '0.68rem', color: '#9CA3AF', lineHeight: 1.3 }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Applied Feedback & 1-Click Rollback */}
        {lastExecuted && (
          <div
            id="sz-ai-applied-feedback"
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.76rem',
              color: '#34D399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} />
              <span>Applied &ldquo;{lastExecuted}&rdquo; to living SceneGraph AST.</span>
            </div>

            {onUndo && hasApplied && (
              <button
                id="sz-ai-undo-btn"
                onClick={handleUndo}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#FFFFFF',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={11} />
                <span>Undo</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
