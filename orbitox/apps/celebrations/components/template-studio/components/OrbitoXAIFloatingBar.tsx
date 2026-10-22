import React, { useState } from 'react';
import { Sparkles, Wand2, Type, LayoutTemplate, Loader2, X } from 'lucide-react';
import { SceneGraphNode } from '../engine/SceneGraphTypes';

interface Props {
  selectedNode: SceneGraphNode | null;
  onGenerateSection: () => void;
  onRedesign: () => void;
  onWriteCopy: () => void;
}

export function OrbitoXAIFloatingBar({
  selectedNode,
  onGenerateSection,
  onRedesign,
  onWriteCopy,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = (action: 'generate' | 'redesign' | 'copy', callback: () => void) => {
    setActiveAction(action);
    setIsGenerating(true);
    // Simulate AI generation delay
    setTimeout(() => {
      callback();
      setIsGenerating(false);
      setActiveAction(null);
    }, 1500);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(9, 13, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        borderRadius: '9999px',
        padding: '6px 8px',
        zIndex: 50,
        boxShadow: '0 10px 40px rgba(139, 92, 246, 0.2), 0 0 0 1px rgba(139, 92, 246, 0.1) inset',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
          color: '#FFFFFF',
          marginRight: '4px',
        }}
      >
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
      </div>

      {!selectedNode && (
        <button
          onClick={() => handleAction('generate', onGenerateSection)}
          disabled={isGenerating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeAction === 'generate' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: '9999px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <LayoutTemplate size={14} style={{ color: '#C4B5FD' }} />
          <span>Generate section...</span>
        </button>
      )}

      {selectedNode && (
        <>
          <button
            onClick={() => handleAction('redesign', onRedesign)}
            disabled={isGenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeAction === 'redesign' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '9999px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Wand2 size={14} style={{ color: '#C4B5FD' }} />
            <span>Redesign...</span>
          </button>

          {(selectedNode.kind === 'text' || selectedNode.kind === 'richtext') && (
            <>
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
              <button
                onClick={() => handleAction('copy', onWriteCopy)}
                disabled={isGenerating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeAction === 'copy' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Type size={14} style={{ color: '#C4B5FD' }} />
                <span>Write copy...</span>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
