'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileCode,
  Image as ImageIcon,
  Film,
  Sparkles,
  RefreshCw,
  Box,
  CheckCircle2,
} from 'lucide-react';
import { AssetIngestionService, AssetIngestionQueueEvent } from '../template-studio/services/AssetIngestionService';

interface GlobalDropzoneOverlayProps {
  onDropFiles: (files: File[], targetNodeId?: string | null) => void;
  onDropUrl?: (url: string) => void;
}

export function GlobalDropzoneOverlay({
  onDropFiles,
  onDropUrl,
}: GlobalDropzoneOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [targetNode, setTargetNode] = useState<{ id: string; kind: string; rect: DOMRect } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<AssetIngestionQueueEvent | null>(null);
  const dragCounter = useRef(0);

  // Subscribe to AssetIngestionService progress events
  useEffect(() => {
    return AssetIngestionService.subscribe((event) => {
      setUploadProgress(event);
      if (event.progressPercent >= 100) {
        setTimeout(() => setUploadProgress(null), 3000);
      }
    });
  }, []);

  // Listen to window-level drag events
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer && e.dataTransfer.types.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!isDragging) setIsDragging(true);

      // Perform spatial hit test against canvas nodes
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = element?.closest('[data-node-id]') as HTMLElement | null;

      if (nodeEl) {
        const id = nodeEl.getAttribute('data-node-id');
        const kind = nodeEl.getAttribute('data-node-kind') || 'frame';

        if (id && (kind === 'image' || kind === 'video' || kind === 'frame')) {
          const rect = nodeEl.getBoundingClientRect();
          setTargetNode({ id, kind, rect });
          return;
        }
      }
      setTargetNode(null);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
        setTargetNode(null);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      const targetId = targetNode?.id || null;
      setTargetNode(null);

      // 1. Check for URL drop
      if (e.dataTransfer?.types.includes('text/uri-list') || e.dataTransfer?.types.includes('text/plain')) {
        const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
          if (onDropUrl) {
            onDropUrl(text.trim());
            return;
          }
        }
      }

      // 2. Check for file drops
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        onDropFiles(files, targetId);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isDragging, targetNode, onDropFiles, onDropUrl]);

  return (
    <>
      {/* ── 1. GLOBAL DRAG INTERCEPTION BACKDROP ── */}
      {isDragging && (
        <div
          id="sz-global-dropzone-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(9, 11, 17, 0.88)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
            border: '3px dashed #3B82F6',
            boxShadow: 'inset 0 0 100px rgba(59, 130, 246, 0.25)',
          }}
        >
          {/* Target Node Glowing Boundary if hovering over replace target */}
          {targetNode && (
            <div
              style={{
                position: 'fixed',
                left: `${targetNode.rect.left}px`,
                top: `${targetNode.rect.top}px`,
                width: `${targetNode.rect.width}px`,
                height: `${targetNode.rect.height}px`,
                border: '2px solid #06B6D4',
                background: 'rgba(6, 182, 212, 0.2)',
                borderRadius: '8px',
                pointerEvents: 'none',
                zIndex: 100000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)',
              }}
            >
              <div
                style={{
                  background: '#06B6D4',
                  color: '#081018',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                }}
              >
                <RefreshCw size={12} />
                <span>Drop to Replace Asset</span>
              </div>
            </div>
          )}

          {/* Central Glassmorphic Portal Indicator */}
          {!targetNode && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '36px 48px',
                background: 'rgba(22, 24, 33, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
                textAlign: 'center',
                maxWidth: '560px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
                }}
              >
                <UploadCloud size={32} color="#FFFFFF" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F3F4F6', margin: 0 }}>
                  Bring Anything into OrbitoX
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
                  Drop HTML5, theme archives, Figma URLs, vector SVGs, photos, videos, custom fonts, or 3D models.
                </p>
              </div>

              {/* Supported Format Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                {[
                  { label: 'HTML5 & Tailwind', icon: <FileCode size={12} /> },
                  { label: 'Shopify OS 2.0', icon: <Box size={12} /> },
                  { label: 'Figma Bridge', icon: <Sparkles size={12} /> },
                  { label: 'Media & 3D GLB', icon: <ImageIcon size={12} /> },
                ].map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      color: '#D1D5DB',
                      fontWeight: 600,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. NON-BLOCKING UPLOAD PROGRESS PILL ── */}
      {uploadProgress && (
        <aside
          id="sz-upload-progress-pill"
          aria-label="Upload Progress"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: '#191C24',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
            userSelect: 'none',
          }}
        >
          {uploadProgress.progressPercent >= 100 ? (
            <CheckCircle2 size={20} color="#10B981" />
          ) : (
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                borderTopColor: '#3B82F6',
                animation: 'spin 1s linear infinite',
              }}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F3F4F6' }}>
              {uploadProgress.progressPercent >= 100
                ? 'All Assets Ready'
                : `Processing ${uploadProgress.currentFileName}`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '120px',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${uploadProgress.progressPercent}%`,
                    height: '100%',
                    background: '#3B82F6',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                {uploadProgress.processedFiles}/{uploadProgress.totalFiles}
              </span>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
