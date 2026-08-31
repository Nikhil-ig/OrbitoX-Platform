'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useCommerceStore,
  useCommerceBuilder,
  useCommerceTheme,
  commerceEngine,
  ComponentType,
  Product,
  SectionLogicConfig,
  StoreAutopilotProfile,
  CustomComponentDefinition,
  FlowGraph,
  PageSection,
} from '@orbitox/commerce';
import { MediaPickerModal } from '@/components/commerce/media-picker-modal';
import { BuilderDndProvider, DragItem } from '@/components/commerce/builder/dnd-context';
import { DragGhost } from '@/components/commerce/builder/drag-ghost';
import { BuilderToolbar } from '@/components/commerce/builder/builder-toolbar';
import { SectionsTree } from '@/components/commerce/builder/sections-tree';
import { ComponentPalette } from '@/components/commerce/builder/component-palette';
import { BuilderCanvas } from '@/components/commerce/builder/builder-canvas';
import { SectionInspector } from '@/components/commerce/builder/section-inspector';
import { ComponentComposer } from '@/components/commerce/builder/component-composer';
import { LaunchWizardModal } from '@/components/onboarding/launch-wizard-modal';
import { StudioFloatingDock } from '@/components/commerce/builder/studio-floating-dock';
import { TemplateLibraryModal } from '@/components/commerce/builder/template-library-modal';
import { PlatformThemeCustomizerModal } from '@/components/commerce/platform-theme-customizer-modal';
import { IconCheck, IconSparkles, IconLego, IconPlay, IconPlus } from '@/components/commerce/builder/studio-icons';


export default function StoreBuilderPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: '#D4AF37' }}>Loading Visual Builder...</div>}>
      <StoreBuilderContent />
    </Suspense>
  );
}

