import React from 'react';
import { NodeRendererRegistry, NodeRenderContext } from './NodeRendererRegistry';
import { resolveBoundValue } from './GraphDataBinder';

export function executeNodeInteraction(
  node: any,
  trigger: 'onTap' | 'onHover' | 'onSubmit' | 'onSceneEnter',
  resolvedState?: any
) {
  if (!node.interactions || node.interactions.length === 0) return;

  const interaction = node.interactions.find(
    (i: any) => i.trigger === trigger || (trigger === 'onTap' && i.onClick)
  );
  if (!interaction) return;

  // Condition evaluation
  if (interaction.condition) {
    const { fieldKey, operator, value } = interaction.condition;
    const currentVal = resolveBoundValue(fieldKey, resolvedState);
    if (operator === 'equals' && currentVal != value) return;
    if (operator === 'not_equals' && currentVal == value) return;
    if (operator === 'exists' && (currentVal === undefined || currentVal === null || currentVal === '')) return;
    if (operator === 'truthy' && !currentVal) return;
  }

  // Action execution
  const action = interaction.action || interaction.onClick?.action;
  const payload = interaction.payload || {};
  const url = payload.url || interaction.onClick?.url;
  const modalId = payload.modalId || interaction.onClick?.modalId;

  if (action === 'navigate' && url) {
    window.open(url, '_blank');
  } else if (action === 'openModal' || action === 'open_modal') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orbitox:open_modal', { detail: { modalId: modalId || 'rsvp' } }));
    }
  } else if (action === 'submit') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orbitox:submit_form', { detail: { nodeId: node.id } }));
    }
  } else if (action === 'reveal' && interaction.targetNodeId) {
    const el = document.getElementById(interaction.targetNodeId);
    if (el) el.style.display = 'block';
  } else if (action === 'hide' && interaction.targetNodeId) {
    const el = document.getElementById(interaction.targetNodeId);
    if (el) el.style.display = 'none';
  } else if (action === 'animate') {
    const el = document.getElementById(node.id);
    if (el) {
      el.style.transform = 'scale(1.05)';
      setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// CONTAINER ADAPTERS
// ─────────────────────────────────────────────────────────────

NodeRendererRegistry.register({
  kind: ['frame', 'container', 'stack', 'grid', 'group', 'mask'],
  render({ node, renderChild, resolvedStyle, isEditorMode, onNodeClick, resolvedState }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id, e);
        return;
      }
      if (!isEditorMode) {
        executeNodeInteraction(node, 'onTap', resolvedState);
      }
    };

    return (
      <div 
        id={node.id} 
        style={resolvedStyle}
        onClick={handleClick}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      >
        {node.children.map(childId => renderChild(childId))}
      </div>
    );
  }
});

// ─────────────────────────────────────────────────────────────
// STRUCTURAL & DECORATIVE ADAPTERS
// ─────────────────────────────────────────────────────────────

NodeRendererRegistry.register({
  kind: 'spacer',
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    return (
      <div
        id={node.id}
        style={{ ...resolvedStyle, pointerEvents: isEditorMode ? 'auto' : 'none' }}
        onClick={(e) => {
          if (isEditorMode && onNodeClick) {
            e.stopPropagation();
            onNodeClick(node.id);
          }
        }}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline min-h-[16px]' : ''}
      />
    );
  }
});

NodeRendererRegistry.register({
  kind: ['line', 'divider'],
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    return (
      <div
        id={node.id}
        style={{
          ...resolvedStyle,
          height: resolvedStyle.height || '1px',
          backgroundColor: resolvedStyle.backgroundColor || 'rgba(255,255,255,0.15)',
        }}
        onClick={(e) => {
          if (isEditorMode && onNodeClick) {
            e.stopPropagation();
            onNodeClick(node.id);
          }
        }}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      />
    );
  }
});

