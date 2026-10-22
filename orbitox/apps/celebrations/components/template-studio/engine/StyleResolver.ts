import { SceneGraphNode, NodeStyle, NodeGeometry, PropertySource, SceneGraph, ColorValue } from './SceneGraphTypes';
import { DeviceBreakpoint, TemplateDesignTokens } from '../types/TemplateSchema';

export interface ResolvedNodeStyle {
  geometry: NodeGeometry;
  style: NodeStyle;
}

export class StyleResolver {
  /**
   * Resolves the effective style and geometry for a node at a given breakpoint
   * with cascading inheritance (Base Desktop -> Tablet -> Mobile).
   */
  static resolveForDevice(
    node: SceneGraphNode,
    device: DeviceBreakpoint | 'desktopSmall' | 'mobileLarge' | 'mobileSmall',
    tokens: TemplateDesignTokens
  ): ResolvedNodeStyle {
    const baseGeometry = { ...node.geometry };
    const baseStyle = { ...node.style };

    if (device === 'desktop') {
      return { geometry: baseGeometry, style: baseStyle };
    }

    let mergedGeometry = { ...baseGeometry };
    let mergedStyle = { ...baseStyle };

    const applyOverride = (overrideKey: string) => {
      const override = (node.responsive as any)?.[overrideKey];
      if (!override) return;
      if (override.geometry) {
        mergedGeometry = { ...mergedGeometry, ...override.geometry };
      } else {
        const { style, layoutConfig, layoutMode, ...geomFields } = override;
        mergedGeometry = { ...mergedGeometry, ...geomFields };
      }
      if (override.style) {
        mergedStyle = this.deepMerge(mergedStyle, override.style);
      } else {
        mergedStyle = this.deepMerge(mergedStyle, override);
      }
    };

    if (device === 'desktopSmall') {
      applyOverride('desktopSmall');
    } else if (device === 'tablet') {
      applyOverride('tablet');
    } else if (device === 'mobile') {
      applyOverride('tablet');
      applyOverride('mobile');
    } else if (device === 'mobileLarge') {
      applyOverride('tablet');
      applyOverride('mobile');
      applyOverride('mobileLarge');
    } else if (device === 'mobileSmall') {
      applyOverride('tablet');
      applyOverride('mobile');
      applyOverride('mobileSmall');
    }

    return {
      geometry: mergedGeometry,
      style: mergedStyle,
    };
  }

