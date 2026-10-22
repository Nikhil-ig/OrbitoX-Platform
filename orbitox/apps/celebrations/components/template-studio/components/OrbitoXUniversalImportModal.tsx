'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Code,
  FileCode,
  Sparkles,
  DownloadCloud,
  Check,
  AlertTriangle,
  Layers,
  Palette,
  Type,
  ShieldCheck,
  FileText,
  Sliders,
} from 'lucide-react';
import { ImportCorrectionStudio } from './import-studio/ImportCorrectionStudio';
import {
  HtmlAdapter,
  ReactAdapter,
  FigmaAdapter,
  XdAdapter,
  ShopifyAdapter,
  WordPressAdapter,
  UrlCrawlerAdapter,
  SceneGraphCompiler,
  SourceAdapterOptions,
} from '@orbitox-io/importer-core';
import { TemplateSceneDefinition, TemplateDesignTokens } from '../types/TemplateSchema';
import { SceneGraphNode } from '../engine/SceneGraphTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeSceneId: string;
  selectedNodeId: string | null;
  onInsertSection: (section: TemplateSceneDefinition) => void;
  onInsertNodesToActiveScene: (nodes: Record<string, SceneGraphNode>, rootNodeId: string) => void;
  onUpdateTokens: (patch: Partial<TemplateDesignTokens>) => void;
  onCreateNewPage?: (pageName: string, path: string, initialScene: TemplateSceneDefinition) => void;
  onCreateNewProject?: (projectName: string, initialScene: TemplateSceneDefinition, initialTokens?: any) => void;
}

