'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileCode,
  Sparkles,
  Layers,
  Palette,
  Type,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  PlusCircle,
  FilePlus,
  RefreshCw,
  Info,
  Code,
} from 'lucide-react';
import {
  HtmlAdapter,
  ReactAdapter,
  FigmaAdapter,
  XdAdapter,
  ShopifyAdapter,
  WordPressAdapter,
  UrlCrawlerAdapter,
  SceneGraphCompiler,
  DesignSystemExtractor,
  ComponentDetector,
  FidelityAuditor,
  IngestionFidelityReport,
  ImportedProject,
} from '@orbitox-io/importer-core';
import { TemplateSceneDefinition, TemplateDesignTokens } from '../types/TemplateSchema';
import { SceneGraphNode } from '../engine/SceneGraphTypes';

interface OrbitoXCreativeIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSceneId: string;
  selectedNodeId: string | null;
  onInsertSection: (section: TemplateSceneDefinition) => void;
  onInsertNodesToActiveScene: (nodes: Record<string, SceneGraphNode>, rootNodeId: string) => void;
  onUpdateTokens: (patch: Partial<TemplateDesignTokens>) => void;
  initialInput?: string;
  onCreateNewPage?: (pageName: string, route: string, section: TemplateSceneDefinition) => void;
  onCreateNewProject?: (projectTitle: string, section: TemplateSceneDefinition, tokens: any) => void;
}

const INTAKE_PRESETS = [
  {
    id: 'tailwind-hero',
    name: 'Tailwind SaaS Hero',
    badge: 'HTML5',
    code: `<section class="relative px-8 py-20 bg-slate-950 text-center flex flex-col items-center gap-6">
  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
    <span>✨ New Release</span>
  </div>
  <h1 class="text-5xl font-bold tracking-tight text-white max-w-2xl font-['Playfair_Display']">
    Elevate Your Celebration Experience
  </h1>
  <p class="text-lg text-slate-400 max-w-xl">
    Graph-native canvas authoring, real-time collaboration, and zero-compromise design fidelity.
  </p>
  <div class="flex items-center gap-4 mt-2">
    <button class="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl">
      Explore Universe
    </button>
    <button class="px-6 py-3 bg-slate-900 border border-slate-800 text-white font-medium rounded-xl">
      Documentation
    </button>
  </div>
</section>`,
  },
  {
    id: 'shopify-dawn',
    name: 'Shopify Dawn Boutique',
    badge: 'Shopify OS 2.0',
    code: JSON.stringify(
      {
        name: 'Bespoke Celebration Boutique',
        sections: {
          banner: {
            type: 'image-banner',
            settings: {
              heading: 'Celebration Couture & Fine Stationery',
              text: 'Handcrafted bridal suites, engraved wax seals, and luxury digital invitations.',
              button_label: 'Shop Collection',
              button_link: '/collections/bridal',
            },
            blocks: {
              heading_1: {
                type: 'heading',
                settings: { heading: 'Celebration Couture & Fine Stationery' },
              },
              button_1: {
                type: 'button',
                settings: { button_label: 'Shop Collection', button_link: '/collections/bridal' },
              },
            },
            block_order: ['heading_1', 'button_1'],
          },
        },
        order: ['banner'],
      },
      null,
      2
    ),
  },
  {
    id: 'bento-grid',
    name: 'Bento Feature Grid',
    badge: 'Modern Web',
    code: `<section class="p-8 bg-neutral-950 grid grid-cols-2 gap-6">
  <div class="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col gap-3">
    <h3 class="text-xl font-bold text-amber-200">Zero-Trust Tenancy</h3>
    <p class="text-sm text-neutral-400">AsyncLocalStorage state scoping ensures zero cross-tenant contamination.</p>
  </div>
  <div class="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col gap-3">
    <h3 class="text-xl font-bold text-amber-200">SceneGraph Compiler</h3>
    <p class="text-sm text-neutral-400">Compiles raw DOM and JSX trees directly to native vector nodes.</p>
  </div>
</section>`,
  },
];

