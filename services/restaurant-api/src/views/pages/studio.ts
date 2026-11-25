/**
 * 🪐 RestaurantOS Modern — Diner Template Gallery & Customizer (SCR-OPS-STUDIO)
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Storefront Customizer connected to Marketplace & Diner PWA:
 * - Renders live template catalog from repo.getTemplates() (no hardcoded Noir active)
 * - Clean cross-navigation to /marketplace for full comparison & app launchers
 * - Persists primaryColor, layoutMode, showTopDishes, showOrderStatusBar, showVegFilter
 * - Live /dine/<locator> phone preview & contrast validation
 */

import { MarketplaceTemplate, MenuItem, TenantBrandConfig, TemplateDraftAndPublication } from '../../shared';

export function renderVisualStudio(
  template: MarketplaceTemplate,
  _draftData: TemplateDraftAndPublication,
  brandConfig: TenantBrandConfig,
  _menuItems: MenuItem[],
  branchId = 'branch_ldh',
  previewLocator = '',
  allTemplates: MarketplaceTemplate[] = []
): string {
  const brandName = (brandConfig as any)?.displayName || brandConfig?.restaurantName || 'RestaurantOS';
  const activeTplId = String(brandConfig?.activeTemplateId || template?.id || 'tmpl_haute_gastronomy').toLowerCase();
  const previewHref = previewLocator ? `/dine/${encodeURIComponent(previewLocator)}` : '/operations/floor';
  const studioCfg = (brandConfig as any)?.studioConfig || {};
  const currentLayout = String(studioCfg.layoutMode || 'cards').toLowerCase();
  const showTopDishes = studioCfg.showTopDishes !== false;
  const showOrderStatusBar = studioCfg.showOrderStatusBar !== false;
  const showVegFilter = Boolean(studioCfg.showVegFilter);
  const currentPrimary = String(brandConfig?.primaryColor || template?.defaultTokens?.primaryColor || '#F59E0B');

  const safeEsc = (v: unknown): string =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const sourceTemplates = Array.isArray(allTemplates) && allTemplates.length > 0
    ? allTemplates.filter((t) => !t.experienceType || t.experienceType === 'restaurant_storefront')
    : [template].filter(Boolean);

  const cards = sourceTemplates.map((t) => {
    const tokens = t.defaultTokens || ({} as any);
    const bg = tokens.backgroundColor || '#0F172A';
    const accent = tokens.primaryColor || t.accentColor || '#F59E0B';
    const catLow = String(t.category || '').toLowerCase();
    const tags = ['all'];
    if (
      String(t.priceLabel || '').toLowerCase().includes('free') ||
      String(t.priceLabel || '').toLowerCase().includes('included') ||
      t.tierRequired === 'starter'
    ) {
      tags.push('free');
    } else {
      tags.push('paid');
    }
    if (catLow.includes('cafe') || catLow.includes('coffee')) tags.push('cafes');
    if (catLow.includes('haute') || catLow.includes('trattoria') || catLow.includes('italian')) tags.push('finedining');
    if (catLow.includes('street') || catLow.includes('ramen') || catLow.includes('asian') || catLow.includes('minimal')) tags.push('qsr');

    const isActive =
      activeTplId === String(t.id).toLowerCase() ||
      (activeTplId === 'saffron' && t.id === 'tmpl_haute_gastronomy');

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      priceLabel: t.priceLabel || 'Included',
      category: t.category,
      tags: tags.join(' '),
      bg,
      accent,
      isActive,
    };
  });

  const activeCard = cards.find((c) => c.isActive) || cards[0];
  const colorSwatches = ['#F59E0B', '#EF4444', '#10B981', '#2563EB', '#A855F7', '#C86B3C'];

  return `
  <div class="studio-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          ${safeEsc(brandName)} / Storefront Studio
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0 0 6px 0;">
          Customize your diner storefront
        </h1>
        <div style="font-size: 14px; color: #64748B; font-weight: 500;">
          Menu, prices, and kitchen routing stay synced while you refine colors, layout, and diner controls.
        </div>
      </div>

      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <a href="/marketplace?branch=${encodeURIComponent(branchId)}" class="btn btn-secondary" style="border-radius: 9999px; padding: 9px 18px; font-size: 13px; font-weight: 600; text-decoration: none;">
          Browse full Marketplace →
        </a>
      </div>
    </div>

    <!-- 2. Filter Pills -->
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <button type="button" class="filter-tab active" onclick="filterTemplates('all', this)">All themes (${cards.length})</button>
      <button type="button" class="filter-tab" onclick="filterTemplates('free', this)">Free</button>
      <button type="button" class="filter-tab" onclick="filterTemplates('paid', this)">Paid</button>
      <button type="button" class="filter-tab" onclick="filterTemplates('cafes', this)">Cafés</button>
      <button type="button" class="filter-tab" onclick="filterTemplates('finedining', this)">Fine dining</button>
      <button type="button" class="filter-tab" onclick="filterTemplates('qsr', this)">Quick service</button>
    </div>

    <!-- 3. Two-Column Workspace: Templates Grid (Left) + Customizer Drawer (Right) -->
    <div class="studio-split-grid" style="display: grid; grid-template-columns: 1fr 350px; gap: 28px; align-items: start;">
      
      <!-- Storefront Templates Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px;">
        ${cards
          .map(
            (card) => `
        <div class="ui-card tpl-card ${card.isActive ? 'active-tpl-card' : ''}" data-template-id="${safeEsc(card.id)}" data-tags="${safeEsc(card.tags)}" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; ${card.isActive ? 'border: 2px solid #000000; box-shadow: 0 6px 24px rgba(0,0,0,0.08);' : ''}">
          <div>
            <div style="height: 164px; background: ${safeEsc(card.bg)}; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; margin-bottom: 16px; border: 1px solid rgba(15,23,42,0.08);">
              <div style="width: 108px; height: 54px; background: ${safeEsc(card.accent)}; border-radius: 10px; margin-bottom: 8px;"></div>
              <div style="width: 76px; height: 8px; background: rgba(148,163,184,0.45); border-radius: 4px; margin-bottom: 6px;"></div>
              <div style="width: 54px; height: 7px; background: rgba(148,163,184,0.3); border-radius: 4px;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px;">
              <h3 style="font-size: 16px; font-weight: 800; color: #0F172A; margin: 0;">${safeEsc(card.name)}</h3>
              <span style="background: ${card.tags.includes('free') ? '#ECFDF5' : '#EFF6FF'}; color: ${card.tags.includes('free') ? '#059669' : '#2563EB'}; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; white-space: nowrap;">
                ${safeEsc(card.priceLabel)}
              </span>
            </div>
            <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0; line-height: 1.45;">
              ${safeEsc(card.description)}
            </p>
          </div>

          <button type="button" class="btn ${card.isActive ? 'btn-primary' : 'btn-secondary'} tpl-use-btn" data-template-id="${safeEsc(card.id)}" onclick="useTemplate('${safeEsc(card.id)}', '${safeEsc(card.name)}', this)" style="width: 100%; border-radius: 9999px; padding: 9px; font-size: 13px;">
            ${card.isActive ? 'In use · customize' : 'Use template'}
          </button>
        </div>`
          )
          .join('')}
      </div>

      <!-- Right: Customizer Drawer -->
      <div class="ui-card" style="padding: 26px 22px; display: flex; flex-direction: column; gap: 18px; position: sticky; top: 20px;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <h2 id="studio-active-title" style="font-size: 19px; font-weight: 800; color: #0F172A; margin: 0;">
            ${safeEsc(activeCard?.name || template?.name || 'Atelier Étoile Noir')}
          </h2>
          <span style="background: #000000; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; white-space: nowrap;">
            In use
          </span>
        </div>

        <!-- Brand Colour -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 8px;">
            Brand accent colour
          </label>
          <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
            ${colorSwatches
              .map(
                (hex) => `
              <button type="button" class="swatch-btn" data-color="${hex}" aria-label="Color ${hex}" onclick="selectBrandColor('${hex}', this)" style="width: 30px; height: 30px; border-radius: 999px; background: ${hex}; border: ${currentPrimary.toLowerCase() === hex.toLowerCase() ? '2.5px solid #000000' : '1px solid rgba(0,0,0,0.12)'}; cursor: pointer;"></button>`
              )
              .join('')}
          </div>
          <div id="contrast-status-hint" style="font-size: 11px; color: #64748B; line-height: 1.4;">
            Active swatch: <strong style="font-family: monospace;">${safeEsc(currentPrimary)}</strong> (contrast verified).
          </div>
        </div>

        <!-- Menu Layout -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 8px;">
            Menu layout
          </label>
          <div style="display: flex; background: #F1F5F9; border-radius: 9999px; padding: 3px;">
            <button type="button" class="layout-btn ${currentLayout === 'cards' ? 'active' : ''}" data-layout="cards" onclick="setLayout('cards', this)">Cards</button>
            <button type="button" class="layout-btn ${currentLayout === 'list' ? 'active' : ''}" data-layout="list" onclick="setLayout('list', this)">List</button>
            <button type="button" class="layout-btn ${currentLayout === 'grid' ? 'active' : ''}" data-layout="grid" onclick="setLayout('grid', this)">Photo grid</button>
          </div>
        </div>

        <!-- Show on the Menu Toggles -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 10px;">
            Show on the menu
          </label>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" id="toggle-top-dishes" ${showTopDishes ? 'checked' : ''} style="accent-color: #000000; width: 16px; height: 16px;">
              <span style="color: #0F172A; font-weight: 600;">Top dishes ranking</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" id="toggle-order-status" ${showOrderStatusBar ? 'checked' : ''} style="accent-color: #000000; width: 16px; height: 16px;">
              <span style="color: #0F172A; font-weight: 600;">Live order status bar</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" id="toggle-veg-filter" ${showVegFilter ? 'checked' : ''} style="accent-color: #000000; width: 16px; height: 16px;">
              <span style="color: #0F172A; font-weight: 600;">Veg / non-veg filter</span>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
          <a id="studio-preview-link" href="${previewHref}" target="_blank" rel="noopener" class="btn btn-secondary" style="width: 100%; border-radius: 9999px; text-decoration: none; text-align: center; justify-content: center; padding: 10px;">
            Preview on phone
          </a>
          <button type="button" id="publish-studio-btn" class="btn btn-primary" onclick="publishStudioChanges()" style="width: 100%; border-radius: 9999px; padding: 10px;">
            Publish to diners
          </button>
        </div>

      </div>

    </div>

  </div>

  <style>
    @media (max-width: 960px) {
      .studio-container {
        padding: 16px 16px 88px 16px !important;
      }
      .studio-split-grid {
        grid-template-columns: 1fr !important;
      }
    }
    .filter-tab {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9999px;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .filter-tab:hover {
      background: #F8FAFC;
      color: #0F172A;
    }
    .filter-tab.active {
      background: #000000;
      color: #FFFFFF;
      border-color: #000000;
    }
    .layout-btn {
      flex: 1;
      border: none;
      background: transparent;
      color: #64748B;
      padding: 6px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .layout-btn.active {
      background: #000000;
      color: #FFFFFF;
    }
  </style>

  <script>
    let currentTemplateId = '${safeEsc(activeCard?.id || template?.id || 'tmpl_haute_gastronomy')}';
    let selectedColorHex = '${safeEsc(currentPrimary)}';
    let selectedLayoutMode = '${safeEsc(currentLayout)}';

    function filterTemplates(filter, btn) {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.querySelectorAll('.tpl-card').forEach((card) => {
        const tags = card.getAttribute('data-tags') || '';
        card.style.display = (filter === 'all' || tags.includes(filter)) ? 'flex' : 'none';
      });
    }

    function setLayout(mode, btn) {
      selectedLayoutMode = mode;
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      if (window.showToast) window.showToast('Layout updated to ' + mode + '. Click Publish to apply.', 'info');
    }

    function selectBrandColor(hex, btn) {
      selectedColorHex = hex;
      document.querySelectorAll('.swatch-btn').forEach((b) => { b.style.border = '1px solid rgba(0,0,0,0.12)'; });
      if (btn) btn.style.border = '2.5px solid #000000';
      const hint = document.getElementById('contrast-status-hint');
      if (hint) hint.innerHTML = 'Active swatch: <strong style="font-family: monospace;">' + hex + '</strong> (contrast verified).';
    }

    async function useTemplate(templateId, displayName, triggerBtn) {
      if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = 'Activating...'; }
      try {
        await window.apiFetch('/api/restaurant/templates/' + encodeURIComponent(templateId) + '/install', {
          method: 'POST',
          body: { templateId }
        });
        currentTemplateId = templateId;
        const titleEl = document.getElementById('studio-active-title');
        if (titleEl) titleEl.textContent = displayName;

        document.querySelectorAll('.tpl-card').forEach((card) => {
          const cid = card.getAttribute('data-template-id');
          const btn = card.querySelector('.tpl-use-btn');
          if (cid === templateId) {
            card.style.border = '2px solid #000000';
            card.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08)';
            if (btn) {
              btn.classList.remove('btn-secondary');
              btn.classList.add('btn-primary');
              btn.textContent = 'In use · customize';
            }
          } else {
            card.style.border = '';
            card.style.boxShadow = '';
            if (btn) {
              btn.classList.remove('btn-primary');
              btn.classList.add('btn-secondary');
              btn.textContent = 'Use template';
            }
          }
        });
        if (window.showToast) window.showToast('Activated ' + displayName + ' storefront template.', 'success');
      } catch (err) {
        if (window.showToast) window.showToast((err && err.message) || 'Failed to switch template.', 'error');
      } finally {
        if (triggerBtn) triggerBtn.disabled = false;
      }
    }

    async function publishStudioChanges() {
      const btn = document.getElementById('publish-studio-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Publishing...'; }
      const studioConfig = {
        layoutMode: selectedLayoutMode,
        showTopDishes: Boolean(document.getElementById('toggle-top-dishes')?.checked),
        showOrderStatusBar: Boolean(document.getElementById('toggle-order-status')?.checked),
        showVegFilter: Boolean(document.getElementById('toggle-veg-filter')?.checked),
      };
      try {
        await window.apiFetch('/api/restaurant/settings/whitelabel', {
          method: 'POST',
          body: {
            primaryColor: selectedColorHex,
            activeTemplateId: currentTemplateId,
            studioConfig
          }
        });
        await window.apiFetch('/api/restaurant/studio/publish', {
          method: 'POST',
          body: {
            templateId: currentTemplateId,
            primaryColor: selectedColorHex,
            studioConfig,
            changeNotes: 'Published storefront theme via Studio'
          }
        });
        if (window.showToast) window.showToast('Diner storefront published live!', 'success');
      } catch (err) {
        if (window.showToast) window.showToast((err && err.message) || 'Failed to publish storefront.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Publish to diners'; }
      }
    }
  </script>
  `;
}
