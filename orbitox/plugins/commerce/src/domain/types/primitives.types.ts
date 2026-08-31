import { FieldControlType } from './component.types';

export type PrimitiveBlockType =
  | 'text'
  | 'rich-text'
  | 'image'
  | 'video'
  | 'video-embed'
  | 'button'
  | 'icon'
  | 'spacer'
  | 'divider'
  | 'container'
  | 'columns'
  | 'card'
  | 'badge'
  | 'countdown'
  | 'star-rating'
  | 'accordion'
  | 'pricing-card'
  | 'social-toast'
  | 'form-input'
  | 'social-link';

export interface BlockStyle {
  padding?: string;
  margin?: string;
  background?: string;
  borderRadius?: string;
  border?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  maxWidth?: string;
  gap?: string;
  flexDirection?: 'row' | 'column';
  boxShadow?: string;
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  gradient?: string;
  backdropBlur?: string;
  glowEffect?: string;
  hoverAnimation?: 'lift' | 'glow' | 'pulse' | 'bounce' | 'shimmer' | 'none';
  lineHeight?: string;
}

export interface PrimitiveBlock {
  id: string;
  type: PrimitiveBlockType;
  label: string;
  properties: Record<string, any>;
  children?: PrimitiveBlock[]; // For container or columns or accordion
  style: BlockStyle;
}

export interface ExposedSetting {
  id: string;
  blockId: string;
  propertyKey: string;
  label: string;
  type: FieldControlType;
  defaultValue: any;
  options?: Array<{ label: string; value: string | number | boolean }>;
  description?: string;
}

export interface CustomComponentDefinition {
  id: string;
  type: string; // e.g. "custom_vip_card_123"
  name: string;
  icon: string;
  description: string;
  category: 'custom';
  blocks: PrimitiveBlock[];
  exposedSettings: ExposedSetting[];
  defaultSettings: Record<string, any>;
  storeId?: string;
  createdAt: string;
  updatedAt: string;
}
