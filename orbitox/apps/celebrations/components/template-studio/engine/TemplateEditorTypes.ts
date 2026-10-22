export type {
  TemplateSchema,
  TemplateSceneDefinition,
  SceneStructureLayer,
  ContentFieldDefinition,
  MediaSlotDefinition,
  TemplateDesignTokens,
  DeviceBreakpoint,
  CustomizationLevel,
  TemplateStatus,
  TemplateHealthReport,
  TemplateHealthIssue,
} from '../types/TemplateSchema';
import {
  TemplateSchema,
  TemplateSceneDefinition,
  SceneStructureLayer,
  ContentFieldDefinition,
  MediaSlotDefinition,
  TemplateDesignTokens,
  DeviceBreakpoint,
  CustomizationLevel,
  TemplateStatus,
  TemplateHealthReport,
  TemplateHealthIssue,
} from '../types/TemplateSchema';
import { CelebrationState } from '@/components/studio/StudioData';

// ─────────────────────────────────────────────────────────────
// 1. SELECTION MODEL (Prompt #5)
// ─────────────────────────────────────────────────────────────
export interface EditorSelection {
  templateId: string;
  sceneId: string | null;
  nodeId: string | null;
  nodeIds?: string[];
  fieldId: string | null;
  propertyPath?: string;
  kind?: TemplateNodeKind;
}

// ─────────────────────────────────────────────────────────────
// 2. SEMANTIC NODE MODEL (Prompt #11)
// ─────────────────────────────────────────────────────────────
export type TemplateNodeKind =
  | 'scene'
  | 'group'
  | 'text'
  | 'image'
  | 'portrait'
  | 'gallery'
  | 'countdown'
  | 'constellation'
  | 'button'
  | 'module'
  | 'transition'
  | 'atmosphere';

export interface TemplateNode {
  id: string;
  kind: TemplateNodeKind;
  sceneId: string;
  parentId?: string;
  name: string;
  bindingFieldKey?: string;
  content?: Record<string, unknown>;
  layout?: {
    composition?: 'editorial' | 'centered' | 'split' | 'orbital' | 'asymmetric';
    paddingTopRem?: number;
    paddingBottomRem?: number;
    contentMaxWidthPx?: number;
    shape?: 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';
    scale?: number;
    aspectRatio?: string;
  };
  responsive?: {
    base?: Record<string, unknown>;
    tablet?: Record<string, unknown>;
    mobile?: Record<string, unknown>;
  };
  motion?: {
    preset?: string;
    parallaxDepth?: number;
    entryDuration?: number;
    entryDelay?: number;
  };
  customization?: {
    level: CustomizationLevel;
    customerEditable: boolean;
  };
}

// ─────────────────────────────────────────────────────────────
// 3. EDITOR MODES & PANELS
// ─────────────────────────────────────────────────────────────
export type EditorMode = 'design' | 'customer' | 'guest';

export type TemplateStudioNavTab =
  | 'overview'
  | 'experience'
  | 'scenes'
  | 'contentSchema'
  | 'mediaSlots'
  | 'designSystem'
  | 'responsive'
  | 'motion'
  | 'interactions'
  | 'modules'
  | 'customization'
  | 'accessibility'
  | 'preview'
  | 'versions'
  | 'publish';

// ─────────────────────────────────────────────────────────────
// 4. SEPARATED STATE HORIZONS (Prompt #2 & #5)
// ─────────────────────────────────────────────────────────────

/**
 * Editor UI State (ephemeral, not persisted as template content)
 */
export interface EditorUIState {
  selection: EditorSelection;
  activePanel: TemplateStudioNavTab;
  activeDevice: DeviceBreakpoint;
  device?: DeviceBreakpoint;
  mode: EditorMode;
  centerViewMode: 'canvas' | 'panel';
  zoom: number;
  canvasScroll: number;
  hoveredNodeId: string | null;
  inspectMode: boolean;
  isStressTest: boolean;
  isCommandPaletteOpen: boolean;
  expandedGroups: Record<string, boolean>;
  activePageId?: string;
}

/**
 * Template Draft State (the single canonical source of truth)
 */
export interface EditorDraftState {
  schema: TemplateSchema;
}

/**
 * History Stack State (transactions & undo/redo)
 */
export interface EditorHistoryState {
  past: TemplateSchema[];
  future: TemplateSchema[];
  activeTransaction: {
    label: string;
    initialSchema: TemplateSchema;
  } | null;
}

/**
 * Persistence State (autosave, dirty tracking, versioning)
 */
export interface EditorPersistenceState {
  isDirty: boolean;
  status: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSavedAt: string | null;
  error: string | null;
}

/**
 * Runtime Preview State (deterministic resolution snapshot)
 */
export interface EditorRuntimeState {
  customerOverrides: Partial<CelebrationState>;
  resolvedSnapshot: CelebrationState;
  motionReplayKey: number;
}

/**
 * Master Template Editor Store State
 */
export interface TemplateEditorState {
  ui: EditorUIState;
  draft: EditorDraftState;
  history: EditorHistoryState;
  persistence: EditorPersistenceState;
  runtime: EditorRuntimeState;
}
