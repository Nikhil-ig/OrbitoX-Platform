/**
 * ProductionEdgeExporter.ts
 * 
 * High-performance, zero-dependency static edge compiler and HTML5 exporter.
 * Compiles living OrbitoX TemplateSchema SceneGraph ASTs into clean, production-ready
 * standalone HTML5, responsive CSS3, and SEO Schema.org JSON-LD bundles.
 */

import { TemplateSchema, TemplateSceneDefinition } from '../types/TemplateSchema';
import { SceneGraphNode, NodeStyle, NodeGeometry } from '../engine/SceneGraphTypes';

export interface ExportBundle {
  html: string;
  css: string;
  jsonLd: string;
  meta: {
    title: string;
    description: string;
    ogImage: string;
    canonicalUrl: string;
    schemaType: string;
    exportedAt: string;
    nodeCount: number;
    sectionCount: number;
  };
}

export class ProductionEdgeExporter {
  /**
   * Compiles the template schema into a complete, standalone, zero-dependency HTML5 string
   */
  public static compileToHTML(schema: TemplateSchema): string {
    const bundle = this.compileToBundle(schema);
    return bundle.html;
  }

  /**
   * Compiles the template schema into an export bundle with separate assets & metadata
   */
  public static compileToBundle(schema: TemplateSchema): ExportBundle {
    const pub = schema.publishingConfig || {};
    const title = pub.seoTitle || schema.name || 'OrbitoX Celebration';
    const description = pub.seoDescription || schema.description || 'An interactive digital experience crafted on OrbitoX.';
    const ogImage = pub.ogImage || schema.coverImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';
    const canonicalUrl = pub.canonicalUrl || (pub.customDomain ? `https://${pub.customDomain}` : `https://orbitox.site/${schema.slug}`);
    const schemaType = pub.schemaType || 'Event';
    const exportedAt = new Date().toISOString();

    // 1. Generate Schema.org JSON-LD Structured Data
    const jsonLdObject = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: title,
      description: description,
      image: ogImage,
      url: canonicalUrl,
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      organizer: {
        '@type': 'Organization',
        name: 'OrbitoX Platform',
        url: 'https://orbitox.io',
      },
    };
    const jsonLd = JSON.stringify(jsonLdObject, null, 2);

    // 2. Generate CSS Stylesheet with Breakpoint Cascades & Parallax
    const { css, nodeCount, sectionCount } = this.compileStylesheet(schema);

    // 3. Generate Semantic HTML Markup
    const bodyMarkup = this.compileBodyMarkup(schema);

    // 4. Assemble Full Standalone HTML Document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>${this.escapeHtml(title)}</title>
  <meta name="description" content="${this.escapeHtml(description)}">
  <meta name="generator" content="OrbitoX Studio v1.4.0 Edge Exporter">
  <link rel="canonical" href="${this.escapeHtml(canonicalUrl)}">

  <!-- OpenGraph Social Metadata -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${this.escapeHtml(title)}">
  <meta property="og:description" content="${this.escapeHtml(description)}">
  <meta property="og:image" content="${this.escapeHtml(ogImage)}">
  <meta property="og:url" content="${this.escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="OrbitoX">

  <!-- Twitter Card Metadata -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${this.escapeHtml(title)}">
  <meta name="twitter:description" content="${this.escapeHtml(description)}">
  <meta name="twitter:image" content="${this.escapeHtml(ogImage)}">

  <!-- Google Web Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- Schema.org JSON-LD Structured Data -->
  <script type="application/ld+json">
${jsonLd}
  </script>

  <!-- Compiled Edge Stylesheet -->
  <style>
${css}
  </style>
</head>
<body>
${bodyMarkup}

