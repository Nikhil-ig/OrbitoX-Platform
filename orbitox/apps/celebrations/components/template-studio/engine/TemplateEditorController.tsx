import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { TemplateSchemaService } from '../services/TemplateSchemaService';
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
import {
  TemplateEditorState,
  EditorSelection,
  TemplateNodeKind,
  EditorMode,
  TemplateStudioNavTab,
} from './TemplateEditorTypes';
import { TemplateEditorStore } from './TemplateEditorStore';
import { CelebrationState } from '@/components/studio/StudioData';
import { SceneNodeKind } from './SceneGraphTypes';
import { IdAllocator } from './IdAllocator';

export interface TemplateEditorController {
  // Selection Controls (Prompt #5, #6, #7, #8)
  selectScene(sceneId: string): void;
  selectNode(nodeId: string, sceneId?: string, kind?: TemplateNodeKind): void;
  selectNodes(nodeIds: string[], sceneId?: string): void;
  selectField(fieldId: string): void;
  clearSelection(): void;
  setHoveredNode(nodeId: string | null): void;

  // Mutations (Prompt #8, #9, #10)
  updateNodeProperty(nodeId: string, path: string, value: unknown): void;
  updateContentField(fieldId: string, patch: Partial<ContentFieldDefinition>): void;
  addContentField(field: ContentFieldDefinition): void;
  deleteContentField(fieldId: string): void;
  updateMediaSlot(slotId: string, patch: Partial<MediaSlotDefinition>): void;
  updateModule(moduleId: string, patch: Partial<TemplateModuleDefinition>): void;
  updateDesignTokens(patch: Partial<TemplateDesignTokens>): void;
  updateScene(sceneId: string, patch: Partial<TemplateSceneDefinition>): void;
  addScene(scene: TemplateSceneDefinition): void;
  reorderScenes(sourceIndex: number, targetIndex: number): void;
  toggleSceneVisibility(sceneId: string): void;
  duplicateScene(sceneId: string): void;
  deleteScene(sceneId: string): void;
  setResponsiveOverride(sceneIdOrNodeId: string, viewport: DeviceBreakpoint, patch: any, sceneId?: string): void;
  resetResponsiveOverride(sceneIdOrNodeId: string, viewport: DeviceBreakpoint, propertyKey?: string, sceneId?: string): void;
  setNodeResponsiveOverride(nodeId: string, viewport: DeviceBreakpoint, patch: any, sceneId?: string): void;
  resetNodeResponsiveOverride(nodeId: string, viewport: DeviceBreakpoint, propertyKey?: string, sceneId?: string): void;

  // P18: First-Class Section Operations (Prompt #6, #7, #8, #9, #10)
  insertSection(section: TemplateSceneDefinition, position?: number): void;
  moveSection(sectionId: string, direction?: 'up' | 'down', targetIndex?: number): void;
  duplicateSection(sectionId: string): void;
  deleteSection(sectionId: string): void;
  swapSectionVariant(sectionId: string, variantBlockId: string): void;

  // P18: First-Class Page Operations
  createPage(name: string, route: string, initialSections?: TemplateSceneDefinition[]): void;
  switchPage(pageId: string): void;
  deletePage(pageId: string): void;
  renamePage(pageId: string, name: string, route?: string): void;
  movePage(sourceIndex: number, targetIndex: number): void;
  duplicatePage(pageId: string): void;

  // P18: First-Class Asset Operations (Prompt #12, #13, #15)
  createAsset(asset: any): void;
  deleteAsset(assetId: string): void;
  replaceAsset(assetId: string, newUrl: string): void;

  // P16.1 Phase 4: Master Components & Instance Overrides
  createComponent(nodeId: string, name?: string, sceneId?: string): void;
  instantiateComponent(masterId: string, targetParentId?: string, sceneId?: string): void;
  setInstanceOverride(instanceNodeId: string, overrides: Record<string, any>, sceneId?: string): void;
  resetInstanceOverrides(instanceNodeId: string, propertyKey?: string, sceneId?: string): void;
  pushInstanceToMaster(instanceNodeId: string, sceneId?: string): void;
  detachInstance(nodeId: string, sceneId?: string): void;
  deleteMasterComponent(masterComponentId: string): void;

  // P18: First-Class Project & Theme Operations (Prompt #17, #19, #20, #21)
  replaceProject(project: TemplateSchema): void;
  applyTheme(universeId?: string, patch?: Partial<TemplateDesignTokens>): void;
  addTemplateSection(section: TemplateSceneDefinition, position?: number): void;