NodeRendererRegistry.register({
  kind: 'button',
  render({ node, resolvedStyle, isEditorMode, onNodeClick, renderChild, resolvedState }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
        return;
      }
      if (!isEditorMode) {
        executeNodeInteraction(node, 'onTap', resolvedState);
      }
    };

    const content = node.textContent || node.name || 'Button';

    return (
      <button
        id={node.id}
        style={{
          ...resolvedStyle,
          cursor: isEditorMode ? 'pointer' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: resolvedStyle.border || 'none',
        }}
        onClick={handleClick}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 transition-all' : 'transition-all'}
      >
        {node.children && node.children.length > 0
          ? node.children.map(childId => renderChild(childId))
          : content}
      </button>
    );
  }
});

NodeRendererRegistry.register({
  kind: 'icon',
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    return (
      <span
        id={node.id}
        style={{
          ...resolvedStyle,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
        onClick={(e) => {
          if (isEditorMode && onNodeClick) {
            e.stopPropagation();
            onNodeClick(node.id, e);
          }
        }}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      >
        {node.textContent || '✦'}
      </span>
    );
  }
});

NodeRendererRegistry.register({
  kind: 'gradient',
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    return (
      <div
        id={node.id}
        style={resolvedStyle}
        onClick={(e) => {
          if (isEditorMode && onNodeClick) {
            e.stopPropagation();
            onNodeClick(node.id, e);
          }
        }}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      />
    );
  }
});

// ─────────────────────────────────────────────────────────────
// CONTENT ADAPTERS
// ─────────────────────────────────────────────────────────────

NodeRendererRegistry.register({
  kind: ['text', 'richtext'],
  render({ node, renderChild, resolvedStyle, isEditorMode, onNodeClick, resolvedState }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id, e);
        return;
      }
      if (!isEditorMode) {
        executeNodeInteraction(node, 'onTap', resolvedState);
      }
    };

    let content = node.textContent || node.name || 'Text Node';
    if (node.binding?.fieldKey) {
      const boundVal = resolveBoundValue(node.binding.fieldKey, resolvedState);
      if (boundVal !== undefined && boundVal !== null && boundVal !== '') {
        content = String(boundVal);
      } else if (isEditorMode) {
        content = `[Bound: ${node.binding.fieldKey}]`;
      }
    }

    return (
      <div 
        id={node.id} 
        style={resolvedStyle}
        onClick={handleClick}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      >
        {content}
      </div>
    );
  }
});

// ─────────────────────────────────────────────────────────────
// MEDIA ADAPTERS
// ─────────────────────────────────────────────────────────────

