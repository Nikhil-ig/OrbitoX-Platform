import {
  TemplateSchema,
  TemplateSceneDefinition,
  ContentFieldDefinition,
  MediaSlotDefinition,
  TemplateModuleDefinition,
  TemplateDesignTokens,
  DeviceBreakpoint,
  CustomizationLevel,
  TemplatePublishingConfig,
} from '../types/TemplateSchema';
import { EditorMode, TemplateStudioNavTab, TemplateNodeKind } from './TemplateEditorTypes';
import { SceneNodeKind, NodeGeometry, NodeStyle, NodeMotion, NodeInteraction, NodeBinding, SceneGraphNode } from './SceneGraphTypes';
import { CelebrationState } from '@/components/studio/StudioData';

export type TemplateEditorCommand =
  // Selection commands
  | { type: 'SELECT_SCENE'; sceneId: string }
  | { type: 'SELECT_NODE'; nodeId: string; sceneId?: string; kind?: TemplateNodeKind }
  | { type: 'SELECT_NODES'; nodeIds: string[]; sceneId?: string }
  | { type: 'SELECT_FIELD'; fieldId: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_HOVERED_NODE'; nodeId: string | null }

  // Node & Property updates (single source of truth mutations)
  | { type: 'UPDATE_NODE_PROPERTY'; nodeId: string; path: string; value: unknown }
  | { type: 'UPDATE_CONTENT_FIELD'; fieldId: string; patch: Partial<ContentFieldDefinition> }
  | { type: 'ADD_CONTENT_FIELD'; field: ContentFieldDefinition }
  | { type: 'DELETE_CONTENT_FIELD'; fieldId: string }
  | { type: 'UPDATE_MEDIA_SLOT'; slotId: string; patch: Partial<MediaSlotDefinition> }
  | { type: 'UPDATE_MODULE'; moduleId: string; patch: Partial<TemplateModuleDefinition> }
  | { type: 'UPDATE_DESIGN_TOKENS'; patch: Partial<TemplateDesignTokens> }
  | { type: 'UPDATE_SCENE'; sceneId: string; patch: Partial<TemplateSceneDefinition> }
  | { type: 'ADD_SCENE'; scene: TemplateSceneDefinition }
  | { type: 'REORDER_SCENES'; sourceIndex: number; targetIndex: number }
  | { type: 'TOGGLE_SCENE_VISIBILITY'; sceneId: string }
  | { type: 'DUPLICATE_SCENE'; sceneId: string }
  | { type: 'DELETE_SCENE'; sceneId: string }
  | { type: 'CREATE_SCENE'; name: string; preset: 'blank' | 'hero' | 'portraits' | 'story' | 'countdown' | 'itinerary' | 'rsvp' | 'gallery' | 'wishes' }

  // P18 & P16.1: First-Class Section Commands
  | { type: 'INSERT_SECTION'; section: TemplateSceneDefinition; position?: number }
  | { type: 'MOVE_SECTION'; sectionId: string; direction?: 'up' | 'down'; targetIndex?: number }
  | { type: 'DUPLICATE_SECTION'; sectionId: string }
  | { type: 'DELETE_SECTION'; sectionId: string }
  | { type: 'SWAP_SECTION_VARIANT'; sectionId: string; variantBlockId: string }

  // P18: First-Class Page Commands
  | { type: 'CREATE_PAGE'; name: string; route: string; initialSections?: TemplateSceneDefinition[] }
  | { type: 'SWITCH_PAGE'; pageId: string }
  | { type: 'DELETE_PAGE'; pageId: string }
  | { type: 'RENAME_PAGE'; pageId: string; name: string; route?: string }
  | { type: 'MOVE_PAGE'; sourceIndex: number; targetIndex: number }
  | { type: 'DUPLICATE_PAGE'; pageId: string }

  // P18: First-Class Asset Commands
  | { type: 'CREATE_ASSET'; asset: any }
  | { type: 'DELETE_ASSET'; assetId: string }
  | { type: 'REPLACE_ASSET'; assetId: string; newUrl: string }

  // P18: First-Class Project & Theme Commands
  | { type: 'REPLACE_PROJECT'; project: TemplateSchema }
  | { type: 'APPLY_THEME'; universeId?: string; patch: Partial<TemplateDesignTokens> }
  | { type: 'ADD_TEMPLATE_SECTION'; section: TemplateSceneDefinition; position?: number }
  | { type: 'UPDATE_PUBLISHING_CONFIG'; patch: Partial<TemplatePublishingConfig> }

  // Scene Graph Commands
  | { type: 'SG_CREATE_NODE'; sceneId: string; kind: SceneNodeKind; parentId?: string; insertIndex?: number; defaults?: any }
  | { type: 'SG_DELETE_NODE'; sceneId: string; nodeId: string }
  | { type: 'SG_MOVE_NODE'; sceneId: string; nodeId: string; newParentId: string; index?: number }
  | { type: 'SG_DUPLICATE_NODE'; sceneId: string; nodeId: string }
  | { type: 'SG_UPDATE_GEOMETRY'; sceneId: string; nodeId: string; patch: Partial<NodeGeometry> }
  | { type: 'SG_UPDATE_STYLE'; sceneId: string; nodeId: string; patch: Partial<NodeStyle> }
  | { type: 'SG_UPDATE_NODE_PROPERTY'; sceneId: string; nodeId: string; patch: Partial<SceneGraphNode> }
  | { type: 'SG_REORDER_NODE'; sceneId: string; nodeId: string; direction: 'up' | 'down' }
  | { type: 'SG_UPDATE_MOTION'; sceneId: string; nodeId: string; patch: Partial<NodeMotion> }
  | { type: 'SG_UPDATE_INTERACTION'; sceneId: string; nodeId: string; interactions: NodeInteraction[] }
  | { type: 'SG_GROUP_NODES'; sceneId: string; nodeIds: string[] }
  | { type: 'SG_UNGROUP'; sceneId: string; groupId: string }
  | { type: 'SG_LOCK_NODE'; sceneId: string; nodeId: string; locked: boolean }
  | { type: 'SG_HIDE_NODE'; sceneId: string; nodeId: string; hidden: boolean }
  | { type: 'SG_REORDER'; sceneId: string; parentId: string; fromIndex: number; toIndex: number }
  | { type: 'SG_SET_RESPONSIVE_OVERRIDE'; sceneId: string; nodeId: string; device: DeviceBreakpoint; patch: Partial<NodeGeometry & NodeStyle> }
  | { type: 'SG_RESET_RESPONSIVE_OVERRIDE'; sceneId: string; nodeId: string; device: DeviceBreakpoint; propertyKey?: string }
  | { type: 'SG_SET_BINDING'; sceneId: string; nodeId: string; binding: NodeBinding | null }
  | { type: 'SG_SET_LAYOUT_MODE'; sceneId: string; nodeId: string; layoutMode: 'flex' | 'grid' | 'stack' | 'freeform' | 'auto' }
  | { type: 'SG_TOGGLE_LAYOUT_MODE'; sceneId: string; nodeId: string }
  | { type: 'SG_ALIGN_NODES'; sceneId: string; nodeIds: string[]; alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }
  | { type: 'SG_DISTRIBUTE_NODES'; sceneId: string; nodeIds: string[]; axis: 'horizontal' | 'vertical' }
  | { type: 'SG_UPDATE_LAYOUT_CONFIG'; sceneId: string; nodeId: string; patch: any }
  | { type: 'SG_SET_CHILD_SIZING'; sceneId: string; parentId: string; childId: string; sizingOptions: any }
  | { type: 'SG_CREATE_COMPONENT'; sceneId: string; nodeId: string; componentId?: string; name?: string }
  | { type: 'SG_INSTANTIATE_COMPONENT'; sceneId: string; masterNodeId: string; targetParentId?: string; variantId?: string }
  | { type: 'SG_SET_INSTANCE_OVERRIDE'; sceneId: string; instanceNodeId: string; overrides: Record<string, any> }
  | { type: 'SG_RESET_INSTANCE_OVERRIDES'; sceneId: string; instanceNodeId: string; propertyKey?: string }
  | { type: 'SG_PUSH_INSTANCE_TO_MASTER'; sceneId: string; instanceNodeId: string }
  | { type: 'SG_DETACH_INSTANCE'; sceneId: string; nodeId: string }
  | { type: 'SG_DELETE_MASTER_COMPONENT'; masterComponentId: string }
  | { type: 'SG_SET_REPEATER'; sceneId: string; nodeId: string; repeater: any }
  | { type: 'SG_SET_CONDITIONAL'; sceneId: string; nodeId: string; conditional: any }

  // P13: Structural Freedom Commands
  | { type: 'SG_WRAP_NODES'; sceneId: string; nodeIds: string[]; wrapperKind?: SceneNodeKind; wrapperDefaults?: any }
  | { type: 'SG_UNWRAP'; sceneId: string; containerId: string }
  | { type: 'SG_REPLACE_KIND'; sceneId: string; nodeId: string; newKind: SceneNodeKind }
  | { type: 'SG_NEST_INTO'; sceneId: string; nodeId: string; targetId: string }
  | { type: 'SG_FLATTEN'; sceneId: string; nodeId: string }
  | { type: 'SG_SWAP_NODES'; sceneId: string; nodeIdA: string; nodeIdB: string }
  | { type: 'SG_MULTI_DELETE'; sceneId: string; nodeIds: string[] }
  | { type: 'SG_COPY_NODES'; sceneId: string; nodeIds: string[] }
  | { type: 'SG_CUT_NODES'; sceneId: string; nodeIds: string[] }
  | { type: 'SG_PASTE_NODES'; sceneId: string; targetParentId: string; insertIndex?: number }
  | { type: 'SG_INSERT_SUBTREE'; sceneId: string; subtreeNodes: Record<string, any>; subtreeRootIds: string[]; targetParentId: string; insertIndex?: number }
  | { type: 'SG_PASTE_REPLACE'; sceneId: string; targetNodeId: string }
  | { type: 'SG_PASTE_STYLES'; sceneId: string; targetNodeId: string }
  | { type: 'SG_PASTE_AT_COORDINATES'; sceneId: string; targetParentId?: string; x: number; y: number }
  | { type: 'SG_REORDER_NODE_FRONT'; sceneId: string; nodeId: string }
  | { type: 'SG_REORDER_NODE_BACK'; sceneId: string; nodeId: string }
  | { type: 'SELECT_ALL_NODES'; sceneId: string }

  // Responsive commands
  | {
      type: 'SET_RESPONSIVE_OVERRIDE';
      sceneId: string;
      viewport: DeviceBreakpoint;
      patch: Record<string, unknown>;
    }
  | {
      type: 'RESET_RESPONSIVE_OVERRIDE';
      sceneId: string;
      viewport: DeviceBreakpoint;
    }

  // UI state commands
  | { type: 'SET_DEVICE'; device: DeviceBreakpoint }
  | { type: 'SET_MODE'; mode: EditorMode }
  | { type: 'SET_ACTIVE_PANEL'; panel: TemplateStudioNavTab }
  | { type: 'SET_CENTER_VIEW_MODE'; mode: 'canvas' | 'panel' }
  | { type: 'SET_INSPECT_MODE'; enabled: boolean }
  | { type: 'TOGGLE_COMMAND_PALETTE'; isOpen?: boolean }
  | { type: 'TOGGLE_GROUP_EXPAND'; groupId: string }

  // Runtime preview simulation commands
  | { type: 'SET_CUSTOMER_OVERRIDE'; patch: Partial<CelebrationState> }
  | { type: 'RESET_CUSTOMER_OVERRIDES' }
  | { type: 'TOGGLE_STRESS_TEST' }
  | { type: 'REPLAY_MOTION' }

  // History & Transactions (Prompt #11)
  | { type: 'BEGIN_TRANSACTION'; label: string }
  | { type: 'COMMIT_TRANSACTION' }
  | { type: 'CANCEL_TRANSACTION' }
  | { type: 'UNDO' }
  | { type: 'REDO' }

  // Persistence commands
  | { type: 'SET_PERSISTENCE_STATUS'; status: 'saved' | 'saving' | 'unsaved' | 'error'; error?: string }
  | { type: 'LOAD_SCHEMA'; schema: TemplateSchema };
