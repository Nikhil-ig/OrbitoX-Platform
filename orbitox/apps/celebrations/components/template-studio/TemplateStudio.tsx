'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TemplateSchema,
  DeviceBreakpoint,
  OrientationMode,
  TemplateStatus,
  ContentFieldDefinition,
  TemplateSceneDefinition,
  TemplateDesignTokens,
} from './types/TemplateSchema';
import { TemplateSchemaService } from './services/TemplateSchemaService';
import { TemplateStudioTopBar } from './components/TemplateStudioTopBar';
import { TemplateStudioLeftRail, TemplateStudioNavTab } from './components/TemplateStudioLeftRail';
import { TemplateStudioCanvas } from './components/TemplateStudioCanvas';
import { TemplateStudioInspector } from './components/TemplateStudioInspector';
import { CustomerStudioSimulator } from './components/CustomerStudioSimulator';
import { CommandPalette } from './components/CommandPalette';
import { SmartDesignAssistance } from './services/SmartDesignAssistance';
import { SmartDesignAssistantModal } from './components/SmartDesignAssistantModal';
import { CreateSceneWizard } from './components/CreateSceneWizard';
import {
  TemplateEditorProvider,
  useTemplateEditor,
} from './engine';

// Panels
import { OverviewPanel } from './panels/OverviewPanel';
import { ExperiencePanel } from './panels/ExperiencePanel';
import { ContentSchemaPanel } from './panels/ContentSchemaPanel';
import { DesignSystemPanel } from './panels/DesignSystemPanel';
import { ResponsivePanel } from './panels/ResponsivePanel';
import { MotionStudioPanel } from './panels/MotionStudioPanel';
import { InteractionsPanel } from './panels/InteractionsPanel';
import { ModulesPanel } from './panels/ModulesPanel';
import { CustomizationPanel } from './panels/CustomizationPanel';
import { AccessibilityPanel } from './panels/AccessibilityPanel';
import { PreviewStressPanel } from './panels/PreviewStressPanel';
import { VersionsPanel } from './panels/VersionsPanel';
import { PublishPanel } from './panels/PublishPanel';
import { Monitor, Layers } from 'lucide-react';

export function TemplateStudio({ slug }: { slug?: string } = {}) {
  const searchParams = useSearchParams();
  const templateSlug = slug || searchParams.get('template') || searchParams.get('slug') || 'celestial-odyssey';

  const initialSchema = useMemo(() => {
    return TemplateSchemaService.getSchema(templateSlug);
  }, [templateSlug]);

  return (
    <TemplateEditorProvider initialSchema={initialSchema}>
      <TemplateStudioContent />
    </TemplateEditorProvider>
  );
}

