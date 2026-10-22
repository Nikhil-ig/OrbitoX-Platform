import { TemplateSchema, TemplatePageDefinition, TemplateSceneDefinition } from '../types/TemplateSchema';
import {
  TemplateEditorState,
  EditorSelection,
  TemplateNode,
  TemplateNodeKind,
  DeviceBreakpoint,
  EditorMode,
  TemplateStudioNavTab,
} from './TemplateEditorTypes';
import { TemplateEditorCommand } from './TemplateEditorCommands';
import { TemplateEditorResolver } from './TemplateEditorResolver';
import { TemplateEditorHistory } from './TemplateEditorHistory';
import { TemplateEditorPersistence } from './TemplateEditorPersistence';
import { TemplateEditorValidation } from './TemplateEditorValidation';
import { SceneGraphEngine } from './SceneGraphEngine';
import { SceneGraph, SceneGraphNode } from './SceneGraphTypes';
import { LegacyTemplateMigrator } from './LegacyTemplateMigrator';
import { ScenePresets } from './ScenePresets';
import { TemplateFactory } from './TemplateFactory';
import { SceneGraphClipboard } from './SceneGraphClipboard';
import { WebSectionLibrary } from './WebSectionLibrary';
import { TemplateContentMigrator } from './TemplateContentMigrator';

export type StoreListener = (state: TemplateEditorState) => void;

export class TemplateEditorStore {
  private state: TemplateEditorState;
  private historyManager: TemplateEditorHistory;
  private persistenceManager: TemplateEditorPersistence;
  private listeners: Set<StoreListener> = new Set();

  constructor(initialSchema: TemplateSchema) {
    this.historyManager = new TemplateEditorHistory();
    this.persistenceManager = new TemplateEditorPersistence();

    const initialDevice: DeviceBreakpoint = 'desktop';
    const initialMode: EditorMode = 'design';

    // P13: Auto-migrate legacy templates on load
    const migratedSchema = LegacyTemplateMigrator.migrateTemplate(initialSchema);

    const resolvedSnapshot = TemplateEditorResolver.resolveTemplateSnapshot(
      migratedSchema,
      initialDevice,
      {},
      false
    );

    const defaultScene = migratedSchema.scenes[0] || initialSchema.scenes[0];

    this.state = {
      ui: {
        selection: {
          templateId: initialSchema.id,
          sceneId: defaultScene ? defaultScene.id : null,
          nodeId: null,
          fieldId: null,
        },
        activePanel: 'scenes',
        activeDevice: initialDevice,
        mode: initialMode,
        centerViewMode: 'canvas',
        zoom: 1,
        canvasScroll: 0,
        hoveredNodeId: null,
        inspectMode: true,
        isStressTest: false,
        isCommandPaletteOpen: false,
        expandedGroups: {},
        activePageId: migratedSchema.pages?.[0]?.id || 'page_home',
      },
      draft: {
        schema: JSON.parse(JSON.stringify(migratedSchema)),
      },
      history: this.historyManager.getState(),
      persistence: {
        isDirty: false,
        status: 'saved',
        lastSavedAt: new Date().toISOString(),
        error: null,
      },
      runtime: {
        customerOverrides: {},
        resolvedSnapshot,
        motionReplayKey: 0,
      },
    };
  }