  // UI & Viewport Controls (Prompt #14, #15)
  setDevice(device: DeviceBreakpoint): void;
  setMode(mode: EditorMode): void;
  setActivePanel(panel: TemplateStudioNavTab): void;
  setCenterViewMode(mode: 'canvas' | 'panel'): void;
  setInspectMode(enabled: boolean): void;
  toggleCommandPalette(isOpen?: boolean): void;
  toggleGroupExpand(groupId: string): void;

  // Runtime Preview Simulation (Prompt #12, #15, #16)
  setCustomerOverride(patch: Partial<CelebrationState>): void;
  resetCustomerOverrides(): void;
  toggleStressTest(): void;
  replayMotion(): void;

  // Continuous Transactions & History (Prompt #11, #22)
  beginTransaction(label: string): void;
  commitTransaction(): void;
  cancelTransaction(): void;
  undo(): void;
  redo(): void;

  // Persistence & Publishing (Prompt #23, #24, #37, #38)
  saveImmediate(): Promise<void>;
  publish(): { success: boolean; error?: string; schema?: TemplateSchema };
  loadSchema(schema: TemplateSchema): void;
  updatePublishingConfig(patch: Partial<TemplatePublishingConfig>): void;
  dispatch(command: any): void;

  // First-class Node Helpers
  updateNode(nodeId: string, patch: any, sceneId?: string): void;
  updateStyle(nodeId: string, patch: any, sceneId?: string): void;
  insertNode(kind: SceneNodeKind, name: string, defaults?: any, sceneId?: string): void;
}

