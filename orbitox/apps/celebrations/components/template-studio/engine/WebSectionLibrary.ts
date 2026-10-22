import { SceneGraph } from './SceneGraphTypes';
import { TemplateSceneDefinition } from '../types/TemplateSchema';
import { SceneBuilder } from './TemplateFactory';

export interface WebSectionBlock {
  id: string;
  title: string;
  category: 'Navbar' | 'Hero' | 'Features' | 'Bento' | 'Pricing' | 'Testimonials' | 'FAQ' | 'Timeline' | 'CTA' | 'Contact' | 'Gallery' | 'Footer';
  description: string;
  icon: string;
  createScene: (title?: string) => TemplateSceneDefinition;
}

export class WebSectionLibrary {
  private static blocks: Map<string, WebSectionBlock> = new Map();

  static register(block: WebSectionBlock) {
    this.blocks.set(block.id, block);
  }

  static get(id: string): WebSectionBlock | undefined {
    return this.blocks.get(id);
  }

  static getAll(): WebSectionBlock[] {
    return Array.from(this.blocks.values());
  }

  static getByCategory(category: WebSectionBlock['category']): WebSectionBlock[] {
    return this.getAll().filter((b) => b.category === category);
  }

  // ─── 1. NAVBAR ──────────────────────────────────────────
  static buildNavbarScene(name: string = 'Navigation Bar'): SceneGraph {
    const sb = new SceneBuilder('Navbar Root');

    // Header container (Auto-layout flex horizontal)
    const navId = sb.addNode(null, 'frame', {
      name: 'Navbar Container',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'horizontal',
        gap: '2rem',
        padding: { top: '1.25rem', right: '4rem', bottom: '1.25rem', left: '4rem' },
        alignment: { primary: 'space-between', cross: 'center' },
        wrap: false,
        sizing: { primary: 'fill', cross: 'hug' },
      },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 50 },
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
        border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        effects: { backdropBlur: '12px' },
      },
    });

    // Logo & Brand
    sb.addNode(navId, 'text', {
      name: 'Brand Logo',
      textContent: 'ORBITOX',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.15em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    // Nav Links Stack
    const linksId = sb.addNode(navId, 'stack', {
      name: 'Nav Links',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'horizontal',
        gap: '2rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'hug' },
      },
      responsive: {
        mobile: { hidden: true },
      },
    });

    ['Features', 'Solutions', 'Pricing', 'Docs'].forEach((label) => {
      sb.addNode(linksId, 'text', {
        name: `Nav Link - ${label}`,
        textContent: label,
        style: {
          typography: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem', fontWeight: 500,
            color: { type: 'token', tokenPath: 'colors.textSecondary' },
          },
        },
        interactions: [
          { trigger: 'onTap', action: 'navigate', payload: { url: `#${label.toLowerCase()}` } },
        ],
      });
    });

    // CTA Button
    sb.addNode(navId, 'button', {
      name: 'Nav CTA Button',
      textContent: 'Get Started',
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
        border: { radius: '999px', width: '0px' },
        padding: '10px 22px',
        typography: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem', fontWeight: 600,
          color: { type: 'solid', value: '#060B1A' },
        },
      },
      interactions: [
        { trigger: 'onTap', action: 'openModal', payload: { modalId: 'get_started' } },
      ],
    });

    return sb.build();
  }

  // ─── 2. HERO (GRAND CENTERED) ───────────────────────────
  static buildHeroCenteredScene(name: string = 'Grand Hero'): SceneGraph {
    const sb = new SceneBuilder('Hero Root');

    // Section Stack
    const heroId = sb.addNode(null, 'stack', {
      name: 'Hero Center Stack',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '1.75rem',
        padding: { top: '8rem', right: '2rem', bottom: '8rem', left: '2rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'fill' },
      },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
    });

    // Eyebrow Tag
    sb.addNode(heroId, 'text', {
      name: 'Hero Eyebrow',
      textContent: '✨ NEXT-GENERATION VISUAL ENGINE',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    // Main Display Heading
    sb.addNode(heroId, 'text', {
      name: 'Hero Main Headline',
      textContent: 'Design, Build & Ship Production Websites at Light Speed',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '4rem', fontWeight: 800, textAlign: 'center', lineHeight: 1.1, maxWidth: '900px',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
      responsive: {
        mobile: { typography: { fontSize: '2.4rem', lineHeight: 1.15 } },
        tablet: { typography: { fontSize: '3.2rem' } },
      },
    });

    // Subtitle paragraph
    sb.addNode(heroId, 'text', {
      name: 'Hero Subtitle',
      textContent: 'A unified visual studio combining the ease of Figma with full multi-tenant production hosting, live data binding, and autonomous zero-code deployment.',
      style: {
        typography: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.25rem', fontWeight: 400, textAlign: 'center', lineHeight: 1.6, maxWidth: '680px',
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
      },
    });

    // Button Actions Row
    const btnRowId = sb.addNode(heroId, 'stack', {
      name: 'Hero Action Buttons',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'horizontal',
        gap: '1rem',
        padding: { top: '0.5rem', right: 0, bottom: 0, left: 0 },
        alignment: { primary: 'center', cross: 'center' },
        wrap: true,
        sizing: { primary: 'hug', cross: 'hug' },
      },
    });

    sb.addNode(btnRowId, 'button', {
      name: 'Primary CTA',
      textContent: 'Start Building Free',
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
        border: { radius: '999px', width: '0px' },
        padding: '16px 36px',
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1rem', fontWeight: 700,
          color: { type: 'solid', value: '#060B1A' },
        },
      },
      interactions: [{ trigger: 'onTap', action: 'navigate', payload: { url: '/create' } }],
    });

    sb.addNode(btnRowId, 'button', {
      name: 'Secondary Demo CTA',
      textContent: 'Explore Interactive Demo',
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfaceSecondary' } },
        border: { radius: '999px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        padding: '16px 32px',
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1rem', fontWeight: 600,
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
      interactions: [{ trigger: 'onTap', action: 'openModal', payload: { modalId: 'demo' } }],
    });

    return sb.build();
  }

  // ─── 3. SPLIT HERO (SHOWCASE) ───────────────────────────
  static buildHeroSplitScene(name: string = 'Split Showcase Hero'): SceneGraph {
    const sb = new SceneBuilder('Split Hero Root');

    const splitId = sb.addNode(null, 'frame', {
      name: 'Split Layout Container',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'horizontal',
        gap: '4rem',
        padding: { top: '6rem', right: '4rem', bottom: '6rem', left: '4rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'fill', cross: 'hug' },
      },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      responsive: {
        mobile: { layoutConfig: { direction: 'vertical', gap: '2.5rem', padding: { top: '3rem', right: '1.5rem', bottom: '3rem', left: '1.5rem' } } },
        tablet: { layoutConfig: { direction: 'vertical' } },
      },
    });

    // Left Column (Copy)
    const leftColId = sb.addNode(splitId, 'stack', {
      name: 'Hero Content Column',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '1.5rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { primary: 'start', cross: 'start' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'fill' },
      },
    });

    sb.addNode(leftColId, 'text', {
      name: 'Split Eyebrow',
      textContent: 'ENTERPRISE PLATFORM',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.2em',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    sb.addNode(leftColId, 'text', {
      name: 'Split Heading',
      textContent: 'High-Performance Visual Experiences Built for Growth',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '3.25rem', fontWeight: 800, lineHeight: 1.15,
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(leftColId, 'text', {
      name: 'Split Body',
      textContent: 'Harness declarative visual graphs to craft dynamic responsive experiences without writing bespoke React JSX.',
      style: {
        typography: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.15rem', fontWeight: 400, lineHeight: 1.6,
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
      },
    });

    sb.addNode(leftColId, 'button', {
      name: 'Split CTA Button',
      textContent: 'Launch Workspace →',
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
        border: { radius: '10px', width: '0px' },
        padding: '14px 28px',
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1rem', fontWeight: 700,
          color: { type: 'solid', value: '#060B1A' },
        },
      },
    });

    // Right Column (Showcase Card)
    sb.addNode(splitId, 'image', {
      name: 'Showcase Image Card',
      geometry: { position: 'relative', x: 0, y: 0, width: '480px', height: '360px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {
        background: {
          type: 'image',
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80',
          size: 'cover',
          position: 'center',
        },
        border: { radius: '20px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        shadow: { boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
      },
      responsive: {
        mobile: { width: '100%', height: '240px' },
      },
    });

    return sb.build();
  }

  // ─── 4. FEATURE GRID ────────────────────────────────────
  static buildFeatureGridScene(name: string = 'Feature Grid'): SceneGraph {
    const sb = new SceneBuilder('Feature Grid Root');

    const containerId = sb.addNode(null, 'stack', {
      name: 'Features Section Stack',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '3.5rem',
        padding: { top: '6rem', right: '4rem', bottom: '6rem', left: '4rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'fill' },
      },
      responsive: {
        mobile: { layoutConfig: { padding: { top: '3rem', right: '1.5rem', bottom: '3rem', left: '1.5rem' } } },
      },
    });

    // Section Header
    const headerId = sb.addNode(containerId, 'stack', {
      name: 'Header Group',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '0.75rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'hug' },
      },
    });

    sb.addNode(headerId, 'text', {
      name: 'Features Eyebrow',
      textContent: 'POWERFUL ARCHITECTURE',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.2em',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    sb.addNode(headerId, 'text', {
      name: 'Features Title',
      textContent: 'Engineered for Flawless Reliability',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '2.75rem', fontWeight: 800, textAlign: 'center',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    // 3-Column Grid
    const gridId = sb.addNode(containerId, 'grid', {
      name: 'Cards Grid',
      layoutMode: 'grid',
      layoutConfig: {
        columns: 3,
        rows: 1,
        gap: '2rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { horizontal: 'stretch', vertical: 'stretch' },
      },
      responsive: {
        mobile: { layoutConfig: { columns: 1 } },
        tablet: { layoutConfig: { columns: 2 } },
      },
    });

    const features = [
      { icon: '⚡', title: 'Real-Time Reactivity', desc: 'Edits project instantaneously across design canvas, preview viewport, and multi-tenant production endpoints.' },
      { icon: '🔒', title: 'Zero-Trust Security', desc: 'Digital signatures on AST schemas, cryptographic anti-tamper validation, and tenant isolation by default.' },
      { icon: '📱', title: 'Responsive Cascades', desc: 'Six distinct viewport targets with deterministic inheritance rules ensuring pixel-perfect delivery on all screens.' },
    ];

    for (const f of features) {
      const cardId = sb.addNode(gridId, 'frame', {
        name: `Card - ${f.title}`,
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'vertical',
          gap: '1rem',
          padding: { top: '2rem', right: '2rem', bottom: '2rem', left: '2rem' },
          alignment: { primary: 'start', cross: 'start' },
          wrap: false,
          sizing: { primary: 'hug', cross: 'fill' },
        },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
          border: { radius: '16px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        },
      });

      sb.addNode(cardId, 'text', {
        name: 'Icon',
        textContent: f.icon,
        style: { typography: { fontSize: '2rem' } },
      });

      sb.addNode(cardId, 'text', {
        name: 'Title',
        textContent: f.title,
        style: {
          typography: {
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.25rem', fontWeight: 700,
            color: { type: 'token', tokenPath: 'colors.textPrimary' },
          },
        },
      });

      sb.addNode(cardId, 'text', {
        name: 'Description',
        textContent: f.desc,
        style: {
          typography: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.5,
            color: { type: 'token', tokenPath: 'colors.textSecondary' },
          },
        },
      });
    }

    return sb.build();
  }

  // ─── 5. PRICING TABLE ───────────────────────────────────
  static buildPricingTableScene(name: string = 'Pricing Tiers'): SceneGraph {
    const sb = new SceneBuilder('Pricing Root');

    const containerId = sb.addNode(null, 'stack', {
      name: 'Pricing Section Container',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '3rem',
        padding: { top: '6rem', right: '4rem', bottom: '6rem', left: '4rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'fill' },
      },
      responsive: {
        mobile: { layoutConfig: { padding: { top: '3rem', right: '1.5rem', bottom: '3rem', left: '1.5rem' } } },
      },
    });

    sb.addNode(containerId, 'text', {
      name: 'Pricing Title',
      textContent: 'Transparent Plans for Any Scale',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '2.75rem', fontWeight: 800, textAlign: 'center',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    const gridId = sb.addNode(containerId, 'grid', {
      name: 'Pricing Cards Grid',
      layoutMode: 'grid',
      layoutConfig: {
        columns: 3,
        rows: 1,
        gap: '2rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { horizontal: 'stretch', vertical: 'stretch' },
      },
      responsive: {
        mobile: { layoutConfig: { columns: 1 } },
        tablet: { layoutConfig: { columns: 1 } },
      },
    });

    const tiers = [
      { name: 'Starter', price: '$29', desc: 'Ideal for independent creators and personal brands.', popular: false },
      { name: 'Professional', price: '$89', desc: 'Built for high-growth SaaS and agency client deployments.', popular: true },
      { name: 'Enterprise', price: '$249', desc: 'Complete multi-tenant isolation, custom domains, and SLA.', popular: false },
    ];

    for (const t of tiers) {
      const cardId = sb.addNode(gridId, 'frame', {
        name: `Pricing Tier - ${t.name}`,
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'vertical',
          gap: '1.25rem',
          padding: { top: '2.5rem', right: '2rem', bottom: '2.5rem', left: '2rem' },
          alignment: { primary: 'start', cross: 'start' },
          wrap: false,
          sizing: { primary: 'hug', cross: 'fill' },
        },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: t.popular ? 'colors.surfaceElevated' : 'colors.surfacePrimary' } },
          border: {
            radius: '16px',
            width: t.popular ? '2px' : '1px',
            color: { type: 'token', tokenPath: t.popular ? 'colors.accentPrimary' : 'colors.borderSubtle' },
          },
        },
      });

      sb.addNode(cardId, 'text', {
        name: 'Tier Name',
        textContent: t.name,
        style: {
          typography: {
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.25rem', fontWeight: 700,
            color: { type: 'token', tokenPath: t.popular ? 'colors.accentPrimary' : 'colors.textPrimary' },
          },
        },
      });

      sb.addNode(cardId, 'text', {
        name: 'Tier Price',
        textContent: `${t.price} / mo`,
        style: {
          typography: {
            fontFamily: "'Outfit', sans-serif",
            fontSize: '2.5rem', fontWeight: 800,
            color: { type: 'token', tokenPath: 'colors.textPrimary' },
          },
        },
      });

      sb.addNode(cardId, 'text', {
        name: 'Tier Description',
        textContent: t.desc,
        style: {
          typography: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.5,
            color: { type: 'token', tokenPath: 'colors.textSecondary' },
          },
        },
      });

      sb.addNode(cardId, 'button', {
        name: 'Tier Button',
        textContent: t.popular ? 'Get Started Pro' : 'Choose Plan',
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: t.popular ? 'colors.accentPrimary' : 'colors.surfaceSecondary' } },
          border: { radius: '8px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
          padding: '12px 24px',
          typography: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.95rem', fontWeight: 600,
            color: { type: 'solid', value: t.popular ? '#060B1A' : '#FFFFFF' },
          },
        },
      });
    }

    return sb.build();
  }

  // ─── 6. FOOTER ──────────────────────────────────────────
  static buildFooterScene(name: string = 'Multi-Column Footer'): SceneGraph {
    const sb = new SceneBuilder('Footer Root');

    const footerId = sb.addNode(null, 'frame', {
      name: 'Footer Container',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '3rem',
        padding: { top: '5rem', right: '4rem', bottom: '3rem', left: '4rem' },
        alignment: { primary: 'start', cross: 'start' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'fill' },
      },
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
        border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
      },
      responsive: {
        mobile: { layoutConfig: { padding: { top: '3rem', right: '1.5rem', bottom: '2rem', left: '1.5rem' } } },
      },
    });

    const columnsId = sb.addNode(footerId, 'frame', {
      name: 'Footer Columns Row',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'horizontal',
        gap: '3rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { primary: 'space-between', cross: 'start' },
        wrap: true,
        sizing: { primary: 'fill', cross: 'hug' },
      },
    });

    // Brand info
    const brandColId = sb.addNode(columnsId, 'stack', {
      name: 'Brand Column',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '1rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { primary: 'start', cross: 'start' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'hug' },
      },
    });

    sb.addNode(brandColId, 'text', {
      name: 'Brand Header',
      textContent: 'ORBITOX PLATFORM',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.1em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(brandColId, 'text', {
      name: 'Brand Tagline',
      textContent: 'Autonomous Multi-Tenant Digital Experience Operating System.',
      style: {
        typography: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.9rem', fontWeight: 400, maxWidth: '280px', lineHeight: 1.5,
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
      },
    });

    // Copyright & bottom line
    sb.addNode(footerId, 'text', {
      name: 'Copyright Notice',
      textContent: '© 2026 OrbitoX Systems Inc. All rights reserved. Zero-Code SceneGraph Engine.',
      style: {
        typography: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.85rem', fontWeight: 400,
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
      },
    });

    return sb.build();
  }

  // ─── 7. VIDEO SHOWCASE HERO ───────────────────────────────
  static buildVideoHeroScene(name: string = 'Cinematic Video Hero'): SceneGraph {
    const sb = new SceneBuilder('Video Hero Root');
    const heroId = sb.addNode(null, 'frame', {
      name: 'Video Hero Container',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '1.5rem',
        padding: { top: '6rem', right: '2rem', bottom: '6rem', left: '2rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'fill', cross: 'fill' },
      },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: '100vh', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.backgroundPrimary' } },
      },
    });

    sb.addNode(heroId, 'text', {
      name: 'Video Badge',
      textContent: '✦ CINEMATIC 4K STREAM',
      style: {
        typography: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.2em', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
        padding: '6px 14px',
        border: { radius: '9999px', width: '1px', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
      },
    });

    sb.addNode(heroId, 'text', {
      name: 'Video Headline',
      textContent: 'Immerse Your Audience in Moving Starlight',
      style: {
        typography: { fontFamily: "'Cinzel', serif", fontSize: '3.75rem', fontWeight: 800, textAlign: 'center', color: { type: 'token', tokenPath: 'colors.textPrimary' } },
      },
    });

    sb.addNode(heroId, 'button', {
      name: 'Play Reel Button',
      textContent: '▶ Watch Showreel',
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
        border: { radius: '9999px', width: '0px' },
        padding: '16px 36px',
        typography: { fontFamily: "'Inter', sans-serif", fontSize: '1rem', fontWeight: 700, color: { type: 'solid', value: '#060B1A' } },
      },
    });

    return sb.build();
  }

  // ─── 8. BENTO GRID SHOWCASE ──────────────────────────────
  static buildBentoGridScene(name: string = 'Bento Architecture'): SceneGraph {
    const sb = new SceneBuilder('Bento Root');
    const containerId = sb.addNode(null, 'frame', {
      name: 'Bento Container',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '2.5rem',
        padding: { top: '5rem', right: '4rem', bottom: '5rem', left: '4rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'fill', cross: 'fill' },
      },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: { background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.backgroundPrimary' } } },
    });

    sb.addNode(containerId, 'text', {
      name: 'Bento Title',
      textContent: 'Designed for Uncompromising Velocity',
      style: {
        typography: { fontFamily: "'Outfit', sans-serif", fontSize: '2.75rem', fontWeight: 800, textAlign: 'center', color: { type: 'token', tokenPath: 'colors.textPrimary' } },
      },
    });

    const gridId = sb.addNode(containerId, 'grid', {
      name: 'Bento Grid 4-Cell',
      layoutMode: 'grid',
      layoutConfig: {
        columns: 2,
        rows: 2,
        gap: '1.5rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { horizontal: 'stretch', vertical: 'stretch' },
      },
    });

    const bentoCards = [
      { title: 'Sub-Millisecond Engine', desc: 'Edge-distributed Graph Runtime with zero runtime serialization overhead.', tag: 'PERFORMANCE' },
      { title: 'Zero-Trust Sandboxing', desc: 'Cryptographically signed Ed25519 payloads and immutable tenant isolation.', tag: 'SECURITY' },
      { title: 'Visual Motion Driver', desc: '60 FPS spring physics with time ruler keyframes and scroll scrubbers.', tag: 'MOTION' },
      { title: '3D Spatial Viewports', desc: 'Lazy WebGL initialization with orbital controls and camera shaders.', tag: '3D SPATIAL' },
    ];

    for (const b of bentoCards) {
      const card = sb.addNode(gridId, 'frame', {
        name: `Bento Card - ${b.tag}`,
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'vertical',
          gap: '1rem',
          padding: { top: '2rem', right: '2rem', bottom: '2rem', left: '2rem' },
          alignment: { primary: 'start', cross: 'start' },
          wrap: false,
          sizing: { primary: 'hug', cross: 'fill' },
        },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
          border: { radius: '16px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        },
      });

      sb.addNode(card, 'text', {
        name: 'Card Tag',
        textContent: b.tag,
        style: { typography: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: { type: 'token', tokenPath: 'colors.accentPrimary' } } },
      });

      sb.addNode(card, 'text', {
        name: 'Card Title',
        textContent: b.title,
        style: { typography: { fontFamily: "'Outfit', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
      });

      sb.addNode(card, 'text', {
        name: 'Card Description',
        textContent: b.desc,
        style: { typography: { fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.5, color: { type: 'token', tokenPath: 'colors.textSecondary' } } },
      });
    }

    return sb.build();
  }

  // ─── 9. TESTIMONIALS WALL ─────────────────────────────────
  static buildTestimonialsScene(name: string = 'Testimonial Wall'): SceneGraph {
    const sb = new SceneBuilder('Testimonials Root');
    const containerId = sb.addNode(null, 'frame', {
      name: 'Testimonials Container',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '2.5rem',
        padding: { top: '5rem', right: '4rem', bottom: '5rem', left: '4rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'fill', cross: 'fill' },
      },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: { background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } } },
    });

    sb.addNode(containerId, 'text', {
      name: 'Testimonials Title',
      textContent: 'Loved by World-Class Creators',
      style: { typography: { fontFamily: "'Cinzel', serif", fontSize: '2.75rem', fontWeight: 800, textAlign: 'center', color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
    });

    const gridId = sb.addNode(containerId, 'grid', {
      name: 'Testimonials Grid',
      layoutMode: 'grid',
      layoutConfig: { columns: 3, rows: 1, gap: '1.5rem', padding: { top: 0, right: 0, bottom: 0, left: 0 }, alignment: { horizontal: 'stretch', vertical: 'stretch' } },
    });

    const reviews = [
      { quote: 'OrbitoX transformed how we author high-stakes digital experiences. The visual motion timeline is unmatched.', author: 'Elena Rostova', role: 'Design Director, Starlight Agency' },
      { quote: 'We deployed 40+ client sites in a month without writing custom CSS boilerplate. The Design Universes are magic.', author: 'Marcus Vance', role: 'Principal Architect, Nexus SaaS' },
      { quote: 'The zero-trust multi-tenancy and 3D WebGL engine feel like software from the future.', author: 'Aria Chen', role: 'Creative Technologist, Horizon Lab' },
    ];

    for (const r of reviews) {
      const card = sb.addNode(gridId, 'frame', {
        name: `Testimonial - ${r.author}`,
        layoutMode: 'flex',
        layoutConfig: { direction: 'vertical', gap: '1rem', padding: { top: '2rem', right: '1.75rem', bottom: '2rem', left: '1.75rem' }, alignment: { primary: 'start', cross: 'start' }, wrap: false, sizing: { primary: 'hug', cross: 'fill' } },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.backgroundPrimary' } },
          border: { radius: '14px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        },
      });

      sb.addNode(card, 'text', {
        name: 'Rating Stars',
        textContent: '★★★★★',
        style: { typography: { fontFamily: 'sans-serif', fontSize: '1rem', color: { type: 'token', tokenPath: 'colors.accentPrimary' } } },
      });

      sb.addNode(card, 'text', {
        name: 'Quote Text',
        textContent: `"${r.quote}"`,
        style: { typography: { fontFamily: "'Inter', sans-serif", fontSize: '0.92rem', fontWeight: 400, lineHeight: 1.6, color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
      });

      sb.addNode(card, 'text', {
        name: 'Author Name',
        textContent: r.author,
        style: { typography: { fontFamily: "'Outfit', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: { type: 'token', tokenPath: 'colors.accentPrimary' } } },
      });
    }

    return sb.build();
  }

  // ─── 10. FAQ ACCORDION ────────────────────────────────────
  static buildFaqScene(name: string = 'FAQ Section'): SceneGraph {
    const sb = new SceneBuilder('FAQ Root');
    const containerId = sb.addNode(null, 'frame', {
      name: 'FAQ Container',
      layoutMode: 'flex',
      layoutConfig: { direction: 'vertical', gap: '2rem', padding: { top: '5rem', right: '4rem', bottom: '5rem', left: '4rem' }, alignment: { primary: 'center', cross: 'center' }, wrap: false, sizing: { primary: 'fill', cross: 'fill' } },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: { background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.backgroundPrimary' } } },
    });

    sb.addNode(containerId, 'text', {
      name: 'FAQ Title',
      textContent: 'Frequently Asked Questions',
      style: { typography: { fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
    });

    const faqs = [
      { q: 'Can I export clean HTML/CSS from OrbitoX?', a: 'Yes. OrbitoX compiles standard SceneGraph nodes into clean, highly optimized semantic HTML and CSS.' },
      { q: 'Does 3D WebGL impact page loading speeds?', a: 'No. OrbitoX uses capability-based rendering. Standard 2D pages incur zero Three.js or WebGL overhead.' },
      { q: 'Can I customize typography across the whole website?', a: 'Yes. The Typography Studio allows 1-click global font pairings that apply instantly to all headings, body, and accents.' },
    ];

    for (const f of faqs) {
      const card = sb.addNode(containerId, 'frame', {
        name: 'FAQ Item',
        layoutMode: 'flex',
        layoutConfig: { direction: 'vertical', gap: '0.5rem', padding: { top: '1.25rem', right: '1.5rem', bottom: '1.25rem', left: '1.5rem' }, alignment: { primary: 'start', cross: 'start' }, wrap: false, sizing: { primary: 'hug', cross: 'fill' } },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
          border: { radius: '10px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        },
      });

      sb.addNode(card, 'text', {
        name: 'Question',
        textContent: f.q,
        style: { typography: { fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
      });

      sb.addNode(card, 'text', {
        name: 'Answer',
        textContent: f.a,
        style: { typography: { fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.5, color: { type: 'token', tokenPath: 'colors.textSecondary' } } },
      });
    }

    return sb.build();
  }

  // ─── 11. TIMELINE PROCESS ─────────────────────────────────
  static buildTimelineScene(name: string = 'Timeline Process'): SceneGraph {
    const sb = new SceneBuilder('Timeline Root');
    const containerId = sb.addNode(null, 'frame', {
      name: 'Timeline Container',
      layoutMode: 'flex',
      layoutConfig: { direction: 'vertical', gap: '2rem', padding: { top: '5rem', right: '4rem', bottom: '5rem', left: '4rem' }, alignment: { primary: 'center', cross: 'center' }, wrap: false, sizing: { primary: 'fill', cross: 'fill' } },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: { background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.backgroundPrimary' } } },
    });

    sb.addNode(containerId, 'text', {
      name: 'Timeline Title',
      textContent: 'How It Works in Four Steps',
      style: { typography: { fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
    });

    const steps = [
      { step: '01', title: 'Choose Design Universe', desc: 'Pick your signature visual vibe, color scheme, and typography pairing.' },
      { step: '02', title: 'Assemble Sections', desc: 'Drag pre-composed responsive blocks or remix layouts in real-time.' },
      { step: '03', title: 'Choreograph Motion', desc: 'Set keyframes, spring physics, and scroll triggers on the visual timeline.' },
      { step: '04', title: 'Publish Cryptographically', desc: 'Deploy globally to Edge CDN signed with Ed25519 security.' },
    ];

    const grid = sb.addNode(containerId, 'grid', {
      name: 'Timeline Steps Grid',
      layoutMode: 'grid',
      layoutConfig: { columns: 4, rows: 1, gap: '1.5rem', padding: { top: 0, right: 0, bottom: 0, left: 0 }, alignment: { horizontal: 'stretch', vertical: 'stretch' } },
    });

    for (const s of steps) {
      const stepCard = sb.addNode(grid, 'frame', {
        name: `Step ${s.step}`,
        layoutMode: 'flex',
        layoutConfig: { direction: 'vertical', gap: '0.75rem', padding: { top: '1.5rem', right: '1.25rem', bottom: '1.5rem', left: '1.25rem' }, alignment: { primary: 'start', cross: 'start' }, wrap: false, sizing: { primary: 'hug', cross: 'fill' } },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
          border: { radius: '12px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        },
      });

      sb.addNode(stepCard, 'text', {
        name: 'Step Number',
        textContent: s.step,
        style: { typography: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: { type: 'token', tokenPath: 'colors.accentPrimary' } } },
      });

      sb.addNode(stepCard, 'text', {
        name: 'Step Title',
        textContent: s.title,
        style: { typography: { fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
      });

      sb.addNode(stepCard, 'text', {
        name: 'Step Desc',
        textContent: s.desc,
        style: { typography: { fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', fontWeight: 400, lineHeight: 1.5, color: { type: 'token', tokenPath: 'colors.textSecondary' } } },
      });
    }

    return sb.build();
  }

  // ─── 12. CTA BANNER ───────────────────────────────────────
  static buildCtaScene(name: string = 'Call to Action'): SceneGraph {
    const sb = new SceneBuilder('CTA Root');
    const containerId = sb.addNode(null, 'frame', {
      name: 'CTA Container',
      layoutMode: 'flex',
      layoutConfig: { direction: 'vertical', gap: '1.5rem', padding: { top: '5rem', right: '4rem', bottom: '5rem', left: '4rem' }, alignment: { primary: 'center', cross: 'center' }, wrap: false, sizing: { primary: 'fill', cross: 'fill' } },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {
        background: { type: 'gradient', gradient: { type: 'linear', angle: 135, stops: [{ position: 0, color: 'rgba(223, 186, 107, 0.2)' }, { position: 1, color: 'rgba(139, 92, 246, 0.2)' }] } },
        border: { radius: '20px', width: '1px', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
      },
    });

    sb.addNode(containerId, 'text', {
      name: 'CTA Heading',
      textContent: 'Ready to Build Something Extraordinary?',
      style: { typography: { fontFamily: "'Outfit', sans-serif", fontSize: '3rem', fontWeight: 800, textAlign: 'center', color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
    });

    sb.addNode(containerId, 'text', {
      name: 'CTA Subtitle',
      textContent: 'Join thousands of visionaries designing websites with OrbitoX Visual Studio.',
      style: { typography: { fontFamily: "'Inter', sans-serif", fontSize: '1.1rem', fontWeight: 400, textAlign: 'center', color: { type: 'token', tokenPath: 'colors.textSecondary' } } },
    });

    sb.addNode(containerId, 'button', {
      name: 'CTA Button',
      textContent: 'Start Designing Free',
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
        border: { radius: '8px', width: '0px' },
        padding: '14px 32px',
        typography: { fontFamily: "'Inter', sans-serif", fontSize: '1rem', fontWeight: 700, color: { type: 'solid', value: '#060B1A' } },
      },
    });

    return sb.build();
  }

  // ─── 13. CONTACT FORM ─────────────────────────────────────
  static buildContactScene(name: string = 'Contact Form'): SceneGraph {
    const sb = new SceneBuilder('Contact Root');
    const containerId = sb.addNode(null, 'frame', {
      name: 'Contact Container',
      layoutMode: 'flex',
      layoutConfig: { direction: 'vertical', gap: '2rem', padding: { top: '5rem', right: '4rem', bottom: '5rem', left: '4rem' }, alignment: { primary: 'center', cross: 'center' }, wrap: false, sizing: { primary: 'fill', cross: 'fill' } },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: { background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.backgroundPrimary' } } },
    });

    sb.addNode(containerId, 'text', {
      name: 'Contact Heading',
      textContent: 'Connect with Our Studio',
      style: { typography: { fontFamily: "'Cinzel', serif", fontSize: '2.75rem', fontWeight: 800, textAlign: 'center', color: { type: 'token', tokenPath: 'colors.textPrimary' } } },
    });

    const formFrame = sb.addNode(containerId, 'frame', {
      name: 'Form Card',
      layoutMode: 'flex',
      layoutConfig: { direction: 'vertical', gap: '1.25rem', padding: { top: '2.5rem', right: '2.5rem', bottom: '2.5rem', left: '2.5rem' }, alignment: { primary: 'start', cross: 'stretch' }, wrap: false, sizing: { primary: 'hug', cross: 'fill' } },
      geometry: { position: 'flow', x: 0, y: 0, width: '560px', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
        border: { radius: '16px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
      },
    });

    sb.addNode(formFrame, 'text', {
      name: 'Input Name Placeholder',
      textContent: 'Full Name: Elena Rostova',
      style: { typography: { fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: { type: 'token', tokenPath: 'colors.textSecondary' } }, padding: '12px 16px', border: { radius: '8px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } } },
    });

    sb.addNode(formFrame, 'text', {
      name: 'Input Email Placeholder',
      textContent: 'Work Email: elena@starlight.io',
      style: { typography: { fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: { type: 'token', tokenPath: 'colors.textSecondary' } }, padding: '12px 16px', border: { radius: '8px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } } },
    });

    sb.addNode(formFrame, 'button', {
      name: 'Send Decree Button',
      textContent: 'Submit Inquiry Decree ✦',
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
        border: { radius: '8px', width: '0px' },
        padding: '14px 24px',
        typography: { fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: { type: 'solid', value: '#060B1A' } },
      },
    });

    return sb.build();
  }

  // ─── 14. GALLERY ──────────────────────────────────────────
  static buildGalleryScene(name: string = 'Curated Gallery'): SceneGraph {
    const sb = new SceneBuilder(name);

    const sectionId = sb.addNode(null, 'frame', {
      name: 'Gallery Section Container',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '2.5rem',
        padding: { top: '5rem', right: '3rem', bottom: '5rem', left: '3rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'fill', cross: 'hug' },
      },
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.backgroundSecondary' } },
      },
    });

    const headerId = sb.addNode(sectionId, 'stack', {
      name: 'Gallery Header Stack',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '0.75rem',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'hug' },
      },
    });

    sb.addNode(headerId, 'text', {
      name: 'Gallery Eyebrow',
      textContent: 'VISUAL ARCHIVE',
      style: {
        typography: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.2em',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
          textTransform: 'uppercase',
        },
      },
    });

    sb.addNode(headerId, 'text', {
      name: 'Gallery Heading',
      textContent: 'Moments Frozen in Starlight',
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '2.5rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
          textAlign: 'center',
        },
      },
    });

    const gridId = sb.addNode(sectionId, 'grid', {
      name: 'Gallery Grid Container',
      layoutConfig: {
        mode: 'grid',
        columns: 3,
        rows: 1,
        columnGap: '1.5rem',
        rowGap: '1.5rem',
        responsive: {
          tablet: { columns: 2 },
          mobile: { columns: 1 },
        },
      } as any,
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
    });

    const galleryImages = [
      {
        title: 'Celestial Convergence',
        url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
      },
      {
        title: 'Architectural Sanctum',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
      },
      {
        title: 'Golden Luminescence',
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
      },
    ];

    galleryImages.forEach((img, idx) => {
      const cardId = sb.addNode(gridId, 'frame', {
        name: `Gallery Card ${idx + 1}`,
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'vertical',
          gap: '0.75rem',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          alignment: { primary: 'start', cross: 'stretch' },
          wrap: false,
          sizing: { primary: 'fill', cross: 'hug' },
        },
        geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
        style: {
          border: { radius: '16px' },
          shadow: { boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
        },
      });

      sb.addNode(cardId, 'image', {
        name: `Gallery Image ${idx + 1}`,
        geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: '320px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
        style: {
          border: { radius: '16px' },
          background: { type: 'image', image: img.url },
        },
      });

      sb.addNode(cardId, 'text', {
        name: `Gallery Caption ${idx + 1}`,
        textContent: img.title,
        style: {
          typography: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 500,
            color: { type: 'token', tokenPath: 'colors.textSecondary' },
          },
        },
      });
    });

    return sb.build();
  }
}

// ─────────────────────────────────────────────────────────────
// REGISTER CORE PRE-BUILT WEB SECTION BLOCKS
// ─────────────────────────────────────────────────────────────

WebSectionLibrary.register({
  id: 'sec_navbar',
  title: 'Responsive Navbar',
  category: 'Navbar',
  description: 'Clean header bar with brand logo, links, and action button',
  icon: '🧭',
  createScene: (title: string = 'Navigation') => ({
    id: `sec_${Date.now()}_nav`,
    name: title,
    slug: 'navbar',
    order: 0,
    purpose: 'Global top navigation bar',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: false,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildNavbarScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 1440 },
      tablet: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'banner' },
    motionPreset: 'soft',
    motionConfig: { entryDuration: 0.6, entryDelay: 0, parallaxDepth: 0, staggerDelay: 0, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 400, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_hero_centered',
  title: 'Grand Centered Hero',
  category: 'Hero',
  description: 'Monumental headline with dual CTAs and subtitle',
  icon: '🌟',
  createScene: (title: string = 'Hero Section') => ({
    id: `sec_${Date.now()}_hero`,
    name: title,
    slug: 'hero',
    order: 1,
    purpose: 'Primary landing page hero introduction',
    sceneType: 'hero',
    scrollMode: 'normal',
    isRequired: true,
    defaultVisible: true,
    customerToggleable: false,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildHeroCenteredScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.2, entryDelay: 0.1, parallaxDepth: 0.5, staggerDelay: 0.15, easing: 'cubic-bezier', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_hero_split',
  title: 'Split Showcase Hero',
  category: 'Hero',
  description: 'Copy and actions on left, media card visual on right',
  icon: '🖼️',
  createScene: (title: string = 'Split Showcase') => ({
    id: `sec_${Date.now()}_split_hero`,
    name: title,
    slug: 'split-hero',
    order: 1,
    purpose: 'Split headline and product visual showcase',
    sceneType: 'hero',
    scrollMode: 'normal',
    isRequired: true,
    defaultVisible: true,
    customerToggleable: false,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildHeroSplitScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'split', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.2, entryDelay: 0.1, parallaxDepth: 0.5, staggerDelay: 0.15, easing: 'cubic-bezier', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_feature_grid',
  title: '3-Column Feature Grid',
  category: 'Features',
  description: 'Three auto-layout feature cards with icons and descriptions',
  icon: '💎',
  createScene: (title: string = 'Features') => ({
    id: `sec_${Date.now()}_features`,
    name: title,
    slug: 'features',
    order: 2,
    purpose: 'Key product features and benefits grid',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildFeatureGridScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.0, entryDelay: 0.1, parallaxDepth: 0.4, staggerDelay: 0.15, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_pricing_table',
  title: 'Pricing Tiers Table',
  category: 'Pricing',
  description: 'Three pricing cards with features, prices, and highlighted tier',
  icon: '🏷️',
  createScene: (title: string = 'Pricing') => ({
    id: `sec_${Date.now()}_pricing`,
    name: title,
    slug: 'pricing',
    order: 3,
    purpose: 'Subscription and pricing tier options',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildPricingTableScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.0, entryDelay: 0.1, parallaxDepth: 0.4, staggerDelay: 0.15, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_footer',
  title: 'Multi-Column Footer',
  category: 'Footer',
  description: 'Bottom website footer with brand, links, and copyright',
  icon: '📜',
  createScene: (title: string = 'Footer') => ({
    id: `sec_${Date.now()}_footer`,
    name: title,
    slug: 'footer',
    order: 4,
    purpose: 'Global website footer and legal notes',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: false,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildFooterScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 1440 },
      tablet: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'contentinfo' },
    motionPreset: 'soft',
    motionConfig: { entryDuration: 0.6, entryDelay: 0, parallaxDepth: 0, staggerDelay: 0, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 400, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_video_hero',
  title: 'Cinematic Video Hero',
  category: 'Hero',
  description: 'Immersive full-bleed video background with floating CTA and badge',
  icon: '🎬',
  createScene: (title: string = 'Video Hero') => ({
    id: `sec_${Date.now()}_video_hero`,
    name: title,
    slug: 'video-hero',
    order: 1,
    purpose: 'Cinematic full-screen video introduction',
    sceneType: 'hero',
    scrollMode: 'normal',
    isRequired: true,
    defaultVisible: true,
    customerToggleable: false,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildVideoHeroScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 1440 },
      tablet: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 0, paddingBottomRem: 0, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.2, entryDelay: 0.1, parallaxDepth: 0.6, staggerDelay: 0.15, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_bento_grid',
  title: 'Bento Grid Architecture',
  category: 'Bento',
  description: 'Modern 4-cell bento layout with asymmetric cards and glowing borders',
  icon: '🍱',
  createScene: (title: string = 'Bento Grid') => ({
    id: `sec_${Date.now()}_bento`,
    name: title,
    slug: 'bento',
    order: 2,
    purpose: 'High-impact feature showcase bento layout',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildBentoGridScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.0, entryDelay: 0.1, parallaxDepth: 0.4, staggerDelay: 0.15, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_testimonials_wall',
  title: 'Testimonials Wall',
  category: 'Testimonials',
  description: 'Social proof cards with client quotes, verified stars, and roles',
  icon: '💬',
  createScene: (title: string = 'Testimonials') => ({
    id: `sec_${Date.now()}_testimonials`,
    name: title,
    slug: 'testimonials',
    order: 3,
    purpose: 'Customer reviews and authority proof',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildTestimonialsScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.0, entryDelay: 0.1, parallaxDepth: 0.4, staggerDelay: 0.15, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_faq_accordion',
  title: 'FAQ Accordion',
  category: 'FAQ',
  description: 'Clean expandable questions and answers addressing user inquiries',
  icon: '❓',
  createScene: (title: string = 'FAQ') => ({
    id: `sec_${Date.now()}_faq`,
    name: title,
    slug: 'faq',
    order: 4,
    purpose: 'Frequently asked questions',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildFaqScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1000 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'soft',
    motionConfig: { entryDuration: 0.8, entryDelay: 0.1, parallaxDepth: 0.2, staggerDelay: 0.1, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 600, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_timeline_process',
  title: 'Timeline Process',
  category: 'Timeline',
  description: '4-step progression process roadmap with badges and descriptions',
  icon: '⏳',
  createScene: (title: string = 'Process Roadmap') => ({
    id: `sec_${Date.now()}_timeline`,
    name: title,
    slug: 'timeline',
    order: 5,
    purpose: 'Step-by-step product walkthrough or history',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildTimelineScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.0, entryDelay: 0.1, parallaxDepth: 0.4, staggerDelay: 0.15, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_cta_banner',
  title: 'Call to Action Banner',
  category: 'CTA',
  description: 'High-conversion banner with bold headline, subtitle, and primary action',
  icon: '🎯',
  createScene: (title: string = 'Call to Action') => ({
    id: `sec_${Date.now()}_cta`,
    name: title,
    slug: 'cta',
    order: 6,
    purpose: 'Final conversion hook and sign-up action',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildCtaScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 1.0, entryDelay: 0.1, parallaxDepth: 0.4, staggerDelay: 0.15, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_contact_form',
  title: 'Contact & RSVP Form',
  category: 'Contact',
  description: 'Structured form card with input fields, email, and submit button',
  icon: '✉️',
  createScene: (title: string = 'Contact Us') => ({
    id: `sec_${Date.now()}_contact`,
    name: title,
    slug: 'contact',
    order: 7,
    purpose: 'Lead capture, contact, and guest RSVPs',
    sceneType: 'custom',
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildContactScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'soft',
    motionConfig: { entryDuration: 0.8, entryDelay: 0.1, parallaxDepth: 0.3, staggerDelay: 0.1, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 600, easing: 'ease-out' },
  }),
});

WebSectionLibrary.register({
  id: 'sec_gallery',
  title: 'Visual Media Gallery',
  category: 'Gallery',
  description: 'Multi-column media showcase with responsive grid and image cards',
  icon: '🖼️',
  createScene: (title: string = 'Gallery Showcase') => ({
    id: `sec_${Date.now()}_gallery`,
    name: title,
    slug: 'gallery',
    order: 4,
    purpose: 'Visual photography showcase and lookbook',
    sceneType: 'custom' as any,
    scrollMode: 'normal',
    isRequired: false,
    defaultVisible: true,
    customerToggleable: true,
    navigationLabel: title,
    layers: [],
    sceneGraph: WebSectionLibrary.buildGalleryScene(title),
    renderMode: 'graph',
    layoutRules: {
      desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
      tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
      mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
    },
    accessibility: { screenReaderTitle: title, ariaRole: 'region' },
    motionPreset: 'expressive',
    motionConfig: { entryDuration: 0.8, entryDelay: 0.1, parallaxDepth: 0.2, staggerDelay: 0.1, easing: 'ease-out', reducedMotionFallback: 'fade' },
    interactions: [],
    transitionToNext: { type: 'fade', durationMs: 600, easing: 'ease-out' },
  }),
});