  /**
   * Resolves a token path against the design tokens.
   */
  static resolveTokenValue(tokenPath: string, tokens: TemplateDesignTokens): any {
    const parts = tokenPath.split('.');
    let current: any = tokens;
    for (const part of parts) {
      if (current[part] === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Resolves a ColorValue to a CSS string.
   */
  static resolveColor(color: ColorValue | undefined, tokens: TemplateDesignTokens): string | undefined {
    if (!color) return undefined;
    if (color.type === 'solid') return color.value;
    if (color.type === 'token') {
      const val = this.resolveTokenValue(color.tokenPath, tokens);
      return typeof val === 'string' ? val : undefined;
    }
    if (color.type === 'gradient') {
      const stops = color.gradient.stops.map((s) => `${s.color} ${s.position}%`).join(', ');
      if (color.gradient.type === 'linear') {
        return `linear-gradient(${color.gradient.angle || 180}deg, ${stops})`;
      }
      if (color.gradient.type === 'radial') {
        return `radial-gradient(${stops})`;
      }
      if (color.gradient.type === 'conic') {
        return `conic-gradient(from ${color.gradient.angle || 0}deg, ${stops})`;
      }
    }
    return undefined;
  }

  /**
   * Deep merge utility for styles
   */
  private static deepMerge(target: any, source: any): any {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private static isObject(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  /**
   * Translates ResolvedNodeStyle to React.CSSProperties
   */
  static resolveToCSSProperties(
    resolved: ResolvedNodeStyle,
    tokens: TemplateDesignTokens,
    node?: SceneGraphNode
  ): React.CSSProperties {
    const { geometry, style } = resolved;
    
    // Transform geometry into CSS with Parallax Depth Plane (-5 to +5)
    const depthPlane = style.depthPlane ?? node?.motion?.parallax?.depthPlane;
    let transformString = `rotate(${geometry.rotation}deg) scale(${geometry.scaleX}, ${geometry.scaleY})`;
    let willChangeVal: string | undefined = undefined;
    if (depthPlane !== undefined && depthPlane !== 0) {
      const factor = (depthPlane * 0.08).toFixed(3);
      const parallaxTransform = `translate3d(0, calc(var(--scroll-y, 0px) * ${factor}), ${depthPlane * 8}px)`;
      transformString = `${parallaxTransform} ${transformString}`;
      willChangeVal = 'transform';
    }

    const css: React.CSSProperties = {
      position: geometry.position === 'flow' ? 'relative' : geometry.position,
      left: geometry.x,
      top: geometry.y,
      width: geometry.width,
      height: geometry.height,
      minWidth: geometry.minWidth,
      maxWidth: geometry.maxWidth,
      minHeight: geometry.minHeight,
      maxHeight: geometry.maxHeight,
      transform: transformString,
      transformOrigin: geometry.transformOrigin,
      opacity: geometry.opacity,
      zIndex: geometry.zIndex,
      ...(willChangeVal ? { willChange: willChangeVal } : {}),
    };

    // Background
    if (style.background) {
      if (style.background.type === 'solid' && style.background.color) {
        css.backgroundColor = this.resolveColor(style.background.color, tokens);
      } else if (style.background.type === 'gradient') {
        if (style.background.color) {
          css.backgroundImage = this.resolveColor(style.background.color, tokens);
        } else if (style.background.gradient) {
          css.backgroundImage = this.resolveColor({ type: 'gradient', gradient: style.background.gradient }, tokens);
        }
      } else if (style.background.type === 'image' && style.background.image) {
        css.backgroundImage = `url(${style.background.image})`;
        css.backgroundSize = style.background.size || 'cover';
        css.backgroundPosition = style.background.position || 'center';
        css.backgroundRepeat = style.background.repeat || 'no-repeat';
      }
    }

    // Border & Corner Radius
    if (style.border || (style as any).borderRadius) {
      if (style.border) {
        css.borderWidth = style.border.width;
        css.borderStyle = style.border.style;
        css.borderColor = this.resolveColor(style.border.color, tokens);
      }
      
      const rawRadius = style.border?.radius ?? (style as any).borderRadius;
      if (rawRadius) {
        if (typeof rawRadius === 'object') {
          const r = rawRadius as any;
          if (r.all !== undefined) {
            css.borderRadius = typeof r.all === 'number' ? `${r.all}px` : r.all;
          } else {
            const tl = r.tl ?? 0;
            const tr = r.tr ?? 0;
            const br = r.br ?? 0;
            const bl = r.bl ?? 0;
            css.borderRadius = `${typeof tl === 'number' ? `${tl}px` : tl} ${typeof tr === 'number' ? `${tr}px` : tr} ${typeof br === 'number' ? `${br}px` : br} ${typeof bl === 'number' ? `${bl}px` : bl}`;
          }
        } else {
          css.borderRadius = typeof rawRadius === 'number' ? `${rawRadius}px` : rawRadius;
        }
      }
    }

    // Shadow
    if (style.shadow) {
      css.boxShadow = style.shadow.boxShadow;
      css.filter = style.shadow.dropShadow ? `drop-shadow(${style.shadow.dropShadow})` : undefined;
    }

    // Effects
    if (style.effects) {
      const filters = [];
      if (style.effects.blur) filters.push(`blur(${style.effects.blur})`);
      if (style.effects.brightness !== undefined) filters.push(`brightness(${style.effects.brightness})`);
      if (style.effects.contrast !== undefined) filters.push(`contrast(${style.effects.contrast})`);
      if (style.effects.saturate !== undefined) filters.push(`saturate(${style.effects.saturate})`);
      if (style.effects.grayscale !== undefined) filters.push(`grayscale(${style.effects.grayscale})`);
      if (style.effects.hueRotate !== undefined) filters.push(`hue-rotate(${style.effects.hueRotate}deg)`);
      if (style.effects.invert !== undefined) filters.push(`invert(${style.effects.invert})`);
      if (style.effects.sepia !== undefined) filters.push(`sepia(${style.effects.sepia})`);
      
      if (filters.length > 0) {
        css.filter = (css.filter ? css.filter + ' ' : '') + filters.join(' ');
      }
      
      if (style.effects.backdropBlur) {
        css.backdropFilter = `blur(${style.effects.backdropBlur})`;
      }
    }

    // Blend & composite
    if (style.blendMode) css.mixBlendMode = style.blendMode as any;
    if (style.mixBlendMode) css.mixBlendMode = style.mixBlendMode as any;
    
    // Overflow
    if (style.overflow) css.overflow = style.overflow;
    
    // Spacing (prioritizes explicit sides over shorthand to eliminate collisions)
    if (style.paddingTop !== undefined || style.paddingRight !== undefined || style.paddingBottom !== undefined || style.paddingLeft !== undefined) {
      if (style.paddingTop !== undefined) css.paddingTop = style.paddingTop;
      if (style.paddingRight !== undefined) css.paddingRight = style.paddingRight;
      if (style.paddingBottom !== undefined) css.paddingBottom = style.paddingBottom;
      if (style.paddingLeft !== undefined) css.paddingLeft = style.paddingLeft;
    } else if (style.padding) {
      css.padding = style.padding;
    }

    if (style.marginTop !== undefined || style.marginRight !== undefined || style.marginBottom !== undefined || style.marginLeft !== undefined) {
      if (style.marginTop !== undefined) css.marginTop = style.marginTop;
      if (style.marginRight !== undefined) css.marginRight = style.marginRight;
      if (style.marginBottom !== undefined) css.marginBottom = style.marginBottom;
      if (style.marginLeft !== undefined) css.marginLeft = style.marginLeft;
    } else if (style.margin) {
      css.margin = style.margin;
    }
    if (style.gap) css.gap = style.gap;

    // Typography
    if (style.typography) {
      css.fontFamily = style.typography.fontFamily;
      css.fontSize = style.typography.fontSize;
      css.fontWeight = style.typography.fontWeight;
      css.lineHeight = style.typography.lineHeight;
      css.letterSpacing = style.typography.letterSpacing;
      css.textAlign = style.typography.textAlign as any;
      css.textTransform = style.typography.textTransform as any;
      css.textDecoration = style.typography.textDecoration;
      css.color = this.resolveColor(style.typography.color, tokens);
      css.textShadow = style.typography.textShadow;
    }
    
    // Mask / Clip
    if (style.clipPath) {
      css.clipPath = style.clipPath;
    }
    if (style.mask) {
      if (style.mask.type === 'url' && style.mask.value) {
        css.maskImage = `url(${style.mask.value})`;
      } else if (style.mask.type === 'shape' && style.mask.value) {
        css.maskImage = style.mask.value; // e.g. linear-gradient(...)
      }
    }

    // Media & Image Framing
    if (style.objectFit) css.objectFit = style.objectFit;
    if (style.objectPosition) {
      css.objectPosition = style.objectPosition;
    } else if (style.focalPoint) {
      css.objectPosition = `${style.focalPoint.x}% ${style.focalPoint.y}%`;
    }
    if (style.aspectRatio) css.aspectRatio = style.aspectRatio;
    if (style.filter) css.filter = style.filter;

    // Motion & Interactions
    if (node && node.motion && node.motion.in && node.motion.in.type !== 'none') {
      const motion = node.motion.in;
      const duration = motion.duration ? `${motion.duration}ms` : '800ms';
      const delay = motion.delay ? `${motion.delay}ms` : '0ms';
      let easing = motion.easing || 'ease-out';
      
      if (motion.cubicBezier && Array.isArray(motion.cubicBezier)) {
        easing = `cubic-bezier(${motion.cubicBezier.join(', ')})`;
      } else if (motion.easing === 'spring' && motion.spring) {
        const { damping = 20, stiffness = 180 } = motion.spring;
        const bounciness = Math.max(0.1, Math.min(1.5, (100 - damping) / 60));
        easing = `cubic-bezier(0.175, 0.885, 0.32, ${1 + Number((bounciness * 0.25).toFixed(2))})`;
      }
      
      let animationName = 'fadeIn'; // Default
      
      switch (motion.type) {
        case 'slide-up': animationName = 'slideUp'; break;
        case 'slide-down': animationName = 'fadeIn'; /* fallback */ break;
        case 'slide-left': animationName = 'csSlideInRight'; break;
        case 'slide-right': animationName = 'csSlideInRight'; break;
        case 'zoom-in': animationName = 'auricPulse'; break;
      }
      
      css.animation = `${animationName} ${duration} ${easing} ${delay} both`;
    }

    return css;
  }
}