export function OrbitoXCreativeIntakeModal({
  isOpen,
  onClose,
  activeSceneId,
  selectedNodeId,
  onInsertSection,
  onInsertNodesToActiveScene,
  onUpdateTokens,
  initialInput = '',
  onCreateNewPage,
  onCreateNewProject,
}: OrbitoXCreativeIntakeModalProps) {
  const [inputContent, setInputContent] = useState(initialInput || INTAKE_PRESETS[0]!.code);
  const [analyzedProject, setAnalyzedProject] = useState<ImportedProject | null>(null);
  const [fidelityReport, setFidelityReport] = useState<IngestionFidelityReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showExplainability, setShowExplainability] = useState(false);
  const [showDeveloperDiagnostics, setShowDeveloperDiagnostics] = useState(false);
  const [showRawInput, setShowRawInput] = useState(false);

  const detectedSummary = useMemo(() => {
    const trimmed = inputContent.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return 'I found a live website ready to convert.';
    } else if (trimmed.includes('<!-- wp:') || trimmed.includes('"theme.json"')) {
      return 'I found a WordPress theme structure.';
    } else if (trimmed.includes('{% schema %}') || trimmed.includes('"sections"')) {
      return 'I found a Shopify theme section structure.';
    } else if (trimmed.includes('export default') || trimmed.includes('className=')) {
      return 'I found a React / JSX component.';
    }
    return 'I found a website ready to edit.';
  }, [inputContent]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Auto-analyze input content when modal opens or input changes
  useEffect(() => {
    if (!isOpen) return;
    if (!inputContent.trim()) {
      setAnalyzedProject(null);
      setFidelityReport(null);
      return;
    }

    let isMounted = true;
    setIsAnalyzing(true);
    setAnalysisError(null);

    const timer = setTimeout(async () => {
      try {
        const trimmed = inputContent.trim();
        let adapter: any;

        // Auto-select adapter
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          if (trimmed.includes('figma.com')) {
            adapter = new FigmaAdapter();
          } else {
            adapter = new UrlCrawlerAdapter();
          }
        } else if (trimmed.includes('<!-- wp:') || (trimmed.startsWith('{') && trimmed.includes('"theme.json"'))) {
          adapter = new WordPressAdapter();
        } else if (trimmed.includes('{% schema %}') || (trimmed.startsWith('{') && trimmed.includes('"sections"') && trimmed.includes('"order"'))) {
          adapter = new ShopifyAdapter();
        } else if (trimmed.startsWith('{') && trimmed.includes('"graphicContent"')) {
          adapter = new XdAdapter();
        } else if (trimmed.startsWith('{') && trimmed.includes('"document"')) {
          adapter = new FigmaAdapter();
        } else if (trimmed.includes('export default function') || trimmed.includes('className=')) {
          adapter = new ReactAdapter();
        } else {
          adapter = new HtmlAdapter();
        }

        const parseResult = await adapter.parse(trimmed, {
          importMode: 'section',
          extractDesignTokens: true,
          localizeRemoteAssets: true,
        });

        if (!isMounted) return;

        if (!parseResult.success) {
          setAnalysisError(parseResult.errors?.join(', ') || 'Failed to parse input.');
          setIsAnalyzing(false);
          return;
        }

        // 1. CIELAB Perceptual Color Token Clustering
        const clustered = DesignSystemExtractor.extractAndCluster(parseResult.projectIR);

        // 2. Component Mining (detect repeating patterns)
        const withComponents = ComponentDetector.detectAndSynthesize(clustered.project);

        // 3. Fidelity Auditing & Explainability Scorecard
        const report = FidelityAuditor.audit(withComponents);

        setAnalyzedProject(withComponents);
        setFidelityReport(report);
        setIsAnalyzing(false);
      } catch (err: any) {
        if (!isMounted) return;
        setAnalysisError(err?.message || 'Error analyzing creative intake.');
        setIsAnalyzing(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, inputContent]);

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────
  // STEP 3: EXECUTE INSERTION ACTIONS
  // ─────────────────────────────────────────────────────────────

  const handleApplyTokens = () => {
    if (analyzedProject?.designTokens) {
      const compiled = SceneGraphCompiler.compileProject(analyzedProject).designTokens;
      onUpdateTokens(compiled as any);
    }
  };

  const handleAddToCurrentPage = () => {
    if (!analyzedProject) return;
    const firstSection = analyzedProject.pages[0]?.sections[0];
    if (!firstSection) return;

    handleApplyTokens();
    const compiledScene = SceneGraphCompiler.compileSection(firstSection) as any as TemplateSceneDefinition;
    onInsertSection(compiledScene);
    onClose();
  };

  const handleAddAsNewPage = () => {
    if (!analyzedProject) return;
    const firstSection = analyzedProject.pages[0]?.sections[0];
    if (!firstSection) return;

    handleApplyTokens();
    const compiledScene = SceneGraphCompiler.compileSection(firstSection) as any as TemplateSceneDefinition;
    if (onCreateNewPage) {
      onCreateNewPage('Imported Page', '/imported', compiledScene);
    } else {
      onInsertSection(compiledScene);
    }
    onClose();
  };

  const handleCreateNewProject = () => {
    if (!analyzedProject) return;
    const firstSection = analyzedProject.pages[0]?.sections[0];
    if (!firstSection) return;

    const compiledTokens = SceneGraphCompiler.compileProject(analyzedProject).designTokens as any;
    const compiledScene = SceneGraphCompiler.compileSection(firstSection) as any as TemplateSceneDefinition;

    if (onCreateNewProject) {
      onCreateNewProject('Imported Project', compiledScene, compiledTokens);
    } else {
      handleApplyTokens();
      onInsertSection(compiledScene);
    }
    onClose();
  };

  const handleReplaceSelectedSection = () => {
    if (!analyzedProject) return;
    const firstSection = analyzedProject.pages[0]?.sections[0];
    if (!firstSection) return;

    handleApplyTokens();
    const compiledScene = SceneGraphCompiler.compileSection(firstSection);
    onInsertNodesToActiveScene(
      compiledScene.sceneGraph.nodes as any,
      compiledScene.sceneGraph.rootNodeId
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="sz-creative-intake-modal"
      role="dialog"
      aria-label="Creative Intake & Import Engine"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(9, 11, 17, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '840px',
          maxHeight: '90vh',
          background: '#161822',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#13151D',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={18} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F3F4F6', margin: 0 }}>
                Universal Creative Intake
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                Frictionless 3-Step Ingestion: Drop ➔ Understand ➔ Bring it in
              </span>
            </div>
          </div>

          <button
            id="sz-creative-intake-close-btn"
            aria-label="Close Intake Modal"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY (CUSTOM SCROLLBAR) ── */}
        <div
          className="sz-custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* STEP 1: DROP / PASTE ZONE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Step 1: Input or Select Creative Source
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {INTAKE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setInputContent(p.code)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      color: '#E5E7EB',
                      cursor: 'pointer',
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Drop & Choice Card */}
            <div
              id="sz-intake-drop-card"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const text = evt.target?.result;
                    if (typeof text === 'string') setInputContent(text);
                  };
                  reader.readAsText(file);
                }
              }}
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(139, 92, 246, 0.06) 100%)',
                border: '1.5px dashed rgba(96, 165, 250, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UploadCloud size={20} color="#60A5FA" />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Bring anything into OrbitoX
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    Drag a file here • HTML, ZIP, Figma, SVG, PDF, Images, Video
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <label
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Choose File
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const text = evt.target?.result;
                          if (typeof text === 'string') setInputContent(text);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowRawInput(!showRawInput)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#D1D5DB',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                >
                  {showRawInput ? 'Hide Code' : 'Paste Code / URL'}
                </button>
              </div>
            </div>

            {showRawInput && (
              <textarea
                id="sz-creative-intake-textarea"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Paste HTML5, React/JSX, Shopify theme JSON, WordPress blocks, or a live website URL..."
                rows={3}
                style={{
                  width: '100%',
                  background: '#1A1D27',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '12px',
                  color: '#E5E7EB',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            )}
          </div>

          {/* STEP 2: UNDERSTAND (PLAIN-ENGLISH SCORECARD) */}
          <div
            id="sz-creative-intake-scorecard"
            style={{
              background: '#1B1E2B',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Step 2: OrbitoX Analysis
                </span>
                {isAnalyzing ? (
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Analyzing structure...</span>
                ) : (
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34D399',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    ✓ Structure Recognized: {detectedSummary}
                  </span>
                )}
              </div>

              {fidelityReport && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#60A5FA',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {fidelityReport.summaryText}
                  </span>
                  <button
                    onClick={() => setShowExplainability(!showExplainability)}
                    title="Explainability Breakdown"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                    }}
                  >
                    <Info size={13} />
                    <span>Why?</span>
                  </button>
                </div>
              )}
            </div>

            {/* Plain-English Counts Ledger */}
            {fidelityReport ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: '#141620', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF', fontSize: '0.7rem' }}>
                    <Layers size={13} />
                    <span>Structure</span>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                    {fidelityReport.stats.totalSections} Secs • {fidelityReport.stats.totalElements} Nodes
                  </span>
                </div>

                <div style={{ background: '#141620', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF', fontSize: '0.7rem' }}>
                    <Sparkles size={13} />
                    <span>Components</span>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#C084FC' }}>
                    {fidelityReport.stats.totalComponents} Reusable Masters
                  </span>
                </div>

                <div style={{ background: '#141620', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF', fontSize: '0.7rem' }}>
                    <Palette size={13} />
                    <span>Design Tokens</span>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FBBF24' }}>
                    {fidelityReport.stats.totalTokens} CIELAB Tokens
                  </span>
                </div>

                <div style={{ background: '#141620', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF', fontSize: '0.7rem' }}>
                    <Type size={13} />
                    <span>Typography</span>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34D399' }}>
                    {fidelityReport.stats.totalFonts} Font Families
                  </span>
                </div>
              </div>
            ) : analysisError ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '0.78rem' }}>
                <AlertTriangle size={15} />
                <span>{analysisError}</span>
              </div>
            ) : null}

            {/* Explainability Accordion */}
            {showExplainability && fidelityReport && (
              <div
                style={{
                  background: '#141620',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#E5E7EB' }}>
                  Fidelity Explainability Breakdown:
                </span>
                {fidelityReport.heuristics.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.72rem', color: '#9CA3AF' }}>
                    <CheckCircle2 size={13} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{h.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 3: BRING IT IN (4 EXPLICIT NON-DESTRUCTIVE ACTIONS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Step 3: Bring It In (Non-Destructive Choices)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <button
                id="sz-intake-btn-add-to-page"
                onClick={handleAddToCurrentPage}
                disabled={!analyzedProject}
                style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: '12px',
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  cursor: analyzedProject ? 'pointer' : 'not-allowed',
                  opacity: analyzedProject ? 1 : 0.5,
                  textAlign: 'left',
                }}
              >
                <PlusCircle size={18} color="#3B82F6" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Add to Current Page
                </span>
                <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                  Appends section directly to your active page canvas.
                </span>
              </button>

              <button
                id="sz-intake-btn-add-as-new-page"
                onClick={handleAddAsNewPage}
                disabled={!analyzedProject}
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '12px',
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  cursor: analyzedProject ? 'pointer' : 'not-allowed',
                  opacity: analyzedProject ? 1 : 0.5,
                  textAlign: 'left',
                }}
              >
                <FilePlus size={18} color="#10B981" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Add as New Page
                </span>
                <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                  Creates route (/imported) without touching active page.
                </span>
              </button>

              <button
                id="sz-intake-btn-create-project"
                onClick={handleCreateNewProject}
                disabled={!analyzedProject}
                style={{
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  borderRadius: '12px',
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  cursor: analyzedProject ? 'pointer' : 'not-allowed',
                  opacity: analyzedProject ? 1 : 0.5,
                  textAlign: 'left',
                }}
              >
                <Sparkles size={18} color="#8B5CF6" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Create New Project
                </span>
                <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                  Spawns clean workspace with extracted design system.
                </span>
              </button>

              <button
                id="sz-intake-btn-replace-selected"
                onClick={handleReplaceSelectedSection}
                disabled={!analyzedProject}
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '12px',
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  cursor: analyzedProject ? 'pointer' : 'not-allowed',
                  opacity: analyzedProject ? 1 : 0.5,
                  textAlign: 'left',
                }}
              >
                <RefreshCw size={18} color="#F59E0B" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Replace Selected
                </span>
                <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                  Swaps selected container while preserving position.
                </span>
              </button>
            </div>
          </div>

          {/* PROGRESSIVE DISCLOSURE: DEVELOPER DIAGNOSTICS */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
            <button
              onClick={() => setShowDeveloperDiagnostics(!showDeveloperDiagnostics)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
              }}
            >
              {showDeveloperDiagnostics ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Developer Diagnostics & AST Tree (Advanced)</span>
            </button>

            {showDeveloperDiagnostics && analyzedProject && (
              <pre
                style={{
                  marginTop: '10px',
                  background: '#0D0E15',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  color: '#9CA3AF',
                  overflowX: 'auto',
                  maxHeight: '160px',
                }}
              >
                {JSON.stringify(analyzedProject.confidenceReport, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
