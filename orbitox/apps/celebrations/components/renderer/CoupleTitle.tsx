'use client';

import React from 'react';

interface CoupleTitleProps {
  title?: string;
  as?: 'h1' | 'h2' | 'h3' | 'div' | 'span';
  className?: string;
  style?: React.CSSProperties;
  nameStyle?: React.CSSProperties;
  ampersandStyle?: React.CSSProperties;
  flourishColor?: string;
  showFlourish?: boolean;
}

/**
 * Parses names separated by '&', 'and', or '+'
 * Also extracts trailing event suffixes (e.g. "Wedding", "Celebration") from name2
 * so partner names remain optically balanced.
 */
export function parseCoupleNames(title?: string): {
  isCouple: boolean;
  name1: string;
  name2: string;
  ampersand: string;
  suffix: string;
} {
  if (!title) return { isCouple: false, name1: '', name2: '', ampersand: '&', suffix: '' };

  const extractSuffix = (name: string): { cleanName: string; suffix: string } => {
    const eventRegex = /\s+(Wedding|Reception|Nuptials|Marriage|Engagement|Celebration|Union)$/i;
    const match = name.match(eventRegex);
    if (match && match[1]) {
      return {
        cleanName: name.replace(eventRegex, '').trim(),
        suffix: match[1].trim(),
      };
    }
    return { cleanName: name.trim(), suffix: '' };
  };

  const normalizedTitle = title.replace(/&amp;/g, '&').trim();

  // Match " & " or "&"
  if (normalizedTitle.includes('&')) {
    const parts = normalizedTitle.split('&');
    const first = parts[0]?.trim() || '';
    const secondRaw = parts.slice(1).join('&').trim();
    const { cleanName: second, suffix } = extractSuffix(secondRaw);
    return {
      isCouple: Boolean(first && second),
      name1: first,
      name2: second,
      ampersand: '&',
      suffix,
    };
  }

  // Match " and " (case-insensitive word boundary)
  if (/\s+and\s+/i.test(normalizedTitle)) {
    const parts = normalizedTitle.split(/\s+and\s+/i);
    const first = parts[0]?.trim() || '';
    const secondRaw = parts.slice(1).join(' and ').trim();
    const { cleanName: second, suffix } = extractSuffix(secondRaw);
    return {
      isCouple: Boolean(first && second),
      name1: first,
      name2: second,
      ampersand: '&',
      suffix,
    };
  }

  // Match " + "
  if (normalizedTitle.includes('+')) {
    const parts = normalizedTitle.split('+');
    const first = parts[0]?.trim() || '';
    const secondRaw = parts.slice(1).join('+').trim();
    const { cleanName: second, suffix } = extractSuffix(secondRaw);
    return {
      isCouple: Boolean(first && second),
      name1: first,
      name2: second,
      ampersand: '&',
      suffix,
    };
  }

  const { cleanName, suffix } = extractSuffix(normalizedTitle);
  return { isCouple: false, name1: cleanName, name2: '', ampersand: '&', suffix };
}

/**
 * Typographic Couple Title component:
 * Elegantly splits partner names across lines with a centered ampersand '&' on the middle line,
 * ensuring each person's name is completely visible, beautifully balanced, and prominent.
 */
export function CoupleTitle({
  title = '',
  as: Component = 'h1',
  className = '',
  style = {},
  nameStyle = {},
  ampersandStyle = {},
  flourishColor,
  showFlourish = true,
}: CoupleTitleProps) {
  const { isCouple, name1, name2, ampersand, suffix } = parseCoupleNames(title);

  // Separate any text-gradient properties from container style so the container
  // never paints a solid rectangular background box across its entire width/height!
  const {
    background: bgFromStyle,
    backgroundImage: bgImgFromStyle,
    WebkitBackgroundClip: webkitClipFromStyle,
    backgroundClip: clipFromStyle,
    WebkitTextFillColor: fillFromStyle,
    color: colorFromStyle,
    ...cleanContainerStyle
  } = (style as any) || {};

  const hasGradientInStyle = Boolean(
    (webkitClipFromStyle === 'text' || clipFromStyle === 'text') &&
    (bgFromStyle || bgImgFromStyle)
  );

  const containerStyle: React.CSSProperties = {
    display: 'block',
    textAlign: 'center',
    width: '100%',
    margin: 0,
    padding: 0,
    color: colorFromStyle || '#FAF5EE',
    ...cleanContainerStyle,
  };

  const resolvedTextGradient: React.CSSProperties = hasGradientInStyle
    ? {
        background: bgFromStyle || bgImgFromStyle,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: fillFromStyle || 'transparent',
        display: 'inline-block',
      }
    : {};

  if (!isCouple || !name1 || !name2) {
    return (
      <Component className={className} style={containerStyle}>
        <span
          style={{
            display: 'inline-block',
            ...resolvedTextGradient,
            ...nameStyle,
          }}
        >
          {title || name1}
        </span>
      </Component>
    );
  }

  return (
    <Component className={className} style={containerStyle}>
      {/* Partner 1 Full Name */}
      <span
        className="couple-name couple-name-1"
        style={{
          display: 'block',
          width: '100%',
          lineHeight: 1.15,
          textWrap: 'balance',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            ...resolvedTextGradient,
            ...nameStyle,
          }}
        >
          {name1}
        </span>
      </span>

      {/* Middle Ampersand Line */}
      <span
        className="couple-ampersand-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(8px, 1.8vw, 18px)',
          margin: 'clamp(3px, 0.5vh, 8px) 0',
          fontSize: '0.52em',
          lineHeight: 1,
          fontStyle: 'italic',
          fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
          opacity: 0.95,
          userSelect: 'none',
          ...ampersandStyle,
        }}
      >
        {showFlourish && (
          <span
            style={{
              display: 'inline-block',
              width: 'clamp(20px, 3.5vw, 44px)',
              height: '1px',
              background: flourishColor || '#D4AF37',
              opacity: 0.45,
            }}
          />
        )}
        <span
          style={{
            fontStyle: 'italic',
            fontWeight: 400,
            transform: 'translateY(-1px)',
            display: 'inline-block',
            color: flourishColor || '#E8B86D',
            WebkitTextFillColor: flourishColor || '#E8B86D',
            ...ampersandStyle,
          }}
        >
          {ampersand}
        </span>
        {showFlourish && (
          <span
            style={{
              display: 'inline-block',
              width: 'clamp(20px, 3.5vw, 44px)',
              height: '1px',
              background: flourishColor || '#D4AF37',
              opacity: 0.45,
            }}
          />
        )}
      </span>

      {/* Partner 2 Full Name */}
      <span
        className="couple-name couple-name-2"
        style={{
          display: 'block',
          width: '100%',
          lineHeight: 1.15,
          textWrap: 'balance',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            ...resolvedTextGradient,
            ...nameStyle,
          }}
        >
          {name2}
        </span>
      </span>

      {/* Optional Event Suffix (e.g. "Wedding", "Celebration") */}
      {suffix && (
        <span
          className="couple-event-suffix"
          style={{
            display: 'block',
            fontSize: '0.34em',
            letterSpacing: 'clamp(3px, 0.8vw, 6px)',
            textTransform: 'uppercase',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            color: flourishColor || '#E8B86D',
            marginTop: 'clamp(6px, 1.2vh, 12px)',
            opacity: 0.85,
          }}
        >
          {suffix}
        </span>
      )}
    </Component>
  );
}