export function createTemplateEditorController(store: TemplateEditorStore): TemplateEditorController {
  return {
    selectScene(sceneId: string) {
      store.dispatch({ type: 'SELECT_SCENE', sceneId });
    },
    selectNode(nodeId: string, sceneId?: string, kind?: TemplateNodeKind) {
      store.dispatch({ type: 'SELECT_NODE', nodeId, sceneId, kind });
    },
    selectNodes(nodeIds: string[], sceneId?: string) {
      store.dispatch({ type: 'SELECT_NODES', nodeIds, sceneId });
    },
    selectField(fieldId: string) {
      store.dispatch({ type: 'SELECT_FIELD', fieldId });
    },
    clearSelection() {
      store.dispatch({ type: 'CLEAR_SELECTION' });
    },
    setHoveredNode(nodeId: string | null) {
      store.dispatch({ type: 'SET_HOVERED_NODE', nodeId });
    },

    updateNodeProperty(nodeId: string, path: string, value: unknown) {
      store.dispatch({ type: 'UPDATE_NODE_PROPERTY', nodeId, path, value });
      this.updateNode(nodeId, { [path]: value });
    },
    updateContentField(fieldId: string, patch: Partial<ContentFieldDefinition>) {
      store.dispatch({ type: 'UPDATE_CONTENT_FIELD', fieldId, patch });
    },
    addContentField(field: ContentFieldDefinition) {
      store.dispatch({ type: 'ADD_CONTENT_FIELD', field });
    },
    deleteContentField(fieldId: string) {
      store.dispatch({ type: 'DELETE_CONTENT_FIELD', fieldId });
    },
    updateMediaSlot(slotId: string, patch: Partial<MediaSlotDefinition>) {
      store.dispatch({ type: 'UPDATE_MEDIA_SLOT', slotId, patch });
    },
    updateModule(moduleId: string, patch: Partial<TemplateModuleDefinition>) {
      store.dispatch({ type: 'UPDATE_MODULE', moduleId, patch });
    },
    updateDesignTokens(patch: Partial<TemplateDesignTokens>) {
      store.dispatch({ type: 'UPDATE_DESIGN_TOKENS', patch });
    },
    updateScene(sceneId: string, patch: Partial<TemplateSceneDefinition>) {
      store.dispatch({ type: 'UPDATE_SCENE', sceneId, patch });
    },
    addScene(scene: TemplateSceneDefinition) {
      const state = store.getState();
      const existingScenes = state.draft?.schema?.scenes || [];
      const existingIds = existingScenes.map(s => s.id);
      
      let preparedScene = scene;
      if (!preparedScene.id || existingIds.includes(preparedScene.id)) {
        const { scene: rekeyed } = IdAllocator.rekeyScene(preparedScene, existingIds);
        preparedScene = rekeyed;
      }
      store.dispatch({ type: 'ADD_SCENE', scene: preparedScene });
    },
    reorderScenes(sourceIndex: number, targetIndex: number) {
      store.dispatch({ type: 'REORDER_SCENES', sourceIndex, targetIndex });
    },
    toggleSceneVisibility(sceneId: string) {
      store.dispatch({ type: 'TOGGLE_SCENE_VISIBILITY', sceneId });
    },
    duplicateScene(sceneId: string) {
      const state = store.getState();
      const existingScenes = state.draft?.schema?.scenes || [];
      const scene = existingScenes.find(s => s.id === sceneId);
      if (!scene) return;
      const existingIds = existingScenes.map(s => s.id);
      const { scene: rekeyed } = IdAllocator.rekeyScene(scene, existingIds);
      store.dispatch({ type: 'ADD_SCENE', scene: rekeyed });
    },
    deleteScene(sceneId: string) {
      store.dispatch({ type: 'DELETE_SCENE', sceneId });
    },
    setResponsiveOverride(arg1: string, viewport: DeviceBreakpoint, patch: any, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      const scene = store.getState().draft.schema?.scenes?.find(s => s.id === sId || s.id === arg1);
      const isNode = scene?.sceneGraph?.nodes?.[arg1];
      if (isNode && scene) {
        store.dispatch({ type: 'SG_SET_RESPONSIVE_OVERRIDE', sceneId: scene.id, nodeId: arg1, device: viewport, patch });
      } else {
        store.dispatch({ type: 'SET_RESPONSIVE_OVERRIDE', sceneId: arg1, viewport, patch });
      }
    },
    resetResponsiveOverride(arg1: string, viewport: DeviceBreakpoint, propertyKey?: string, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      const scene = store.getState().draft.schema?.scenes?.find(s => s.id === sId || s.id === arg1);
      const isNode = scene?.sceneGraph?.nodes?.[arg1];
      if (isNode && scene) {
        store.dispatch({ type: 'SG_RESET_RESPONSIVE_OVERRIDE', sceneId: scene.id, nodeId: arg1, device: viewport, propertyKey });
      } else {
        store.dispatch({ type: 'RESET_RESPONSIVE_OVERRIDE', sceneId: arg1, viewport });
      }
    },
    setNodeResponsiveOverride(nodeId: string, viewport: DeviceBreakpoint, patch: any, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      store.dispatch({ type: 'SG_SET_RESPONSIVE_OVERRIDE', sceneId: sId, nodeId, device: viewport, patch });
    },
    resetNodeResponsiveOverride(nodeId: string, viewport: DeviceBreakpoint, propertyKey?: string, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      store.dispatch({ type: 'SG_RESET_RESPONSIVE_OVERRIDE', sceneId: sId, nodeId, device: viewport, propertyKey });
    },

    insertSection(section: TemplateSceneDefinition, position?: number) {
      store.dispatch({ type: 'INSERT_SECTION', section, position });
    },
    moveSection(sectionId: string, direction?: 'up' | 'down', targetIndex?: number) {
      store.dispatch({ type: 'MOVE_SECTION', sectionId, direction, targetIndex });
    },
    duplicateSection(sectionId: string) {
      store.dispatch({ type: 'DUPLICATE_SECTION', sectionId });
    },
    deleteSection(sectionId: string) {
      store.dispatch({ type: 'DELETE_SECTION', sectionId });
    },
    swapSectionVariant(sectionId: string, variantBlockId: string) {
      store.dispatch({ type: 'SWAP_SECTION_VARIANT', sectionId, variantBlockId });
    },

    createAsset(asset: any) {
      store.dispatch({ type: 'CREATE_ASSET', asset });
    },
    deleteAsset(assetId: string) {
      store.dispatch({ type: 'DELETE_ASSET', assetId });
    },
    replaceAsset(assetId: string, newUrl: string) {
      store.dispatch({ type: 'REPLACE_ASSET', assetId, newUrl });
    },

    // P16.1 Phase 4: Master Components & Instance Overrides
    createComponent(nodeId: string, name?: string, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      store.dispatch({ type: 'SG_CREATE_COMPONENT', sceneId: sId, nodeId, name });
    },
    instantiateComponent(masterId: string, targetParentId?: string, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      store.dispatch({ type: 'SG_INSTANTIATE_COMPONENT', sceneId: sId, masterNodeId: masterId, targetParentId });
    },
    setInstanceOverride(instanceNodeId: string, overrides: Record<string, any>, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      store.dispatch({ type: 'SG_SET_INSTANCE_OVERRIDE', sceneId: sId, instanceNodeId, overrides });
    },
    resetInstanceOverrides(instanceNodeId: string, propertyKey?: string, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      store.dispatch({ type: 'SG_RESET_INSTANCE_OVERRIDES', sceneId: sId, instanceNodeId, propertyKey });
    },
    pushInstanceToMaster(instanceNodeId: string, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      store.dispatch({ type: 'SG_PUSH_INSTANCE_TO_MASTER', sceneId: sId, instanceNodeId });
    },
    detachInstance(nodeId: string, sceneId?: string) {
      const sId = sceneId || store.getState().ui?.selection?.sceneId || store.getState().draft.schema?.scenes[0]?.id || '';
      store.dispatch({ type: 'SG_DETACH_INSTANCE', sceneId: sId, nodeId });
    },
    deleteMasterComponent(masterComponentId: string) {
      store.dispatch({ type: 'SG_DELETE_MASTER_COMPONENT', masterComponentId });
    },

    createPage(name: string, route: string, initialSections?: TemplateSceneDefinition[]) {
      store.dispatch({ type: 'CREATE_PAGE', name, route, initialSections });
    },
    switchPage(pageId: string) {
      store.dispatch({ type: 'SWITCH_PAGE', pageId });
    },
    deletePage(pageId: string) {
      store.dispatch({ type: 'DELETE_PAGE', pageId });
    },
    renamePage(pageId: string, name: string, route?: string) {
      store.dispatch({ type: 'RENAME_PAGE', pageId, name, route });
    },
    movePage(sourceIndex: number, targetIndex: number) {
      store.dispatch({ type: 'MOVE_PAGE', sourceIndex, targetIndex });
    },
    duplicatePage(pageId: string) {
      store.dispatch({ type: 'DUPLICATE_PAGE', pageId });
    },

    replaceProject(project: TemplateSchema) {
      store.dispatch({ type: 'REPLACE_PROJECT', project });
    },
    applyTheme(universeId?: string, patch?: Partial<TemplateDesignTokens>) {
      store.dispatch({ type: 'APPLY_THEME', universeId, patch: patch || {} });
    },
    addTemplateSection(section: TemplateSceneDefinition, position?: number) {
      store.dispatch({ type: 'ADD_TEMPLATE_SECTION', section, position });
    },

    setDevice(device: DeviceBreakpoint) {
      store.dispatch({ type: 'SET_DEVICE', device });
    },
    setMode(mode: EditorMode) {
      store.dispatch({ type: 'SET_MODE', mode });
    },
    setActivePanel(panel: TemplateStudioNavTab) {
      store.dispatch({ type: 'SET_ACTIVE_PANEL', panel });
    },
    setCenterViewMode(mode: 'canvas' | 'panel') {
      store.dispatch({ type: 'SET_CENTER_VIEW_MODE', mode });
    },
    setInspectMode(enabled: boolean) {
      store.dispatch({ type: 'SET_INSPECT_MODE', enabled });
    },
    toggleCommandPalette(isOpen?: boolean) {
      store.dispatch({ type: 'TOGGLE_COMMAND_PALETTE', isOpen });
    },
    toggleGroupExpand(groupId: string) {
      store.dispatch({ type: 'TOGGLE_GROUP_EXPAND', groupId });
    },

    setCustomerOverride(patch: Partial<CelebrationState>) {
      store.dispatch({ type: 'SET_CUSTOMER_OVERRIDE', patch });
    },
    resetCustomerOverrides() {
      store.dispatch({ type: 'RESET_CUSTOMER_OVERRIDES' });
    },
    toggleStressTest() {
      store.dispatch({ type: 'TOGGLE_STRESS_TEST' });
    },
    replayMotion() {
      store.dispatch({ type: 'REPLAY_MOTION' });
    },

    beginTransaction(label: string) {
      store.dispatch({ type: 'BEGIN_TRANSACTION', label });
    },
    commitTransaction() {
      store.dispatch({ type: 'COMMIT_TRANSACTION' });
    },
    cancelTransaction() {
      store.dispatch({ type: 'CANCEL_TRANSACTION' });
    },
    undo() {
      store.dispatch({ type: 'UNDO' });
    },
    redo() {
      store.dispatch({ type: 'REDO' });
    },

    async saveImmediate(): Promise<void> {
      const state = store.getState();
      store.dispatch({ type: 'SET_PERSISTENCE_STATUS', status: 'saving' });
      try {
        TemplateSchemaService.saveSchema(state.draft.schema);
        store.dispatch({ type: 'SET_PERSISTENCE_STATUS', status: 'saved' });
      } catch (err: any) {
        store.dispatch({
          type: 'SET_PERSISTENCE_STATUS',
          status: 'error',
          error: err?.message || 'Failed to save schema',
        });
      }
    },

    publish() {
      const state = store.getState();
      const result = TemplateSchemaService.publishVersion(state.draft.schema);
      if (result.success && result.schema) {
        store.dispatch({ type: 'LOAD_SCHEMA', schema: result.schema });
      }
      return result;
    },

    loadSchema(schema: TemplateSchema) {
      store.dispatch({ type: 'LOAD_SCHEMA', schema });
    },

    updatePublishingConfig(patch: Partial<TemplatePublishingConfig>) {
      store.dispatch({ type: 'UPDATE_PUBLISHING_CONFIG', patch });
    },
    
    dispatch(command: any) {
      store.dispatch(command);
    },

    updateNode(nodeId: string, patch: any, sceneId?: string) {
      const state = store.getState();
      const scenes = state.draft?.schema?.scenes || [];
      const sId = sceneId || state.ui?.selection?.sceneId || scenes.find((s: any) => s.sceneGraph?.nodes?.[nodeId])?.id || scenes[0]?.id;
      if (sId) {
        store.dispatch({
          type: 'SG_UPDATE_NODE_PROPERTY',
          sceneId: sId,
          nodeId,
          patch,
        });
      }
    },

    updateStyle(nodeId: string, patch: any, sceneId?: string) {
      const state = store.getState();
      const scenes = state.draft?.schema?.scenes || [];
      const sId = sceneId || state.ui?.selection?.sceneId || scenes.find((s: any) => s.sceneGraph?.nodes?.[nodeId])?.id || scenes[0]?.id;
      if (sId) {
        store.dispatch({
          type: 'SG_UPDATE_STYLE',
          sceneId: sId,
          nodeId,
          patch,
        });
      }
    },

    insertNode(kind: SceneNodeKind, name: string, defaults?: any, sceneId?: string) {
      const state = store.getState();
      const sId = sceneId || state.ui?.selection?.sceneId || state.draft.schema?.scenes[0]?.id;
      const targetScene = state.draft.schema?.scenes.find((s) => s.id === sId) || state.draft.schema?.scenes[0];
      if (targetScene) {
        store.dispatch({
          type: 'SG_CREATE_NODE',
          sceneId: targetScene.id,
          kind,
          parentId: targetScene.sceneGraph?.rootNodeId || undefined,
          defaults: defaults || { name },
        });
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────
// REACT CONTEXT & HOOKS
// ─────────────────────────────────────────────────────────────

interface TemplateEditorContextValue {
  state: TemplateEditorState;
  controller: TemplateEditorController;
  store: TemplateEditorStore;
}

const TemplateEditorContext = createContext<TemplateEditorContextValue | null>(null);

export interface TemplateEditorProviderProps {
  initialSchema: TemplateSchema;
  children: React.ReactNode;
}

export function TemplateEditorProvider({ initialSchema, children }: TemplateEditorProviderProps) {
  const storeRef = useRef<TemplateEditorStore | null>(null);
  if (!storeRef.current || (initialSchema?.id && storeRef.current.getState().draft?.schema?.id !== initialSchema.id)) {
    storeRef.current = new TemplateEditorStore(initialSchema);
  }
  const store = storeRef.current;

  // React tear-free subscription
  const state = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getState(),
    () => store.getState()
  );

  const controller = useMemo(() => createTemplateEditorController(store), [store]);

  const value = useMemo(
    () => ({
      state,
      controller,
      store,
    }),
    [state, controller, store]
  );

  return <TemplateEditorContext.Provider value={value}>{children}</TemplateEditorContext.Provider>;
}

export function useTemplateEditor(): TemplateEditorContextValue {
  const context = useContext(TemplateEditorContext);
  if (!context) {
    throw new Error('useTemplateEditor must be used within a TemplateEditorProvider');
  }
  return context;
}
