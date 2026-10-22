'use client';

import React from 'react';
import { BoxModelControl } from '../BoxModelControl';

export interface VisualBoxModelProps {
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  width?: string | number;
  height?: string | number;
  onPaddingChange?: (side: 'top' | 'right' | 'bottom' | 'left', val: string) => void;
  onMarginChange?: (side: 'top' | 'right' | 'bottom' | 'left', val: string) => void;
  onUpdateStyle?: (patch: Record<string, any>) => void;
}

export function VisualBoxModel({
  paddingTop = '0',
  paddingRight = '0',
  paddingBottom = '0',
  paddingLeft = '0',
  marginTop = '0',
  marginRight = '0',
  marginBottom = '0',
  marginLeft = '0',
  width = 'auto',
  height = 'auto',
  onPaddingChange,
  onMarginChange,
  onUpdateStyle,
}: VisualBoxModelProps) {
  const handlePadding = (side: 'top' | 'right' | 'bottom' | 'left' | 'all' | 'x' | 'y', val: string) => {
    if (side === 'all') {
      if (onUpdateStyle) {
        onUpdateStyle({
          paddingTop: val,
          paddingRight: val,
          paddingBottom: val,
          paddingLeft: val,
        });
      } else {
        onPaddingChange?.('top', val);
        onPaddingChange?.('right', val);
        onPaddingChange?.('bottom', val);
        onPaddingChange?.('left', val);
      }
    } else if (side === 'x') {
      if (onUpdateStyle) {
        onUpdateStyle({ paddingLeft: val, paddingRight: val });
      } else {
        onPaddingChange?.('left', val);
        onPaddingChange?.('right', val);
      }
    } else if (side === 'y') {
      if (onUpdateStyle) {
        onUpdateStyle({ paddingTop: val, paddingBottom: val });
      } else {
        onPaddingChange?.('top', val);
        onPaddingChange?.('bottom', val);
      }
    } else {
      if (onUpdateStyle) {
        const propMap: Record<string, string> = { top: 'paddingTop', right: 'paddingRight', bottom: 'paddingBottom', left: 'paddingLeft' };
        const prop = propMap[side];
        if (prop) onUpdateStyle({ [prop]: val });
      } else {
        onPaddingChange?.(side as any, val);
      }
    }
  };

  const handleMargin = (side: 'top' | 'right' | 'bottom' | 'left' | 'all' | 'x' | 'y', val: string) => {
    if (side === 'all') {
      if (onUpdateStyle) {
        onUpdateStyle({
          marginTop: val,
          marginRight: val,
          marginBottom: val,
          marginLeft: val,
        });
      } else {
        onMarginChange?.('top', val);
        onMarginChange?.('right', val);
        onMarginChange?.('bottom', val);
        onMarginChange?.('left', val);
      }
    } else if (side === 'x') {
      if (onUpdateStyle) {
        onUpdateStyle({ marginLeft: val, marginRight: val });
      } else {
        onMarginChange?.('left', val);
        onMarginChange?.('right', val);
      }
    } else if (side === 'y') {
      if (onUpdateStyle) {
        onUpdateStyle({ marginTop: val, marginBottom: val });
      } else {
        onMarginChange?.('top', val);
        onMarginChange?.('bottom', val);
      }
    } else {
      if (onUpdateStyle) {
        const propMap: Record<string, string> = { top: 'marginTop', right: 'marginRight', bottom: 'marginBottom', left: 'marginLeft' };
        const prop = propMap[side];
        if (prop) onUpdateStyle({ [prop]: val });
      } else {
        onMarginChange?.(side as any, val);
      }
    }
  };

  return (
    <BoxModelControl
      paddingTop={paddingTop}
      paddingRight={paddingRight}
      paddingBottom={paddingBottom}
      paddingLeft={paddingLeft}
      marginTop={marginTop}
      marginRight={marginRight}
      marginBottom={marginBottom}
      marginLeft={marginLeft}
      width={width}
      height={height}
      onChangePadding={handlePadding}
      onChangeMargin={handleMargin}
    />
  );
}