  <!-- Lightweight Zero-Dependency Parallax & Interactive Runtime -->
  <script>
    (function() {
      // Dynamic --scroll-y CSS variable synchronization
      var ticking = false;
      function updateScroll() {
        document.documentElement.style.setProperty('--scroll-y', window.pageYOffset + 'px');
        ticking = false;
      }
      window.addEventListener('scroll', function() {
        if (!ticking) {
          window.requestAnimationFrame(updateScroll);
          ticking = true;
        }
      }, { passive: true });
      updateScroll();
    })();
  </script>
</body>
</html>`;

    return {
      html,
      css,
      jsonLd,
      meta: {
        title,
        description,
        ogImage,
        canonicalUrl,
        schemaType,
        exportedAt,
        nodeCount,
        sectionCount,
      },
    };
  }

  /**
   * Compiles CSS rules, design tokens, and responsive media queries
   */
  private static compileStylesheet(schema: TemplateSchema): { css: string; nodeCount: number; sectionCount: number } {
    let nodeCount = 0;
    const sectionCount = schema.scenes?.length || 0;
    const desktopRules: string[] = [];
    const tabletRules: string[] = [];
    const mobileRules: string[] = [];

    const headingFont = schema.designTokens?.typography?.headingFont || "'Cinzel', serif";
    const bodyFont = schema.designTokens?.typography?.bodyFont || "'Inter', sans-serif";
    const primaryColor = schema.designTokens?.colors?.accentPrimary || '#D4AF37';
    const secondaryColor = schema.designTokens?.colors?.accentSecondary || '#3B82F6';
    const bgColor = schema.designTokens?.colors?.backgroundPrimary || '#060B1A';

    // Base Reset & CSS Variables
    desktopRules.push(`
/* ─── ORBITOX BASE RESET ─── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --scroll-y: 0px;
  --font-heading: ${headingFont};
  --font-body: ${bodyFont};
  --color-primary: ${primaryColor};
  --color-secondary: ${secondaryColor};
  --bg-primary: ${bgColor};
}

body {
  font-family: var(--font-body);
  background-color: var(--bg-primary);
  color: #FFFFFF;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

.orbitox-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.orbitox-section {
  width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.orbitox-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.orbitox-btn:hover {
  transform: translateY(-2px);
  opacity: 0.95;
}
`);

    // Compile each section and its nodes
    schema.scenes?.forEach((scene: TemplateSceneDefinition) => {
      const nodes = scene.sceneGraph?.nodes ? Object.values(scene.sceneGraph.nodes) : [];
      nodeCount += nodes.length;

      // Section wrapper style
      const rootId = scene.sceneGraph?.rootNodeId;
      const rootNode = rootId && scene.sceneGraph?.nodes ? scene.sceneGraph.nodes[rootId] : null;
      const sectionBg = (rootNode?.style?.background?.color as any)?.value || bgColor;

      desktopRules.push(`
#${scene.id} {
  min-height: 100vh;
  background-color: ${sectionBg};
}
`);

      // Node styles
      nodes.forEach((node: SceneGraphNode) => {
        const selector = `#${node.id}`;
        const baseCss = this.nodeStyleToCss(node.style, node.geometry);
        desktopRules.push(`${selector} {\n${baseCss}\n}`);

        // Responsive overrides for Tablet
        if (node.responsive?.tablet) {
          const tabCss = this.nodeStyleToCss(node.responsive.tablet.style, node.responsive.tablet.geometry);
          if (tabCss) {
            tabletRules.push(`  ${selector} {\n${tabCss.replace(/^/gm, '    ')}\n  }`);
          }
        }

        // Responsive overrides for Mobile
        if (node.responsive?.mobile) {
          const mobCss = this.nodeStyleToCss(node.responsive.mobile.style, node.responsive.mobile.geometry);
          if (mobCss) {
            mobileRules.push(`  ${selector} {\n${mobCss.replace(/^/gm, '    ')}\n  }`);
          }
        }
      });
    });

    let css = desktopRules.join('\n');

    if (tabletRules.length > 0) {
      css += `\n/* ─── TABLET BREAKPOINT (max-width: 768px) ─── */\n@media (max-width: 768px) {\n${tabletRules.join('\n')}\n}\n`;
    }

    if (mobileRules.length > 0) {
      css += `\n/* ─── MOBILE BREAKPOINT (max-width: 390px) ─── */\n@media (max-width: 390px) {\n${mobileRules.join('\n')}\n}\n`;
    }

    return { css, nodeCount, sectionCount };
  }

  /**
   * Converts a node's style and geometry objects into clean CSS property declarations
   */
  private static nodeStyleToCss(style?: Partial<NodeStyle>, geometry?: Partial<NodeGeometry>): string {
    const lines: string[] = [];

    // Geometry
    if (geometry) {
      if (geometry.position === 'absolute') {
        lines.push('  position: absolute;');
        if (geometry.x !== undefined) lines.push(`  left: ${typeof geometry.x === 'number' ? `${geometry.x}px` : geometry.x};`);
        if (geometry.y !== undefined) lines.push(`  top: ${typeof geometry.y === 'number' ? `${geometry.y}px` : geometry.y};`);
      } else {
        lines.push('  position: relative;');
      }

      if (geometry.width !== undefined) lines.push(`  width: ${typeof geometry.width === 'number' ? `${geometry.width}px` : geometry.width};`);
      if (geometry.height !== undefined) lines.push(`  height: ${typeof geometry.height === 'number' ? `${geometry.height}px` : geometry.height};`);
      if (geometry.zIndex !== undefined) lines.push(`  z-index: ${geometry.zIndex};`);
      if (geometry.opacity !== undefined && geometry.opacity < 1) lines.push(`  opacity: ${geometry.opacity};`);
    }

    // Styling
    if (style) {
      // Background
      if (style.background) {
        const bg = style.background;
        if (bg.type === 'solid' && (bg.color as any)?.value) {
          lines.push(`  background-color: ${(bg.color as any).value};`);
        } else if (bg.type === 'gradient' && bg.gradient) {
          lines.push(`  background: ${bg.gradient};`);
        } else if (bg.type === 'image' && typeof bg.image === 'string') {
          lines.push(`  background-image: url('${bg.image}');`);
          lines.push('  background-size: cover;');
          lines.push('  background-position: center;');
        }
      }

      // Spacing (4-sided box model)
      if (style.paddingTop) lines.push(`  padding-top: ${style.paddingTop};`);
      if (style.paddingRight) lines.push(`  padding-right: ${style.paddingRight};`);
      if (style.paddingBottom) lines.push(`  padding-bottom: ${style.paddingBottom};`);
      if (style.paddingLeft) lines.push(`  padding-left: ${style.paddingLeft};`);
      else if (style.padding) lines.push(`  padding: ${style.padding};`);

      if (style.marginTop) lines.push(`  margin-top: ${style.marginTop};`);
      if (style.marginRight) lines.push(`  margin-right: ${style.marginRight};`);
      if (style.marginBottom) lines.push(`  margin-bottom: ${style.marginBottom};`);
      if (style.marginLeft) lines.push(`  margin-left: ${style.marginLeft};`);
      else if (style.margin) lines.push(`  margin: ${style.margin};`);

      // Typography
      if (style.typography) {
        const typo = style.typography;
        if (typo.fontFamily) lines.push(`  font-family: ${typo.fontFamily};`);
        if (typo.fontSize) lines.push(`  font-size: ${typo.fontSize};`);
        if (typo.fontWeight) lines.push(`  font-weight: ${typo.fontWeight};`);
        if (typo.lineHeight) lines.push(`  line-height: ${typo.lineHeight};`);
        if (typo.letterSpacing) lines.push(`  letter-spacing: ${typo.letterSpacing};`);
        if (typo.textAlign) lines.push(`  text-align: ${typo.textAlign};`);
        if (typo.color) {
          const cVal = (typo.color as any)?.value || (typeof typo.color === 'string' ? typo.color : '');
          if (cVal) lines.push(`  color: ${cVal};`);
        }
      }

      // Border & Radius
      if (style.border) {
        if (style.border.radius) {
          const rVal = typeof style.border.radius === 'object' ? `${(style.border.radius as any).tl || '0'} ${(style.border.radius as any).tr || '0'} ${(style.border.radius as any).br || '0'} ${(style.border.radius as any).bl || '0'}` : style.border.radius;
          lines.push(`  border-radius: ${rVal};`);
        }
        if (style.border.width && (style.border.color as any)?.value) {
          lines.push(`  border: ${style.border.width} ${style.border.style || 'solid'} ${(style.border.color as any).value};`);
        }
      }

      // Shadow
      if (style.shadow?.boxShadow) {
        lines.push(`  box-shadow: ${style.shadow.boxShadow};`);
      }

      // Effects (Backdrop blur)
      if (style.effects) {
        if (style.effects.backdropBlur) {
          lines.push(`  backdrop-filter: blur(${style.effects.backdropBlur});`);
          lines.push(`  -webkit-backdrop-filter: blur(${style.effects.backdropBlur});`);
        }
      }

      // Parallax Depth Plane Hardware Translation
      if (style.depthPlane && style.depthPlane !== 0) {
        const factor = (style.depthPlane * 0.08).toFixed(3);
        const zPx = style.depthPlane * 8;
        lines.push(`  transform: translate3d(0, calc(var(--scroll-y, 0px) * ${factor}), ${zPx}px);`);
        lines.push('  will-change: transform;');
      }
    }

    return lines.join('\n');
  }

  /**
   * Compiles the body section and node tree into semantic HTML markup
   */
  private static compileBodyMarkup(schema: TemplateSchema): string {
    const markup: string[] = ['  <main class="orbitox-page">'];

    schema.scenes?.forEach((scene: TemplateSceneDefinition) => {
      markup.push(`    <section id="${scene.id}" class="orbitox-section" data-section-name="${this.escapeHtml(scene.name)}">`);

      const rootNodeId = scene.sceneGraph?.rootNodeId;
      const nodeMap = scene.sceneGraph?.nodes || {};

      const renderNodeTree = (nodeId: string, indent: string): void => {
        const node = nodeMap[nodeId];
        if (!node || node.hidden) return;

        const tag = this.getNodeSemanticTag(node);
        const textContent = node.props?.text || node.textContent || (node.kind === 'text' ? (node.name || '') : '');
        const children = node.children || [];

        if (node.kind === 'image') {
          const bgImg = typeof node.style?.background?.image === 'string' ? node.style.background.image : '';
          const src = node.props?.src || bgImg || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';
          markup.push(`${indent}<img id="${node.id}" class="orbitox-img" src="${this.escapeHtml(src)}" alt="${this.escapeHtml(node.name || 'Image')}" loading="lazy" />`);
        } else if (node.kind === 'button') {
          const href = node.props?.url || '#';
          markup.push(`${indent}<a id="${node.id}" class="orbitox-btn" href="${this.escapeHtml(href)}">${this.escapeHtml(textContent || 'Explore')}</a>`);
        } else if (children.length > 0) {
          markup.push(`${indent}<${tag} id="${node.id}" class="orbitox-${node.kind}">`);
          if (textContent) {
            markup.push(`${indent}  <span>${this.escapeHtml(textContent)}</span>`);
          }
          children.forEach((cId) => renderNodeTree(cId, `${indent}  `));
          markup.push(`${indent}</${tag}>`);
        } else {
          markup.push(`${indent}<${tag} id="${node.id}" class="orbitox-${node.kind}">${this.escapeHtml(textContent)}</${tag}>`);
        }
      };

      if (rootNodeId && nodeMap[rootNodeId]) {
        renderNodeTree(rootNodeId, '      ');
      } else {
        // Fallback: render all nodes in this scene
        Object.keys(nodeMap).forEach((nId) => renderNodeTree(nId, '      '));
      }

      markup.push('    </section>');
    });

    markup.push('  </main>');
    return markup.join('\n');
  }

  /**
   * Determines semantic HTML tag according to node kind and naming convention
   */
  private static getNodeSemanticTag(node: SceneGraphNode): string {
    if (node.kind === 'text') {
      const name = (node.name || '').toLowerCase();
      if (name.includes('title') || name.includes('h1') || name.includes('hero')) return 'h1';
      if (name.includes('subtitle') || name.includes('h2')) return 'h2';
      if (name.includes('heading') || name.includes('h3')) return 'h3';
      return 'p';
    }
    if (node.kind === 'button') return 'a';
    if (node.kind === 'image') return 'img';
    return 'div';
  }

  /**
   * Simulates DNS CNAME validation against cname.edge.orbitox.io
   */
  public static async verifyCustomDomainDNS(domain: string): Promise<{
    valid: boolean;
    cname: string;
    ssl: 'active' | 'pending' | 'none';
    message: string;
  }> {
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean || clean.length < 3 || !clean.includes('.')) {
      return {
        valid: false,
        cname: 'cname.edge.orbitox.io',
        ssl: 'none',
        message: 'Invalid domain format. Please enter a valid FQDN (e.g. invite.royalcourt.com).',
      };
    }

    // Mock resolution check
    return {
      valid: true,
      cname: 'cname.edge.orbitox.io',
      ssl: 'active',
      message: `Domain ${clean} successfully verified and pointed to cname.edge.orbitox.io with active 256-bit TLS certificate.`,
    };
  }

  /**
   * HTML entity escaping helper
   */
  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
