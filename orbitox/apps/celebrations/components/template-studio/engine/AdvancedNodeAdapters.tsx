import React from 'react';
import { NodeRendererRegistry, NodeRenderContext } from './NodeRendererRegistry';
import { ThreeDRuntimeNode } from '@/components/renderer/ThreeDRuntimeNode';

// ─────────────────────────────────────────────────────────────
// ADVANCED ADAPTERS (P1)
// ─────────────────────────────────────────────────────────────

NodeRendererRegistry.register({
  kind: 'shape',
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
        return;
      }
      if (!isEditorMode && node.interactions) {
        const onClick = node.interactions.find(i => i.onClick)?.onClick;
        if (onClick?.action === 'navigate' && onClick.url) {
          window.open(onClick.url, '_blank');
        } else if (onClick?.action === 'open_modal') {
          alert('Open Modal: ' + onClick.modalId);
        } else if (onClick?.action === 'submit') {
          alert('Submit Form Action');
        }
      }
    };

    // MVP: For a shape, we could render an SVG, but for now we'll just render a styled div.
    // The mask/clipPath in resolvedStyle will handle the actual shape if set.
    return (
      <div 
        id={node.id} 
        style={resolvedStyle}
        onClick={handleClick}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      >
        {/* Shape SVG would go here based on node configuration */}
      </div>
    );
  }
});

NodeRendererRegistry.register({
  kind: 'video',
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
        return;
      }
      if (!isEditorMode && node.interactions) {
        const onClick = node.interactions.find(i => i.onClick)?.onClick;
        if (onClick?.action === 'navigate' && onClick.url) {
          window.open(onClick.url, '_blank');
        } else if (onClick?.action === 'open_modal') {
          alert('Open Modal: ' + onClick.modalId);
        } else if (onClick?.action === 'submit') {
          alert('Submit Form Action');
        }
      }
    };

    // A real implementation would bind to the video URL
    const videoUrl = undefined;
    const posterUrl = resolvedStyle.backgroundImage;

    return (
      <div 
        id={node.id} 
        style={resolvedStyle}
        onClick={handleClick}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline relative' : 'relative'}
      >
        {videoUrl ? (
          <video src={videoUrl} controls className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4l12 6-12 6V4z" />
            </svg>
          </div>
        )}
      </div>
    );
  }
});

NodeRendererRegistry.register({
  kind: 'countdown',
  render({ node, resolvedStyle, isEditorMode, onNodeClick, resolvedState }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
      }
    };

    const isSingleDial = node.name.toLowerCase().includes('dial') || node.id.startsWith('clock_');
    const label = node.name.replace(/dial/i, '').trim();

    return (
      <div 
        id={node.id} 
        style={resolvedStyle}
        onClick={handleClick}
        className={
          (isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline ' : '') + 
          (isSingleDial ? 'flex flex-col items-center justify-center p-3' : 'flex gap-4 items-center justify-center p-4')
        }
      >
        {isSingleDial ? (
          <>
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {node.id.includes('days') ? '24' : node.id.includes('hours') ? '08' : node.id.includes('minutes') ? '42' : '18'}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#DFBA6B] mt-1 font-sans">{label || 'Unit'}</span>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold font-mono text-white">24</span>
              <span className="text-[10px] uppercase text-[#DFBA6B] tracking-wider">Days</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold font-mono text-white">08</span>
              <span className="text-[10px] uppercase text-[#DFBA6B] tracking-wider">Hrs</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold font-mono text-white">42</span>
              <span className="text-[10px] uppercase text-[#DFBA6B] tracking-wider">Min</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold font-mono text-white">18</span>
              <span className="text-[10px] uppercase text-[#DFBA6B] tracking-wider">Sec</span>
            </div>
          </>
        )}
      </div>
    );
  }
});

// ─────────────────────────────────────────────────────────────
// SEMANTIC CELEBRATION ADAPTERS
// ─────────────────────────────────────────────────────────────

NodeRendererRegistry.register({
  kind: ['person', 'portrait', 'couple', 'couplecluster', 'story', 'storymilestone', 'event', 'eventcard', 'venue', 'rsvp', 'rsvpform', 'guestbook', 'blessing', 'gallery', 'navigation', 'transition'],
  render({ node, resolvedStyle, renderChild, isEditorMode, onNodeClick, resolvedState }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
        return;
      }
      if (!isEditorMode && node.interactions) {
        const onClick = node.interactions.find(i => i.onClick)?.onClick;
        if (onClick?.action === 'navigate' && onClick.url) {
          window.open(onClick.url, '_blank');
        } else if (onClick?.action === 'open_modal') {
          alert('Open Modal: ' + (onClick.modalId || 'Detail View'));
        } else if (onClick?.action === 'submit') {
          alert('Submit Action Executed');
        }
      }
    };

    return (
      <div 
        id={node.id} 
        style={resolvedStyle}
        onClick={handleClick}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      >
        {node.children && node.children.length > 0 ? (
          node.children.map(childId => renderChild(childId))
        ) : (
          <div className="p-3 text-xs opacity-75">
            <span className="font-semibold">{node.name}</span>
          </div>
        )}
      </div>
    );
  }
});