NodeRendererRegistry.register({
  kind: 'image',
  render({ node, resolvedStyle, isEditorMode, onNodeClick, resolvedState, schema, device }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
        return;
      }
      if (!isEditorMode) {
        executeNodeInteraction(node, 'onTap', resolvedState);
      }
    };

    let hasBgImage = !!resolvedStyle.backgroundImage;
    let style: React.CSSProperties = { 
      ...resolvedStyle,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
    
    // Apply Media Slot cropping and shape if bound to a media slot
    if (node.binding?.bindingType === 'media' && schema?.mediaSlots) {
      const slotDef = schema.mediaSlots.find((s: any) => s.slotKey === node.binding!.fieldKey);
      if (slotDef) {
        const crop = slotDef.responsiveCrops?.[device] || { focalPoint: slotDef.focalPointDefault || { x: 50, y: 50 } };
        style.backgroundPosition = `${crop.focalPoint.x}% ${crop.focalPoint.y}%`;
        
        if (slotDef.cropBehavior === 'fit') {
          style.backgroundSize = 'contain';
        }

        // Apply shapes (fallback if not styled directly by renderer)
        if (!resolvedStyle.borderRadius) {
          if (slotDef.defaultShape === 'circle') {
            style.borderRadius = '50%';
          } else if (slotDef.defaultShape === 'arch') {
            style.borderRadius = '999px 999px 6px 6px';
          } else if (slotDef.defaultShape === 'rounded') {
            style.borderRadius = '24px';
          }
        }
      }
    }

    const directImageUrl =
      (node as any).src ||
      (node as any).imageUrl ||
      (node as any).smartProps?.url ||
      (node as any).smartProps?.src ||
      (node as any).defaults?.imageUrl ||
      (node.style?.background?.image);
    if (directImageUrl) {
      style.backgroundImage = `url("${directImageUrl}")`;
      hasBgImage = true;
    }

    if (node.binding?.fieldKey && resolvedState && resolvedState[node.binding.fieldKey]) {
      style.backgroundImage = `url("${resolvedState[node.binding.fieldKey]}")`;
      hasBgImage = true;
    }

    // Focal point & object positioning
    const focal = (node.style as any)?.focalPoint || (node as any).smartProps?.focalPoint;
    if (focal && typeof focal.x === 'number' && typeof focal.y === 'number') {
      style.backgroundPosition = `${focal.x}% ${focal.y}%`;
      style.objectPosition = `${focal.x}% ${focal.y}%`;
    } else if ((node.style as any)?.objectPosition) {
      style.backgroundPosition = (node.style as any).objectPosition;
      style.objectPosition = (node.style as any).objectPosition;
    }

    // Aspect ratio & filters
    if ((node.style as any)?.aspectRatio) {
      style.aspectRatio = (node.style as any).aspectRatio;
    }
    if ((node.style as any)?.filter) {
      style.filter = (node.style as any).filter;
    }

    // Object fit
    if ((node.style as any)?.objectFit) {
      const fit = (node.style as any).objectFit;
      if (fit === 'contain') style.backgroundSize = 'contain';
      else if (fit === 'fill') style.backgroundSize = '100% 100%';
      else if (fit === 'scale-down') style.backgroundSize = 'auto';
      else style.backgroundSize = 'cover';
    }

    // Drag-and-drop event handlers for replacing images directly on canvas
    const handleDragOver = (e: React.DragEvent) => {
      if (!isEditorMode) return;
      if (
        e.dataTransfer.types.includes('orbitox_asset') ||
        e.dataTransfer.types.includes('text/plain') ||
        e.dataTransfer.types.includes('Files')
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        const el = e.currentTarget as HTMLElement;
        el.style.outline = '2px dashed #3B82F6';
        el.style.outlineOffset = '-2px';
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      if (!isEditorMode) return;
      const el = e.currentTarget as HTMLElement;
      el.style.outline = '';
      el.style.outlineOffset = '';
    };

    const handleDrop = async (e: React.DragEvent) => {
      if (!isEditorMode) return;
      e.preventDefault();
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      el.style.outline = '';
      el.style.outlineOffset = '';

      let assetUrl = '';
      let assetId = '';

      const rawAsset = e.dataTransfer.getData('orbitox_asset');
      if (rawAsset) {
        try {
          const parsed = JSON.parse(rawAsset);
          assetUrl = parsed.url;
          assetId = parsed.id;
        } catch {}
      }
      if (!assetUrl) {
        assetUrl = e.dataTransfer.getData('text/plain');
      }

      // Check if user dropped a local file directly from desktop
      if (!assetUrl && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          try {
            const { FileUploadService } = await import('../services/FileUploadService');
            const newAsset = await FileUploadService.uploadFile(file);
            assetUrl = newAsset.url;
            assetId = newAsset.id;
          } catch (err) {
            console.error('[ImageAdapter] Failed to process dropped file:', err);
          }
        }
      }

      if (assetUrl) {
        const controller = (window as any).__studioController;
        if (controller) {
          controller.updateNode(node.id, {
            src: assetUrl,
            imageUrl: assetUrl,
            smartProps: { ...(node.smartProps || {}), url: assetUrl, src: assetUrl, assetId },
          });
        }
      }
    };

    return (
      <div 
        id={node.id} 
        style={{
          ...style,
          // Placeholder if no image is bound yet
          backgroundColor: hasBgImage ? style.backgroundColor : '#e5e7eb', // gray-200
        }}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={
          (isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline ' : '') +
          (!hasBgImage ? 'flex items-center justify-center text-gray-400 text-xs overflow-hidden' : ' bg-cover bg-center')
        }
      >
        {!hasBgImage && (node.binding?.fieldKey || 'Image')}
      </div>
    );
  }
});