  getState(): TemplateEditorState {
    return this.state;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Internal helper to commit a draft mutation with history and re-resolution
   */
  private mutateDraft(
    updater: (draft: TemplateSchema) => TemplateSchema,
    trackHistory: boolean = true
  ): void {
    if (trackHistory) {
      this.historyManager.push(this.state.draft.schema);
    }

    const nextDraft = updater(this.state.draft.schema);
    nextDraft.updatedAt = new Date().toISOString();
    nextDraft.healthReport = TemplateEditorValidation.validate(nextDraft);

    // Re-resolve deterministic runtime snapshot immediately
    const nextSnapshot = TemplateEditorResolver.resolveTemplateSnapshot(
      nextDraft,
      this.state.ui.activeDevice,
      this.state.runtime.customerOverrides,
      this.state.ui.isStressTest
    );

    this.state = {
      ...this.state,
      draft: { schema: nextDraft },
      history: this.historyManager.getState(),
      persistence: {
        ...this.state.persistence,
        isDirty: true,
        status: 'unsaved',
      },
      runtime: {
        ...this.state.runtime,
        resolvedSnapshot: nextSnapshot,
      },
    };

    // Debounced autosave
    this.persistenceManager.scheduleAutosave(nextDraft, (status, error) => {
      this.state = {
        ...this.state,
        persistence: {
          ...this.state.persistence,
          status,
          isDirty: status !== 'saved',
          lastSavedAt: status === 'saved' ? new Date().toISOString() : this.state.persistence.lastSavedAt,
          error: error || null,
        },
      };
      this.notify();
    });

    this.notify();
  }

  /**
   * Re-resolve runtime preview without draft mutations
   */
  private recomputeSnapshot(): void {
    const nextSnapshot = TemplateEditorResolver.resolveTemplateSnapshot(
      this.state.draft.schema,
      this.state.ui.activeDevice,
      this.state.runtime.customerOverrides,
      this.state.ui.isStressTest
    );
    this.state = {
      ...this.state,
      runtime: {
        ...this.state.runtime,
        resolvedSnapshot: nextSnapshot,
      },
    };
    this.notify();
  }

  /**
   * Helper to retrieve or initialize project pages
   */
  public getOrCreatePages(draft: TemplateSchema): TemplatePageDefinition[] {
    if (draft.pages && draft.pages.length > 0) {
      return draft.pages;
    }
    return [
      {
        id: 'page_home',
        name: 'Home',
        route: '/',
        sectionIds: (draft.scenes || []).map((s) => s.id),
        isHome: true,
      },
    ];
  }

  /**
   * Recursively clone and re-key a SceneGraph to guarantee zero node ID collisions
   */
  public rekeySceneGraph(sceneGraph?: SceneGraph): SceneGraph | undefined {
    if (!sceneGraph || !sceneGraph.nodes) return sceneGraph;
    const idMap: Record<string, string> = {};
    Object.keys(sceneGraph.nodes).forEach((oldId) => {
      idMap[oldId] = `node_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    });
    const newNodes: Record<string, any> = {};
    Object.entries(sceneGraph.nodes).forEach(([oldId, node]: [string, any]) => {
      const newId = idMap[oldId] || oldId;
      const newParentId = node.parentId && idMap[node.parentId] ? idMap[node.parentId] : null;
      const newChildren = (node.children || []).map((chId: string) => idMap[chId] || chId);
      newNodes[newId] = {
        ...node,
        id: newId,
        parentId: newParentId,
        children: newChildren,
      };
    });
    const newRootId = sceneGraph.rootNodeId ? (idMap[sceneGraph.rootNodeId] || sceneGraph.rootNodeId) : '';
    const newRenderOrder = (sceneGraph.renderOrder || []).map((id: string) => idMap[id] || id);
    return {
      schemaVersion: sceneGraph.schemaVersion || 1,
      nodes: newNodes,
      rootNodeId: newRootId,
      renderOrder: newRenderOrder,
    };
  }

  /**
   * Propagates changes made to a Master Component across all scenes to all instances sharing masterComponentId
   */
  private propagateMasterComponentUpdate(
    draft: any,
    masterId: string,
    propertyType: 'style' | 'geometry' | 'property',
    patch: any
  ): void {
    if (!draft || !masterId) return;

    // 1. Update masterComponents registry
    if (draft.masterComponents && draft.masterComponents[masterId]) {
      const masterNode = draft.masterComponents[masterId];
      if (propertyType === 'style') {
        masterNode.style = { ...(masterNode.style || {}), ...patch };
      } else if (propertyType === 'geometry') {
        masterNode.geometry = { ...(masterNode.geometry || {}), ...patch };
      } else {
        Object.assign(masterNode, patch);
      }
    }

    // 2. Propagate to all instances across all scenes
    for (const scene of draft.scenes || []) {
      if (!scene.sceneGraph || !scene.sceneGraph.nodes) continue;
      for (const [nodeId, n] of Object.entries(scene.sceneGraph.nodes) as [string, SceneGraphNode][]) {
        if (n.component?.masterComponentId === masterId && !n.component?.isMaster) {
          const overrides = n.component?.instanceOverrides || {};
          if (propertyType === 'style') {
            const updatedStyle = { ...(n.style || {}) };
            for (const [k, v] of Object.entries(patch)) {
              if (overrides[`style.${k}`] === undefined && overrides[k] === undefined) {
                (updatedStyle as any)[k] = v;
              }
            }
            n.style = updatedStyle;
          } else if (propertyType === 'geometry') {
            const updatedGeom = { ...(n.geometry || {}) };
            for (const [k, v] of Object.entries(patch)) {
              if (overrides[`geometry.${k}`] === undefined && overrides[k] === undefined) {
                (updatedGeom as any)[k] = v;
              }
            }
            n.geometry = updatedGeom;
          } else {
            for (const [k, v] of Object.entries(patch)) {
              if (k !== 'id' && k !== 'component' && k !== 'parentId' && k !== 'children') {
                if (overrides[k] === undefined) {
                  (n as any)[k] = v;
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Command Dispatcher (Single Source of Truth, Prompt #3 & #4)
   */
  dispatch(command: TemplateEditorCommand): void {
    switch (command.type) {
      // ─────────────────────────────────────────────────────────────
      // SELECTION (Prompt #5, #6, #7)
      // ─────────────────────────────────────────────────────────────
      case 'SELECT_SCENE': {
        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            selection: {
              templateId: this.state.draft.schema.id,
              sceneId: command.sceneId,
              nodeId: null,
              fieldId: null,
            },
          },
        };
        this.notify();
        break;
      }

      case 'SELECT_NODE': {
        // Resolve sceneId if not explicitly provided
        let targetSceneId = command.sceneId || this.state.ui.selection.sceneId;
        if (!targetSceneId) {
          for (const s of this.state.draft.schema.scenes) {
            if (this.findLayer(s.layers, command.nodeId) || (s.sceneGraph?.nodes && s.sceneGraph.nodes[command.nodeId])) {
              targetSceneId = s.id;
              break;
            }
          }
        }

        // Find associated bindingFieldKey if layer binds to a content field
        let targetFieldId: string | null = null;
        if (targetSceneId) {
          const scn = this.state.draft.schema.scenes.find((s) => s.id === targetSceneId);
          if (scn) {
            const lay = this.findLayer(scn.layers, command.nodeId);
            if (lay?.bindingFieldKey) {
              const fld = this.state.draft.schema.contentSchema.find(
                (f) => f.key === lay.bindingFieldKey
              );
              if (fld) targetFieldId = fld.id;
            }
          }
        }

        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            selection: {
              templateId: this.state.draft.schema.id,
              sceneId: targetSceneId,
              nodeId: command.nodeId,
              nodeIds: command.nodeId ? [command.nodeId] : [],
              fieldId: targetFieldId,
              kind: command.kind,
            },
          },
        };
        this.notify();
        break;
      }

      case 'SELECT_NODES': {
        const primaryId = command.nodeIds[0] || null;
        let targetSceneId = command.sceneId || this.state.ui.selection.sceneId;
        if (!targetSceneId && primaryId) {
          for (const s of this.state.draft.schema.scenes) {
            if (s.sceneGraph?.nodes && s.sceneGraph.nodes[primaryId]) {
              targetSceneId = s.id;
              break;
            }
          }
        }
        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            selection: {
              templateId: this.state.draft.schema.id,
              sceneId: targetSceneId,
              nodeId: primaryId,
              nodeIds: command.nodeIds,
              fieldId: null,
            },
          },
        };
        this.notify();
        break;
      }

      case 'SELECT_FIELD': {
        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            selection: {
              ...this.state.ui.selection,
              fieldId: command.fieldId,
            },
          },
        };
        this.notify();
        break;
      }

      case 'CLEAR_SELECTION': {
        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            selection: {
              templateId: this.state.draft.schema.id,
              sceneId: null,
              nodeId: null,
              nodeIds: [],
              fieldId: null,
            },
          },
        };
        this.notify();
        break;
      }

      case 'SET_HOVERED_NODE': {
        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            hoveredNodeId: command.nodeId,
          },
        };
        this.notify();
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // MUTATIONS (Prompt #8, #9, #10)
      // ─────────────────────────────────────────────────────────────
      case 'UPDATE_NODE_PROPERTY': {
        this.mutateDraft((draft) => {
          const updatedScenes = draft.scenes.map((scene) => {
            const updatedLayers = this.updateLayerProperty(
              scene.layers,
              command.nodeId,
              command.path,
              command.value
            );
            return { ...scene, layers: updatedLayers };
          });
          return { ...draft, scenes: updatedScenes };
        });
        break;
      }

      case 'UPDATE_CONTENT_FIELD': {
        this.mutateDraft((draft) => ({
          ...draft,
          contentSchema: draft.contentSchema.map((f) =>
            f.id === command.fieldId ? { ...f, ...command.patch } : f
          ),
        }));
        break;
      }

      case 'ADD_CONTENT_FIELD': {
        this.mutateDraft((draft) => ({
          ...draft,
          contentSchema: [...draft.contentSchema, command.field],
        }));
        break;
      }

      case 'DELETE_CONTENT_FIELD': {
        this.mutateDraft((draft) => ({
          ...draft,
          contentSchema: draft.contentSchema.filter((f) => f.id !== command.fieldId),
        }));
        break;
      }

      case 'UPDATE_MEDIA_SLOT': {
        this.mutateDraft((draft) => ({
          ...draft,
          mediaSlots: draft.mediaSlots.map((s) =>
            s.id === command.slotId ? { ...s, ...command.patch } : s
          ),
        }));
        break;
      }

      case 'UPDATE_MODULE': {
        this.mutateDraft((draft) => ({
          ...draft,
          modules: draft.modules.map((m) =>
            m.id === command.moduleId ? { ...m, ...command.patch } : m
          ),
        }));
        break;
      }

      case 'UPDATE_DESIGN_TOKENS': {
        this.mutateDraft((draft) => ({
          ...draft,
          designTokens: {
            ...draft.designTokens,
            ...command.patch,
            colors: command.patch.colors
              ? { ...draft.designTokens.colors, ...command.patch.colors }
              : draft.designTokens.colors,
            typography: command.patch.typography
              ? { ...draft.designTokens.typography, ...command.patch.typography }
              : draft.designTokens.typography,
            spacing: command.patch.spacing
              ? { ...draft.designTokens.spacing, ...command.patch.spacing }
              : draft.designTokens.spacing,
            radius: command.patch.radius
              ? { ...draft.designTokens.radius, ...command.patch.radius }
              : draft.designTokens.radius,
            shadows: command.patch.shadows
              ? { ...draft.designTokens.shadows, ...command.patch.shadows }
              : draft.designTokens.shadows,
            motion: command.patch.motion
              ? { ...draft.designTokens.motion, ...command.patch.motion }
              : draft.designTokens.motion,
          },
        }));
        break;
      }

      case 'UPDATE_SCENE': {
        this.mutateDraft((draft) => {
          const exists = draft.scenes.some((s) => s.id === command.sceneId);
          if (exists) {
            return {
              ...draft,
              scenes: draft.scenes.map((s) =>
                s.id === command.sceneId ? { ...s, ...command.patch } : s
              ),
            };
          } else {
            return {
              ...draft,
              scenes: [...draft.scenes, { ...command.patch, id: command.sceneId } as any],
            };
          }
        });
        break;
      }

      case 'ADD_SCENE': {
        this.mutateDraft((draft) => {
          const sceneToAdd = {
            ...command.scene,
            order: draft.scenes.length + 1,
          };
          
          const updatedScenes = [...draft.scenes];
          const existingIdx = updatedScenes.findIndex((s) => s.id === sceneToAdd.id);
          if (existingIdx >= 0) {
            updatedScenes[existingIdx] = sceneToAdd;
          } else {
            updatedScenes.push(sceneToAdd);
          }

          // Atomically sync active page's sectionIds
          const pages = this.getOrCreatePages(draft);
          const activePageId = this.state.ui.activePageId || pages[0]?.id || 'page_home';
          const updatedPages = pages.map((p) => {
            if (p.id === activePageId) {
              const currentIds = p.sectionIds || [];
              return {
                ...p,
                sectionIds: currentIds.includes(sceneToAdd.id) ? currentIds : [...currentIds, sceneToAdd.id],
              };
            }
            return p;
          });

          return {
            ...draft,
            pages: updatedPages,
            scenes: updatedScenes,
          };
        });
        break;
      }

      case 'REORDER_SCENES': {
        this.mutateDraft((draft) => {
          const scenes = [...draft.scenes];
          const [moved] = scenes.splice(command.sourceIndex, 1);
          if (moved) {
            scenes.splice(command.targetIndex, 0, moved);
            scenes.forEach((s, idx) => {
              s.order = idx + 1;
            });
          }

          // Atomically sync active page's sectionIds
          const pages = this.getOrCreatePages(draft);
          const activePageId = this.state.ui.activePageId || pages[0]?.id || 'page_home';
          const updatedPages = pages.map((p) => {
            if (p.id === activePageId && moved) {
              const secIds = [...p.sectionIds];
              const cIdx = secIds.indexOf(moved.id);
              if (cIdx !== -1) {
                const [mId] = secIds.splice(cIdx, 1);
                if (mId) {
                  const targetSecIndex = Math.max(0, Math.min(command.targetIndex, secIds.length));
                  secIds.splice(targetSecIndex, 0, mId);
                }
              }
              return { ...p, sectionIds: secIds };
            }
            return p;
          });

          return { ...draft, scenes, pages: updatedPages };
        });
        break;
      }

      case 'TOGGLE_SCENE_VISIBILITY': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) =>
            s.id === command.sceneId ? { ...s, defaultVisible: !s.defaultVisible } : s
          ),
        }));
        break;
      }

      case 'DUPLICATE_SCENE': {
        this.mutateDraft((draft) => {
          const target = draft.scenes.find((s) => s.id === command.sceneId);
          if (!target) return draft;
          const cloned = JSON.parse(JSON.stringify(target));
          cloned.id = `scene_${Date.now()}`;
          cloned.name = `${target.name} (Copy)`;
          cloned.order = draft.scenes.length + 1;
          return { ...draft, scenes: [...draft.scenes, cloned] };
        });
        break;
      }

      case 'DELETE_SCENE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.filter((s) => s.id !== command.sceneId),
        }));
        break;
      }

      case 'CREATE_SCENE': {
        this.mutateDraft((draft) => {
          const newId = `scene_${Date.now()}`;
          let sceneGraph;

          // Map preset string to factory method
          switch (command.preset) {
            case 'hero': sceneGraph = TemplateFactory.buildHeroScene(); break;
            case 'portraits': sceneGraph = TemplateFactory.buildPortraitsScene(); break;
            case 'story': sceneGraph = TemplateFactory.buildStoryScene(); break;
            case 'countdown': sceneGraph = TemplateFactory.buildCountdownScene(); break;
            case 'itinerary': sceneGraph = TemplateFactory.buildItineraryScene(); break;
            case 'rsvp': sceneGraph = TemplateFactory.buildRSVPScene(); break;
            case 'gallery': sceneGraph = TemplateFactory.buildGalleryScene(); break;
            case 'wishes': sceneGraph = TemplateFactory.buildWishesScene(); break;
            case 'blank':
            default:
              sceneGraph = ScenePresets.blank();
              break;
          }

          return {
            ...draft,
            scenes: [
              ...draft.scenes,
              {
                id: newId,
                name: command.name,
                order: draft.scenes.length,
                defaultVisible: true,
                renderMode: 'graph',
                sceneGraph,
              } as any
            ]
          };
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // P18: FIRST-CLASS SECTION WORKFLOW COMMANDS
      // ─────────────────────────────────────────────────────────────
      case 'INSERT_SECTION': {
        this.mutateDraft((draft) => {
          const scenes = [...draft.scenes];
          const newSectionId = command.section.id || `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const newSection = {
            ...command.section,
            id: newSectionId,
            sceneGraph: this.rekeySceneGraph(command.section.sceneGraph),
          };
          const insertPos = (command.position !== undefined && command.position >= 0 && command.position <= scenes.length)
            ? command.position
            : scenes.length;
          scenes.splice(insertPos, 0, newSection);
          scenes.forEach((s, idx) => {
            s.order = idx + 1;
          });

          // Sync with active page
          const pages = this.getOrCreatePages(draft);
          const activePageId = this.state.ui.activePageId || pages[0]?.id || 'page_home';
          const updatedPages = pages.map((p) => {
            if (p.id === activePageId) {
              const secIds = [...p.sectionIds];
              const pPos = (command.position !== undefined && command.position >= 0 && command.position <= secIds.length)
                ? command.position
                : secIds.length;
              secIds.splice(pPos, 0, newSectionId);
              return { ...p, sectionIds: secIds };
            }
            return p;
          });

          return { ...draft, scenes, pages: updatedPages };
        });
        break;
      }

      case 'MOVE_SECTION': {
        this.mutateDraft((draft) => {
          const scenes = [...draft.scenes];
          const currentIndex = scenes.findIndex((s) => s.id === command.sectionId);
          if (currentIndex === -1) return draft;
          let targetIndex = command.targetIndex;
          if (targetIndex === undefined && command.direction) {
            targetIndex = command.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
          }
          if (targetIndex === undefined || targetIndex < 0 || targetIndex >= scenes.length || targetIndex === currentIndex) {
            return draft;
          }
          const moved = scenes.splice(currentIndex, 1)[0];
          if (moved) {
            scenes.splice(targetIndex, 0, moved);
          }
          scenes.forEach((s, idx) => {
            s.order = idx + 1;
          });

          // Sync with active page
          const pages = this.getOrCreatePages(draft);
          const activePageId = this.state.ui.activePageId || pages[0]?.id || 'page_home';
          const updatedPages = pages.map((p) => {
            if (p.id === activePageId) {
              const secIds = [...p.sectionIds];
              const cIdx = secIds.indexOf(command.sectionId);
              if (cIdx !== -1) {
                let tIdx = command.targetIndex;
                if (tIdx === undefined && command.direction) {
                  tIdx = command.direction === 'up' ? cIdx - 1 : cIdx + 1;
                }
                if (tIdx !== undefined && tIdx >= 0 && tIdx < secIds.length && tIdx !== cIdx) {
                  const mId = secIds.splice(cIdx, 1)[0];
                  if (mId) {
                    secIds.splice(tIdx, 0, mId);
                  }
                }
              }
              return { ...p, sectionIds: secIds };
            }
            return p;
          });

          return { ...draft, scenes, pages: updatedPages };
        });
        break;
      }

      case 'DUPLICATE_SECTION': {
        this.mutateDraft((draft) => {
          const scenes = [...draft.scenes];
          const currentIndex = scenes.findIndex((s) => s.id === command.sectionId);
          if (currentIndex === -1) return draft;
          const target = scenes[currentIndex];
          if (!target) return draft;
          const clonedSectionId = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const cloned = JSON.parse(JSON.stringify(target));
          cloned.id = clonedSectionId;
          cloned.name = `${target.name} (Copy)`;

          cloned.sceneGraph = this.rekeySceneGraph(cloned.sceneGraph);

          scenes.splice(currentIndex + 1, 0, cloned);
          scenes.forEach((s, idx) => {
            s.order = idx + 1;
          });

          // Sync with active page
          const pages = this.getOrCreatePages(draft);
          const activePageId = this.state.ui.activePageId || pages[0]?.id || 'page_home';
          const updatedPages = pages.map((p) => {
            if (p.id === activePageId) {
              const secIds = [...p.sectionIds];
              const pIdx = secIds.indexOf(command.sectionId);
              if (pIdx !== -1) {
                secIds.splice(pIdx + 1, 0, clonedSectionId);
              } else {
                secIds.push(clonedSectionId);
              }
              return { ...p, sectionIds: secIds };
            }
            return p;
          });

          return { ...draft, scenes, pages: updatedPages };
        });
        break;
      }

      case 'DELETE_SECTION': {
        this.mutateDraft((draft) => {
          if (draft.scenes.length <= 1) return draft;
          const scenes = draft.scenes.filter((s) => s.id !== command.sectionId);
          scenes.forEach((s, idx) => {
            s.order = idx + 1;
          });

          const pages = this.getOrCreatePages(draft);
          const updatedPages = pages.map((p) => ({
            ...p,
            sectionIds: p.sectionIds.filter((id) => id !== command.sectionId),
          }));

          return { ...draft, scenes, pages: updatedPages };
        });
        break;
      }

      case 'SWAP_SECTION_VARIANT': {
        this.mutateDraft((draft) => {
          const scnIdx = draft.scenes.findIndex((s) => s.id === command.sectionId);
          if (scnIdx === -1) return draft;
          const currentScene = draft.scenes[scnIdx]!;
          const updatedScene = TemplateContentMigrator.migrateSectionVariant(
            currentScene,
            command.variantBlockId
          );
          const scenes = [...draft.scenes];
          scenes[scnIdx] = updatedScene;
          return { ...draft, scenes };
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // P18: FIRST-CLASS PAGE MANAGEMENT COMMANDS
      // ─────────────────────────────────────────────────────────────
      case 'CREATE_PAGE': {
        const newPageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        let createdSections: TemplateSceneDefinition[] = [];

        this.mutateDraft((draft) => {
          const pages = this.getOrCreatePages(draft);
          let initialSectionIds: string[] = [];

          if (command.initialSections && command.initialSections.length > 0) {
            createdSections = command.initialSections.map((sec, idx) => ({
              ...sec,
              id: sec.id || `sec_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            }));
            initialSectionIds = createdSections.map((s) => s.id);
          } else {
            const allBlocks = WebSectionLibrary.getAll();
            const heroBlock = allBlocks.find((b) => b.category === 'Hero') || allBlocks[0];
            const heroScene = heroBlock
              ? heroBlock.createScene(`${command.name} Hero`)
              : (JSON.parse(JSON.stringify(draft.scenes[0])) as TemplateSceneDefinition);
            heroScene.id = `sec_${Date.now()}_hero`;
            heroScene.order = draft.scenes.length + 1;
            createdSections = [heroScene];
            initialSectionIds = [heroScene.id];
          }

          const newPage: TemplatePageDefinition = {
            id: newPageId,
            name: command.name,
            route: command.route.startsWith('/') ? command.route : `/${command.route}`,
            sectionIds: initialSectionIds,
            isHome: false,
          };

          return {
            ...draft,
            scenes: [...draft.scenes, ...createdSections],
            pages: [...pages, newPage],
          };
        });

        // Auto-switch to newly created page
        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            activePageId: newPageId,
            selection: {
              ...this.state.ui.selection,
              sceneId: createdSections[0]?.id || null,
              nodeId: null,
            },
          },
        };
        this.notify();
        break;
      }

      case 'SWITCH_PAGE': {
        const pages = this.getOrCreatePages(this.state.draft.schema);
        const targetPage = pages.find((p) => p.id === command.pageId) || pages[0];
        if (targetPage) {
          const firstSectionId = targetPage.sectionIds[0] || null;
          this.state = {
            ...this.state,
            ui: {
              ...this.state.ui,
              activePageId: targetPage.id,
              selection: {
                ...this.state.ui.selection,
                sceneId: firstSectionId,
                nodeId: null,
              },
            },
          };
          this.notify();
        }
        break;
      }

      case 'DELETE_PAGE': {
        this.mutateDraft((draft) => {
          const pages = this.getOrCreatePages(draft);
          if (pages.length <= 1) return draft;
          const targetPage = pages.find((p) => p.id === command.pageId);
          if (!targetPage || targetPage.isHome) return draft;

          const remainingPages = pages.filter((p) => p.id !== command.pageId);
          return {
            ...draft,
            pages: remainingPages,
          };
        });

        const currentActive = this.state.ui.activePageId;
        if (currentActive === command.pageId) {
          const pages = this.getOrCreatePages(this.state.draft.schema);
          const nextActive = pages[0]?.id || 'page_home';
          this.state = {
            ...this.state,
            ui: {
              ...this.state.ui,
              activePageId: nextActive,
            },
          };
          this.notify();
        }
        break;
      }

      case 'RENAME_PAGE': {
        this.mutateDraft((draft) => {
          const pages = this.getOrCreatePages(draft);
          const updatedPages = pages.map((p) => {
            if (p.id === command.pageId) {
              return {
                ...p,
                name: command.name,
                route: command.route !== undefined ? command.route : p.route,
              };
            }
            return p;
          });
          return { ...draft, pages: updatedPages };
        });
        break;
      }

      case 'MOVE_PAGE': {
        this.mutateDraft((draft) => {
          const pages = [...this.getOrCreatePages(draft)];
          if (
            command.sourceIndex < 0 ||
            command.sourceIndex >= pages.length ||
            command.targetIndex < 0 ||
            command.targetIndex >= pages.length ||
            command.sourceIndex === command.targetIndex
          ) {
            return draft;
          }
          const moved = pages.splice(command.sourceIndex, 1)[0];
          if (moved) {
            pages.splice(command.targetIndex, 0, moved);
          }
          return { ...draft, pages };
        });
        break;
      }

      case 'DUPLICATE_PAGE': {
        const newPageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.mutateDraft((draft) => {
          const pages = this.getOrCreatePages(draft);
          const targetPage = pages.find((p) => p.id === command.pageId);
          if (!targetPage) return draft;

          const clonedSectionIds: string[] = [];
          const clonedScenes: TemplateSceneDefinition[] = [];

          targetPage.sectionIds.forEach((secId) => {
            const orig = draft.scenes.find((s) => s.id === secId);
            if (orig) {
              const newSecId = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
              const clonedSec = JSON.parse(JSON.stringify(orig));
              clonedSec.id = newSecId;
              clonedSec.name = `${orig.name} (Copy)`;
              clonedSectionIds.push(newSecId);
              clonedScenes.push(clonedSec);
            }
          });

          const newPage: TemplatePageDefinition = {
            id: newPageId,
            name: `${targetPage.name} (Copy)`,
            route: `${targetPage.route}-copy`,
            sectionIds: clonedSectionIds,
            isHome: false,
          };

          const targetIndex = pages.findIndex((p) => p.id === command.pageId);
          const nextPages = [...pages];
          nextPages.splice(targetIndex + 1, 0, newPage);

          return {
            ...draft,
            scenes: [...draft.scenes, ...clonedScenes],
            pages: nextPages,
          };
        });

        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            activePageId: newPageId,
          },
        };
        this.notify();
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // P18: FIRST-CLASS ASSET MANAGEMENT COMMANDS
      // ─────────────────────────────────────────────────────────────
      case 'CREATE_ASSET': {
        this.mutateDraft((draft) => {
          const assets = draft.assets || [];
          return {
            ...draft,
            assets: [command.asset, ...assets.filter((a: any) => a.id !== command.asset.id)],
          };
        });
        break;
      }

      case 'DELETE_ASSET': {
        this.mutateDraft((draft) => {
          const assets = draft.assets || [];
          return {
            ...draft,
            assets: assets.filter((a: any) => a.id !== command.assetId),
          };
        });
        break;
      }

      case 'REPLACE_ASSET': {
        this.mutateDraft((draft) => {
          const assets = draft.assets || [];
          return {
            ...draft,
            assets: assets.map((a: any) => (a.id === command.assetId ? { ...a, url: command.newUrl } : a)),
          };
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // P18: FIRST-CLASS PROJECT & THEME COMMANDS
      // ─────────────────────────────────────────────────────────────
      case 'REPLACE_PROJECT': {
        this.mutateDraft(() => {
          return {
            ...command.project,
          };
        });
        break;
      }

      case 'APPLY_THEME': {
        this.mutateDraft((draft) => {
          return {
            ...draft,
            designTokens: {
              ...draft.designTokens,
              ...command.patch,
              colors: command.patch.colors ? { ...draft.designTokens.colors, ...command.patch.colors } : draft.designTokens.colors,
              typography: command.patch.typography ? { ...draft.designTokens.typography, ...command.patch.typography } : draft.designTokens.typography,
              spacing: command.patch.spacing ? { ...draft.designTokens.spacing, ...command.patch.spacing } : draft.designTokens.spacing,
              radius: command.patch.radius ? { ...draft.designTokens.radius, ...command.patch.radius } : draft.designTokens.radius,
              shadows: command.patch.shadows ? { ...draft.designTokens.shadows, ...command.patch.shadows } : draft.designTokens.shadows,
              motion: command.patch.motion ? { ...draft.designTokens.motion, ...command.patch.motion } : draft.designTokens.motion,
            },
          };
        });
        break;
      }

      case 'UPDATE_PUBLISHING_CONFIG': {
        this.mutateDraft((draft) => {
          return {
            ...draft,
            publishingConfig: {
              ...(draft.publishingConfig || {}),
              ...command.patch,
            },
          };
        });
        break;
      }

      case 'ADD_TEMPLATE_SECTION': {
        this.mutateDraft((draft) => {
          const scenes = [...draft.scenes];
          const existingIds = new Set(scenes.map((s) => s.id));
          const newSectionId = existingIds.has(command.section.id)
            ? `${command.section.id}_${Date.now()}`
            : (command.section.id || `section_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
          const newSection = {
            ...command.section,
            id: newSectionId,
            sceneGraph: this.rekeySceneGraph(command.section.sceneGraph),
          };

          const insertPos = (command.position !== undefined && command.position >= 0 && command.position <= scenes.length)
            ? command.position
            : scenes.length;
          scenes.splice(insertPos, 0, newSection);
          scenes.forEach((s, idx) => {
            s.order = idx + 1;
          });

          // Sync with active page
          const pages = this.getOrCreatePages(draft);
          const activePageId = this.state.ui.activePageId || pages[0]?.id || 'page_home';
          const updatedPages = pages.map((p) => {
            if (p.id === activePageId) {
              const secIds = [...p.sectionIds];
              const pPos = (command.position !== undefined && command.position >= 0 && command.position <= secIds.length)
                ? command.position
                : secIds.length;
              secIds.splice(pPos, 0, newSectionId);
              return { ...p, sectionIds: secIds };
            }
            return p;
          });

          return { ...draft, scenes, pages: updatedPages };
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // SCENE GRAPH MUTATIONS
      // ─────────────────────────────────────────────────────────────
      case 'SG_CREATE_NODE': {
        let createdNodeId: string | null = null;
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId) return s;
            const currentGraph =
              s.sceneGraph && Object.keys(s.sceneGraph.nodes || {}).length > 0
                ? s.sceneGraph
                : ScenePresets.blank();

            const CONTAINER_KINDS = ['frame', 'container', 'stack', 'grid', 'group', 'component', 'repeater', 'conditional'];
            let parentId = command.parentId || currentGraph.rootNodeId || null;
            let insertIndex = command.insertIndex;

            if (parentId && currentGraph.nodes[parentId]) {
              const targetNode = currentGraph.nodes[parentId];
              if (targetNode && !CONTAINER_KINDS.includes(targetNode.kind)) {
                // If target is leaf (e.g. text, image), insert right after it in its container parent!
                const realParent = targetNode.parentId && currentGraph.nodes[targetNode.parentId]
                  ? targetNode.parentId
                  : currentGraph.rootNodeId || null;
                if (realParent && currentGraph.nodes[realParent]) {
                  const siblings = currentGraph.nodes[realParent]?.children || [];
                  const siblingIdx = siblings.indexOf(targetNode.id);
                  if (siblingIdx !== -1) {
                    insertIndex = siblingIdx + 1;
                  }
                }
                parentId = realParent;
              }
            }

            const { graph, newNodeId } = SceneGraphEngine.createNode(
              currentGraph,
              command.kind,
              parentId,
              command.defaults,
              insertIndex
            );
            createdNodeId = newNodeId;
            return { ...s, sceneGraph: graph, renderMode: 'graph' };
          }),
        }));

        if (createdNodeId) {
          this.state = {
            ...this.state,
            ui: {
              ...this.state.ui,
              selection: {
                ...this.state.ui.selection,
                sceneId: command.sceneId,
                nodeId: createdNodeId,
                kind: command.kind as any,
              },
            },
          };
          this.notify();
        }
        break;
      }
      case 'SG_SET_LAYOUT_MODE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.nodeId]: { ...node, layoutMode: command.layoutMode },
                },
              },
            };
          }),
        }));
        break;
      }
      case 'SG_TOGGLE_LAYOUT_MODE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return {
              ...s,
              sceneGraph: SceneGraphEngine.toggleLayoutMode(s.sceneGraph, command.nodeId),
            };
          }),
        }));
        break;
      }
      case 'SG_ALIGN_NODES': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return {
              ...s,
              sceneGraph: SceneGraphEngine.alignNodes(s.sceneGraph, command.nodeIds, command.alignment),
            };
          }),
        }));
        break;
      }
      case 'SG_DISTRIBUTE_NODES': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return {
              ...s,
              sceneGraph: SceneGraphEngine.distributeNodes(s.sceneGraph, command.nodeIds, command.axis),
            };
          }),
        }));
        break;
      }
      case 'SG_UPDATE_LAYOUT_CONFIG': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.nodeId]: {
                    ...node,
                    layoutConfig: {
                      ...(node.layoutConfig || {}),
                      ...command.patch,
                    },
                  },
                },
              },
            };
          }),
        }));
        break;
      }
      case 'SG_SET_CHILD_SIZING': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const parent = s.sceneGraph.nodes[command.parentId];
            if (!parent || !parent.layoutConfig) return s;
            
            const currentChildOverrides = (parent.layoutConfig as any).childOverrides || {};
            
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.parentId]: {
                    ...parent,
                    layoutConfig: {
                      ...parent.layoutConfig,
                      childOverrides: {
                        ...currentChildOverrides,
                        [command.childId]: {
                          ...(currentChildOverrides[command.childId] || {}),
                          ...command.sizingOptions,
                        },
                      },
                    },
                  },
                },
              },
            };
          }),
        }));
        break;
      }
      case 'SG_DELETE_NODE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.deleteNode(s.sceneGraph, command.nodeId) };
          }),
        }));
        break;
      }
      case 'SG_MOVE_NODE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.moveNode(s.sceneGraph, command.nodeId, command.newParentId, command.index) };
          }),
        }));
        break;
      }
      case 'SG_DUPLICATE_NODE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const { graph } = SceneGraphEngine.duplicateNode(s.sceneGraph, command.nodeId);
            return { ...s, sceneGraph: graph };
          }),
        }));
        break;
      }
      case 'SG_UPDATE_GEOMETRY': {
        this.mutateDraft((draft) => {
          let masterIdToPropagate: string | null = null;
          const nextScenes = draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;

            if (node.component?.isMaster) {
              masterIdToPropagate = node.component.masterComponentId || node.id;
            }

            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.nodeId]: {
                    ...node,
                    geometry: { ...node.geometry, ...command.patch },
                  } as SceneGraphNode
                }
              }
            };
          });

          const nextDraft = { ...draft, scenes: nextScenes };
          if (masterIdToPropagate) {
            this.propagateMasterComponentUpdate(nextDraft, masterIdToPropagate, 'geometry', command.patch);
          }
          return nextDraft;
        });
        break;
      }
      case 'SG_UPDATE_NODE_PROPERTY': {
        this.mutateDraft((draft) => {
          let masterIdToPropagate: string | null = null;
          const nextScenes = draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;

            if (node.component?.isMaster) {
              masterIdToPropagate = node.component.masterComponentId || node.id;
            }

            const isInstance = Boolean(node.component?.masterComponentId && !node.component?.isMaster);
            const nextOverrides = isInstance ? { ...(node.component?.instanceOverrides || {}) } : undefined;
            if (isInstance && nextOverrides) {
              for (const [k, v] of Object.entries(command.patch)) {
                if (k !== 'id' && k !== 'component' && k !== 'parentId' && k !== 'children') {
                  nextOverrides[k] = v;
                }
              }
            }
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.nodeId]: {
                    ...node,
                    ...command.patch,
                    ...(isInstance ? {
                      component: {
                        ...(node.component || {}),
                        instanceOverrides: nextOverrides,
                      }
                    } : {})
                  },
                },
              },
            };
          });

          const nextDraft = { ...draft, scenes: nextScenes };
          if (masterIdToPropagate) {
            this.propagateMasterComponentUpdate(nextDraft, masterIdToPropagate, 'property', command.patch);
          }
          return nextDraft;
        });
        break;
      }
      case 'SG_REORDER_NODE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const sg = s.sceneGraph;
            const node = sg.nodes[command.nodeId];
            if (!node) return s;
            
            let arr: string[] = [];
            if (node.parentId) {
              const parent = sg.nodes[node.parentId];
              if (parent && parent.children) {
                arr = parent.children;
              }
            } else {
              arr = sg.renderOrder;
            }
            
            const idx = arr.indexOf(command.nodeId);
            if (idx === -1) return s;
            
            const newArr = [...arr];
            if (command.direction === 'up' && idx > 0) {
              const temp = newArr[idx - 1];
              if (temp !== undefined) {
                newArr[idx - 1] = newArr[idx] as string;
                newArr[idx] = temp;
              }
            } else if (command.direction === 'down' && idx < newArr.length - 1) {
              const temp = newArr[idx + 1];
              if (temp !== undefined) {
                newArr[idx + 1] = newArr[idx] as string;
                newArr[idx] = temp;
              }
            } else {
              return s;
            }
            
            if (node.parentId) {
              const p = sg.nodes[node.parentId];
              if (!p) return s;
              return {
                ...s,
                sceneGraph: {
                  ...sg,
                  nodes: {
                    ...sg.nodes,
                    [node.parentId]: { ...p, children: newArr }
                  }
                }
              };
            } else {
              return {
                ...s,
                sceneGraph: {
                  ...sg,
                  renderOrder: newArr
                }
              };
            }
          }),
        }));
        break;
      }
      case 'SG_UPDATE_STYLE': {
        this.mutateDraft((draft) => {
          let masterIdToPropagate: string | null = null;
          const nextScenes = draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;

            if (node.component?.isMaster) {
              masterIdToPropagate = node.component.masterComponentId || node.id;
            }

            const isInstance = Boolean(node.component?.masterComponentId && !node.component?.isMaster);
            const nextOverrides = isInstance ? { ...(node.component?.instanceOverrides || {}) } : undefined;
            if (isInstance && nextOverrides) {
              for (const k of Object.keys(command.patch)) {
                nextOverrides[`style.${k}`] = (command.patch as any)[k];
              }
            }
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.nodeId]: {
                    ...node,
                    style: { ...node.style, ...command.patch },
                    ...(isInstance ? {
                      component: {
                        ...(node.component || {}),
                        instanceOverrides: nextOverrides,
                      }
                    } : {})
                  } as SceneGraphNode
                }
              }
            };
          });

          const nextDraft = { ...draft, scenes: nextScenes };
          if (masterIdToPropagate) {
            this.propagateMasterComponentUpdate(nextDraft, masterIdToPropagate, 'style', command.patch);
          }
          return nextDraft;
        });
        break;
      }
      case 'SG_UPDATE_MOTION': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const sg = s.sceneGraph;
            const node = sg.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...sg,
                nodes: {
                  ...sg.nodes,
                  [command.nodeId]: {
                    ...node,
                    motion: { ...(node.motion || {}), ...command.patch }
                  }
                }
              }
            };
          }),
        }));
        break;
      }
      case 'SG_UPDATE_INTERACTION': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const sg = s.sceneGraph;
            const node = sg.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...sg,
                nodes: {
                  ...sg.nodes,
                  [command.nodeId]: {
                    ...node,
                    interactions: command.interactions
                  }
                }
              }
            };
          }),
        }));
        break;
      }
      case 'SG_GROUP_NODES': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const { graph } = SceneGraphEngine.groupNodes(s.sceneGraph, command.nodeIds);
            return { ...s, sceneGraph: graph };
          }),
        }));
        break;
      }
      case 'SG_UNGROUP': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.ungroupNode(s.sceneGraph, command.groupId) };
          }),
        }));
        break;
      }
      case 'SG_DETACH_INSTANCE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return {
              ...s,
              sceneGraph: SceneGraphEngine.detachInstance(s.sceneGraph, command.nodeId),
            };
          }),
        }));
        break;
      }
      case 'SG_CREATE_COMPONENT': {
        this.mutateDraft((draft) => {
          let createdMasterNode: any = null;
          let masterCompId = command.componentId || '';

          const nextScenes = draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            if (!masterCompId) {
              masterCompId = `comp_${(command.name || node.name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`;
            }
            const updatedGraph = SceneGraphEngine.createMasterComponent(s.sceneGraph, command.nodeId, masterCompId, command.name);
            createdMasterNode = updatedGraph.nodes[command.nodeId] || null;
            return {
              ...s,
              sceneGraph: updatedGraph,
            };
          });

          const nextMasterComponents = { ...(draft.masterComponents || {}) };
          if (createdMasterNode && masterCompId) {
            nextMasterComponents[masterCompId] = JSON.parse(JSON.stringify(createdMasterNode));
          }

          return {
            ...draft,
            masterComponents: nextMasterComponents,
            scenes: nextScenes,
          };
        });
        break;
      }
      case 'SG_INSTANTIATE_COMPONENT': {
        this.mutateDraft((draft) => {
          const targetBlueprint = draft.masterComponents?.[command.masterNodeId];
          return {
            ...draft,
            scenes: draft.scenes.map((s) => {
              if (s.id !== command.sceneId || !s.sceneGraph) return s;
              const targetParent = command.targetParentId || s.sceneGraph.rootNodeId;
              const { graph } = SceneGraphEngine.instantiateComponent(
                s.sceneGraph,
                command.masterNodeId,
                targetParent,
                command.variantId,
                targetBlueprint
              );
              return { ...s, sceneGraph: graph };
            }),
          };
        });
        break;
      }
      case 'SG_SET_INSTANCE_OVERRIDE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return {
              ...s,
              sceneGraph: SceneGraphEngine.setInstanceOverride(s.sceneGraph, command.instanceNodeId, command.overrides),
            };
          }),
        }));
        break;
      }
      case 'SG_RESET_INSTANCE_OVERRIDES': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return {
              ...s,
              sceneGraph: SceneGraphEngine.resetInstanceOverrides(
                s.sceneGraph,
                command.instanceNodeId,
                draft.masterComponents,
                command.propertyKey
              ),
            };
          }),
        }));
        break;
      }
      case 'SG_PUSH_INSTANCE_TO_MASTER': {
        this.mutateDraft((draft) => {
          return SceneGraphEngine.pushInstanceToMaster(
            draft,
            command.sceneId,
            command.instanceNodeId
          );
        });
        break;
      }
      case 'SG_DELETE_MASTER_COMPONENT': {
        this.mutateDraft((draft) => {
          const nextMasterComponents = { ...(draft.masterComponents || {}) };
          delete nextMasterComponents[command.masterComponentId];
          return {
            ...draft,
            masterComponents: nextMasterComponents,
          };
        });
        break;
      }
      case 'SG_SET_REPEATER': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.nodeId]: { ...node, repeater: command.repeater },
                },
              },
            };
          }),
        }));
        break;
      }
      case 'SG_SET_CONDITIONAL': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.nodeId]: { ...node, conditional: command.conditional },
                },
              },
            };
          }),
        }));
        break;
      }
      // ─────────────────────────────────────────────────────────────
      // P13: STRUCTURAL FREEDOM COMMANDS
      // ─────────────────────────────────────────────────────────────
      case 'SG_WRAP_NODES': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const { graph } = SceneGraphEngine.wrapInContainer(s.sceneGraph, command.nodeIds, command.wrapperKind, command.wrapperDefaults);
            return { ...s, sceneGraph: graph };
          }),
        }));
        break;
      }
      case 'SG_UNWRAP': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.unwrapChildren(s.sceneGraph, command.containerId) };
          }),
        }));
        break;
      }
      case 'SG_REPLACE_KIND': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.replaceNodeKind(s.sceneGraph, command.nodeId, command.newKind) };
          }),
        }));
        break;
      }
      case 'SG_NEST_INTO': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.nestNodeInto(s.sceneGraph, command.nodeId, command.targetId) };
          }),
        }));
        break;
      }
      case 'SG_FLATTEN': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.flattenChildren(s.sceneGraph, command.nodeId) };
          }),
        }));
        break;
      }
      case 'SG_SWAP_NODES': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.swapNodes(s.sceneGraph, command.nodeIdA, command.nodeIdB) };
          }),
        }));
        break;
      }
      case 'SG_MULTI_DELETE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.multiDelete(s.sceneGraph, command.nodeIds) };
          }),
        }));
        break;
      }
      case 'SG_COPY_NODES': {
        // Copy is a side-effect-only operation (populates clipboard), no draft mutation
        const copyScene = this.state.draft.schema.scenes.find(s => s.id === command.sceneId);
        if (copyScene?.sceneGraph) {
          SceneGraphClipboard.copy(copyScene.sceneGraph, command.nodeIds, command.sceneId);
        }
        break;
      }
      case 'SG_CUT_NODES': {
        const cutScene = this.state.draft.schema.scenes.find(s => s.id === command.sceneId);
        if (cutScene?.sceneGraph) {
          SceneGraphClipboard.copy(cutScene.sceneGraph, command.nodeIds, command.sceneId);
        }
        // Then delete the nodes
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.multiDelete(s.sceneGraph, command.nodeIds) };
          }),
        }));
        break;
      }
      case 'SG_PASTE_NODES': {
        if (!SceneGraphClipboard.hasClipboard()) break;
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const { graph } = SceneGraphClipboard.paste(s.sceneGraph, command.targetParentId, command.insertIndex);
            return { ...s, sceneGraph: graph };
          }),
        }));
        break;
      }
      case 'SG_PASTE_REPLACE': {
        if (!SceneGraphClipboard.hasClipboard()) break;
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const { graph } = SceneGraphClipboard.pasteToReplace(s.sceneGraph, command.targetNodeId);
            return { ...s, sceneGraph: graph };
          }),
        }));
        break;
      }
      case 'SG_PASTE_STYLES': {
        if (!SceneGraphClipboard.hasClipboard()) break;
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const graph = SceneGraphClipboard.pasteStylesOnly(s.sceneGraph, command.targetNodeId);
            return { ...s, sceneGraph: graph };
          }),
        }));
        break;
      }
      case 'SG_PASTE_AT_COORDINATES': {
        if (!SceneGraphClipboard.hasClipboard()) break;
        const defaultParent = this.state.draft.schema.scenes.find(s => s.id === command.sceneId)?.sceneGraph?.rootNodeId || 'root';
        const targetParentId = command.targetParentId || defaultParent;
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const { graph } = SceneGraphClipboard.pasteAtCoordinates(s.sceneGraph, targetParentId, command.x, command.y);
            return { ...s, sceneGraph: graph };
          }),
        }));
        break;
      }
      case 'SG_REORDER_NODE_FRONT': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node || !node.parentId) return s;
            const parent = s.sceneGraph.nodes[node.parentId];
            if (!parent) return s;
            const idx = parent.children.indexOf(command.nodeId);
            if (idx === -1 || idx === parent.children.length - 1) return s;
            return { ...s, sceneGraph: SceneGraphEngine.reorderChildren(s.sceneGraph, node.parentId, idx, parent.children.length - 1) };
          }),
        }));
        break;
      }
      case 'SG_REORDER_NODE_BACK': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node || !node.parentId) return s;
            const parent = s.sceneGraph.nodes[node.parentId];
            if (!parent) return s;
            const idx = parent.children.indexOf(command.nodeId);
            if (idx <= 0) return s;
            return { ...s, sceneGraph: SceneGraphEngine.reorderChildren(s.sceneGraph, node.parentId, idx, 0) };
          }),
        }));
        break;
      }
      case 'SELECT_ALL_NODES': {
        const scene = this.state.draft.schema.scenes.find(s => s.id === command.sceneId);
        if (scene?.sceneGraph) {
          const sg = scene.sceneGraph;
          const allNodeIds = Object.keys(sg.nodes).filter(id => id !== sg.rootNodeId);
          this.state = {
            ...this.state,
            ui: {
              ...this.state.ui,
              selection: {
                ...this.state.ui.selection,
                sceneId: command.sceneId,
                nodeId: allNodeIds[0] || null,
              },
            },
          };
          this.notify();
        }
        break;
      }
      case 'SG_INSERT_SUBTREE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.insertSubtree(s.sceneGraph, command.subtreeNodes, command.subtreeRootIds, command.targetParentId, command.insertIndex) };
          }),
        }));
        break;
      }
      case 'SG_LOCK_NODE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: { ...s.sceneGraph.nodes, [command.nodeId]: { ...node, locked: command.locked } as SceneGraphNode }
              }
            };
          }),
        }));
        break;
      }
      case 'SG_HIDE_NODE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: { ...s.sceneGraph.nodes, [command.nodeId]: { ...node, hidden: command.hidden } as SceneGraphNode }
              }
            };
          }),
        }));
        break;
      }
      case 'SG_REORDER': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            return { ...s, sceneGraph: SceneGraphEngine.reorderChildren(s.sceneGraph, command.parentId, command.fromIndex, command.toIndex) };
          }),
        }));
        break;
      }
      case 'SG_SET_RESPONSIVE_OVERRIDE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            const responsive = { ...node.responsive };
            if (command.device === 'tablet' || command.device === 'mobile') {
              const currentDev = (responsive as any)[command.device] || {};
              const patchAny = command.patch as any;
              const mergedStyle = patchAny.style
                ? { ...(currentDev.style || {}), ...patchAny.style }
                : currentDev.style;
              const mergedGeom = patchAny.geometry
                ? { ...(currentDev.geometry || {}), ...patchAny.geometry }
                : currentDev.geometry;
              
              (responsive as any)[command.device] = {
                ...currentDev,
                ...command.patch,
                ...(mergedStyle ? { style: mergedStyle } : {}),
                ...(mergedGeom ? { geometry: mergedGeom } : {}),
              };
            }
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: { ...s.sceneGraph.nodes, [command.nodeId]: { ...node, responsive } as SceneGraphNode }
              }
            };
          }),
        }));
        break;
      }
      case 'SG_RESET_RESPONSIVE_OVERRIDE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            const responsive = { ...node.responsive };
            if (command.device === 'tablet' || command.device === 'mobile') {
              if (!command.propertyKey) {
                delete (responsive as any)[command.device];
              } else {
                const currentDev = { ...((responsive as any)[command.device] || {}) };
                const prop = command.propertyKey;
                delete currentDev[prop];
                if (currentDev.style) {
                  const sCopy = { ...currentDev.style };
                  delete sCopy[prop];
                  if (sCopy.typography) {
                    const typo = { ...sCopy.typography };
                    delete typo[prop];
                    sCopy.typography = typo;
                  }
                  currentDev.style = sCopy;
                }
                if (currentDev.geometry) {
                  const gCopy = { ...currentDev.geometry };
                  delete gCopy[prop];
                  currentDev.geometry = gCopy;
                }
                if (currentDev.typography) {
                  const tCopy = { ...currentDev.typography };
                  delete tCopy[prop];
                  currentDev.typography = tCopy;
                }
                (responsive as any)[command.device] = currentDev;
              }
            }
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: { ...s.sceneGraph.nodes, [command.nodeId]: { ...node, responsive } as SceneGraphNode }
              }
            };
          }),
        }));
        break;
      }
      case 'SG_SET_BINDING': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId || !s.sceneGraph) return s;
            const node = s.sceneGraph.nodes[command.nodeId];
            if (!node) return s;
            return {
              ...s,
              sceneGraph: {
                ...s.sceneGraph,
                nodes: {
                  ...s.sceneGraph.nodes,
                  [command.nodeId]: { ...node, binding: command.binding ? { ...command.binding } : undefined } as SceneGraphNode
                }
              }
            };
          }),
        }));
        break;
      }

      case 'SET_RESPONSIVE_OVERRIDE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId) return s;
            const currentRule = s.layoutRules[command.viewport] || s.layoutRules.desktop;
            return {
              ...s,
              layoutRules: {
                ...s.layoutRules,
                [command.viewport]: {
                  ...currentRule,
                  ...command.patch,
                  isOverridden: command.viewport !== 'desktop',
                },
              },
            };
          }),
        }));
        break;
      }

      case 'RESET_RESPONSIVE_OVERRIDE': {
        this.mutateDraft((draft) => ({
          ...draft,
          scenes: draft.scenes.map((s) => {
            if (s.id !== command.sceneId) return s;
            return {
              ...s,
              layoutRules: {
                ...s.layoutRules,
                [command.viewport]: {
                  ...s.layoutRules.desktop,
                  isOverridden: false,
                },
              },
            };
          }),
        }));
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // UI STATE COMMANDS
      // ─────────────────────────────────────────────────────────────
      case 'SET_DEVICE': {
        this.state = {
          ...this.state,
          ui: { ...this.state.ui, activeDevice: command.device, device: command.device as any },
        };
        this.recomputeSnapshot();
        break;
      }

      case 'SET_MODE': {
        this.state = {
          ...this.state,
          ui: { ...this.state.ui, mode: command.mode },
        };
        this.notify();
        break;
      }

      case 'SET_ACTIVE_PANEL': {
        const isCanvasTab =
          command.panel === 'scenes' ||
          command.panel === 'responsive' ||
          command.panel === 'motion';

        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            activePanel: command.panel,
            centerViewMode: isCanvasTab ? 'canvas' : 'panel',
          },
        };
        this.notify();
        break;
      }

      case 'SET_CENTER_VIEW_MODE': {
        this.state = {
          ...this.state,
          ui: { ...this.state.ui, centerViewMode: command.mode },
        };
        this.notify();
        break;
      }

      case 'SET_INSPECT_MODE': {
        this.state = {
          ...this.state,
          ui: { ...this.state.ui, inspectMode: command.enabled },
        };
        this.notify();
        break;
      }

      case 'TOGGLE_COMMAND_PALETTE': {
        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            isCommandPaletteOpen:
              command.isOpen !== undefined ? command.isOpen : !this.state.ui.isCommandPaletteOpen,
          },
        };
        this.notify();
        break;
      }

      case 'TOGGLE_GROUP_EXPAND': {
        this.state = {
          ...this.state,
          ui: {
            ...this.state.ui,
            expandedGroups: {
              ...this.state.ui.expandedGroups,
              [command.groupId]: !this.state.ui.expandedGroups[command.groupId],
            },
          },
        };
        this.notify();
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // RUNTIME SIMULATION
      // ─────────────────────────────────────────────────────────────
      case 'SET_CUSTOMER_OVERRIDE': {
        this.state = {
          ...this.state,
          runtime: {
            ...this.state.runtime,
            customerOverrides: { ...this.state.runtime.customerOverrides, ...command.patch },
          },
        };
        this.recomputeSnapshot();
        break;
      }

      case 'RESET_CUSTOMER_OVERRIDES': {
        this.state = {
          ...this.state,
          runtime: {
            ...this.state.runtime,
            customerOverrides: {},
          },
        };
        this.recomputeSnapshot();
        break;
      }

      case 'TOGGLE_STRESS_TEST': {
        this.state = {
          ...this.state,
          ui: { ...this.state.ui, isStressTest: !this.state.ui.isStressTest },
        };
        this.recomputeSnapshot();
        break;
      }

      case 'REPLAY_MOTION': {
        this.state = {
          ...this.state,
          runtime: {
            ...this.state.runtime,
            motionReplayKey: this.state.runtime.motionReplayKey + 1,
          },
        };
        this.notify();
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // TRANSACTIONS & HISTORY (Prompt #11 & #22)
      // ─────────────────────────────────────────────────────────────
      case 'BEGIN_TRANSACTION': {
        this.historyManager.beginTransaction(this.state.draft.schema, command.label);
        this.state = {
          ...this.state,
          history: this.historyManager.getState(),
        };
        this.notify();
        break;
      }

      case 'COMMIT_TRANSACTION': {
        this.historyManager.commitTransaction();
        this.state = {
          ...this.state,
          history: this.historyManager.getState(),
        };
        this.notify();
        break;
      }

      case 'CANCEL_TRANSACTION': {
        const rollback = this.historyManager.cancelTransaction();
        if (rollback) {
          this.mutateDraft(() => rollback, false);
        }
        break;
      }

      case 'UNDO': {
        const previous = this.historyManager.undo(this.state.draft.schema);
        if (previous) {
          const nextSnapshot = TemplateEditorResolver.resolveTemplateSnapshot(
            previous,
            this.state.ui.activeDevice,
            this.state.runtime.customerOverrides,
            this.state.ui.isStressTest
          );
          this.state = {
            ...this.state,
            draft: { schema: previous },
            history: this.historyManager.getState(),
            runtime: { ...this.state.runtime, resolvedSnapshot: nextSnapshot },
          };
          this.persistenceManager.saveImmediate(previous);
          this.notify();
        }
        break;
      }

      case 'REDO': {
        const next = this.historyManager.redo(this.state.draft.schema);
        if (next) {
          const nextSnapshot = TemplateEditorResolver.resolveTemplateSnapshot(
            next,
            this.state.ui.activeDevice,
            this.state.runtime.customerOverrides,
            this.state.ui.isStressTest
          );
          this.state = {
            ...this.state,
            draft: { schema: next },
            history: this.historyManager.getState(),
            runtime: { ...this.state.runtime, resolvedSnapshot: nextSnapshot },
          };
          this.persistenceManager.saveImmediate(next);
          this.notify();
        }
        break;
      }

      case 'SET_PERSISTENCE_STATUS': {
        this.state = {
          ...this.state,
          persistence: {
            ...this.state.persistence,
            status: command.status,
            error: command.error || null,
          },
        };
        this.notify();
        break;
      }

      case 'LOAD_SCHEMA': {
        const migratedSchema = LegacyTemplateMigrator.migrateTemplate(command.schema);
        const loadedSnapshot = TemplateEditorResolver.resolveTemplateSnapshot(
          migratedSchema,
          this.state.ui.activeDevice,
          {},
          false
        );
        this.state = {
          ...this.state,
          draft: { schema: migratedSchema },
          runtime: {
            ...this.state.runtime,
            resolvedSnapshot: loadedSnapshot,
          },
        };
        this.notify();
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DOM & LAYER RECURSIVE UTILITIES
  // ─────────────────────────────────────────────────────────────
  private findLayer(layers: any[], id: string): any {
    for (const l of layers) {
      if (l.id === id) return l;
      if (l.children) {
        const found = this.findLayer(l.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private updateLayerProperty(
    layers: any[],
    targetId: string,
    path: string,
    value: unknown
  ): any[] {
    return layers.map((layer) => {
      if (layer.id === targetId) {
        const cloned = { ...layer };
        this.setDeepProperty(cloned, path, value);
        return cloned;
      }
      if (layer.children) {
        return {
          ...layer,
          children: this.updateLayerProperty(layer.children, targetId, path, value),
        };
      }
      return layer;
    });
  }

  private setDeepProperty(obj: any, path: string, value: unknown): void {
    const parts = path.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!curr[part] || typeof curr[part] !== 'object') {
        curr[part] = {};
      }
      curr = curr[part];
    }
    curr[parts[parts.length - 1]!] = value;
  }
}