NodeRendererRegistry.register({
  kind: 'milestone',
  render({ node, resolvedStyle, isEditorMode, onNodeClick, resolvedState }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
      }
    };

    let milestoneTitle = node.name;
    let milestoneDesc = 'A profound celestial convergence etched across timeless horizons.';
    let milestoneYear = '✦';

    if (node.name.includes(':')) {
      const parts = node.name.split(':');
      milestoneYear = parts[0]?.trim() || '✦';
      milestoneTitle = parts[1]?.trim() || node.name;
    }

    return (
      <div
        id={node.id}
        style={resolvedStyle}
        onClick={handleClick}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline flex flex-col items-center justify-center p-4' : 'flex flex-col items-center justify-center p-4'}
      >
        <span className="text-[10px] tracking-widest uppercase text-[#DFBA6B] font-medium mb-1">{milestoneYear}</span>
        <h4 className="text-sm font-semibold text-white text-center mb-1">{milestoneTitle}</h4>
        <p className="text-[11px] text-gray-400 text-center leading-relaxed line-clamp-2">{milestoneDesc}</p>
      </div>
    );
  }
});

// ─────────────────────────────────────────────────────────────
// VISUAL & ATMOSPHERIC ADAPTERS
// ─────────────────────────────────────────────────────────────

NodeRendererRegistry.register({
  kind: ['atmosphere', 'particlefield', 'starfield', 'noise', 'backdrop'],
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    return (
      <div
        id={node.id}
        style={{
          ...resolvedStyle,
          pointerEvents: isEditorMode ? 'auto' : 'none',
        }}
        onClick={(e) => {
          if (isEditorMode && onNodeClick) {
            e.stopPropagation();
            onNodeClick(node.id);
          }
        }}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      >
        {/* Ambient celestial stardust particles background */}
        <div 
          className="w-full h-full opacity-60 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(223, 186, 107, 0.08) 0%, transparent 70%), radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 100px 150px, rgba(223, 186, 107, 0.9), rgba(0,0,0,0)), radial-gradient(1px 1px at 250px 80px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 320px 220px, rgba(223, 186, 107, 0.8), rgba(0,0,0,0))',
            backgroundSize: '100% 100%, 300px 300px, 350px 350px, 280px 280px, 400px 400px',
          }}
        />
      </div>
    );
  }
});

NodeRendererRegistry.register({
  kind: 'orbit',
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    return (
      <div
        id={node.id}
        style={{
          ...resolvedStyle,
          pointerEvents: isEditorMode ? 'auto' : 'none',
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
  kind: 'constellation',
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    return (
      <div
        id={node.id}
        style={{
          ...resolvedStyle,
          pointerEvents: isEditorMode ? 'auto' : 'none',
        }}
        onClick={(e) => {
          if (isEditorMode && onNodeClick) {
            e.stopPropagation();
            onNodeClick(node.id);
          }
        }}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      >
        <svg className="w-full h-full opacity-30" viewBox="0 0 800 600" preserveAspectRatio="none">
          <line x1="150" y1="120" x2="350" y2="280" stroke="rgba(223,186,107,0.5)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="350" y1="280" x2="550" y2="200" stroke="rgba(223,186,107,0.5)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="550" y1="200" x2="680" y2="380" stroke="rgba(223,186,107,0.5)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="150" cy="120" r="3" fill="#DFBA6B" />
          <circle cx="350" cy="280" r="4" fill="#FFF" />
          <circle cx="550" cy="200" r="3.5" fill="#DFBA6B" />
          <circle cx="680" cy="380" r="4" fill="#FFF" />
        </svg>
      </div>
    );
  }
});

NodeRendererRegistry.register({
  kind: ['lightsource', 'glow', 'imagetreatment'],
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    return (
      <div
        id={node.id}
        style={{
          ...resolvedStyle,
          pointerEvents: isEditorMode ? 'auto' : 'none',
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
  kind: ['interactive_object', 'audio'],
  render({ node, resolvedStyle, renderChild, isEditorMode, onNodeClick }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
        return;
      }
      if (!isEditorMode && node.interactions) {
        const onClick = node.interactions.find(i => i.onClick)?.onClick;
        if (onClick?.action === 'navigate' && onClick.url) {
          window.open(onClick.url, '_blank');
        } else if (onClick?.action === 'submit') {
          alert('Add to Calendar Invitation Downloaded (.ics)');
        }
      }
    };

    return (
      <button
        id={node.id}
        style={{
          ...resolvedStyle,
          cursor: 'pointer',
        }}
        onClick={handleClick}
        className={
          (isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline ' : '') +
          'px-6 py-2.5 rounded-full border border-[rgba(223,186,107,0.4)] bg-[rgba(13,20,41,0.85)] text-[#DFBA6B] text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-[rgba(223,186,107,0.15)] transition-all'
        }
      >
        <span>📅 Add to Calendar (.ics)</span>
      </button>
    );
  }
});

NodeRendererRegistry.register({
  kind: ['threed', 'model3d'],
  render({ node, resolvedStyle, isEditorMode, onNodeClick }: NodeRenderContext) {
    const handleClick = (e: React.MouseEvent) => {
      if (isEditorMode && onNodeClick) {
        e.stopPropagation();
        onNodeClick(node.id);
      }
    };

    const threeDProps = (node as any).threeD || {};

    return (
      <ThreeDRuntimeNode
        id={node.id}
        style={resolvedStyle}
        geometryType={threeDProps.geometryType || 'torusknot'}
        rotationSpeed={threeDProps.rotationSpeed || 0.01}
        color={threeDProps.color || '#DFBA6B'}
        isEditorMode={isEditorMode}
        onClick={handleClick}
        className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
      />
    );
  }
});