const PRESETS = [
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
    name: 'Shopify Dawn Theme',
    badge: 'SHOPIFY',
    code: JSON.stringify({
      name: "Bespoke Celebration Boutique",
      sections: {
        banner: {
          type: "image-banner",
          settings: {
            heading: "Celebration Couture & Fine Stationery",
            text: "Handcrafted bridal suites, engraved wax seals, and luxury digital invitations.",
            button_label: "Shop Collection",
            button_link: "/collections/bridal"
          },
          blocks: {
            heading_1: {
              type: "heading",
              settings: { heading: "Celebration Couture & Fine Stationery" }
            },
            button_1: {
              type: "button",
              settings: { button_label: "Shop Collection", button_link: "/collections/bridal" }
            }
          },
          block_order: ["heading_1", "button_1"]
        },
        featured_products: {
          type: "featured-collection",
          settings: {
            title: "Signature Gala Packages",
            collection: "signature_gala",
            products_per_row: 3
          }
        }
      },
      order: ["banner", "featured_products"]
    }, null, 2),
  },
  {
    id: 'wp-fse-columns',
    name: 'WordPress FSE Hero',
    badge: 'WORDPRESS',
    code: `<!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":"32px"}}} -->
<div class="wp-block-columns alignwide">
  <!-- wp:column {"width":"66.66%"} -->
  <div class="wp-block-column" style="flex-basis:66.66%">
    <!-- wp:heading {"level":1,"style":{"typography":{"fontWeight":"700"}}} -->
    <h1 class="wp-block-heading">Grand Celestial Symphony Gala</h1>
    <!-- /wp:heading -->
    <!-- wp:paragraph -->
    <p>A multi-sensory celebratory evening honoring artistic excellence and transformative design.</p>
    <!-- /wp:paragraph -->
    <!-- wp:buttons -->
    <div class="wp-block-buttons">
      <!-- wp:button {"backgroundColor":"accent","style":{"border":{"radius":"12px"}}} -->
      <div class="wp-block-button">
        <a class="wp-block-button__link" href="/gala-rsvp">Reserve Gala Invitation</a>
      </div>
      <!-- /wp:button -->
    </div>
    <!-- /wp:buttons -->
  </div>
  <!-- /wp:column -->
  <!-- wp:column {"width":"33.33%"} -->
  <div class="wp-block-column" style="flex-basis:33.33%">
    <!-- wp:image {"url":"https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80","alt":"Gala Suite"} -->
    <figure class="wp-block-image"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80" alt="Gala Suite"/></figure>
    <!-- /wp:image -->
  </div>
  <!-- /wp:column -->
</div>
<!-- /wp:columns -->`,
  },
  {
    id: 'live-url-demo',
    name: 'Live Website URL',
    badge: 'URL',
    code: 'https://celebrations.orbitox.io',
  },
  {
    id: 'figma-card',
    name: 'Figma Celestial Card',
    badge: 'FIGMA',
    code: JSON.stringify({
      id: "10:1",
      name: "Celebration Gala Invitation",
      type: "FRAME",
      layoutMode: "VERTICAL",
      itemSpacing: 16,
      paddingLeft: 32,
      paddingRight: 32,
      paddingTop: 32,
      paddingBottom: 32,
      primaryAxisAlignItems: "CENTER",
      counterAxisAlignItems: "CENTER",
      cornerRadius: 16,
      fills: [{ type: "SOLID", color: { r: 0.05, g: 0.05, b: 0.08, a: 1 } }],
      strokes: [{ type: "SOLID", color: { r: 0.87, g: 0.73, b: 0.42, a: 0.3 } }],
      strokeWeight: 1,
      children: [
        {
          id: "10:2",
          name: "Badge",
          type: "FRAME",
          layoutMode: "HORIZONTAL",
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 6,
          paddingBottom: 6,
          cornerRadius: 9999,
          fills: [{ type: "SOLID", color: { r: 0.87, g: 0.73, b: 0.42, a: 0.15 } }],
          children: [
            {
              id: "10:3",
              name: "Badge Text",
              type: "TEXT",
              characters: "EXCLUSIVE GALA",
              style: {
                fontFamily: "Outfit",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: 1.5,
                fills: [{ type: "SOLID", color: { r: 0.95, g: 0.85, b: 0.6, a: 1 } }]
              }
            }
          ]
        },
        {
          id: "10:4",
          name: "Title",
          type: "TEXT",
          characters: "Royal Celestial Banquet",
          style: {
            fontFamily: "Playfair Display",
            fontWeight: 700,
            fontSize: 32,
            fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }]
          }
        },
        {
          id: "10:5",
          name: "Description",
          type: "TEXT",
          characters: "Join us under the starlit dome for an evening of luxury, orchestral harmony, and timeless memory creation.",
          style: {
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 15,
            fills: [{ type: "SOLID", color: { r: 0.65, g: 0.65, b: 0.7, a: 1 } }]
          }
        }
      ]
    }, null, 2),
  },
  {
    id: 'xd-artboard',
    name: 'Adobe XD Artboard',
    badge: 'XD',
    code: JSON.stringify({
      version: "1.0.0",
      children: [
        {
          id: "xd-artboard-1",
          type: "artboard",
          name: "Golden Milestone Ceremony",
          meta: { ux: { width: 1440, height: 800 } },
          style: {
            fill: { type: "color", value: { r: 8, g: 11, b: 22 } }
          },
          artboard: {
            children: [
              {
                id: "xd-badge",
                type: "shape",
                name: "Anniversary Pill",
                shape: { type: "rect", x: 60, y: 50, width: 170, height: 34, r: 17 },
                style: {
                  fill: { type: "color", value: { r: 223, g: 186, b: 107, a: 0.18 } },
                  stroke: { type: "color", value: { r: 223, g: 186, b: 107 }, width: 1 }
                }
              },
              {
                id: "xd-title",
                type: "text",
                name: "Anniversary Headline",
                transform: { tx: 60, ty: 110 },
                text: {
                  rawText: "A Golden Half-Century of Devotion",
                  paragraphs: [
                    {
                      lines: [
                        [
                          {
                            font: { family: "Playfair Display", style: "Bold", size: 40 },
                            fill: { type: "color", value: { r: 255, g: 255, b: 255 } }
                          }
                        ]
                      ]
                    }
                  ]
                }
              },
              {
                id: "xd-description",
                type: "text",
                name: "Ceremony Subtitle",
                transform: { tx: 60, ty: 175 },
                text: {
                  rawText: "Honoring five decades of shared legacy, triumphs, and unbreakable union at the Grand Ballroom.",
                  paragraphs: [
                    {
                      lines: [
                        [
                          {
                            font: { family: "Inter", style: "Regular", size: 16 },
                            fill: { type: "color", value: { r: 185, g: 190, b: 205 } }
                          }
                        ]
                      ]
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }, null, 2),
  },
  {
    id: 'react-pricing',
    name: 'React Pricing Card',
    badge: 'JSX',
    code: `export default function PricingCard() {
  return (
    <div className="flex flex-col p-8 bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white font-['Outfit']">Enterprise Tier</h3>
        <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 font-semibold">Popular</span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-amber-400">$89</span>
        <span className="text-sm text-zinc-400">/month</span>
      </div>
      <p className="mt-2 text-sm text-zinc-400">Unlimited bespoke guest portals and multi-tenant custom domains.</p>
      <button className="mt-6 w-full py-3 bg-amber-500 rounded-xl text-black font-semibold">
        Start 14-Day Trial
      </button>
    </div>
  );
}`,
  },
  {
    id: 'svg-monogram',
    name: 'Golden Monogram',
    badge: 'SVG',
    code: `<svg viewBox="0 0 120 120" fill="none" stroke="#DFBA6B" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="54" stroke="#DFBA6B" stroke-width="2" />
  <circle cx="60" cy="60" r="48" stroke="#DFBA6B" stroke-dasharray="4 4" stroke-width="1" />
  <path d="M40 78 L60 38 L80 78 M48 64 L72 64" stroke="#DFBA6B" stroke-width="3" />
</svg>`,
  },
  {
    id: 'bento-features',
    name: 'Bento Feature Grid',
    badge: 'HTML5',
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

import { OrbitoXCreativeIntakeModal } from './OrbitoXCreativeIntakeModal';

export function OrbitoXUniversalImportModal({
  isOpen,
  onClose,
  activeSceneId,
  selectedNodeId,
  onInsertSection,
  onInsertNodesToActiveScene,
  onUpdateTokens,
  onCreateNewPage,
  onCreateNewProject,
}: Props) {
  return (
    <OrbitoXCreativeIntakeModal
      isOpen={isOpen}
      onClose={onClose}
      activeSceneId={activeSceneId}
      selectedNodeId={selectedNodeId}
      onInsertSection={onInsertSection}
      onInsertNodesToActiveScene={onInsertNodesToActiveScene}
      onUpdateTokens={onUpdateTokens}
      onCreateNewPage={onCreateNewPage}
      onCreateNewProject={onCreateNewProject}
    />
  );
}

function LegacyOrbitoXUniversalImportModal({
  isOpen,
  onClose,
  activeSceneId,
  selectedNodeId,
  onInsertSection,
  onInsertNodesToActiveScene,
  onUpdateTokens,
}: Props) {
  const [code, setCode] = useState(PRESETS[0]!.code);
  const [formatMode, setFormatMode] = useState<'auto' | 'html' | 'react' | 'svg' | 'figma' | 'xd' | 'shopify' | 'wordpress' | 'url'>('auto');
  const [destination, setDestination] = useState<'new_section' | 'active_section'>('new_section');
  const [extractTokens, setExtractTokens] = useState(true);
  const [localizeAssets, setLocalizeAssets] = useState(true);
  const [resolveFonts, setResolveFonts] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [correctionData, setCorrectionData] = useState<{
    projectIR: any;
    compiledSceneGraph: any;
  } | null>(null);

  // Auto-detect format
  const detectedFormat = useMemo(() => {
    const trimmed = code.trim();
    if (trimmed.startsWith('https://www.figma.com/') || trimmed.startsWith('https://figma.com/')) return 'Figma URL';
    if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) && !trimmed.includes('figma.com')) return 'Live Website URL';
    if (trimmed.startsWith('{') && (trimmed.includes('"document"') || trimmed.includes('"layoutMode"') || (trimmed.includes('"type"') && trimmed.includes('"FRAME"')))) return 'Figma AST JSON';
    if (trimmed.startsWith('{') && (trimmed.includes('"mimetype"') || trimmed.includes('"artboard"') || trimmed.includes('"graphicContent"') || trimmed.includes('"type": "artboard"') || trimmed.includes('"type":"artboard"'))) return 'Adobe XD AST';
    if (trimmed.includes('<!-- wp:') || trimmed.includes('<!-- /wp:') || (trimmed.startsWith('{') && (trimmed.includes('"theme.json"') || trimmed.includes('"templates/index.html"')))) return 'WordPress FSE';
    if (trimmed.includes('{% schema %}') || (trimmed.startsWith('{') && trimmed.includes('"sections"') && trimmed.includes('"order"')) || (trimmed.startsWith('{') && trimmed.includes('"templates/index.json"'))) return 'Shopify OS 2.0';
    if (trimmed.startsWith('<svg') || trimmed.includes('xmlns="http://www.w3.org/2000/svg"')) return 'SVG Vector';
    if (trimmed.includes('export default function') || trimmed.includes('className=') || trimmed.includes('from \'react\'')) return 'React JSX';
    return 'HTML5 & Tailwind';
  }, [code]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetCode: string) => {
    setCode(presetCode);
    setStatusMessage(null);
  };

  const handleExecuteImport = async () => {
    if (!code.trim()) return;
    setIsProcessing(true);
    setStatusMessage('Compiling into SceneGraph IR...');

    try {
      const htmlAdapter = new HtmlAdapter();
      const reactAdapter = new ReactAdapter();
      const figmaAdapter = new FigmaAdapter();
      const xdAdapter = new XdAdapter();
      const shopifyAdapter = new ShopifyAdapter();
      const wordPressAdapter = new WordPressAdapter();
      const urlCrawlerAdapter = new UrlCrawlerAdapter();

      let adapter: any = htmlAdapter;
      if (formatMode === 'url' || (formatMode === 'auto' && urlCrawlerAdapter.canHandle(code))) {
        adapter = urlCrawlerAdapter;
      } else if (formatMode === 'wordpress' || (formatMode === 'auto' && wordPressAdapter.canHandle(code))) {
        adapter = wordPressAdapter;
      } else if (formatMode === 'shopify' || (formatMode === 'auto' && shopifyAdapter.canHandle(code))) {
        adapter = shopifyAdapter;
      } else if (formatMode === 'xd' || (formatMode === 'auto' && xdAdapter.canHandle(code))) {
        adapter = xdAdapter;
      } else if (formatMode === 'figma' || (formatMode === 'auto' && figmaAdapter.canHandle(code))) {
        adapter = figmaAdapter;
      } else if (formatMode === 'react' || (formatMode === 'auto' && reactAdapter.canHandle(code))) {
        adapter = reactAdapter;
      }

      const options: Partial<SourceAdapterOptions> = {
        importMode: destination === 'new_section' ? 'section' : 'component',
        extractDesignTokens: extractTokens,
        localizeRemoteAssets: localizeAssets,
      };

      const result = await adapter.parse(code, options);

      if (!result.success) {
        setStatusMessage(`Error: ${result.errors.join(', ')}`);
        setIsProcessing(false);
        return;
      }

      // 1. Merge Design Tokens if extracted
      if (extractTokens && result.projectIR.designTokens) {
        const compiledTokens = SceneGraphCompiler.compileProject(result.projectIR).designTokens;
        onUpdateTokens(compiledTokens as any);
      }

      // 2. Insert as New Section or Into Active Scene
      const firstSection = result.projectIR.pages[0]?.sections[0];
      if (!firstSection) {
        setStatusMessage('No section structure found in parsed input.');
        setIsProcessing(false);
        return;
      }

      const compiledScene = SceneGraphCompiler.compileSection(firstSection);

      if (destination === 'new_section') {
        const templateScene: TemplateSceneDefinition = {
          id: compiledScene.id,
          order: 99,
          name: compiledScene.name || 'Imported Section',
          slug: compiledScene.slug || 'imported-section',
          purpose: 'Imported via OrbitoX Universal Importer',
          sceneType: (compiledScene.archetype as any) || 'custom',
          scrollMode: 'normal',
          isRequired: false,
          defaultVisible: true,
          customerToggleable: true,
          navigationLabel: compiledScene.name || 'Imported',
          layers: [],
          renderMode: 'graph',
          sceneGraph: compiledScene.sceneGraph as any,
          motionPreset: 'subtle',
          motionConfig: {
            entryDuration: 0.6,
            entryDelay: 0,
            parallaxDepth: 0.2,
            staggerDelay: 0.05,
            easing: 'ease-out',
            reducedMotionFallback: 'fade',
          },
          interactions: [],
          transitionToNext: { type: 'fade', durationMs: 400, easing: 'ease-out' },
          layoutRules: {
            desktop: {
              composition: 'centered',
              paddingTopRem: 4,
              paddingBottomRem: 4,
              contentMaxWidthPx: 1440,
            },
            tablet: {
              composition: 'centered',
              paddingTopRem: 3,
              paddingBottomRem: 3,
              contentMaxWidthPx: 768,
              isOverridden: false,
            },
            mobile: {
              composition: 'centered',
              paddingTopRem: 2,
              paddingBottomRem: 2,
              contentMaxWidthPx: 390,
              isOverridden: false,
            },
          },
          accessibility: {
            screenReaderTitle: compiledScene.name || 'Imported Section',
            ariaRole: 'region',
          },
        };

        onInsertSection(templateScene);
      } else {
        // Insert nodes directly into active scene
        onInsertNodesToActiveScene(
          compiledScene.sceneGraph.nodes as any,
          compiledScene.sceneGraph.rootNodeId
        );
      }

      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage(`Import failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleOpenCorrectionStudio = async () => {
    if (!code.trim()) return;
    setIsProcessing(true);
    setStatusMessage('Parsing layout and compiling visual diff...');

    try {
      const htmlAdapter = new HtmlAdapter();
      const reactAdapter = new ReactAdapter();
      const figmaAdapter = new FigmaAdapter();
      const xdAdapter = new XdAdapter();
      const shopifyAdapter = new ShopifyAdapter();
      const wordPressAdapter = new WordPressAdapter();
      const urlCrawlerAdapter = new UrlCrawlerAdapter();

      let adapter: any = htmlAdapter;
      if (formatMode === 'url' || (formatMode === 'auto' && urlCrawlerAdapter.canHandle(code))) {
        adapter = urlCrawlerAdapter;
      } else if (formatMode === 'wordpress' || (formatMode === 'auto' && wordPressAdapter.canHandle(code))) {
        adapter = wordPressAdapter;
      } else if (formatMode === 'shopify' || (formatMode === 'auto' && shopifyAdapter.canHandle(code))) {
        adapter = shopifyAdapter;
      } else if (formatMode === 'xd' || (formatMode === 'auto' && xdAdapter.canHandle(code))) {
        adapter = xdAdapter;
      } else if (formatMode === 'figma' || (formatMode === 'auto' && figmaAdapter.canHandle(code))) {
        adapter = figmaAdapter;
      } else if (formatMode === 'react' || (formatMode === 'auto' && reactAdapter.canHandle(code))) {
        adapter = reactAdapter;
      }

      const result = await adapter.parse(code, {
        importMode: destination === 'new_section' ? 'section' : 'component',
        extractDesignTokens: extractTokens,
        localizeRemoteAssets: localizeAssets,
      });

      if (!result.success || !result.projectIR.pages[0]?.sections[0]) {
        setStatusMessage(`Error: ${result.errors?.join(', ') || 'Failed to parse structure'}`);
        setIsProcessing(false);
        return;
      }

      const compiledScene = SceneGraphCompiler.compileSection(result.projectIR.pages[0].sections[0]);
      setCorrectionData({
        projectIR: result.projectIR,
        compiledSceneGraph: compiledScene.sceneGraph,
      });
      setIsProcessing(false);
      setStatusMessage(null);
    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage(`Parse error: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          background: '#090D1A',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(223, 186, 107, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#060B1A',
              }}
            >
              <DownloadCloud size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Universal Import Studio
                </h2>
                <span
                  style={{
                    background: 'rgba(223, 186, 107, 0.15)',
                    border: '1px solid rgba(223, 186, 107, 0.3)',
                    color: '#DFBA6B',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  P26 Universal Pipeline
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                Bring in Figma frames, Adobe XD artboards, Shopify OS 2.0 themes, WordPress FSE blocks, live websites, HTML, Tailwind, React JSX, and SVGs into native, editable SceneGraph nodes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Presets Bar */}
        <div
          style={{
            padding: '10px 1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0 }}>
            Presets:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleApplyPreset(p.code)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
            >
              <span>{p.name}</span>
              <span style={{ fontSize: '0.65rem', color: '#DFBA6B', opacity: 0.8 }}>({p.badge})</span>
            </button>
          ))}
        </div>

        {/* Editor Body */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Format and Detection Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Detected Format:</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#DFBA6B',
                  background: 'rgba(223, 186, 107, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(223, 186, 107, 0.2)',
                }}
              >
                {detectedFormat}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>Format Override:</span>
              <select
                value={formatMode}
                onChange={(e) => setFormatMode(e.target.value as any)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  outline: 'none',
                }}
              >
                <option value="auto" style={{ background: '#0B0F19' }}>Auto-Detect</option>
                <option value="url" style={{ background: '#0B0F19' }}>Live Website URL</option>
                <option value="wordpress" style={{ background: '#0B0F19' }}>WordPress FSE / Gutenberg</option>
                <option value="shopify" style={{ background: '#0B0F19' }}>Shopify OS 2.0 Theme / Liquid</option>
                <option value="figma" style={{ background: '#0B0F19' }}>Figma AST / URL</option>
                <option value="xd" style={{ background: '#0B0F19' }}>Adobe XD Archive / AGC</option>
                <option value="html" style={{ background: '#0B0F19' }}>HTML5 & Tailwind</option>
                <option value="react" style={{ background: '#0B0F19' }}>React / Next.js JSX</option>
                <option value="svg" style={{ background: '#0B0F19' }}>SVG Vector</option>
              </select>
            </div>
          </div>

          {/* Textarea Code Input */}
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setStatusMessage(null);
            }}
            placeholder="Paste live website URL (https://...), Figma node AST JSON / URL, Adobe XD manifest/AGC JSON, Shopify OS 2.0 JSON / Liquid, WordPress Gutenberg block HTML / theme.json, raw HTML5, Tailwind snippet, React functional component JSX, or SVG vector code..."
            rows={10}
            style={{
              width: '100%',
              background: '#040711',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#E2E8F0',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              padding: '12px 14px',
              outline: 'none',
              resize: 'vertical',
            }}
          />

          {/* Configuration Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px',
            }}
          >
            {/* Destination Selection */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '6px' }}>
                Import Destination:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: destination === 'new_section' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="dest"
                    checked={destination === 'new_section'}
                    onChange={() => setDestination('new_section')}
                  />
                  <span>New Section Block</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: destination === 'active_section' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="dest"
                    checked={destination === 'active_section'}
                    onChange={() => setDestination('active_section')}
                  />
                  <span>Into Active Scene</span>
                </label>
              </div>
            </div>

            {/* Pipeline Feature Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>
                Ingestion Optimizations:
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={extractTokens}
                  onChange={(e) => setExtractTokens(e.target.checked)}
                />
                <span>Extract & harmonize design tokens into theme</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={localizeAssets}
                  onChange={(e) => setLocalizeAssets(e.target.checked)}
                />
                <span>Localize remote images (SHA-256 deduplicated, SSRF-safe)</span>
              </label>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              style={{
                fontSize: '0.75rem',
                color: statusMessage.startsWith('Error') ? '#EF4444' : '#DFBA6B',
                background: statusMessage.startsWith('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(223, 186, 107, 0.1)',
                border: statusMessage.startsWith('Error') ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(223, 186, 107, 0.2)',
                borderRadius: '6px',
                padding: '8px 12px',
              }}
            >
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
            <ShieldCheck size={14} style={{ color: '#10B981' }} />
            <span>Zero-Trust SSRF & XSS Security Sanitizer active</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleOpenCorrectionStudio}
              disabled={isProcessing || !code.trim()}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#93C5FD',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sliders size={14} />
              <span>Inspect Visual Diff</span>
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={isProcessing || !code.trim()}
              style={{
                background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                color: '#060B1A',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(223, 186, 107, 0.25)',
              }}
            >
              <Sparkles size={15} />
              <span>{isProcessing ? 'Importing...' : 'Import to Canvas'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Diff & Import Correction Studio */}
      {correctionData && (
        <ImportCorrectionStudio
          isOpen={true}
          onClose={() => setCorrectionData(null)}
          rawSourceCode={code}
          detectedFormat={detectedFormat}
          projectIR={correctionData.projectIR}
          compiledSceneGraph={correctionData.compiledSceneGraph}
          onCommit={(finalSceneGraph) => {
            if (destination === 'new_section') {
              const templateScene: TemplateSceneDefinition = {
                id: `imported_sec_${Date.now()}`,
                order: 99,
                name: correctionData.projectIR.pages[0]?.sections[0]?.name || 'Imported Section',
                slug: 'imported-section',
                purpose: 'Imported via OrbitoX Universal Importer',
                sceneType: 'custom',
                scrollMode: 'normal',
                isRequired: false,
                defaultVisible: true,
                customerToggleable: true,
                navigationLabel: 'Imported',
                layers: [],
                renderMode: 'graph',
                sceneGraph: finalSceneGraph as any,
                motionPreset: 'subtle',
                motionConfig: {
                  entryDuration: 0.6,
                  entryDelay: 0,
                  parallaxDepth: 0.2,
                  staggerDelay: 0.05,
                  easing: 'ease-out',
                  reducedMotionFallback: 'fade',
                },
                interactions: [],
                transitionToNext: { type: 'fade', durationMs: 400, easing: 'ease-out' },
                layoutRules: {
                  desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1440 },
                  tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
                  mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
                },
                accessibility: { screenReaderTitle: 'Imported Section', ariaRole: 'region' },
              };
              onInsertSection(templateScene);
            } else {
              onInsertNodesToActiveScene(finalSceneGraph.nodes as any, finalSceneGraph.rootNodeId);
            }
            setCorrectionData(null);
            onClose();
          }}
        />
      )}
    </div>
  );
}