function StoreBuilderContent() {
  const searchParams = useSearchParams();
  const initialPageParam = searchParams?.get('page') || '/';

  const { store, updateStore } = useCommerceStore();
  const storeId = store?.id || 'store_aura_luxury';

  const {
    page,
    allPages,
    activePageSlug,
    setActivePageSlug,
    createNewPage,
    deleteStorePage,
    duplicateStorePage,
    updatePageMeta,
    selectedSection,
    selectedSectionId,
    setSelectedSectionId,
    availableComponents,
    previewDevice,
    setPreviewDevice,
    isDirty,
    publishSuccessMessage,
    addSection,
    updateSectionSettings,
    updateSectionLogic,
    replaceDraftSections,
    moveSection,
    toggleSection,
    deleteSection,
    duplicateSection,
    publishPage,
    discardDraft,
    refreshPage,
  } = useCommerceBuilder(storeId, initialPageParam);

  const {
    presets: themePresets,
    currentTheme,
    harmonyPalettes,
    selectPreset: handleSelectThemePreset,
    updateThemeConfig,
    updateThemeColors,
    updateThemeTypography,
    updateThemeLayout,
    updateThemeButtons,
    resetToPreset,
    refreshTheme,
  } = useCommerceTheme(store?.activeThemeId || 'punjabi-jutti-royal');
  const [leftTab, setLeftTab] = useState<'tree' | 'palette'>('tree');

  // Custom Components List
  const [customComponents, setCustomComponents] = useState<CustomComponentDefinition[]>(() =>
    commerceEngine.customComponents.listCustomComponents(storeId)
  );

  // Component Composer Modal State
  const [composerOpen, setComposerOpen] = useState<boolean>(false);
  const [editingCustomComp, setEditingCustomComp] = useState<CustomComponentDefinition | null>(null);

  // Multi-page Modal State
  const [newPageModalOpen, setNewPageModalOpen] = useState<boolean>(false);
  const [pageSettingsModalOpen, setPageSettingsModalOpen] = useState<boolean>(false);
  const [newPageTitle, setNewPageTitle] = useState<string>('');
  const [newPageSlug, setNewPageSlug] = useState<string>('');
  const [newPageTemplate, setNewPageTemplate] = useState<'blank' | 'lookbook' | 'about' | 'sale' | 'faq'>('lookbook');
  const [newPageIsHome, setNewPageIsHome] = useState<boolean>(false);

  // Page Settings Meta state
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSlug, setEditSlug] = useState<string>('');
  const [editSeoTitle, setEditSeoTitle] = useState<string>('');
  const [editSeoDesc, setEditSeoDesc] = useState<string>('');
  const [editIsHome, setEditIsHome] = useState<boolean>(false);

  // AI Autopilot Modal State
  const [autopilotModalOpen, setAutopilotModalOpen] = useState<boolean>(false);
  const [autopilotNiche, setAutopilotNiche] = useState<StoreAutopilotProfile['niche']>('luxury_fashion');
  const [autopilotGenerating, setAutopilotGenerating] = useState<boolean>(false);

  // Traditional Fashion Launchpad Wizard State
  const [launchWizardOpen, setLaunchWizardOpen] = useState<boolean>(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState<boolean>(false);
  const [platformThemeModalOpen, setPlatformThemeModalOpen] = useState<boolean>(false);
  const [activeStudioTool, setActiveStudioTool] = useState<'select' | 'add' | 'logic' | 'autopilot' | 'theme' | 'launchpad'>('select');

  // Collapsible Sidebars for Immersive Storefront Preview
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(true);


  // Real Products from Store Catalog for Live Preview
  const [storeProducts, setStoreProducts] = useState<Product[]>(() => {
    return commerceEngine.products.listProducts(storeId).products;
  });

  // AI Generating Copy State
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  // Media Picker Modal State
  const [mediaPickerOpen, setMediaPickerOpen] = useState<boolean>(false);
  const [activeImageField, setActiveImageField] = useState<string>('imageUrl');

  // Quick Product Price / Image Editor Modal State (from within builder)
  const [editingProductInBuilder, setEditingProductInBuilder] = useState<Product | null>(null);
  const [quickPrice, setQuickPrice] = useState<string>('');
  const [quickComparePrice, setQuickComparePrice] = useState<string>('');
  const [quickImageUrl, setQuickImageUrl] = useState<string>('');

  // Undo / Redo Action History Stack
  const historyRef = useRef<PageSection[][]>([]);
  const historyIdxRef = useRef<number>(-1);

  useEffect(() => {
    if (page && page.sectionsDraft) {
      if (historyIdxRef.current === -1 || historyRef.current[historyIdxRef.current] !== page.sectionsDraft) {
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        historyRef.current.push(JSON.parse(JSON.stringify(page.sectionsDraft)));
        historyIdxRef.current = historyRef.current.length - 1;
      }
    }
  }, [page?.sectionsDraft]);

  const handleUndo = () => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1;
      const prev = historyRef.current[historyIdxRef.current];
      if (prev) replaceDraftSections(JSON.parse(JSON.stringify(prev)));
    }
  };

  const handleRedo = () => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current += 1;
      const next = historyRef.current[historyIdxRef.current];
      if (next) replaceDraftSections(JSON.parse(JSON.stringify(next)));
    }
  };

  // Keyboard Shortcuts for ⌘Z / ⌘⇧Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Refresh custom components when event fires
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleCustomUpdated = () => {
      setCustomComponents(commerceEngine.customComponents.listCustomComponents(storeId));
    };
    window.addEventListener('orbitox:custom_components_updated', handleCustomUpdated);
    return () => {
      window.removeEventListener('orbitox:custom_components_updated', handleCustomUpdated);
    };
  }, [storeId]);

  // ─── Drag & Drop Global Handler ──────────────────────────────
  const handleDndDrop = (item: DragItem, targetIndex: number) => {
    if (!page) return;

    if (item.type === 'new-component' && item.componentType) {
      const customDef = customComponents.find((c) => c.type === item.componentType);
      if (customDef) {
        const newSec = {
          id: `sec_${customDef.type}_${Date.now()}`,
          type: customDef.type,
          name: customDef.name,
          enabled: true,
          order: targetIndex,
          settings: JSON.parse(JSON.stringify(customDef.defaultSettings || {})),
          customComponentId: customDef.id,
        };
        const list = [...page.sectionsDraft];
        list.splice(targetIndex, 0, newSec);
        replaceDraftSections(list);
        setSelectedSectionId(newSec.id);
      } else {
        addSection(item.componentType, targetIndex);
      }
    } else if (item.type === 'existing-section' && item.sectionId) {
      const list = [...page.sectionsDraft];
      const fromIndex = list.findIndex((s) => s.id === item.sectionId);
      if (fromIndex !== -1 && fromIndex !== targetIndex) {
        const [moved] = list.splice(fromIndex, 1);
        if (moved) {
          const insertAt = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;
          list.splice(insertAt, 0, moved);
          replaceDraftSections(list);
        }
      }
    }
  };

  // ─── Quick Insert from Magic "+" on Canvas ────────────────────
  const handleQuickInsertSection = (type: ComponentType | string, targetIndex: number) => {
    if (!page) return;
    const customDef = customComponents.find((c) => c.type === type);
    if (customDef) {
      const newSec = {
        id: `sec_${customDef.type}_${Date.now()}`,
        type: customDef.type,
        name: customDef.name,
        enabled: true,
        order: targetIndex,
        settings: JSON.parse(JSON.stringify(customDef.defaultSettings || {})),
        customComponentId: customDef.id,
      };
      const list = [...page.sectionsDraft];
      list.splice(targetIndex, 0, newSec);
      replaceDraftSections(list);
      setSelectedSectionId(newSec.id);
    } else {
      addSection(type as ComponentType, targetIndex);
    }
  };

  // ─── Click to Add Component from Palette ──────────────────────
  const handleSelectComponentFromPalette = (type: string) => {
    if (!page) return;
    const customDef = customComponents.find((c) => c.type === type);
    if (customDef) {
      const newSec = {
        id: `sec_${customDef.type}_${Date.now()}`,
        type: customDef.type,
        name: customDef.name,
        enabled: true,
        order: page.sectionsDraft.length,
        settings: JSON.parse(JSON.stringify(customDef.defaultSettings || {})),
        customComponentId: customDef.id,
      };
      const list = [...page.sectionsDraft, newSec];
      replaceDraftSections(list);
      setSelectedSectionId(newSec.id);
      setLeftTab('tree');
    } else {
      addSection(type as ComponentType);
      setLeftTab('tree');
    }
  };

  // ─── Flow Graph Update Handler ────────────────────────────────
  const handleUpdateFlowGraph = (flowGraph: FlowGraph) => {
    if (!selectedSection) return;
    updateSectionLogic(selectedSection.id, {
      ...(selectedSection.logic || { enabled: true, matchType: 'all', rules: [] }),
      enabled: flowGraph.enabled,
    });
    const list = page?.sectionsDraft.map((s) =>
      s.id === selectedSection.id ? { ...s, flowGraph } : s
    );
    if (list) replaceDraftSections(list);
  };

  // ─── AI Autopilot Generation ─────────────────────────────────
  const handleRunAutopilotGeneration = () => {
    setAutopilotGenerating(true);
    setTimeout(() => {
      const generatedSections = commerceEngine.autopilot.generateFullStorefront({
        storeName: store?.name || 'AURA Luxury',
        niche: autopilotNiche,
      });

      replaceDraftSections(generatedSections);

      const themePresetMap: Record<string, string> = {
        luxury_fashion: 'aura-luxury-gold',
        tech_gadgets: 'neo-minimal-light',
        organic_beauty: 'verde-organic-earth',
        streetwear: 'kuro-streetwear-black',
        art_design: 'aura-luxury-gold',
        general: 'aura-luxury-gold',
      };
      const recommendedTheme = themePresetMap[autopilotNiche] || 'punjabi-jutti-royal';
      handleSelectThemePreset(recommendedTheme);
      updateStore({ activeThemeId: recommendedTheme });

      setAutopilotGenerating(false);
      setAutopilotModalOpen(false);
    }, 600);
  };

  // ─── Smart AI Copywriting Handler ─────────────────────────────
  const handleGenerateAiSectionCopy = () => {
    if (!selectedSection) return;
    setAiGenerating(true);

    try {
      const generated = commerceEngine.ai.generateSectionCopy(
        selectedSection.type as any,
        store?.name || 'AURA Luxury'
      );

      const updates: Record<string, any> = {};
      if (generated.title) updates.title = generated.title;
      if (generated.heading) updates.heading = generated.heading;
      if (generated.subtitle) updates.subtitle = generated.subtitle;
      if (generated.tagline) updates.tagline = generated.tagline;
      if (generated.badge) updates.badge = generated.badge;
      if (generated.description) updates.description = generated.description;
      if (generated.primaryButtonText) updates.primaryButtonText = generated.primaryButtonText;
      if (generated.primaryButtonLink) updates.primaryButtonLink = generated.primaryButtonLink;
      if (generated.secondaryButtonText) updates.secondaryButtonText = generated.secondaryButtonText;
      if (generated.secondaryButtonLink) updates.secondaryButtonLink = generated.secondaryButtonLink;

      updateSectionSettings(selectedSection.id, updates);
    } finally {
      setTimeout(() => setAiGenerating(false), 400);
    }
  };

  return (
    <BuilderDndProvider onDrop={handleDndDrop}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100vh', flex: 1, minHeight: 0, gap: '10px', color: '#FFF', padding: '10px 14px', boxSizing: 'border-box', overflow: 'hidden' }}>
        {/* Floating Drag Ghost Cursor Follower */}
        <DragGhost />

        {/* Top Control Toolbar */}
        <BuilderToolbar
          storeSlug={store?.slug || 'aura-luxury'}
          storeName={store?.name || 'AURA Luxury'}
          allPages={allPages}
          activePageSlug={activePageSlug}
          onSelectPage={(slug) => setActivePageSlug(slug)}
          onOpenNewPageModal={() => {
            setNewPageTitle('');
            setNewPageSlug('');
            setNewPageTemplate('lookbook');
            setNewPageIsHome(false);
            setNewPageModalOpen(true);
          }}
          onOpenPageSettingsModal={() => {
            if (!page) return;
            setEditTitle(page.title);
            setEditSlug(page.slug);
            setEditSeoTitle(page.seo?.title || page.title);
            setEditSeoDesc(page.seo?.description || '');
            setEditIsHome(page.isHome || false);
            setPageSettingsModalOpen(true);
          }}
          previewDevice={previewDevice}
          onChangePreviewDevice={setPreviewDevice}
          isDirty={isDirty}
          onDiscardDraft={discardDraft}
          onPublishPage={publishPage}
          onOpenAutopilot={() => setAutopilotModalOpen(true)}
          onOpenComposer={() => {
            setEditingCustomComp(null);
            setComposerOpen(true);
          }}
          onOpenLaunchpad={() => setLaunchWizardOpen(true)}
          onOpenTemplatesModal={() => setTemplatesModalOpen(true)}
          onOpenPlatformTheme={() => setPlatformThemeModalOpen(true)}
          publishSuccessMessage={publishSuccessMessage}

          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIdxRef.current > 0}
          canRedo={historyIdxRef.current < historyRef.current.length - 1}

          leftSidebarOpen={leftSidebarOpen}
          onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
          rightSidebarOpen={rightSidebarOpen}
          onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        />

        {/* Success Toast */}
        {publishSuccessMessage && (
          <div
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.3))',
              border: '1px solid #22C55E',
              color: '#4ADE80',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <IconCheck size={14} />
            <span>{publishSuccessMessage}</span>
          </div>
        )}

        {/* ─── DYNAMIC STOREFRONT WORKSPACE (COLLAPSIBLE SIDEBARS) ──────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              leftSidebarOpen && rightSidebarOpen
                ? '290px minmax(0, 1fr) 320px'
                : leftSidebarOpen && !rightSidebarOpen
                ? '290px minmax(0, 1fr)'
                : !leftSidebarOpen && rightSidebarOpen
                ? 'minmax(0, 1fr) 320px'
                : 'minmax(0, 1fr)',
            gridTemplateRows: 'minmax(0, 1fr)',
            gap: '14px',
            flex: 1,
            minHeight: 0,
            height: 'calc(100% - 60px)',
            maxHeight: 'calc(100% - 60px)',
            overflow: 'hidden',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* LEFT SIDEBAR: Page & Layers Hierarchy */}
          {leftSidebarOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0, height: '100%' }}>
            {leftTab === 'palette' ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '14px',
                  background: 'rgba(18, 21, 33, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  flex: 1,
                  minHeight: 0,
                  height: '100%',
                  padding: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconLego size={14} style={{ color: '#E5A93C' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>Component Library</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLeftTab('tree')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    « Layers
                  </button>
                </div>
                <ComponentPalette
                  availableComponents={availableComponents}
                  customComponents={customComponents}
                  onSelectComponent={handleSelectComponentFromPalette}
                  onOpenComposer={() => {
                    setEditingCustomComp(null);
                    setComposerOpen(true);
                  }}
                  onEditCustomComponent={(comp) => {
                    setEditingCustomComp(comp);
                    setComposerOpen(true);
                  }}
                />
              </div>
            ) : (
              <SectionsTree
                sections={page?.sectionsDraft || []}
                selectedSectionId={selectedSectionId}
                onSelectSection={setSelectedSectionId}
                onMoveSection={moveSection}
                onDuplicateSection={duplicateSection}
                onDeleteSection={deleteSection}
                onToggleSection={toggleSection}
                onAddSectionClick={() => setLeftTab('palette')}
                allPages={allPages}
                activePageSlug={activePageSlug}
                onSelectPage={(slug) => setActivePageSlug(slug)}
                onOpenNewPageModal={() => {
                  setNewPageTitle('');
                  setNewPageSlug('');
                  setNewPageTemplate('lookbook');
                  setNewPageIsHome(false);
                  setNewPageModalOpen(true);
                }}
              />
            )}
          </div>
          )}

          {/* CENTER CANVAS: Visual Storefront Canvas */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              background: 'radial-gradient(circle at center, rgba(20, 24, 38, 0.95) 0%, rgba(10, 12, 20, 0.98) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.7)',
              minHeight: 0,
              height: '100%',
              maxHeight: '100%',
              flex: 1,
            }}
          >
            <BuilderCanvas
              sections={page?.sectionsDraft || []}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onMoveSection={moveSection}
              onDuplicateSection={duplicateSection}
              onDeleteSection={deleteSection}
              onToggleSection={toggleSection}
              onQuickInsertSection={handleQuickInsertSection}
              onUpdateSectionSettings={updateSectionSettings}
              currentTheme={currentTheme}
              previewDevice={previewDevice}
              storeProducts={storeProducts}
              customComponents={customComponents}
              onOpenQuickProductEdit={(p) => {
                setEditingProductInBuilder(p);
                setQuickPrice(p.price.toString());
                setQuickComparePrice(p.compareAtPrice ? p.compareAtPrice.toString() : '');
                setQuickImageUrl(p.media?.[0]?.url || '');
              }}
            />

            {/* Studio Bottom Floating Dock (Reference 4) */}
            <StudioFloatingDock
              activeTool={activeStudioTool}
              onSelectTool={setActiveStudioTool}
              onOpenAddSection={() => setLeftTab('palette')}
              onOpenComposer={() => {
                setEditingCustomComp(null);
                setComposerOpen(true);
              }}
              onOpenAutopilot={() => setAutopilotModalOpen(true)}
              onOpenLaunchpad={() => setLaunchWizardOpen(true)}
              onOpenTemplates={() => setTemplatesModalOpen(true)}
              onQuickInsertSection={(type) => handleQuickInsertSection(type, page?.sectionsDraft?.length || 0)}
            />

            {/* Bottom Right '+ Render Live Store' Button (Reference 4) */}
            <button
              type="button"
              onClick={publishPage}
              title="Publish and Render Live Storefront"
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                zIndex: 60,
                padding: '10px 22px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #FF5722 0%, #F97316 100%)',
                border: 'none',
                color: '#FFF',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
            >
              <IconPlus size={14} />
              <span>Render</span>
            </button>
          </div>

          {/* RIGHT SIDEBAR: Property Inspector & Automations */}
          {rightSidebarOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <SectionInspector
                selectedSection={selectedSection}
                componentDef={availableComponents.find((c) => c.type === selectedSection?.type)}
                storeId={storeId}
                currentTheme={currentTheme}
                themePresets={themePresets}
                harmonyPalettes={harmonyPalettes}
                onSelectThemePreset={(presetId) => {
                  handleSelectThemePreset(presetId);
                  if (updateStore) {
                    updateStore({ activeThemeId: presetId });
                  }
                }}
                onUpdateThemeConfig={updateThemeConfig}
                onUpdateThemeColors={updateThemeColors}
                onUpdateThemeTypography={updateThemeTypography}
                onUpdateThemeLayout={updateThemeLayout}
                onUpdateThemeButtons={updateThemeButtons}
                onResetThemePreset={resetToPreset}
                onUpdateSettings={(updates) => {
                  if (selectedSection) updateSectionSettings(selectedSection.id, updates);
                }}
                onUpdateLogic={(logic) => {
                  if (selectedSection) updateSectionLogic(selectedSection.id, logic);
                }}
                onUpdateFlowGraph={handleUpdateFlowGraph}
                onDeleteSection={deleteSection}
                onAiGenerateCopy={handleGenerateAiSectionCopy}
                isAiGenerating={aiGenerating}
              />
            </div>
          )}
        </div>


        {/* ─── MODALS ─────────────────────────────────────────────────── */}

        {/* 1. Visual LEGO Component Composer */}
        <ComponentComposer
          isOpen={composerOpen}
          editingComponent={editingCustomComp}
          onClose={() => setComposerOpen(false)}
          onSave={(saved) => {
            setCustomComponents(commerceEngine.customComponents.listCustomComponents(storeId));
            setLeftTab('palette');
          }}
        />

        {/* 2. New Page Modal */}
        {newPageModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '440px',
                background: '#161619',
                borderRadius: '12px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#D4AF37' }}>
                📄 Create New Storefront Page
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#AAA', fontWeight: 700 }}>Page Title</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Bridal Lookbook 2026"
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    if (!newPageSlug) {
                      setNewPageSlug('/' + e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#AAA', fontWeight: 700 }}>Route Slug (URL path)</label>
                <input
                  type="text"
                  placeholder="/lookbook"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setNewPageModalOpen(false)}
                  style={{ padding: '6px 12px', borderRadius: '6px', background: 'none', border: '1px solid #444', color: '#FFF', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPageTitle.trim()) return;
                    createNewPage({
                      title: newPageTitle,
                      slug: newPageSlug || `/${newPageTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                      template: newPageTemplate,
                      isHome: newPageIsHome,
                    });
                    setNewPageModalOpen(false);
                  }}
                  style={{ padding: '6px 16px', borderRadius: '6px', background: '#D4AF37', border: 'none', color: '#000', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                >
                  Create Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Page Settings & SEO Modal */}
        {pageSettingsModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '460px',
                background: '#161619',
                borderRadius: '12px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#D4AF37' }}>
                ⚙️ Page Settings & SEO Meta
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#AAA', fontWeight: 700 }}>Page Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#AAA', fontWeight: 700 }}>SEO Meta Title</label>
                <input
                  type="text"
                  value={editSeoTitle}
                  onChange={(e) => setEditSeoTitle(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#AAA', fontWeight: 700 }}>SEO Description</label>
                <textarea
                  rows={2}
                  value={editSeoDesc}
                  onChange={(e) => setEditSeoDesc(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPageSettingsModalOpen(false)}
                  style={{ padding: '6px 12px', borderRadius: '6px', background: 'none', border: '1px solid #444', color: '#FFF', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (page) {
                      updatePageMeta(page.id, {
                        title: editTitle,
                        seo: { title: editSeoTitle, description: editSeoDesc },
                      });
                    }
                    setPageSettingsModalOpen(false);
                  }}
                  style={{ padding: '6px 16px', borderRadius: '6px', background: '#D4AF37', border: 'none', color: '#000', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. AI Autopilot Full Storefront Modal */}
        {autopilotModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '460px',
                background: '#161619',
                borderRadius: '12px',
                border: '1px solid #8B5CF6',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#8B5CF6' }}>
                  🤖 Autonomous Storefront Generator
                </span>
                <button
                  type="button"
                  onClick={() => setAutopilotModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                Autopilot will generate a comprehensive storefront layout with tailored sections, copywriting, and theme styling.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#AAA', fontWeight: 700 }}>Brand Industry Niche</label>
                <select
                  value={autopilotNiche}
                  onChange={(e) => setAutopilotNiche(e.target.value as any)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #444', color: '#FFF', fontSize: '12px' }}
                >
                  <option value="luxury_fashion">👑 Luxury Bridal & High Fashion</option>
                  <option value="tech_gadgets">⚡ Tech & Electronics</option>
                  <option value="organic_beauty">🌿 Organic Skincare & Wellness</option>
                  <option value="streetwear">🔥 Urban Streetwear</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleRunAutopilotGeneration}
                  disabled={autopilotGenerating}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {autopilotGenerating ? '⚡ Synthesizing Storefront...' : '✨ Generate Full Layout'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Universal Media Picker */}
        <MediaPickerModal
          isOpen={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onSelectMedia={(media) => {
            if (editingProductInBuilder) {
              setQuickImageUrl(media.url);
            } else if (selectedSection) {
              updateSectionSettings(selectedSection.id, { [activeImageField]: media.url });
            }
            setMediaPickerOpen(false);
          }}
          storeId={storeId}
        />

        {/* 6. Traditional Fashion Launchpad Wizard Modal */}
        <LaunchWizardModal
          isOpen={launchWizardOpen}
          onClose={() => setLaunchWizardOpen(false)}
          onStoreCreated={(newSlug) => {
            refreshPage();
          }}
        />

        {/* 7. Website Templates & Themes Library (Canva / Figma style) */}
        <TemplateLibraryModal
          isOpen={templatesModalOpen}
          onClose={() => setTemplatesModalOpen(false)}
          storeId={storeId}
          onTemplateApplied={(template, mode) => {
            refreshPage();
            refreshTheme();
          }}
        />

        {/* 8. Platform Theme & Style Studio Modal */}
        <PlatformThemeCustomizerModal
          isOpen={platformThemeModalOpen}
          onClose={() => setPlatformThemeModalOpen(false)}
        />
      </div>
    </BuilderDndProvider>
  );
}

