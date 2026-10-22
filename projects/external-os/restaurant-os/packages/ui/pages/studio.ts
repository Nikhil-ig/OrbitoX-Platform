/**
 * 🎨 RestaurantOS 3.0 Real Visual Customization Studio
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional website authoring environment:
 * - Top Toolbar: Template badge, Viewport selector, Undo/Redo, Save Draft, Publish
 * - Left Panel: Pages, Sections, Component Blocks, Layer Tree
 * - Center Canvas: Live interactive responsive storefront preview with element selection
 * - Right Inspector: Real-time property inspector for selected section / block
 * - Revision History & Revert workflows
 */

import { MarketplaceTemplate, MenuItem, TenantBrandConfig, TemplateDraftAndPublication } from '../../domain';
import { icon } from '../icons';

export function renderVisualStudio(
  template: MarketplaceTemplate,
  draftData: TemplateDraftAndPublication,
  brandConfig: TenantBrandConfig,
  menuItems: MenuItem[],
  branchId = 'branch_ldh'
): string {
  const sections = draftData.draftSections || template.defaultSections;
  const tokens = draftData.draftTokens || template.defaultTokens;

  return `
  <div style="display: flex; flex-direction: column; height: calc(100vh - 52px); overflow: hidden; background: #0A0D10;">
    <!-- Studio Top Toolbar -->
    <div style="height: 52px; background: #11141A; border-bottom: 1px solid var(--border-default); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 30; gap: 16px;">
      <!-- Left: Template & Status Info -->
      <div style="display: flex; align-items: center; gap: 12px;">
        <a href="/marketplace" class="btn btn-ghost btn-sm" title="Back to Marketplace" style="padding: 4px 8px;">
          ← Marketplace
        </a>
        <div style="height: 18px; width: 1px; background: var(--border-subtle);"></div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; font-weight: 800; color: var(--color-linen);">${template.name}</span>
          <span class="badge badge-copper" style="font-size: 10px;">v${draftData.version || template.version}</span>
          <span id="save-status-indicator" style="font-size: 11px; color: var(--color-stone); font-family: var(--font-mono); display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-sage);"></span> Saved
          </span>
        </div>
      </div>

      <!-- Center: Viewport Toggle & Undo/Redo -->
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-default); border-radius: 8px; padding: 3px;">
          <button onclick="setStudioViewport('mobile')" id="studio-vp-mobile" class="studio-vp-btn" style="padding: 5px 12px; border-radius: 5px; border: none; background: transparent; color: var(--color-stone); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            ${icon('smartphone', { size: 14, color: 'currentColor' })}
            <span>Mobile (390px)</span>
          </button>
          <button onclick="setStudioViewport('tablet')" id="studio-vp-tablet" class="studio-vp-btn" style="padding: 5px 12px; border-radius: 5px; border: none; background: transparent; color: var(--color-stone); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            ${icon('tablet', { size: 14, color: 'currentColor' })}
            <span>Tablet (768px)</span>
          </button>
          <button onclick="setStudioViewport('desktop')" id="studio-vp-desktop" class="studio-vp-btn active" style="padding: 5px 12px; border-radius: 5px; border: none; background: var(--color-copper); color: #FFF; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            ${icon('monitor', { size: 14, color: 'currentColor' })}
            <span>Desktop (1200px)</span>
          </button>
        </div>

        <div style="display: flex; gap: 4px;">
          <button onclick="studioUndo()" id="btn-undo" class="btn btn-secondary btn-sm" title="Undo (⌘Z)" style="padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px;">
            ${icon('refresh', { size: 12, color: 'currentColor' })}
            <span>Undo</span>
          </button>
          <button onclick="studioRedo()" id="btn-redo" class="btn btn-secondary btn-sm" title="Redo (⌘⇧Z)" style="padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px;">
            ${icon('refresh', { size: 12, color: 'currentColor' })}
            <span>Redo</span>
          </button>
        </div>
      </div>

      <!-- Right: Actions, Revisions & Publish -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <button onclick="toggleRevisionsDrawer()" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('clock', { size: 14, color: 'currentColor' })}
          <span>History (${draftData.revisions?.length || 0})</span>
        </button>
        <button onclick="saveDraft()" id="btn-save-draft" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('save', { size: 14, color: 'currentColor' })}
          <span>Save Draft</span>
        </button>
        <button onclick="publishStudio()" id="btn-publish" class="btn btn-primary btn-sm" style="font-weight: 700; box-shadow: 0 2px 10px rgba(200, 107, 60, 0.35); display: inline-flex; align-items: center; gap: 6px;">
          ${icon('upload', { size: 14, color: '#FFFFFF' })}
          <span>Publish to Storefront</span>
        </button>
      </div>
    </div>

    <!-- 3-Pane Studio Workspace -->
    <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
      <!-- Left Panel: Pages, Sections & Components -->
      <aside style="width: 290px; min-width: 290px; background: #0E1218; border-right: 1px solid var(--border-default); display: flex; flex-direction: column; overflow-y: auto;">
        <!-- Left Panel Tabs -->
        <div style="display: flex; border-bottom: 1px solid var(--border-subtle); background: rgba(0,0,0,0.2);">
          <button onclick="switchLeftTab('sections')" id="tab-btn-sections" class="left-tab-btn active" style="flex: 1; padding: 12px; font-size: 12px; font-weight: 700; border: none; background: transparent; color: var(--color-copper); border-bottom: 2px solid var(--color-copper); cursor: pointer;">
            Sections (${sections.length})
          </button>
          <button onclick="switchLeftTab('tokens')" id="tab-btn-tokens" class="left-tab-btn" style="flex: 1; padding: 12px; font-size: 12px; font-weight: 700; border: none; background: transparent; color: var(--color-stone); border-bottom: 2px solid transparent; cursor: pointer;">
            Design Tokens
          </button>
        </div>

        <!-- Sections List View -->
        <div id="left-panel-sections" style="padding: 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Storefront Sections</span>
            <button onclick="promptAddSection()" class="btn btn-ghost btn-sm" style="font-size: 11px; padding: 2px 8px; color: var(--color-copper);">+ Add</button>
          </div>

          <div id="sections-list-container" style="display: flex; flex-direction: column; gap: 6px;">
            ${sections
              .map(
                (sec, idx) => `
              <div
                class="section-item-row"
                id="sec-row-${sec.id}"
                onclick="selectSection('${sec.id}')"
                style="padding: 10px 12px; background: ${idx === 0 ? 'var(--color-copper-subtle)' : 'var(--color-charcoal)'}; border: 1px solid ${idx === 0 ? 'var(--color-copper)' : 'var(--border-subtle)'}; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 120ms ease;"
              >
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="color: var(--color-muted); font-size: 11px; font-family: var(--font-mono);">${idx + 1}</span>
                  <div>
                    <div style="font-size: 13px; font-weight: 700; color: var(--color-linen);">${sec.title}</div>
                    <div style="font-size: 11px; color: var(--color-stone); text-transform: uppercase;">${sec.type}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 4px;">
                  <button onclick="moveSection('${sec.id}', -1); event.stopPropagation();" title="Move Up" class="btn btn-ghost btn-sm" style="padding: 3px 6px;">
                    ${icon('arrow-up', { size: 10, color: 'var(--color-stone)' })}
                  </button>
                  <button onclick="moveSection('${sec.id}', 1); event.stopPropagation();" title="Move Down" class="btn btn-ghost btn-sm" style="padding: 3px 6px;">
                    ${icon('arrow-down', { size: 10, color: 'var(--color-stone)' })}
                  </button>
                  <button onclick="toggleSectionVisibility('${sec.id}'); event.stopPropagation();" title="Toggle Visibility" class="btn btn-ghost btn-sm" style="padding: 3px 6px;">
                    ${sec.visible ? icon('eye', { size: 12, color: 'var(--color-copper)' }) : icon('x', { size: 12, color: 'var(--color-crimson)' })}
                  </button>
                </div>
              </div>`
              )
              .join('')}
          </div>
        </div>

        <!-- Design Tokens Panel -->
        <div id="left-panel-tokens" style="padding: 16px; display: none; flex-direction: column; gap: 16px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Primary Brand Accent</label>
            <div style="display: flex; gap: 10px; align-items: center; margin-top: 6px;">
              <input type="color" id="token-primary-color" value="${tokens.primaryColor || '#C86B3C'}" onchange="updateToken('primaryColor', this.value)" style="width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--border-default); background: transparent; cursor: pointer;" />
              <input type="text" id="token-primary-hex" value="${tokens.primaryColor || '#C86B3C'}" onchange="updateToken('primaryColor', this.value)" style="flex: 1; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-family: var(--font-mono); font-size: 12px;" />
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Heading Typography</label>
            <select id="token-font-heading" onchange="updateToken('fontFamilyHeading', this.value)" style="width: 100%; margin-top: 6px; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;">
              <option value='"Playfair Display", Georgia, serif' ${tokens.fontFamilyHeading?.includes('Playfair') ? 'selected' : ''}>Playfair Display (Editorial Serif)</option>
              <option value='"Inter", -apple-system, sans-serif' ${tokens.fontFamilyHeading?.includes('Inter') ? 'selected' : ''}>Inter (Modern Clean Sans)</option>
              <option value='"Space Grotesk", sans-serif' ${tokens.fontFamilyHeading?.includes('Space') ? 'selected' : ''}>Space Grotesk (Craft Cafe)</option>
              <option value='"Noto Serif", serif' ${tokens.fontFamilyHeading?.includes('Noto') ? 'selected' : ''}>Noto Serif (Traditional Artisan)</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Corner Border Radius</label>
            <select id="token-radius" onchange="updateToken('borderRadius', this.value)" style="width: 100%; margin-top: 6px; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;">
              <option value="4px" ${tokens.borderRadius === '4px' ? 'selected' : ''}>Sharp (4px)</option>
              <option value="8px" ${tokens.borderRadius === '8px' ? 'selected' : ''}>Refined (8px)</option>
              <option value="12px" ${tokens.borderRadius === '12px' ? 'selected' : ''}>Soft Curved (12px)</option>
              <option value="16px" ${tokens.borderRadius === '16px' ? 'selected' : ''}>Chunky Modern (16px)</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Card Aesthetics</label>
            <select id="token-card-style" onchange="updateToken('cardStyle', this.value)" style="width: 100%; margin-top: 6px; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;">
              <option value="tactile" ${tokens.cardStyle === 'tactile' ? 'selected' : ''}>Tactile Warm (Subtle glow & border)</option>
              <option value="bordered" ${tokens.cardStyle === 'bordered' ? 'selected' : ''}>Bordered (Minimalist outline)</option>
              <option value="elevated" ${tokens.cardStyle === 'elevated' ? 'selected' : ''}>Elevated (Deep shadows)</option>
              <option value="flat" ${tokens.cardStyle === 'flat' ? 'selected' : ''}>Flat (Modern flush)</option>
            </select>
          </div>
        </div>
      </aside>

      <!-- Center WYSIWYG Canvas -->
      <main style="flex: 1; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 28px; background: #06080A;">
        <div id="studio-canvas-stage" style="width: 100%; max-width: 1200px; transition: max-width 180ms ease; background: var(--color-ink); border: 1px solid var(--border-strong); border-radius: 12px; overflow: hidden; box-shadow: 0 16px 64px rgba(0,0,0,0.85);">
          <!-- Live Storefront Render Canvas -->
          <div id="studio-rendered-storefront">
            <!-- Dynamically populated by client JavaScript -->
          </div>
        </div>
      </main>

      <!-- Right Inspector Panel -->
      <aside style="width: 320px; min-width: 320px; background: #0E1218; border-left: 1px solid var(--border-default); display: flex; flex-direction: column; overflow-y: auto;">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Properties Inspector</span>
          <span id="inspector-selected-tag" class="badge badge-copper" style="font-size: 10px;">Hero</span>
        </div>

        <div id="inspector-content" style="padding: 18px; display: flex; flex-direction: column; gap: 16px;">
          <!-- Dynamically populated based on active section -->
        </div>
      </aside>
    </div>
  </div>

  <!-- Revisions History Drawer -->
  <div id="revisions-drawer" style="display: none; position: fixed; right: 0; top: 52px; bottom: 0; width: 360px; background: #11141A; border-left: 1px solid var(--border-default); z-index: 100; box-shadow: -8px 0 32px rgba(0,0,0,0.8); flex-direction: column;">
    <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
      <h3 style="font-size: 14px; font-weight: 800; color: var(--color-linen);">Published Revisions History</h3>
      <button onclick="toggleRevisionsDrawer()" class="btn btn-ghost btn-sm" aria-label="Close History">${icon('x', { size: 14, color: 'currentColor' })}</button>
    </div>

    <div style="padding: 14px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px;" id="revisions-list-container">
      ${(draftData.revisions || [])
        .map(
          (rev) => `
        <div style="background: var(--color-charcoal); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-linen);">Version ${rev.version}</span>
            <span style="font-size: 10px; color: var(--color-stone); font-family: var(--font-mono);">${new Date(rev.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div style="font-size: 11px; color: var(--color-muted); line-height: 1.4; margin-bottom: 8px;">
            ${rev.summary}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; color: var(--color-stone);">${rev.publishedBy}</span>
            <button onclick="restoreRevision('${rev.revisionId}')" class="btn btn-secondary btn-sm" style="font-size: 10px; padding: 2px 8px;">
              Restore Version
            </button>
          </div>
        </div>`
        )
        .join('')}
    </div>
  </div>

  <script>
    // Studio Runtime State
    let studioData = ${JSON.stringify(draftData)};
    let activeTemplate = ${JSON.stringify(template)};
    let brandConfig = ${JSON.stringify(brandConfig)};
    let menuItems = ${JSON.stringify(menuItems)};
    let selectedSectionId = studioData.draftSections && studioData.draftSections[0] ? studioData.draftSections[0].id : 'sec_hero_noir';

    let historyStack = [JSON.stringify(studioData)];
    let historyIndex = 0;

    function pushHistory() {
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push(JSON.stringify(studioData));
      historyIndex++;
      updateUndoRedoBtns();
    }

    function studioUndo() {
      if (historyIndex > 0) {
        historyIndex--;
        studioData = JSON.parse(historyStack[historyIndex]);
        renderCanvas();
        populateInspector();
        updateUndoRedoBtns();
      }
    }

    function studioRedo() {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        studioData = JSON.parse(historyStack[historyIndex]);
        renderCanvas();
        populateInspector();
        updateUndoRedoBtns();
      }
    }

    function updateUndoRedoBtns() {
      document.getElementById('btn-undo').disabled = historyIndex === 0;
      document.getElementById('btn-redo').disabled = historyIndex >= historyStack.length - 1;
    }

    function setStudioViewport(device) {
      const stage = document.getElementById('studio-canvas-stage');
      const btns = {
        mobile: document.getElementById('studio-vp-mobile'),
        tablet: document.getElementById('studio-vp-tablet'),
        desktop: document.getElementById('studio-vp-desktop'),
      };

      Object.values(btns).forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--color-stone)';
      });

      btns[device].style.background = 'var(--color-copper)';
      btns[device].style.color = '#FFF';

      if (device === 'mobile') {
        stage.style.maxWidth = '390px';
      } else if (device === 'tablet') {
        stage.style.maxWidth = '768px';
      } else {
        stage.style.maxWidth = '1200px';
      }
    }

    function switchLeftTab(tab) {
      const btnSec = document.getElementById('tab-btn-sections');
      const btnTok = document.getElementById('tab-btn-tokens');
      const panelSec = document.getElementById('left-panel-sections');
      const panelTok = document.getElementById('left-panel-tokens');

      if (tab === 'sections') {
        btnSec.style.color = 'var(--color-copper)';
        btnSec.style.borderBottomColor = 'var(--color-copper)';
        btnTok.style.color = 'var(--color-stone)';
        btnTok.style.borderBottomColor = 'transparent';
        panelSec.style.display = 'flex';
        panelTok.style.display = 'none';
      } else {
        btnTok.style.color = 'var(--color-copper)';
        btnTok.style.borderBottomColor = 'var(--color-copper)';
        btnSec.style.color = 'var(--color-stone)';
        btnSec.style.borderBottomColor = 'transparent';
        panelTok.style.display = 'flex';
        panelSec.style.display = 'none';
      }
    }

    function selectSection(secId) {
      selectedSectionId = secId;
      document.querySelectorAll('.section-item-row').forEach(row => {
        if (row.id === 'sec-row-' + secId) {
          row.style.background = 'var(--color-copper-subtle)';
          row.style.borderColor = 'var(--color-copper)';
        } else {
          row.style.background = 'var(--color-charcoal)';
          row.style.borderColor = 'var(--border-subtle)';
        }
      });
      populateInspector();
      highlightCanvasSection(secId);
    }

    function highlightCanvasSection(secId) {
      document.querySelectorAll('.canvas-section-block').forEach(b => {
        if (b.getAttribute('data-sec-id') === secId) {
          b.style.outline = '2px solid var(--color-copper)';
          b.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          b.style.outline = 'none';
        }
      });
    }

    function populateInspector() {
      const sec = studioData.draftSections.find(s => s.id === selectedSectionId);
      const inspector = document.getElementById('inspector-content');
      const tag = document.getElementById('inspector-selected-tag');

      if (!sec) {
        inspector.innerHTML = '<div style="color:var(--color-muted); font-size:12px;">No section selected.</div>';
        return;
      }

      tag.innerText = sec.type.toUpperCase();

      inspector.innerHTML = \`
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Section Title</label>
          <input
            type="text"
            id="insp-title"
            value="\${sec.title || ''}"
            oninput="updateSectionProp('title', this.value)"
            style="width: 100%; margin-top: 6px; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;"
          />
        </div>

        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Subtitle / Description</label>
          <textarea
            id="insp-sub"
            rows="3"
            oninput="updateSectionProp('subtitle', this.value)"
            style="width: 100%; margin-top: 6px; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 12px; resize: vertical;"
          >\${sec.subtitle || ''}</textarea>
        </div>

        \${sec.type === 'hero' ? \`
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Hero Background Image URL</label>
            <input
              type="text"
              id="insp-image"
              value="\${sec.imageUrl || ''}"
              oninput="updateSectionProp('imageUrl', this.value)"
              style="width: 100%; margin-top: 6px; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 12px;"
            />
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">CTA Button Text</label>
            <input
              type="text"
              id="insp-cta-text"
              value="\${sec.ctaText || 'Explore Menu'}"
              oninput="updateSectionProp('ctaText', this.value)"
              style="width: 100%; margin-top: 6px; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;"
            />
          </div>
        \` : ''}

        \${sec.type === 'story' ? \`
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Story Manifesto Body</label>
            <textarea
              id="insp-content"
              rows="4"
              oninput="updateSectionProp('content', this.value)"
              style="width: 100%; margin-top: 6px; padding: 8px 12px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 12px; resize: vertical;"
            >\${sec.content || ''}</textarea>
          </div>
        \` : ''}

        <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; font-weight: 700; color: var(--color-linen);">Visible on Storefront</label>
            <input
              type="checkbox"
              \${sec.visible ? 'checked' : ''}
              onchange="updateSectionProp('visible', this.checked)"
              style="cursor: pointer;"
            />
          </div>
        </div>

        <button onclick="removeSelectedSection()" class="btn btn-secondary btn-sm" style="color: var(--color-crimson); border-color: rgba(201,87,87,0.3); margin-top: 12px; display: inline-flex; align-items: center; gap: 4px;">
          ${icon('trash', { size: 12, color: 'var(--color-crimson)' })}
          <span>Delete Section</span>
        </button>
      \`;
    }

    function updateSectionProp(prop, val) {
      const sec = studioData.draftSections.find(s => s.id === selectedSectionId);
      if (sec) {
        sec[prop] = val;
        renderCanvas();
        markDirty();
      }
    }

    function updateToken(key, val) {
      if (!studioData.draftTokens) studioData.draftTokens = {};
      studioData.draftTokens[key] = val;
      renderCanvas();
      markDirty();
    }

    function moveSection(secId, direction) {
      const idx = studioData.draftSections.findIndex(s => s.id === secId);
      if (idx === -1) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= studioData.draftSections.length) return;

      const item = studioData.draftSections.splice(idx, 1)[0];
      studioData.draftSections.splice(targetIdx, 0, item);
      pushHistory();
      renderSectionsList();
      renderCanvas();
      selectSection(secId);
    }

    function toggleSectionVisibility(secId) {
      const sec = studioData.draftSections.find(s => s.id === secId);
      if (sec) {
        sec.visible = !sec.visible;
        pushHistory();
        renderSectionsList();
        renderCanvas();
      }
    }

    function promptAddSection() {
      const title = prompt('Enter section title:', 'Chef Table Tasting');
      if (!title) return;
      const newSec = {
        id: 'sec_' + Date.now(),
        type: 'featured_dishes',
        title: title,
        subtitle: 'Curated dishes and seasonal specialties.',
        visible: true,
        order: studioData.draftSections.length + 1
      };
      studioData.draftSections.push(newSec);
      pushHistory();
      renderSectionsList();
      renderCanvas();
      selectSection(newSec.id);
    }

    function removeSelectedSection() {
      if (confirm('Are you sure you want to delete this section?')) {
        studioData.draftSections = studioData.draftSections.filter(s => s.id !== selectedSectionId);
        if (studioData.draftSections.length > 0) {
          selectedSectionId = studioData.draftSections[0].id;
        }
        pushHistory();
        renderSectionsList();
        renderCanvas();
        populateInspector();
      }
    }

    function renderSectionsList() {
      const container = document.getElementById('sections-list-container');
      container.innerHTML = studioData.draftSections.map((sec, idx) => \`
        <div
          class="section-item-row"
          id="sec-row-\${sec.id}"
          onclick="selectSection('\${sec.id}')"
          style="padding: 10px 12px; background: \${sec.id === selectedSectionId ? 'var(--color-copper-subtle)' : 'var(--color-charcoal)'}; border: 1px solid \${sec.id === selectedSectionId ? 'var(--color-copper)' : 'var(--border-subtle)'}; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 120ms ease;"
        >
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: var(--color-muted); font-size: 11px; font-family: var(--font-mono);">\${idx + 1}</span>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: var(--color-linen);">\${sec.title}</div>
              <div style="font-size: 11px; color: var(--color-stone); text-transform: uppercase;">\${sec.type}</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 4px;">
            <button onclick="moveSection('\${sec.id}', -1); event.stopPropagation();" title="Move Up" class="btn btn-ghost btn-sm" style="padding: 3px 6px;">
              ${icon('arrow-up', { size: 10, color: 'var(--color-stone)' })}
            </button>
            <button onclick="moveSection('\${sec.id}', 1); event.stopPropagation();" title="Move Down" class="btn btn-ghost btn-sm" style="padding: 3px 6px;">
              ${icon('arrow-down', { size: 10, color: 'var(--color-stone)' })}
            </button>
            <button onclick="toggleSectionVisibility('\${sec.id}'); event.stopPropagation();" title="Toggle Visibility" class="btn btn-ghost btn-sm" style="padding: 3px 6px;">
              \${sec.visible ? \`${icon('eye', { size: 12, color: 'var(--color-copper)' })}\` : \`${icon('x', { size: 12, color: 'var(--color-crimson)' })}\`}
            </button>
          </div>
        </div>
      \`).join('');
    }

    function renderCanvas() {
      const container = document.getElementById('studio-rendered-storefront');
      const t = studioData.draftTokens || activeTemplate.defaultTokens;
      const sections = studioData.draftSections.filter(s => s.visible);

      const starters = menuItems.filter(m => m.category === 'Starters').slice(0, 4);
      const mains = menuItems.filter(m => m.category === 'Mains').slice(0, 4);

      let sectionsHtml = '';
      sections.forEach(sec => {
        if (sec.type === 'hero') {
          sectionsHtml += \`
            <div
              class="canvas-section-block"
              data-sec-id="\${sec.id}"
              onclick="selectSection('\${sec.id}')"
              style="position: relative; height: \${t.heroHeight || '440px'}; display: flex; align-items: flex-end; padding: 40px; background: url('\${sec.imageUrl || activeTemplate.previewHero}') center/cover no-repeat; cursor: pointer; transition: outline 120ms ease;"
            >
              <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, \${t.backgroundColor} 100%);"></div>
              <div style="position: relative; z-index: 2; max-width: 640px;">
                <span style="display: inline-block; font-size: 11px; font-weight: 700; color: \${t.primaryColor}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">\${activeTemplate.tagline}</span>
                <h1 style="font-family: \${t.fontFamilyHeading}; font-size: 32px; font-weight: 800; color: \${t.textColor}; line-height: 1.2; margin-bottom: 12px;">\${sec.title}</h1>
                <p style="font-size: 14px; color: \${t.mutedColor}; line-height: 1.5; margin-bottom: 20px;">\${sec.subtitle || ''}</p>
                <div style="display: flex; gap: 12px;">
                  <button style="background: \${t.primaryColor}; color: #FFF; border: none; padding: 10px 22px; border-radius: \${t.borderRadius}; font-weight: 700; font-size: 13px;">\${sec.ctaText || 'Order Table Service'}</button>
                </div>
              </div>
            </div>
          \`;
        } else if (sec.type === 'featured_dishes') {
          sectionsHtml += \`
            <div
              class="canvas-section-block"
              data-sec-id="\${sec.id}"
              onclick="selectSection('\${sec.id}')"
              style="padding: 40px 32px; cursor: pointer; transition: outline 120ms ease;"
            >
              <div style="margin-bottom: 24px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: \${t.primaryColor}; text-transform: uppercase; letter-spacing: 0.08em;">\${sec.title}</div>
                <h2 style="font-family: \${t.fontFamilyHeading}; font-size: 24px; font-weight: 800; color: \${t.textColor}; margin-top: 4px;">\${sec.subtitle || 'Curated Offerings'}</h2>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
                \${[...starters, ...mains].map(dish => \`
                  <div style="background: \${t.surfaceColor}; border: 1px solid rgba(255,255,255,0.06); border-radius: \${t.borderRadius}; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <h4 style="font-family: \${t.fontFamilyHeading}; font-size: 15px; font-weight: 700; color: \${t.textColor};">\${dish.name}</h4>
                        <span style="font-size: 13px; font-weight: 800; color: \${t.primaryColor};">\${dish.formattedPrice}</span>
                      </div>
                      <p style="font-size: 12px; color: \${t.mutedColor}; line-height: 1.4;">\${dish.description}</p>
                    </div>
                  </div>
                \`).join('')}
              </div>
            </div>
          \`;
        } else if (sec.type === 'story') {
          sectionsHtml += \`
            <div
              class="canvas-section-block"
              data-sec-id="\${sec.id}"
              onclick="selectSection('\${sec.id}')"
              style="padding: 40px 32px; background: rgba(0,0,0,0.25); cursor: pointer; transition: outline 120ms ease;"
            >
              <div style="max-width: 680px; margin: 0 auto; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: \${t.primaryColor}; text-transform: uppercase;">Heritage & Technique</div>
                <h2 style="font-family: \${t.fontFamilyHeading}; font-size: 26px; font-weight: 800; color: \${t.textColor}; margin-top: 4px; margin-bottom: 14px;">\${sec.title}</h2>
                <p style="font-size: 14px; color: \${t.mutedColor}; line-height: 1.6;">\${sec.content || sec.subtitle || ''}</p>
              </div>
            </div>
          \`;
        } else if (sec.type === 'hours_contact') {
          sectionsHtml += \`
            <div
              class="canvas-section-block"
              data-sec-id="\${sec.id}"
              onclick="selectSection('\${sec.id}')"
              style="padding: 32px; border-top: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: outline 120ms ease;"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div>
                  <h3 style="font-family: \${t.fontFamilyHeading}; font-size: 18px; font-weight: 700; color: \${t.textColor};">\${sec.title}</h3>
                  <p style="font-size: 13px; color: \${t.mutedColor}; margin-top: 4px;">\${sec.subtitle || 'Daily service in main dining hall & courtyard'}</p>
                </div>
                <div style="font-size: 12px; color: \${t.mutedColor};">
                  <strong>Location:</strong> \${brandConfig.restaurantName} · \${brandConfig.subdomain || 'bistro.orbitox.live'}
                </div>
              </div>
            </div>
          \`;
        }
      });

      container.innerHTML = \`
        <div style="background: \${t.backgroundColor}; color: \${t.textColor}; font-family: \${t.fontFamilyBody}; min-height: 700px;">
          <!-- Top Navigation Header -->
          <div style="padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-family: \${t.fontFamilyHeading}; font-size: 18px; font-weight: 800; color: \${t.textColor};">\${brandConfig.restaurantName}</span>
            </div>
            <div style="display: flex; gap: 16px; font-size: 12px; color: \${t.mutedColor};">
              <span>Menu</span>
              <span>Philosophy</span>
              <span>Reservations</span>
            </div>
          </div>

          \${sectionsHtml}
        </div>
      \`;

      highlightCanvasSection(selectedSectionId);
    }

    function markDirty() {
      const ind = document.getElementById('save-status-indicator');
      ind.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:var(--color-amber);"></span> Unsaved changes';
    }

    async function saveDraft() {
      const btn = document.getElementById('btn-save-draft');
      btn.innerText = 'Saving...';

      try {
        const res = await fetch('/api/restaurant/studio/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftSections: studioData.draftSections,
            draftTokens: studioData.draftTokens,
            savedBy: 'Storefront Author'
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const ind = document.getElementById('save-status-indicator');
          ind.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:var(--color-sage);"></span> Saved';
          btn.innerText = 'Save Draft';
        } else {
          alert('Save failed: ' + (data.error || 'Server error'));
          btn.innerText = 'Save Draft';
        }
      } catch (err) {
        alert('Network error saving draft.');
        btn.innerText = 'Save Draft';
      }
    }

    async function publishStudio() {
      const summary = prompt('Enter a short summary for this publication revision:', 'Updated Autumn seasonal menu and visual tokens');
      if (summary === null) return;

      const btn = document.getElementById('btn-publish');
      btn.innerText = 'Publishing...';

      try {
        const res = await fetch('/api/restaurant/studio/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publishedBy: 'Sukhwinder Sandhu (Manager)',
            summary: summary || 'Published via Brand Studio'
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Successfully published Version ' + data.version + ' to live storefront!');
          window.location.reload();
        } else {
          alert('Publishing failed: ' + (data.error || 'Server error'));
          btn.innerText = 'Publish to Live Storefront';
        }
      } catch (err) {
        alert('Network error publishing draft.');
        btn.innerText = 'Publish to Live Storefront';
      }
    }

    async function restoreRevision(revId) {
      if (!confirm('Revert current working draft to this historical revision?')) return;
      try {
        const res = await fetch('/api/restaurant/studio/revisions/' + revId + '/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Revision restored successfully!');
          window.location.reload();
        } else {
          alert('Restore failed: ' + (data.error || 'Server error'));
        }
      } catch (err) {
        alert('Network error restoring revision.');
      }
    }

    function toggleRevisionsDrawer() {
      const d = document.getElementById('revisions-drawer');
      d.style.display = d.style.display === 'flex' ? 'none' : 'flex';
    }

    // Initialize Studio on load
    renderSectionsList();
    renderCanvas();
    populateInspector();
  </script>
`;
}
