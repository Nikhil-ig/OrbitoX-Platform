'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomComponentDefinition, PrimitiveBlock } from '@orbitox/commerce';

export interface CustomComponentRendererProps {
  definition?: CustomComponentDefinition;
  settings?: Record<string, any>;
  storeSlug?: string;
  onOpenCart?: () => void;
  onOpenWishlist?: () => void;
}

export function CustomComponentRenderer({
  definition,
  settings = {},
  storeSlug = 'aura-luxury',
  onOpenCart,
  onOpenWishlist,
}: CustomComponentRendererProps) {
  // Accordion open/close state
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ hours: number; mins: number; secs: number }>({
    hours: 23,
    mins: 59,
    secs: 59,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
        if (prev.mins > 0) return { ...prev, mins: prev.mins - 1, secs: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, mins: 59, secs: 59 };
        return { hours: 23, mins: 59, secs: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!definition || !definition.blocks || definition.blocks.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '10px',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
        }}
      >
        <span>🧩 Custom Component (Empty blocks)</span>
      </div>
    );
  }

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to render a single primitive block recursively
  const renderBlock = (block: PrimitiveBlock, idx: number): React.ReactNode => {
    const resolvedProps: Record<string, any> = { ...block.properties };

    if (definition.exposedSettings) {
      for (const exp of definition.exposedSettings) {
        if (exp.blockId === block.id && settings[exp.propertyKey] !== undefined) {
          resolvedProps[exp.propertyKey] = settings[exp.propertyKey];
        }
      }
    }

    const { type, style = {}, children = [] } = block;

    const baseStyle: React.CSSProperties = {
      padding: style.padding,
      margin: style.margin,
      background: style.background,
      borderRadius: style.borderRadius,
      border: style.border,
      textAlign: style.textAlign,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight as any,
      color: style.color,
      maxWidth: style.maxWidth,
      boxShadow: style.boxShadow,
      display:
        type === 'container' || type === 'columns' || type === 'card'
          ? 'flex'
          : undefined,
      flexDirection:
        type === 'columns'
          ? 'row'
          : (style.flexDirection as any) || (type === 'card' ? 'column' : undefined),
      alignItems: style.alignItems as any,
      justifyContent: style.justifyContent as any,
      gap: style.gap || (type === 'columns' ? '16px' : undefined),
      width: '100%',
      boxSizing: 'border-box',
    };

    switch (type) {
      case 'container':
        return (
          <div key={block.id || idx} style={baseStyle}>
            {children.map((child, cIdx) => renderBlock(child, cIdx))}
          </div>
        );

      case 'columns':
        return (
          <div
            key={block.id || idx}
            style={{
              ...baseStyle,
              display: 'grid',
              gridTemplateColumns: `repeat(${resolvedProps.columnCount || children.length || 2}, 1fr)`,
            }}
          >
            {children.map((child, cIdx) => renderBlock(child, cIdx))}
          </div>
        );

      case 'card':
      case 'pricing-card':
        return (
          <div key={block.id || idx} style={baseStyle}>
            {resolvedProps.icon && (
              <span style={{ fontSize: '28px', marginBottom: '4px' }}>{resolvedProps.icon}</span>
            )}
            {resolvedProps.title && (
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>
                {resolvedProps.title}
              </div>
            )}
            {resolvedProps.price && (
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#D4AF37', margin: '4px 0' }}>
                {resolvedProps.price}
              </div>
            )}
            {resolvedProps.subtitle && (
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {resolvedProps.subtitle}
              </div>
            )}
            {children.map((child, cIdx) => renderBlock(child, cIdx))}
          </div>
        );

      case 'countdown':
        return (
          <div
            key={block.id || idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              ...baseStyle,
            }}
          >
            {resolvedProps.title && (
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>
                {resolvedProps.title}
              </span>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: 'HRS', val: timeLeft.hours },
                { label: 'MIN', val: timeLeft.mins },
                { label: 'SEC', val: timeLeft.secs },
              ].map((t) => (
                <div
                  key={t.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#D4AF37' }}>
                    {String(t.val).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'star-rating':
        return (
          <div
            key={block.id || idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: baseStyle.textAlign === 'center' ? 'center' : 'flex-start',
              ...baseStyle,
            }}
          >
            <div style={{ color: '#FBBF24', fontSize: '15px', letterSpacing: '2px' }}>
              {'★'.repeat(resolvedProps.rating || 5)}
            </div>
            {resolvedProps.reviewCount && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#4ADE80',
                  background: 'rgba(34, 197, 94, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                ✓ {resolvedProps.reviewCount}
              </span>
            )}
          </div>
        );

      case 'accordion': {
        const isOpen = !!openAccordions[block.id];
        return (
          <div
            key={block.id || idx}
            style={{
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              marginBottom: '8px',
              ...baseStyle,
            }}
          >
            <div
              onClick={() => toggleAccordion(block.id)}
              style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '13px',
                color: '#FFF',
              }}
            >
              <span>{resolvedProps.question || 'Frequently Asked Question'}</span>
              <span style={{ color: '#D4AF37', fontSize: '14px' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  lineHeight: 1.6,
                }}
              >
                {resolvedProps.answer || 'Answer details explaining the policy or craft.'}
              </div>
            )}
          </div>
        );
      }

      case 'text':
      case 'rich-text': {
        const Tag = (resolvedProps.tag || 'p') as any;
        return (
          <Tag
            key={block.id || idx}
            style={{
              ...baseStyle,
              margin: baseStyle.margin || 0,
              lineHeight: 1.6,
            }}
          >
            {resolvedProps.text || 'Custom text block'}
          </Tag>
        );
      }

      case 'badge':
        return (
          <span
            key={block.id || idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              ...baseStyle,
            }}
          >
            {resolvedProps.text || 'NEW'}
          </span>
        );

      case 'button': {
        const btnText = resolvedProps.text || 'Click Here';
        const btnLink = resolvedProps.link || `/store/${storeSlug}/shop`;
        const btnAction = resolvedProps.action || 'link';

        const handleClick = (e: React.MouseEvent) => {
          if (btnAction === 'cart') {
            e.preventDefault();
            if (onOpenCart) onOpenCart();
          } else if (btnAction === 'wishlist') {
            e.preventDefault();
            if (onOpenWishlist) onOpenWishlist();
          } else if (btnAction === 'whatsapp') {
            e.preventDefault();
            const phone = btnLink.replace(/[^0-9]/g, '') || '919876543210';
            window.open(`https://wa.me/${phone}?text=Inquiring%20about%20collection`, '_blank');
          }
        };

        return (
          <Link
            key={block.id || idx}
            href={btnLink}
            onClick={handleClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'none',
              cursor: 'pointer',
              ...baseStyle,
            }}
          >
            {resolvedProps.icon && <span>{resolvedProps.icon}</span>}
            <span>{btnText}</span>
          </Link>
        );
      }

      case 'image':
        return (
          <img
            key={block.id || idx}
            src={resolvedProps.url || 'https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=800&auto=format&fit=crop'}
            alt={resolvedProps.altText || ''}
            style={{
              width: resolvedProps.width || '100%',
              height: resolvedProps.height || 'auto',
              objectFit: resolvedProps.objectFit || 'cover',
              ...baseStyle,
            }}
          />
        );

      case 'video':
      case 'video-embed':
        return (
          <div key={block.id || idx} style={{ width: '100%', overflow: 'hidden', ...baseStyle }}>
            <video
              src={resolvedProps.url || 'https://assets.mixkit.co/videos/preview/mixkit-hand-embroidering-a-fabric-41710-large.mp4'}
              autoPlay
              muted
              loop
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        );

      case 'spacer':
        return (
          <div
            key={block.id || idx}
            style={{
              height: resolvedProps.height || '24px',
              width: '100%',
            }}
          />
        );

      case 'divider':
        return (
          <div
            key={block.id || idx}
            style={{
              height: '1px',
              width: '100%',
              background: resolvedProps.color || 'rgba(255, 255, 255, 0.1)',
              margin: '12px 0',
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {definition.blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}
