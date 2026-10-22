import { AutoLayoutConfig, GridLayoutConfig } from './SceneGraphTypes';
import React from 'react';

export class LayoutResolver {
  /**
   * Resolves layout mode and config into React CSS properties.
   */
  static resolve(
    layoutMode?: 'flex' | 'grid' | 'stack' | 'freeform' | 'auto',
    layoutConfig?: AutoLayoutConfig | GridLayoutConfig
  ): React.CSSProperties {
    if (layoutMode === 'freeform' || !layoutMode) {
      return {}; // Handled by absolute/flow positioning
    }

    if (layoutMode === 'grid') {
      return this.resolveGrid(layoutConfig as GridLayoutConfig);
    }

    // Treat 'flex', 'stack', 'auto' as flexbox variants
    return this.resolveAutoLayout(layoutConfig as AutoLayoutConfig, layoutMode);
  }

  private static resolveAutoLayout(
    config?: AutoLayoutConfig,
    fallbackMode?: 'flex' | 'stack' | 'auto'
  ): React.CSSProperties {
    const css: React.CSSProperties = {
      display: 'flex',
    };

    if (!config) {
      // Fallbacks if no config provided but mode requested it
      css.flexDirection = fallbackMode === 'stack' ? 'column' : 'row';
      return css;
    }

    // Direction
    css.flexDirection = config.direction === 'vertical' ? 'column' : 'row';
    
    // Wrap
    if (config.direction === 'wrap' || config.wrap) {
      css.flexWrap = 'wrap';
    } else {
      css.flexWrap = 'nowrap';
    }

    // Gap
    if (config.gap !== undefined) {
      css.gap = config.gap;
    }

    // Padding
    if (config.padding) {
      css.paddingTop = config.padding.top;
      css.paddingRight = config.padding.right;
      css.paddingBottom = config.padding.bottom;
      css.paddingLeft = config.padding.left;
    }

    // Alignment
    if (config.alignment) {
      const primary = config.alignment.primary;
      const cross = config.alignment.cross;

      // Map primary alignment (justify-content)
      const primaryMap: Record<string, string> = {
        'start': 'flex-start',
        'center': 'center',
        'end': 'flex-end',
        'space-between': 'space-between',
        'space-around': 'space-around',
        'space-evenly': 'space-evenly',
      };
      css.justifyContent = primaryMap[primary] || 'flex-start';

      // Map cross alignment (align-items)
      const crossMap: Record<string, string> = {
        'start': 'flex-start',
        'center': 'center',
        'end': 'flex-end',
        'stretch': 'stretch',
        'baseline': 'baseline',
      };
      css.alignItems = crossMap[cross] || 'stretch';
    }

    return css;
  }

  private static resolveGrid(config?: GridLayoutConfig): React.CSSProperties {
    const css: React.CSSProperties = {
      display: 'grid',
    };

    if (!config) return css;

    // Columns
    if (config.columns !== undefined) {
      if (config.columns === 'auto-fill' || config.columns === 'auto-fit') {
        const minWidth = config.columnWidth || '1fr';
        css.gridTemplateColumns = `repeat(${config.columns}, minmax(${minWidth}, 1fr))`;
      } else if (typeof config.columns === 'number') {
        const width = config.columnWidth || '1fr';
        css.gridTemplateColumns = `repeat(${config.columns}, ${width})`;
      }
    }

    // Rows
    if (config.rows !== undefined) {
      if (typeof config.rows === 'number') {
        const height = config.rowHeight || 'auto';
        css.gridTemplateRows = `repeat(${config.rows}, ${height})`;
      }
    }

    // Gap
    if (config.gap !== undefined) {
      css.gap = config.gap;
    }

    // Padding
    if (config.padding) {
      css.paddingTop = config.padding.top;
      css.paddingRight = config.padding.right;
      css.paddingBottom = config.padding.bottom;
      css.paddingLeft = config.padding.left;
    }
    
    // Alignment
    if (config.alignment) {
      // Simplistic mapping for grid
      css.justifyContent = config.alignment.horizontal === 'start' ? 'start' : config.alignment.horizontal === 'end' ? 'end' : 'center';
      css.alignContent = config.alignment.vertical === 'start' ? 'start' : config.alignment.vertical === 'end' ? 'end' : 'center';
    }

    return css;
  }

  /**
   * Resolves sizing rules for a specific child node based on parent's auto layout config.
   */
  static resolveChildSizing(
    childId: string,
    parentConfig?: AutoLayoutConfig | GridLayoutConfig,
    parentMode?: string
  ): React.CSSProperties {
    if (!parentConfig || parentMode === 'grid' || parentMode === 'freeform') return {};

    const config = parentConfig as AutoLayoutConfig;
    const css: React.CSSProperties = {};

    // Get specific child overrides or fall back to container-level defaults
    const childOverride = config.childOverrides?.[childId];
    
    const primarySizing = childOverride?.sizing || config.sizing?.primary || 'hug';
    const crossSizing = config.sizing?.cross || 'hug'; // Currently child override only allows 1 sizing param for simplicity

    const isHorizontal = config.direction === 'horizontal';

    // Apply primary sizing (flex-grow / basis)
    if (primarySizing === 'fill') {
      css.flexGrow = 1;
      css.flexBasis = '0%';
    } else if (primarySizing === 'fixed') {
      css.flexGrow = 0;
      css.flexShrink = 0;
    } else {
      // hug
      css.flexGrow = 0;
      css.flexShrink = 1; // allow shrink if needed
    }

    // Apply cross sizing
    if (crossSizing === 'fill') {
      if (isHorizontal) {
        css.height = '100%';
      } else {
        css.width = '100%';
      }
    }

    // Apply specific child flex overrides
    if (childOverride) {
      if (childOverride.flexGrow !== undefined) css.flexGrow = childOverride.flexGrow;
      if (childOverride.flexShrink !== undefined) css.flexShrink = childOverride.flexShrink;
      if (childOverride.order !== undefined) css.order = childOverride.order;
      if (childOverride.alignment) {
        const alignMap: Record<string, string> = {
          'start': 'flex-start',
          'center': 'center',
          'end': 'flex-end',
          'stretch': 'stretch',
        };
        css.alignSelf = alignMap[childOverride.alignment] || 'auto';
      }
    }

    return css;
  }
}