function TemplateStudioContent() {
  const { state, controller } = useTemplateEditor();
  const [orientation, setOrientation] = useState<OrientationMode>('portrait');
  const [isSmartAssistantOpen, setIsSmartAssistantOpen] = useState(false);
  const [isCreateSceneOpen, setIsCreateSceneOpen] = useState(false);

  const schema = state.draft.schema;
  const resolvedState = state.runtime.resolvedSnapshot;
  const viewport = state.ui.activeDevice;
  const previewMode: 'admin' | 'customer' | 'guest' =
    state.ui.mode === 'design' ? 'admin' : (state.ui.mode as 'customer' | 'guest');
  const isStressTest = state.ui.isStressTest;
  const activeTab = state.ui.activePanel;
  const selectedSceneId = state.ui.selection.sceneId;
  const selectedLayerId = state.ui.selection.nodeId;
  const selectedFieldKey = state.ui.selection.fieldId;
  const centerViewMode = state.ui.centerViewMode;
  const saveStatus = state.persistence.status === 'error' ? 'unsaved' : state.persistence.status;
  const isCommandPaletteOpen = state.ui.isCommandPaletteOpen;
  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;

  const smartSuggestions = useMemo(() => {
    return SmartDesignAssistance.analyze(schema, selectedSceneId || schema.scenes[0]?.id || '', viewport);
  }, [schema, selectedSceneId, viewport]);

  // Global Keyboard Shortcuts (⌘K, ⌘Z, ⇧⌘Z, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        controller.toggleCommandPalette();
      }
      // ⌘Z or Ctrl+Z: Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          controller.redo();
        } else {
          e.preventDefault();
          controller.undo();
        }
      }
      // Escape: Close overlay / deselect layer
      if (e.key === 'Escape') {
        controller.toggleCommandPalette(false);
        controller.clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controller]);

  // Selection Handlers via Central Controller
  const handleSelectScene = (sceneId: string) => {
    controller.selectScene(sceneId);
  };

  const handleSelectLayer = (layerId: string, sceneId?: string, kind?: any) => {
    controller.selectNode(layerId, sceneId, kind);
  };

  const handleSelectField = (fieldKey: string) => {
    controller.selectField(fieldKey);
  };

  const handleSelectNavTab = (tab: TemplateStudioNavTab) => {
    controller.setActivePanel(tab);
  };

  const handlePublish = () => {
    const result = controller.publish();
    if (result.success && result.schema) {
      alert(`🎉 Template ${result.schema.name} (v${result.schema.activeVersion}) successfully published to production!`);
    } else {
      alert(`⚠️ Publish failed:\n${result.error || 'Health checks or security validation did not pass'}`);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: '#040711',
        overflow: 'hidden',
        color: '#fff',
        fontFamily: 'var(--font-sans, "Outfit", sans-serif)',
      }}
    >
      {/* 1. MASTER TOP BAR */}
      <TemplateStudioTopBar
        schema={schema}
        selectedSceneId={selectedSceneId}
        viewport={viewport}
        onViewportChange={(v) => controller.setDevice(v)}
        orientation={orientation}
        onOrientationChange={setOrientation}
        previewMode={previewMode}
        onPreviewModeChange={(mode) => controller.setMode(mode === 'admin' ? 'design' : mode)}
        isStressTest={isStressTest}
        onToggleStressTest={() => controller.toggleStressTest()}
        saveStatus={saveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => controller.undo()}
        onRedo={() => controller.redo()}
        onOpenVersions={() => handleSelectNavTab('versions')}
        onOpenPublish={() => handleSelectNavTab('publish')}
        onOpenCommandPalette={() => controller.toggleCommandPalette(true)}
        onOpenSmartAssistant={() => setIsSmartAssistantOpen(true)}
        smartAssistantCount={smartSuggestions.length}
        onOpenCreateScene={() => setIsCreateSceneOpen(true)}
        onStatusChange={(status: TemplateStatus) =>
          controller.updateScene(schema.scenes[0]?.id || '', {} as any)
        }
      />

      {/* 2. BODY SPLIT (Left Rail + Center Stage + Right Inspector) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT PROGRESSIVE DISCLOSURE RAIL */}
        {previewMode !== 'guest' && (
          <TemplateStudioLeftRail
            activeTab={activeTab}
            onSelectTab={handleSelectNavTab}
            schema={schema}
          />
        )}

        {/* CENTER STAGE (Either Live Canvas or Tab Panel) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* Quick Center Toggle (if on a panel tab, let admin toggle between Canvas and Panel) */}
          {activeTab !== 'scenes' && activeTab !== 'responsive' && activeTab !== 'motion' && previewMode !== 'guest' && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '20px',
                zIndex: 40,
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                onClick={() => controller.setCenterViewMode('canvas')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: centerViewMode === 'canvas' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
                  color: centerViewMode === 'canvas' ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Monitor size={12} />
                <span>Live Canvas</span>
              </button>

              <button
                onClick={() => controller.setCenterViewMode('panel')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: centerViewMode === 'panel' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
                  color: centerViewMode === 'panel' ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Layers size={12} />
                <span>Tab Settings</span>
              </button>
            </div>
          )}

          {/* Render Either Center View */}
          {centerViewMode === 'canvas' || previewMode === 'guest' ? (
            <TemplateStudioCanvas
              schema={schema}
              resolvedState={resolvedState}
              viewport={viewport}
              previewMode={previewMode}
              selectedSceneId={selectedSceneId}
              selectedLayerId={selectedLayerId}
              onSelectScene={handleSelectScene}
              onSelectLayer={handleSelectLayer}
              onSelectField={handleSelectField}
              dispatch={(c) => controller.dispatch(c)}
            />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', background: '#040711' }}>
              {activeTab === 'overview' && (
                <OverviewPanel
                  schema={schema}
                  onNavigateTab={handleSelectNavTab}
                  onSelectScene={handleSelectScene}
                />
              )}
              {activeTab === 'experience' && (
                <ExperiencePanel
                  schema={schema}
                  onUpdateScenes={(scenes) => {
                    scenes.forEach((scn, idx) => {
                      controller.updateScene(scn.id, scn);
                    });
                  }}
                  onSelectScene={handleSelectScene}
                  onNavigateTab={handleSelectNavTab}
                  dispatch={(c) => controller.dispatch(c)}
                />
              )}
              {(activeTab === 'contentSchema' || activeTab === 'mediaSlots') && (
                <ContentSchemaPanel
                  schema={schema}
                  initialTab={activeTab === 'mediaSlots' ? 'media' : 'fields'}
                  onUpdateField={(fieldId, patch) => controller.updateContentField(fieldId, patch)}
                  onAddField={(field) => controller.addContentField(field)}
                  onDeleteField={(fieldId) => controller.deleteContentField(fieldId)}
                  onSelectField={handleSelectField}
                  onUpdateMediaSlot={(slotId, patch) => controller.updateMediaSlot(slotId, patch)}
                />
              )}
              {activeTab === 'designSystem' && (
                <DesignSystemPanel
                  schema={schema}
                  onUpdateTokens={(patch) => controller.updateDesignTokens(patch)}
                />
              )}
              {activeTab === 'responsive' && (
                <ResponsivePanel
                  schema={schema}
                  viewport={viewport}
                  onViewportChange={(v) => controller.setDevice(v)}
                  onUpdateScene={(sceneId, patch) => controller.updateScene(sceneId, patch)}
                  onSelectScene={handleSelectScene}
                />
              )}
              {activeTab === 'motion' && (
                <MotionStudioPanel
                  schema={schema}
                  onUpdateScene={(sceneId, patch) => controller.updateScene(sceneId, patch)}
                  onSelectScene={handleSelectScene}
                />
              )}
              {activeTab === 'interactions' && (
                <InteractionsPanel schema={schema} />
              )}
              {activeTab === 'modules' && (
                <ModulesPanel
                  schema={schema}
                  onUpdateModule={(modId, patch) => {
                    controller.updateModule(modId, patch);
                  }}
                />
              )}
              {activeTab === 'customization' && (
                <CustomizationPanel
                  schema={schema}
                  onUpdatePermissions={(fieldPermissions) => {
                    controller.updateDesignTokens({});
                  }}
                />
              )}
              {activeTab === 'accessibility' && (
                <AccessibilityPanel schema={schema} />
              )}
              {activeTab === 'preview' && (
                <PreviewStressPanel
                  schema={schema}
                  isStressTest={isStressTest}
                  onToggleStressTest={() => controller.toggleStressTest()}
                  onPreviewModeChange={(mode) => controller.setMode(mode === 'admin' ? 'design' : mode)}
                />
              )}
              {activeTab === 'versions' && (
                <VersionsPanel
                  schema={schema}
                  onCreateDraft={(ver, changelog) => {
                    const nextSchema = {
                      ...schema,
                      activeVersion: ver,
                      status: 'DRAFT' as TemplateStatus,
                      versionHistory: [
                        {
                          version: ver,
                          status: 'DRAFT' as TemplateStatus,
                          createdAt: new Date().toISOString(),
                          author: 'Platform Admin',
                          changeLog: changelog,
                          healthScore: schema.healthReport.score,
                        },
                        ...schema.versionHistory,
                      ],
                    };
                    controller.loadSchema(nextSchema);
                  }}
                  onRollback={(ver) => {
                    alert(`Rolling back to version ${ver}`);
                  }}
                />
              )}
              {activeTab === 'publish' && (
                <PublishPanel
                  schema={schema}
                  onPublish={handlePublish}
                  onNavigateTab={handleSelectNavTab}
                />
              )}
            </div>
          )}

          {/* Guest View Exit Float Button */}
          {previewMode === 'guest' && (
            <button
              onClick={() => controller.setMode('design')}
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                padding: '10px 18px',
                borderRadius: '9999px',
                background: 'rgba(13, 20, 41, 0.95)',
                border: '1px solid rgba(223, 186, 107, 0.5)',
                color: '#DFBA6B',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                zIndex: 9999,
              }}
            >
              Exit Guest View → Back to Studio
            </button>
          )}
        </div>

        {/* RIGHT CONTEXTUAL INSPECTOR (or Customer Studio Simulator) */}
        {previewMode === 'customer' ? (
          <CustomerStudioSimulator
            schema={schema}
            state={resolvedState}
            onChange={(patch) => controller.setCustomerOverride(patch)}
          />
        ) : previewMode === 'admin' ? (
          <TemplateStudioInspector
            schema={schema}
            selectedSceneId={selectedSceneId}
            selectedLayerId={selectedLayerId}
            selectedFieldKey={selectedFieldKey}
            viewport={viewport}
            onUpdateSchema={(patch) => {
              if (patch.scenes) {
                patch.scenes.forEach((scn) => controller.updateScene(scn.id, scn));
              }
              if (patch.contentSchema) {
                patch.contentSchema.forEach((f) => controller.updateContentField(f.id, f));
              }
              if (patch.designTokens) {
                controller.updateDesignTokens(patch.designTokens);
              }
            }}
            onUpdateScene={(sceneId, patch) => controller.updateScene(sceneId, patch)}
            onUpdateField={(fieldId, patch) => controller.updateContentField(fieldId, patch)}
            onUpdateMediaSlot={(slotId, patch) => controller.updateMediaSlot(slotId, patch)}
            onSelectScene={handleSelectScene}
            onSelectLayer={handleSelectLayer}
            onBeginTransaction={(lbl) => controller.beginTransaction(lbl)}
            onCommitTransaction={() => controller.commitTransaction()}
            onCancelTransaction={() => controller.cancelTransaction()}
            dispatch={(c) => controller.dispatch(c)}
          />
        ) : null}
      </div>

      {/* 3. GLOBAL COMMAND PALETTE (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => controller.toggleCommandPalette(false)}
        schema={schema}
        onSelectScene={(sceneId) => {
          handleSelectScene(sceneId);
          controller.setCenterViewMode('canvas');
        }}
        onSelectTab={(tab) => handleSelectNavTab(tab)}
        onViewportChange={(v) => controller.setDevice(v)}
        onPreviewModeChange={(mode) => controller.setMode(mode === 'admin' ? 'design' : mode)}
        onToggleStressTest={() => controller.toggleStressTest()}
        onOpenPublish={() => handleSelectNavTab('publish')}
      />

      {/* 4. SMART DESIGN ASSISTANT MODAL (Prompt #46) */}
      <SmartDesignAssistantModal
        isOpen={isSmartAssistantOpen}
        onClose={() => setIsSmartAssistantOpen(false)}
        suggestions={smartSuggestions}
        onSelectNode={(nodeId, sceneId) => {
          controller.selectScene(sceneId);
          controller.selectNode(nodeId, sceneId);
        }}
        dispatch={(c) => controller.dispatch(c)}
      />

      {/* 5. CREATE SCENE WIZARD (Prompt #4) */}
      <CreateSceneWizard
        isOpen={isCreateSceneOpen}
        onClose={() => setIsCreateSceneOpen(false)}
        dispatch={(c) => {
          controller.dispatch(c);
          setIsCreateSceneOpen(false);
        }}
      />
    </div>
  );
}
