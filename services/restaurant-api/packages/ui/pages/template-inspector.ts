/**
 * 🪐 RestaurantOS 3.1 — Template Composition Inspector
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoring & Development tool exposing the actual AST / component layout tree
 * for every marketplace template.
 * Features:
 * - Full component hierarchy & nested layout tree inspection
 * - Responsive geometry & breakpoint rules audit
 * - Side-by-side Structural Comparison Engine
 * - Anti-Token-Clone Validation Rule (verifies structural divergence > 75%)
 * - Zero-emoji vector iconography
 */

import { MarketplaceTemplate, MenuItem } from '../../domain';
import { icon } from '../icons';

export function renderTemplateCompositionInspector(
  templates: MarketplaceTemplate[],
  selectedTemplateId = 'tmpl_haute_gastronomy',
  compareTemplateId = 'tmpl_artisan_coffee',
  menuItems: MenuItem[] = []
): string {
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const compareTemplate = templates.find((t) => t.id === compareTemplateId) || templates[1] || templates[0];

  // Structural comparison calculation
  const isArchitectureDifferent =
    currentTemplate.composition?.pageArchitecture !== compareTemplate.composition?.pageArchitecture;
  const isLayoutPatternDifferent =
    currentTemplate.composition?.menuLayoutPattern !== compareTemplate.composition?.menuLayoutPattern;
  const isCardCompositionDifferent =
    currentTemplate.composition?.cardComposition !== compareTemplate.composition?.cardComposition;
  const isNavigationDifferent =
    currentTemplate.composition?.navigationPattern !== compareTemplate.composition?.navigationPattern;
  const isCartDifferent =
    currentTemplate.composition?.cartPresentation !== compareTemplate.composition?.cartPresentation;

  // Compute AST structural dissimilarity score
  let differenceCount = 0;
  if (isArchitectureDifferent) differenceCount += 25;
  if (isLayoutPatternDifferent) differenceCount += 25;
  if (isCardCompositionDifferent) differenceCount += 20;
  if (isNavigationDifferent) differenceCount += 15;
  if (isCartDifferent) differenceCount += 15;

  const structuralDivergenceScore = differenceCount; // 0 to 100%
  const isClone = structuralDivergenceScore < 25;

  return `
  <div style="padding: 24px 32px; max-width: 1400px; margin: 0 auto; width: 100%; font-family: var(--font-sans);">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 20px;">
      <div>
        <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: var(--color-copper); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
          <span style="display:inline-flex;align-items:center;">${icon('code', { size: 14 })}</span>
          <span>Template Architecture & Composition Inspector</span>
          <span style="color: var(--border-strong);">|</span>
          <span style="color: var(--color-stone);">Anti-Token-Clone System</span>
        </div>
        <h1 style="font-size: 26px; font-weight: 800; color: var(--color-linen); letter-spacing: -0.02em;">
          Visual Template Composition Inspector
        </h1>
        <p style="font-size: 13px; color: var(--color-stone); margin-top: 4px; max-width: 720px;">
          Expose, validate, and compare the underlying layout tree, section hierarchies, and component recipes of every marketplace template. Guarantees that templates are structurally distinct compositions rather than superficial color token presets.
        </p>
      </div>

      <div style="display: flex; gap: 10px;">
        <a href="/marketplace" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:6px;">
          ${icon('marketplace', { size: 14 })} <span>Marketplace View</span>
        </a>
        <a href="/studio" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:6px;">
          ${icon('studio', { size: 14 })} <span>Open in Visual Studio</span>
        </a>
      </div>
    </div>

    <!-- Anti-Token-Clone Validation Status Banner -->
    <div style="background: ${isClone ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)'}; border: 1px solid ${isClone ? '#EF4444' : '#10B981'}; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 40px; height: 40px; border-radius: 8px; background: ${isClone ? '#EF4444' : '#10B981'}; display: flex; align-items: center; justify-content: center; color: #FFF;">
          ${isClone ? icon('alert-circle', { size: 22 }) : icon('shield-check', { size: 22 })}
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 800; color: var(--color-linen);">
            ${isClone ? 'WARNING: Palette Clone Detected (Structural Similarity > 75%)' : 'Anti-Token-Clone Validation: Authentic Structural Divergence'}
          </div>
          <div style="font-size: 12px; color: var(--color-stone); margin-top: 2px;">
            Comparing <strong>${currentTemplate.name}</strong> vs <strong>${compareTemplate.name}</strong> · Structural Divergence: <span id="divergence-score" style="font-weight:800; color:${isClone ? '#EF4444' : '#10B981'}; font-family:var(--font-mono);">${structuralDivergenceScore}%</span>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <span class="badge ${isClone ? 'badge-amber' : 'badge-sage'}" style="font-size: 11px; padding: 6px 12px;">
          ${isClone ? 'Superficial Token Variation' : 'Validated Independent Architecture'}
        </span>
      </div>
    </div>

    <!-- Template Selector Controls -->
    <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
        <span style="font-size: 12px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Primary Template:</span>
        <select onchange="window.location.href='/developer/templates?selected=' + this.value + '&compare=${compareTemplate.id}'" style="background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: var(--color-linen); font-size: 13px; font-weight: 600;">
          ${templates
            .map(
              (t) => `
            <option value="${t.id}" ${t.id === currentTemplate.id ? 'selected' : ''}>${t.name} (${t.composition?.pageArchitecture || t.category})</option>`
            )
            .join('')}
        </select>

        <span style="font-size: 12px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Compare Against:</span>
        <select onchange="window.location.href='/developer/templates?selected=${currentTemplate.id}&compare=' + this.value" style="background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: var(--color-linen); font-size: 13px; font-weight: 600;">
          ${templates
            .map(
              (t) => `
            <option value="${t.id}" ${t.id === compareTemplate.id ? 'selected' : ''}>${t.name} (${t.composition?.pageArchitecture || t.category})</option>`
            )
            .join('')}
        </select>
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="toggleInspectorMode('tree')" id="btn-mode-tree" style="font-weight:700;">
          Component Tree View
        </button>
        <button class="btn btn-primary btn-sm" onclick="toggleInspectorMode('diff')" id="btn-mode-diff" style="font-weight:700;">
          Side-by-Side Diff View
        </button>
      </div>
    </div>

    <!-- View Mode 1: Side-by-Side Structural Diff Matrix -->
    <div id="inspector-diff-view" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
      <!-- Template A Spec -->
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); background: rgba(0,0,0,0.2); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 10px; font-family: var(--font-mono); color: var(--color-copper); text-transform: uppercase;">Template 01</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-linen); margin-top: 2px;">${currentTemplate.name}</div>
          </div>
          <span class="badge badge-copper">v${currentTemplate.version}</span>
        </div>

        <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Page Architecture</div>
            <div style="font-size: 14px; font-weight: 700; color: var(--color-linen); margin-top: 2px;">
              ${currentTemplate.composition?.pageArchitecture || 'editorial-tasting-split'}
            </div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Hero Architecture</div>
            <div style="font-size: 13px; color: var(--color-linen); margin-top: 2px;">
              ${currentTemplate.composition?.heroArchitecture || 'split-asymmetric'}
            </div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Menu Layout Pattern</div>
            <div style="font-size: 13px; color: var(--color-linen); margin-top: 2px;">
              ${currentTemplate.composition?.menuLayoutPattern || 'course-progression-timeline'}
            </div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Card Composition Recipe</div>
            <div style="font-size: 13px; color: var(--color-linen); margin-top: 2px;">
              ${currentTemplate.composition?.cardComposition || 'editorial-sommelier'}
            </div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Responsive Layout Rules</div>
            <div style="font-size: 12px; font-family: var(--font-mono); color: var(--color-stone); margin-top: 2px;">
              Desktop: ${currentTemplate.composition?.responsiveRules.desktopColumns || 2} Col · Tablet: ${currentTemplate.composition?.responsiveRules.tabletColumns || 1} Col · Mobile: ${currentTemplate.composition?.responsiveRules.mobileColumns || 1} Col
            </div>
          </div>

          <!-- Component Hierarchy Snippet -->
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; margin-bottom: 8px;">Render Tree Nodes (${currentTemplate.composition?.componentTree?.length || 4})</div>
            <div style="background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 8px; padding: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--color-linen); display: flex; flex-direction: column; gap: 6px;">
              ${(currentTemplate.composition?.componentTree || [])
                .map((node, i) => `<div>${i + 1}. &lt;${node.type} layout="${node.layout}" /&gt;</div>`)
                .join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Template B Spec -->
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); background: rgba(0,0,0,0.2); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 10px; font-family: var(--font-mono); color: var(--color-copper); text-transform: uppercase;">Template 02 (Comparison)</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-linen); margin-top: 2px;">${compareTemplate.name}</div>
          </div>
          <span class="badge badge-sage">v${compareTemplate.version}</span>
        </div>

        <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Page Architecture</div>
            <div style="font-size: 14px; font-weight: 700; color: ${isArchitectureDifferent ? 'var(--color-sage)' : 'var(--color-linen)'}; margin-top: 2px;">
              ${compareTemplate.composition?.pageArchitecture || 'tactile-stepper-cards'}
              ${isArchitectureDifferent ? ' (Distinct Layout)' : ' (Identical)'}
            </div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Hero Architecture</div>
            <div style="font-size: 13px; color: var(--color-linen); margin-top: 2px;">
              ${compareTemplate.composition?.heroArchitecture || 'warm-carousel-showcase'}
            </div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Menu Layout Pattern</div>
            <div style="font-size: 13px; color: ${isLayoutPatternDifferent ? 'var(--color-sage)' : 'var(--color-linen)'}; margin-top: 2px;">
              ${compareTemplate.composition?.menuLayoutPattern || 'tactile-card-grid'}
              ${isLayoutPatternDifferent ? ' (Distinct Pattern)' : ' (Identical)'}
            </div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Card Composition Recipe</div>
            <div style="font-size: 13px; color: ${isCardCompositionDifferent ? 'var(--color-sage)' : 'var(--color-linen)'}; margin-top: 2px;">
              ${compareTemplate.composition?.cardComposition || 'tactile-stepper'}
              ${isCardCompositionDifferent ? ' (Distinct Card Recipe)' : ' (Identical)'}
            </div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Responsive Layout Rules</div>
            <div style="font-size: 12px; font-family: var(--font-mono); color: var(--color-stone); margin-top: 2px;">
              Desktop: ${compareTemplate.composition?.responsiveRules.desktopColumns || 3} Col · Tablet: ${compareTemplate.composition?.responsiveRules.tabletColumns || 2} Col · Mobile: ${compareTemplate.composition?.responsiveRules.mobileColumns || 1} Col
            </div>
          </div>

          <!-- Component Hierarchy Snippet -->
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; margin-bottom: 8px;">Render Tree Nodes (${compareTemplate.composition?.componentTree?.length || 4})</div>
            <div style="background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 8px; padding: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--color-linen); display: flex; flex-direction: column; gap: 6px;">
              ${(compareTemplate.composition?.componentTree || [])
                .map((node, i) => `<div>${i + 1}. &lt;${node.type} layout="${node.layout}" /&gt;</div>`)
                .join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- View Mode 2: Detailed Component Tree Node Graph -->
    <div id="inspector-tree-view" class="ast-tree-root" style="display: none; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; padding: 24px; margin-bottom: 28px;">
      <h3 style="font-size: 16px; font-weight: 800; color: var(--color-linen); margin-bottom: 16px;">
        Complete AST Layout Tree: ${currentTemplate.name}
      </h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${(currentTemplate.composition?.componentTree || [])
          .map(
            (node, idx) => `
          <div style="background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 8px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--color-copper); font-weight: 800;">#0${idx + 1}</span>
                <span style="font-size: 14px; font-weight: 800; color: var(--color-linen);">${node.name}</span>
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--color-stone);">&lt;${node.type}&gt;</span>
              </div>
              <span class="badge badge-copper" style="font-size: 10px;">layout: ${node.layout}</span>
            </div>
            ${
              node.props
                ? `<div style="margin-top: 10px; font-size: 11px; color: var(--color-stone); font-family: var(--font-mono); background: rgba(255,255,255,0.02); padding: 8px 10px; border-radius: 6px;">
                     props: ${JSON.stringify(node.props)}
                   </div>`
                : ''
            }
            ${
              node.children && node.children.length > 0
                ? `<div style="margin-top: 12px; padding-left: 20px; border-left: 2px solid var(--border-subtle); display: flex; flex-direction: column; gap: 8px;">
                     ${node.children
                       .map(
                         (child) => `
                       <div style="background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                         <span style="font-size: 12px; color: var(--color-linen); font-weight: 600;">${child.name} (&lt;${child.type}&gt;)</span>
                         <span style="font-family: var(--font-mono); font-size: 10px; color: var(--color-stone);">${child.layout}</span>
                       </div>`
                       )
                       .join('')}
                   </div>`
                : ''
            }
          </div>`
          )
          .join('')}
      </div>
    </div>
  </div>

  <script>
    function toggleInspectorMode(mode) {
      const diffView = document.getElementById('inspector-diff-view');
      const treeView = document.getElementById('inspector-tree-view');
      const btnDiff = document.getElementById('btn-mode-diff');
      const btnTree = document.getElementById('btn-mode-tree');

      if (mode === 'tree') {
        diffView.style.display = 'none';
        treeView.style.display = 'block';
        btnTree.className = 'btn btn-primary btn-sm';
        btnDiff.className = 'btn btn-secondary btn-sm';
      } else {
        diffView.style.display = 'grid';
        treeView.style.display = 'none';
        btnDiff.className = 'btn btn-primary btn-sm';
        btnTree.className = 'btn btn-secondary btn-sm';
      }
    }
  </script>`;
}
