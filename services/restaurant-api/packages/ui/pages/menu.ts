/**
 * 🍷 RestaurantOS 5.3 — BOH Menu & Category Management Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * World-Class Restaurant Catalog & Menu Engineering Suite:
 * - Tab 1: Master Culinary Catalog (Search, dynamic category filters, item table, full editor)
 * - Tab 2: Category Taxonomy Management (Create, rename, reorder, archive with orphan prevention)
 * - Tab 3: Branch Overrides & 86'ing (Location-level pricing, availability toggles, inheritance)
 * - Complete Item Modal / Drawer (Responsive desktop 1440px, tablet 768px, mobile 390px):
 *   * Create & Edit modes with Unsaved Changes indicator
 *   * Live Image URL Preview with placeholder & error fallback
 *   * Authoritative Base Price in integer minor units (INR paise conversion)
 *   * Preparation SLA and kitchen station routing
 *   * Dietary flags (VEG, NON_VEG, VEGAN, GLUTEN_FREE) & allergens
 *   * Intuitive Modifier Group Editor (min/max selection limits, options, price adjustments)
 *   * Non-blocking toast notifications & custom confirmation modals (zero browser alert() calls)
 *   * Keyboard accessibility (Esc to close with dirty check, Cmd+Enter to save)
 */

import { BranchMenuOverride, BranchRecord, MenuItem, MenuCategory, DEFAULT_CATEGORIES } from '../../domain';
import { icon } from '../icons';

export function renderMenuWorkspace(
  menu: MenuItem[],
  branches: BranchRecord[],
  currentBranchId: string,
  branchOverrides: BranchMenuOverride[],
  categories?: MenuCategory[]
): string {
  const activeBranch = branches.find((b) => b.id === currentBranchId) || branches[0];
  const activeCategories = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
  const nonArchivedCategories = activeCategories.filter((c) => !c.isArchived);

  return `
  <div class="menu-workspace-root">
    <!-- Notifications Toast Container -->
    <div id="toast-container" class="toast-container" aria-live="polite"></div>

    <!-- Workspace Header -->
    <header class="workspace-header">
      <div>
        <nav class="breadcrumb-label" aria-label="Breadcrumb">
          Culinary Catalog & Multi-Location Taxonomy
        </nav>
        <h1 class="workspace-title">
          Menu & Category Workspace
        </h1>
      </div>
      <div class="workspace-header-actions">
        <button class="btn btn-secondary btn-sm" onclick="switchMenuTab('categories')">
          ${icon('layers', { size: 14 })} Manage Categories (${nonArchivedCategories.length})
        </button>
        <button class="btn btn-secondary btn-sm" onclick="switchMenuTab('overrides')">
          ${icon('map-pin', { size: 14 })} Branch Overrides & 86'ing
        </button>
        <button class="btn btn-primary btn-sm" id="btn-add-dish" onclick="openNewItemModal()">
          ${icon('plus', { size: 14 })} Add New Dish
        </button>
      </div>
    </header>

    <!-- Workspace Tabs -->
    <div class="workspace-tabs-bar" role="tablist">
      <button class="workspace-tab-btn active" id="tab-btn-catalog" role="tab" aria-selected="true" onclick="switchMenuTab('catalog')">
        ${icon('menu', { size: 14 })} Master Dishes (<span id="catalog-count-badge">${menu.filter(m => !m.isArchived).length}</span>)
      </button>
      <button class="workspace-tab-btn" id="tab-btn-categories" role="tab" aria-selected="false" onclick="switchMenuTab('categories')">
        ${icon('layers', { size: 14 })} Category Hierarchy (<span id="category-count-badge">${nonArchivedCategories.length}</span>)
      </button>
      <button class="workspace-tab-btn" id="tab-btn-overrides" role="tab" aria-selected="false" onclick="switchMenuTab('overrides')">
        ${icon('sliders', { size: 14 })} Branch Overrides (${activeBranch.name})
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: MASTER MENU CATALOG -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <section id="view-menu-catalog" class="tab-view-content" role="tabpanel" aria-labelledby="tab-btn-catalog">
      <!-- Search & Dynamic Category Filters derived from Persisted Domain Categories -->
      <div class="catalog-filters-bar">
        <div class="category-pills-scroll" id="category-pills-container" role="radiogroup" aria-label="Category Filters">
          <button class="btn btn-primary btn-sm cat-pill active" data-cat="ALL" onclick="filterCategory('ALL')">
            All Dishes (${menu.filter(m => !m.isArchived).length})
          </button>
          ${nonArchivedCategories
            .map(
              (cat) => `
            <button class="btn btn-secondary btn-sm cat-pill" data-cat="${cat.name}" onclick="filterCategory('${cat.name.replace(/'/g, "\\'")}')">
              ${cat.name}
            </button>`
            )
            .join('')}
        </div>
        <div class="catalog-search-wrapper">
          <span class="search-icon-adornment">${icon('search', { size: 13, color: 'var(--color-stone)' })}</span>
          <input
            type="text"
            id="dish-search-input"
            placeholder="Search dishes, stations, dietary..."
            oninput="handleSearch(this.value)"
            aria-label="Search dishes"
            class="catalog-search-input"
          />
        </div>
      </div>

      <!-- Items Table Card -->
      <div class="table-card-container">
        <div class="catalog-table-header" role="row">
          <div>Dish & Details</div>
          <div>Category</div>
          <div>Kitchen Station</div>
          <div>Base Price</div>
          <div>Prep SLA</div>
          <div style="text-align: right;">Actions</div>
        </div>

        <div class="catalog-rows-list" id="menu-rows-container">
          ${menu
            .filter((m) => !m.isArchived)
            .map(
              (item) => `
            <div class="data-row menu-item-row" id="row-${item.id}" data-id="${item.id}" data-cat="${item.category}" role="row">
              <div class="dish-primary-cell">
                <div class="dish-media-thumb">
                  ${
                    item.imageUrl
                      ? `<img src="${item.imageUrl}" alt="${item.name}" class="dish-thumb-img" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&auto=format&fit=crop&q=80';">`
                      : `<div class="dish-thumb-placeholder">${icon('coffee', { size: 18, color: 'var(--color-stone)' })}</div>`
                  }
                </div>
                <div class="dish-meta-info">
                  <div class="dish-title-row">
                    <span class="dish-name-label">${item.name}</span>
                    ${item.isPopular ? `<span class="badge badge-copper" style="font-size: 10px;">Popular</span>` : ''}
                    ${item.isSignature ? `<span class="badge badge-amber" style="font-size: 10px;">Signature</span>` : ''}
                    ${(item.dietaryFlags || []).map(f => `<span class="badge badge-dietary badge-dietary-${f.toLowerCase()}">${f}</span>`).join(' ')}
                  </div>
                  <div class="dish-description-label">${item.description || 'No description provided.'}</div>
                  ${item.modifierGroups && item.modifierGroups.length > 0 ? `
                    <div class="dish-modifiers-tag">
                      ${icon('sliders', { size: 11 })} ${item.modifierGroups.length} Modifier Group${item.modifierGroups.length > 1 ? 's' : ''}: 
                      <span style="color: var(--color-stone);">${item.modifierGroups.map(g => g.name).join(', ')}</span>
                    </div>` : ''}
                </div>
              </div>
              <div>
                <span class="badge badge-neutral">${item.category}</span>
              </div>
              <div>
                <span class="badge badge-copper">${item.station || 'CURRY_LINE'}</span>
              </div>
              <div class="dish-price-cell">
                ${item.formattedPrice || '₹' + ((item.basePriceMinor || 0) / 100).toFixed(2)}
              </div>
              <div class="dish-sla-cell">
                ${icon('clock', { size: 12, color: 'var(--color-stone)' })} ${item.prepDurationMinutes || 12} min
              </div>
              <div class="dish-actions-cell">
                <button class="btn btn-secondary btn-sm" onclick="openItemModal('${item.id}')" title="Edit dish details & modifiers">
                  ${icon('edit', { size: 12 })} Edit
                </button>
              </div>
            </div>`
            )
            .join('')}
        </div>
        <div id="no-dishes-empty" class="empty-state-card" style="display: none;">
          ${icon('search', { size: 32, color: 'var(--color-stone)' })}
          <div style="font-size: 14px; font-weight: 700; color: #FFF; margin-top: 10px;">No matching dishes found</div>
          <div style="font-size: 12px; color: var(--color-stone); margin-top: 4px;">Try searching for a different keyword or select another category filter.</div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: CATEGORY TAXONOMY MANAGEMENT -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <section id="view-menu-categories" class="tab-view-content" style="display: none;" role="tabpanel" aria-labelledby="tab-btn-categories">
      <div class="categories-toolbar">
        <div>
          <h2 style="font-size: 16px; font-weight: 800; color: #FFF; margin: 0 0 4px 0;">Menu Categories Hierarchy</h2>
          <p style="font-size: 12px; color: var(--color-stone); margin: 0;">Organize the dining taxonomy. Reorder priority, edit labels, or archive categories with automatic dish orphan protection.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openNewCategoryModal()">
          ${icon('plus', { size: 14 })} Add Category
        </button>
      </div>

      <div class="table-card-container">
        <div class="categories-table-header" role="row">
          <div>Order</div>
          <div>Category Details</div>
          <div>Assigned Dishes</div>
          <div style="text-align: right;">Actions</div>
        </div>

        <div class="categories-rows-list" id="categories-rows-container">
          ${nonArchivedCategories
            .map((cat, idx) => {
              const assignedCount = menu.filter((m) => !m.isArchived && (m.category === cat.name || m.categoryId === cat.id)).length;
              return `
            <div class="data-row category-row" id="cat-row-${cat.id}" data-id="${cat.id}" data-order="${cat.displayOrder || idx + 1}">
              <div class="cat-order-cell">
                <span class="cat-order-number">${cat.displayOrder || idx + 1}</span>
                <div class="cat-order-btns">
                  <button class="btn btn-ghost btn-icon-xs" onclick="moveCategoryOrder('${cat.id}', -1)" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
                    ${icon('arrow-up', { size: 12 })}
                  </button>
                  <button class="btn btn-ghost btn-icon-xs" onclick="moveCategoryOrder('${cat.id}', 1)" title="Move Down" ${idx === nonArchivedCategories.length - 1 ? 'disabled' : ''}>
                    ${icon('arrow-down', { size: 12 })}
                  </button>
                </div>
              </div>
              <div class="cat-details-cell">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="cat-color-dot" style="background-color: ${cat.color || '#D97706'};"></span>
                  <strong style="font-size: 14px; color: #FFF;">${cat.name}</strong>
                </div>
                <div style="font-size: 12px; color: var(--color-stone); margin-top: 2px;">${cat.description || 'No description provided.'}</div>
              </div>
              <div class="cat-count-cell">
                <span class="badge badge-neutral">${assignedCount} Dish${assignedCount === 1 ? '' : 'es'}</span>
              </div>
              <div class="cat-actions-cell">
                <button class="btn btn-secondary btn-sm" onclick="openEditCategoryModal('${cat.id}')">
                  ${icon('edit', { size: 12 })} Edit
                </button>
                <button class="btn btn-secondary btn-sm btn-danger-ghost" onclick="promptArchiveCategory('${cat.id}')" title="Archive category with orphan protection">
                  ${icon('trash', { size: 12 })} Archive
                </button>
              </div>
            </div>`;
            })
            .join('')}
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 3: BRANCH OVERRIDES & 86'ing -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <section id="view-menu-overrides" class="tab-view-content" style="display: none;" role="tabpanel" aria-labelledby="tab-btn-overrides">
      <div class="branch-selector-panel">
        <div>
          <div class="branch-selector-label">Target Outlet Context</div>
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <select id="branch-override-select" onchange="onBranchOverrideSelect(this.value)" class="branch-select-control">
              ${branches
                .map(
                  (b) => `
                <option value="${b.id}" ${b.id === activeBranch.id ? 'selected' : ''}>
                  ${b.name} (${b.city}) · ${b.code}
                </option>`
                )
                .join('')}
            </select>
            <span class="branch-meta-text">
              ${activeBranch.address} · Timezone: ${activeBranch.timezone}
            </span>
          </div>
        </div>
        <div>
          <span class="badge badge-sage">Authoritative Branch Isolation Active</span>
        </div>
      </div>

      <div class="table-card-container">
        <div class="overrides-table-header" role="row">
          <div>Dish Name</div>
          <div>Base Price</div>
          <div>Branch Price Override (₹)</div>
          <div>Availability (86'd / In Stock)</div>
          <div style="text-align: right;">Action</div>
        </div>

        <div class="overrides-rows-list" id="branch-override-rows">
          ${menu
            .filter((m) => !m.isArchived)
            .map((item) => {
              const override = branchOverrides.find(
                (o) => o.itemId === item.id && o.branchId === activeBranch.id
              );
              const isAvailable = override ? override.isAvailable : true;
              const hasPriceOverride = typeof override?.priceOverrideMinor === 'number';
              const overridePrice = hasPriceOverride ? (override!.priceOverrideMinor! / 100).toFixed(0) : '';

              return `
            <div class="data-row override-item-row" id="ov-row-${item.id}" role="row">
              <div>
                <span style="font-weight: 700; font-size: 14px; color: var(--color-linen);">${item.name}</span>
                <div style="font-size: 11px; color: var(--color-stone);">${item.category} · ${item.station || 'CURRY_LINE'}</div>
              </div>
              <div style="font-family: var(--font-mono); font-weight: 700; color: var(--color-stone);">
                ${item.formattedPrice || '₹' + ((item.basePriceMinor || 0) / 100).toFixed(2)}
              </div>
              <div>
                <input
                  type="number"
                  id="ov-price-${item.id}"
                  placeholder="Base (${((item.basePriceMinor || 0) / 100).toFixed(0)})"
                  value="${overridePrice}"
                  min="0"
                  class="override-price-input"
                  aria-label="Price override for ${item.name}"
                />
              </div>
              <div>
                <button
                  class="btn btn-sm ${isAvailable ? 'btn-secondary' : 'btn-danger'}"
                  id="ov-avail-btn-${item.id}"
                  data-available="${isAvailable}"
                  onclick="toggleItemAvailability('${item.id}')"
                  style="font-size: 11px; min-width: 130px;"
                >
                  ${isAvailable ? '● Available' : '○ 86\'d (Sold Out)'}
                </button>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button class="btn btn-primary btn-sm" onclick="saveBranchOverride('${item.id}')">
                  ${icon('check', { size: 12 })} Save Override
                </button>
              </div>
            </div>`;
            })
            .join('')}
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- BOH ITEM EDITOR MODAL (RESPONSIVE DESKTOP, TABLET, MOBILE) -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div id="item-modal" class="modal-backdrop" onclick="if(event.target === this) requestCloseItemModal()">
      <div class="modal-dialog-large" role="dialog" aria-modal="true" aria-labelledby="modal-item-title">
        <!-- Modal Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h2 id="modal-item-title" class="modal-title">Edit Culinary Dish</h2>
            <span id="unsaved-changes-indicator" class="unsaved-badge" style="display: none;">
              ● Unsaved Changes
            </span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="requestCloseItemModal()" aria-label="Close modal">
            ${icon('x', { size: 16, color: 'currentColor' })}
          </button>
        </div>

        <!-- Modal Body (2-Column Responsive Layout) -->
        <div class="modal-body-scroll">
          <form id="item-editor-form" onsubmit="event.preventDefault(); submitItemForm();">
            <div class="editor-grid">
              <!-- Left Column: Core Dish Metadata & Financials -->
              <div class="editor-col">
                <div class="form-group">
                  <label for="edit-item-name" class="form-label required">Dish Name</label>
                  <input type="text" id="edit-item-name" required placeholder="e.g. Murgh Makhani Royal" class="form-control" oninput="markFormDirty()" />
                  <div class="field-error-msg" id="err-item-name"></div>
                </div>

                <div class="form-group">
                  <label for="edit-item-category" class="form-label required">Category Taxonomy</label>
                  <div style="display: flex; gap: 8px;">
                    <select id="edit-item-category" class="form-control" style="flex: 1;" onchange="markFormDirty()">
                      ${nonArchivedCategories
                        .map((c) => `<option value="${c.name}">${c.name}</option>`)
                        .join('')}
                    </select>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="openNewCategoryModal()" title="Add Category">
                      ${icon('plus', { size: 13 })}
                    </button>
                  </div>
                  <div class="field-error-msg" id="err-item-category"></div>
                </div>

                <div class="form-group">
                  <label for="edit-item-desc" class="form-label">Dish Description</label>
                  <textarea id="edit-item-desc" rows="3" placeholder="Sensory tasting notes, key ingredients, preparation style..." class="form-control" oninput="markFormDirty()"></textarea>
                </div>

                <div class="form-row-2">
                  <div class="form-group">
                    <label for="edit-item-price" class="form-label required">Base Price (INR ₹)</label>
                    <div class="input-with-adornment">
                      <span class="input-prefix">₹</span>
                      <input type="number" id="edit-item-price" required min="0" step="0.5" placeholder="450" class="form-control has-prefix" oninput="onPriceInput(this.value); markFormDirty();" />
                    </div>
                    <div style="font-size: 11px; color: var(--color-stone); margin-top: 3px;" id="price-minor-preview">Stored as 45000 paise</div>
                    <div class="field-error-msg" id="err-item-price"></div>
                  </div>

                  <div class="form-group">
                    <label for="edit-item-sla" class="form-label required">Prep SLA (Minutes)</label>
                    <input type="number" id="edit-item-sla" required min="1" max="180" value="12" class="form-control" oninput="markFormDirty()" />
                    <div class="field-error-msg" id="err-item-sla"></div>
                  </div>
                </div>

                <div class="form-group">
                  <label for="edit-item-station" class="form-label required">Kitchen Routing Station</label>
                  <select id="edit-item-station" class="form-control" onchange="markFormDirty()">
                    <option value="CURRY_LINE">Curry & Wok Line</option>
                    <option value="TANDOOR">Tandoor Clay Oven</option>
                    <option value="BAR">Bar & Beverages</option>
                    <option value="EXPO">Expo Pass</option>
                    <option value="DESSERT">Dessert Station</option>
                  </select>
                </div>

                <!-- Dietary Badges -->
                <div class="form-group">
                  <label class="form-label">Dietary Attributes</label>
                  <div class="dietary-checkboxes-grid">
                    <label class="checkbox-pill">
                      <input type="checkbox" id="diet-flag-veg" value="VEG" onchange="markFormDirty()" />
                      <span>Vegetarian (VEG)</span>
                    </label>
                    <label class="checkbox-pill">
                      <input type="checkbox" id="diet-flag-non-veg" value="NON_VEG" onchange="markFormDirty()" />
                      <span>Non-Veg (NON_VEG)</span>
                    </label>
                    <label class="checkbox-pill">
                      <input type="checkbox" id="diet-flag-vegan" value="VEGAN" onchange="markFormDirty()" />
                      <span>Vegan (VEGAN)</span>
                    </label>
                    <label class="checkbox-pill">
                      <input type="checkbox" id="diet-flag-gf" value="GLUTEN_FREE" onchange="markFormDirty()" />
                      <span>Gluten-Free (GF)</span>
                    </label>
                  </div>
                </div>

                <!-- Merchandising Toggles -->
                <div class="form-row-2">
                  <label class="checkbox-pill">
                    <input type="checkbox" id="edit-item-popular" onchange="markFormDirty()" />
                    <span>Featured as "Popular"</span>
                  </label>
                  <label class="checkbox-pill">
                    <input type="checkbox" id="edit-item-signature" onchange="markFormDirty()" />
                    <span>Chef's "Signature"</span>
                  </label>
                </div>
              </div>

              <!-- Right Column: Image Preview & Interactive Modifier Group Editor -->
              <div class="editor-col">
                <!-- Image URL & Live Preview Card -->
                <div class="form-group">
                  <label for="edit-item-image" class="form-label">Photography Image URL</label>
                  <input
                    type="url"
                    id="edit-item-image"
                    placeholder="https://images.unsplash.com/..."
                    class="form-control"
                    oninput="updateImagePreview(this.value); markFormDirty();"
                  />
                  <div class="image-preview-box" id="image-preview-container">
                    <img id="image-preview-el" src="" alt="Dish preview" class="image-preview-img" style="display: none;" onerror="onImagePreviewError()" />
                    <div id="image-preview-placeholder" class="image-preview-empty">
                      ${icon('sparkles', { size: 24, color: 'var(--color-stone)' })}
                      <span>Enter photo URL to see high-resolution preview</span>
                    </div>
                  </div>
                </div>

                <!-- Modifier Groups Editor -->
                <div class="modifiers-editor-section">
                  <div class="modifiers-editor-header">
                    <div>
                      <div class="form-label" style="margin-bottom: 2px;">Modifier Groups & Customizers</div>
                      <div style="font-size: 11px; color: var(--color-stone);">Options for spice, sides, preparations, and price deltas</div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="addModifierGroup()">
                      ${icon('plus', { size: 12 })} Add Group
                    </button>
                  </div>

                  <div id="modifier-groups-list" class="modifier-groups-list">
                    <!-- Populated dynamically -->
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <div class="footer-left">
            <button type="button" id="btn-delete-item" class="btn btn-secondary btn-danger-ghost" style="display: none;" onclick="promptDeleteItem()">
              ${icon('trash', { size: 14 })} Archive Dish
            </button>
          </div>
          <div class="footer-right">
            <button type="button" class="btn btn-secondary" onclick="requestCloseItemModal()">Cancel</button>
            <button type="button" id="btn-save-item" class="btn btn-primary" onclick="submitItemForm()">
              ${icon('save', { size: 14 })} Save Dish
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- CATEGORY CREATE / EDIT MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div id="category-modal" class="modal-backdrop" onclick="if(event.target === this) closeCategoryModal()">
      <div class="modal-dialog-small" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
        <div class="modal-header">
          <h3 id="category-modal-title" class="modal-title">New Menu Category</h3>
          <button class="btn btn-ghost btn-sm" onclick="closeCategoryModal()" aria-label="Close">
            ${icon('x', { size: 14, color: 'currentColor' })}
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="cat-input-name" class="form-label required">Category Name</label>
            <input type="text" id="cat-input-name" placeholder="e.g. Tandoori Breads" class="form-control" />
            <div class="field-error-msg" id="err-cat-name"></div>
          </div>
          <div class="form-group">
            <label for="cat-input-desc" class="form-label">Description</label>
            <input type="text" id="cat-input-desc" placeholder="Freshly baked artisan rotis and naans..." class="form-control" />
          </div>
          <div class="form-group">
            <label for="cat-input-color" class="form-label">Taxonomy Color Accent</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="color" id="cat-input-color" value="#D97706" style="width: 44px; height: 36px; padding: 2px; background: transparent; border: 1px solid var(--border-default); border-radius: 6px; cursor: pointer;" />
              <span style="font-size: 12px; color: var(--color-stone);">Color badge shown on KDS and POS</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeCategoryModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="submitCategoryForm()">
            ${icon('save', { size: 14 })} Save Category
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- CATEGORY ARCHIVE & ORPHAN PROTECTION MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div id="category-archive-modal" class="modal-backdrop" onclick="if(event.target === this) closeCategoryArchiveModal()">
      <div class="modal-dialog-small" role="dialog" aria-modal="true" aria-labelledby="cat-archive-title">
        <div class="modal-header">
          <h3 id="cat-archive-title" class="modal-title" style="color: var(--color-crimson);">Archive Category</h3>
          <button class="btn btn-ghost btn-sm" onclick="closeCategoryArchiveModal()" aria-label="Close">
            ${icon('x', { size: 14, color: 'currentColor' })}
          </button>
        </div>
        <div class="modal-body">
          <div style="font-size: 13px; color: #FFF; line-height: 1.5; margin-bottom: 14px;" id="cat-archive-summary-text">
            This category contains active dishes. To prevent accidental orphaning, choose which category to reassign these dishes to:
          </div>
          <div class="form-group">
            <label for="cat-reassign-select" class="form-label required">Reassign Remaining Dishes To:</label>
            <select id="cat-reassign-select" class="form-control">
              <!-- Populated dynamically -->
            </select>
          </div>
          <div style="font-size: 11px; color: var(--color-stone); line-height: 1.4;">
            Once archived, this category tab will be removed from all branch storefronts. Existing branch price overrides will remain preserved.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeCategoryArchiveModal()">Cancel</button>
          <button type="button" class="btn btn-primary btn-danger" id="btn-confirm-archive-cat" onclick="confirmCategoryArchive()">
            Confirm & Reassign
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- GENERIC CONFIRMATION MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div id="confirm-modal" class="modal-backdrop" onclick="if(event.target === this) closeConfirmModal()">
      <div class="modal-dialog-small" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 id="confirm-modal-title" class="modal-title">Confirm Action</h3>
          <button class="btn btn-ghost btn-sm" onclick="closeConfirmModal()" aria-label="Close">
            ${icon('x', { size: 14, color: 'currentColor' })}
          </button>
        </div>
        <div class="modal-body">
          <p id="confirm-modal-message" style="font-size: 13px; color: #FFF; line-height: 1.5; margin: 0;"></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeConfirmModal()">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirm-modal-btn">Confirm</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ═════════════════════════════════════════════════════════════════════════ -->
  <!-- CSS DESIGN SYSTEM: TOAST / LINEAR / RESPONSIVE (1440px, 768px, 390px) -->
  <!-- ═════════════════════════════════════════════════════════════════════════ -->
  <style>
    .menu-workspace-root {
      padding: 24px;
      max-width: 1360px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      color: #E2E8F0;
    }

    .workspace-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .breadcrumb-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-stone, #94A3B8);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }

    .workspace-title {
      font-size: 24px;
      font-weight: 800;
      color: var(--color-linen, #F8FAFC);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .workspace-header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .workspace-tabs-bar {
      display: flex;
      gap: 6px;
      border-bottom: 1px solid var(--border-default, #2A3241);
      margin-bottom: 20px;
      overflow-x: auto;
    }

    .workspace-tab-btn {
      background: none;
      border: none;
      color: var(--color-stone, #94A3B8);
      font-size: 13px;
      font-weight: 700;
      padding: 10px 16px;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .workspace-tab-btn:hover {
      color: #FFF;
    }

    .workspace-tab-btn.active {
      color: var(--color-copper, #F59E0B);
      border-bottom-color: var(--color-copper, #F59E0B);
    }

    /* Filters Bar */
    .catalog-filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .category-pills-scroll {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
      max-width: 100%;
    }

    .cat-pill {
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 20px;
    }

    .catalog-search-wrapper {
      position: relative;
      min-width: 280px;
    }

    .search-icon-adornment {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .catalog-search-input {
      width: 100%;
      box-sizing: border-box;
      background: #0E1216;
      border: 1px solid var(--border-default, #2A3241);
      border-radius: 8px;
      padding: 8px 12px 8px 32px;
      color: #FFF;
      font-size: 12px;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .catalog-search-input:focus {
      border-color: var(--color-copper, #F59E0B);
    }

    /* Tables & Rows */
    .table-card-container {
      background: var(--color-charcoal, #14181F);
      border: 1px solid var(--border-default, #2A3241);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }

    .catalog-table-header {
      padding: 12px 16px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border-subtle, #1E2530);
      display: grid;
      grid-template-columns: minmax(280px, 2.5fr) 130px 130px 110px 100px 100px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-stone, #94A3B8);
      align-items: center;
    }

    .menu-item-row {
      display: grid;
      grid-template-columns: minmax(280px, 2.5fr) 130px 130px 110px 100px 100px;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle, #1E2530);
      transition: background 0.12s ease;
    }

    .menu-item-row:hover {
      background: rgba(255,255,255,0.025);
    }

    .dish-primary-cell {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .dish-media-thumb {
      width: 52px;
      height: 52px;
      border-radius: 8px;
      overflow: hidden;
      background: #0E1216;
      border: 1px solid var(--border-subtle, #1E2530);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dish-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .dish-thumb-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dish-meta-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .dish-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .dish-name-label {
      font-weight: 700;
      font-size: 14px;
      color: var(--color-linen, #F8FAFC);
    }

    .dish-description-label {
      font-size: 12px;
      color: var(--color-stone, #94A3B8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 440px;
    }

    .dish-modifiers-tag {
      font-size: 11px;
      color: var(--color-copper, #F59E0B);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }

    .dish-price-cell {
      font-family: var(--font-mono, monospace);
      font-weight: 700;
      font-size: 13px;
      color: var(--color-linen, #F8FAFC);
    }

    .dish-sla-cell {
      font-size: 12px;
      color: var(--color-stone, #94A3B8);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .dish-actions-cell {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    /* Badges */
    .badge-dietary {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
    }
    .badge-dietary-veg { background: rgba(34, 197, 94, 0.15); color: #4ADE80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-dietary-non_veg { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-dietary-vegan { background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-dietary-gluten_free { background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); }

    /* Categories Tab Styles */
    .categories-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
    }

    .categories-table-header {
      padding: 12px 16px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border-subtle, #1E2530);
      display: grid;
      grid-template-columns: 90px 2.5fr 150px 180px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-stone, #94A3B8);
      align-items: center;
    }

    .category-row {
      display: grid;
      grid-template-columns: 90px 2.5fr 150px 180px;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle, #1E2530);
    }

    .cat-order-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cat-order-number {
      font-family: var(--font-mono, monospace);
      font-weight: 800;
      font-size: 14px;
      color: var(--color-copper, #F59E0B);
      width: 22px;
    }

    .cat-order-btns {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .btn-icon-xs {
      padding: 2px 4px !important;
      line-height: 1;
      height: auto !important;
    }

    .cat-color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .cat-actions-cell {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    /* Branch Overrides Tab */
    .branch-selector-panel {
      background: var(--color-elevated, #181E29);
      border: 1px solid var(--border-default, #2A3241);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .branch-selector-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-stone, #94A3B8);
      margin-bottom: 4px;
    }

    .branch-select-control {
      background: #0E1216;
      border: 1px solid var(--border-strong, #3B465A);
      border-radius: 6px;
      padding: 8px 14px;
      color: #FFF;
      font-size: 14px;
      font-weight: 700;
      outline: none;
    }

    .branch-meta-text {
      font-size: 12px;
      color: var(--color-stone, #94A3B8);
    }

    .overrides-table-header {
      padding: 12px 16px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border-subtle, #1E2530);
      display: grid;
      grid-template-columns: minmax(200px, 2fr) 110px 160px 160px 140px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-stone, #94A3B8);
      align-items: center;
    }

    .override-item-row {
      display: grid;
      grid-template-columns: minmax(200px, 2fr) 110px 160px 160px 140px;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle, #1E2530);
    }

    .override-price-input {
      width: 120px;
      background: #0E1216;
      border: 1px solid var(--border-default, #2A3241);
      border-radius: 6px;
      padding: 6px 10px;
      color: #FFF;
      font-size: 12px;
      outline: none;
    }

    /* Modal System */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    }

    .modal-backdrop.open {
      display: flex;
    }

    .modal-dialog-large {
      background: #141820;
      border: 1px solid var(--border-strong, #3B465A);
      border-radius: 14px;
      width: 100%;
      max-width: 980px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,0.85);
      overflow: hidden;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-dialog-small {
      background: #141820;
      border: 1px solid var(--border-strong, #3B465A);
      border-radius: 12px;
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8);
      overflow: hidden;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      padding: 16px 22px;
      border-bottom: 1px solid var(--border-subtle, #1E2530);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255,255,255,0.015);
    }

    .modal-title {
      font-size: 17px;
      font-weight: 800;
      color: #FFF;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .unsaved-badge {
      font-size: 11px;
      font-weight: 700;
      color: #FBBF24;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 3px 8px;
      border-radius: 12px;
      animation: pulseIndicator 2s infinite;
    }

    @keyframes pulseIndicator {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.65; }
    }

    .modal-body-scroll {
      padding: 22px;
      overflow-y: auto;
      flex: 1;
    }

    .modal-body {
      padding: 20px 22px;
    }

    .modal-footer {
      padding: 14px 22px;
      border-top: 1px solid var(--border-subtle, #1E2530);
      background: rgba(10, 14, 20, 0.85);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-right {
      display: flex;
      gap: 10px;
    }

    /* Form Controls */
    .editor-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .editor-col {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .form-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-stone, #94A3B8);
      margin-bottom: 6px;
      display: block;
    }

    .form-label.required::after {
      content: " *";
      color: var(--color-crimson, #EF4444);
    }

    .form-control {
      width: 100%;
      box-sizing: border-box;
      background: #0B0E14;
      border: 1px solid var(--border-default, #2A3241);
      border-radius: 7px;
      padding: 8px 12px;
      color: #FFF;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-control:focus {
      border-color: var(--color-copper, #F59E0B);
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
    }

    .input-with-adornment {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-prefix {
      position: absolute;
      left: 10px;
      font-weight: 700;
      color: var(--color-stone, #94A3B8);
      pointer-events: none;
      font-size: 13px;
    }

    .form-control.has-prefix {
      padding-left: 24px;
    }

    .field-error-msg {
      font-size: 11px;
      color: var(--color-crimson, #EF4444);
      margin-top: 4px;
      min-height: 14px;
      font-weight: 600;
    }

    .dietary-checkboxes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .checkbox-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0B0E14;
      border: 1px solid var(--border-default, #2A3241);
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 12px;
      color: #CBD5E1;
      user-select: none;
      transition: background 0.12s ease;
    }

    .checkbox-pill:hover {
      background: #121722;
    }

    .checkbox-pill input[type="checkbox"] {
      accent-color: var(--color-copper, #F59E0B);
    }

    /* Image Preview */
    .image-preview-box {
      width: 100%;
      height: 140px;
      background: #0B0E14;
      border: 1px dashed var(--border-default, #2A3241);
      border-radius: 8px;
      margin-top: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .image-preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-preview-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--color-stone, #94A3B8);
      padding: 12px;
      text-align: center;
    }

    /* Modifier Groups Editor */
    .modifiers-editor-section {
      background: #0E1218;
      border: 1px solid var(--border-default, #2A3241);
      border-radius: 9px;
      padding: 14px;
      margin-top: 6px;
    }

    .modifiers-editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .modifier-groups-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 280px;
      overflow-y: auto;
    }

    .mod-group-card {
      background: #141820;
      border: 1px solid var(--border-strong, #3B465A);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .mod-group-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .mod-options-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .mod-option-row {
      display: grid;
      grid-template-columns: 2fr 100px 70px 32px;
      gap: 8px;
      align-items: center;
    }

    /* Toast Notification System */
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 100000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast-pill {
      pointer-events: auto;
      background: #1E2530;
      border: 1px solid var(--border-strong, #3B465A);
      color: #FFF;
      padding: 10px 16px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
      min-width: 260px;
      max-width: 420px;
      animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      transition: all 0.2s ease;
    }

    .toast-pill.toast-success {
      border-color: rgba(34, 197, 94, 0.4);
      background: #064E3B;
      color: #ECFDF5;
    }

    .toast-pill.toast-error {
      border-color: rgba(239, 68, 68, 0.4);
      background: #7F1D1D;
      color: #FEF2F2;
    }

    .toast-pill.toast-info {
      border-color: rgba(59, 130, 246, 0.4);
      background: #1E3A8A;
      color: #EFF6FF;
    }

    @keyframes toastSlideIn {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .btn-danger-ghost {
      color: var(--color-crimson, #EF4444) !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
    }
    .btn-danger-ghost:hover {
      background: rgba(239, 68, 68, 0.15) !important;
    }

    /* ═══════════════════════════════════════════════════════════════════════ */
    /* RESPONSIVE BREAKPOINTS (Desktop 1440px, Tablet 768px, Mobile 390px)   */
    /* ═══════════════════════════════════════════════════════════════════════ */
    @media (max-width: 900px) {
      .editor-grid {
        grid-template-columns: 1fr;
      }
      .catalog-table-header,
      .menu-item-row {
        grid-template-columns: 2fr 100px 90px 80px;
      }
      .catalog-table-header > div:nth-child(2),
      .catalog-table-header > div:nth-child(5),
      .menu-item-row > div:nth-child(2),
      .menu-item-row > div:nth-child(5) {
        display: none;
      }
    }

    @media (max-width: 600px) {
      .menu-workspace-root {
        padding: 12px;
      }
      .workspace-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .workspace-header-actions {
        width: 100%;
      }
      .workspace-header-actions button {
        flex: 1;
      }
      .catalog-filters-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .catalog-search-wrapper {
        min-width: 100%;
      }
      .catalog-table-header {
        display: none;
      }
      .menu-item-row {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 12px;
      }
      .dish-primary-cell {
        align-items: flex-start;
      }
      .dish-actions-cell {
        justify-content: flex-start;
      }
      .modal-dialog-large,
      .modal-dialog-small {
        max-height: 96vh;
        border-radius: 10px;
      }
      .modal-footer {
        flex-direction: column;
        gap: 10px;
      }
      .footer-right,
      .footer-left {
        width: 100%;
      }
      .footer-right button,
      .footer-left button {
        flex: 1;
      }
      .form-row-2,
      .dietary-checkboxes-grid {
        grid-template-columns: 1fr;
      }
      .overrides-table-header {
        display: none;
      }
      .override-item-row {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }
  </style>

  <!-- ═════════════════════════════════════════════════════════════════════════ -->
  <!-- CLIENT JAVASCRIPT: PERSISTENCE, TOASTS, VALIDATION, MODIFIERS, DRAG     -->
  <!-- ═════════════════════════════════════════════════════════════════════════ -->
  <script>
    // State initialization
    let menuData = ${JSON.stringify(menu)};
    let categoriesData = ${JSON.stringify(categories || DEFAULT_CATEGORIES)};
    let branchOverridesData = ${JSON.stringify(branchOverrides)};
    let currentBranchId = "${activeBranch.id}";
    let activeEditingItemId = null;
    let isFormDirty = false;
    let activeModalTarget = null;
    let modifierGroupsState = [];

    // ─────────────────────────────────────────────────────────────────────────
    // Tab Navigation
    // ─────────────────────────────────────────────────────────────────────────
    function switchMenuTab(tab) {
      document.getElementById('view-menu-catalog').style.display = tab === 'catalog' ? 'block' : 'none';
      document.getElementById('view-menu-categories').style.display = tab === 'categories' ? 'block' : 'none';
      document.getElementById('view-menu-overrides').style.display = tab === 'overrides' ? 'block' : 'none';

      document.querySelectorAll('.workspace-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });

      const activeBtn = document.getElementById('tab-btn-' + tab);
      if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-selected', 'true');
      }
    }

    function onBranchOverrideSelect(bId) {
      window.location.href = '/menu?branch=' + encodeURIComponent(bId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Non-Blocking Toast Notifications System
    // ─────────────────────────────────────────────────────────────────────────
    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const pill = document.createElement('div');
      pill.className = 'toast-pill toast-' + type;
      pill.innerHTML = \`
        <span>\${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <div style="flex: 1;">\${message}</div>
      \`;
      container.appendChild(pill);
      setTimeout(() => {
        pill.style.opacity = '0';
        pill.style.transform = 'translateY(-10px)';
        setTimeout(() => pill.remove(), 250);
      }, 4000);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Staff Authentication Header Resolver
    // ─────────────────────────────────────────────────────────────────────────
    function getStaffHeaders() {
      const token = (window.__STAFF_SESSION__ && window.__STAFF_SESSION__.token) || '';
      return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Master Catalog Filter & Search
    // ─────────────────────────────────────────────────────────────────────────
    let activeCategoryFilter = 'ALL';
    let activeSearchQuery = '';

    function filterCategory(cat) {
      activeCategoryFilter = cat;
      document.querySelectorAll('.cat-pill').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-cat') === cat);
      });
      applyFilters();
    }

    function handleSearch(q) {
      activeSearchQuery = q.toLowerCase().trim();
      applyFilters();
    }

    function applyFilters() {
      const rows = document.querySelectorAll('.menu-item-row');
      let visibleCount = 0;
      rows.forEach(r => {
        const rowCat = r.getAttribute('data-cat');
        const rowText = r.textContent.toLowerCase();
        const matchesCat = activeCategoryFilter === 'ALL' || rowCat === activeCategoryFilter;
        const matchesSearch = !activeSearchQuery || rowText.includes(activeSearchQuery);
        if (matchesCat && matchesSearch) {
          r.style.display = 'grid';
          visibleCount++;
        } else {
          r.style.display = 'none';
        }
      });
      const emptyEl = document.getElementById('no-dishes-empty');
      if (emptyEl) {
        emptyEl.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dirty Checking & Form Lifecycle
    // ─────────────────────────────────────────────────────────────────────────
    function markFormDirty() {
      isFormDirty = true;
      const ind = document.getElementById('unsaved-changes-indicator');
      if (ind) ind.style.display = 'inline-block';
    }

    function resetFormDirty() {
      isFormDirty = false;
      const ind = document.getElementById('unsaved-changes-indicator');
      if (ind) ind.style.display = 'none';
      clearFieldErrors();
    }

    function clearFieldErrors() {
      document.querySelectorAll('.field-error-msg').forEach(el => el.textContent = '');
    }

    function requestCloseItemModal() {
      if (isFormDirty) {
        openConfirmModal(
          'Discard Unsaved Changes?',
          'You have unsaved edits in this dish. Closing will discard these changes.',
          () => {
            closeItemModal();
          }
        );
      } else {
        closeItemModal();
      }
    }

    function closeItemModal() {
      document.getElementById('item-modal').classList.remove('open');
      activeEditingItemId = null;
      resetFormDirty();
    }

    function onPriceInput(val) {
      const num = parseFloat(val) || 0;
      const minor = Math.round(num * 100);
      const preview = document.getElementById('price-minor-preview');
      if (preview) {
        preview.textContent = 'Stored as ' + minor + ' paise (₹' + (minor / 100).toFixed(2) + ')';
      }
    }

    function updateImagePreview(url) {
      const img = document.getElementById('image-preview-el');
      const placeholder = document.getElementById('image-preview-placeholder');
      if (url && url.trim()) {
        img.src = url.trim();
        img.style.display = 'block';
        placeholder.style.display = 'none';
      } else {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
      }
    }

    function onImagePreviewError() {
      const img = document.getElementById('image-preview-el');
      const placeholder = document.getElementById('image-preview-placeholder');
      img.style.display = 'none';
      placeholder.style.display = 'flex';
      placeholder.innerHTML = '<span>⚠️ Invalid image URL or blocked by CORS</span>';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Item Modal: Open Create / Open Edit
    // ─────────────────────────────────────────────────────────────────────────
    function openNewItemModal() {
      activeEditingItemId = null;
      document.getElementById('modal-item-title').textContent = 'Add New Culinary Dish';
      document.getElementById('btn-delete-item').style.display = 'none';
      document.getElementById('btn-save-item').textContent = 'Create Dish';

      // Clear fields
      document.getElementById('edit-item-name').value = '';
      document.getElementById('edit-item-desc').value = '';
      document.getElementById('edit-item-price').value = '350';
      onPriceInput('350');
      document.getElementById('edit-item-sla').value = '15';
      document.getElementById('edit-item-station').value = 'CURRY_LINE';
      document.getElementById('edit-item-image').value = '';
      updateImagePreview('');

      // Checkboxes
      document.getElementById('diet-flag-veg').checked = true;
      document.getElementById('diet-flag-non-veg').checked = false;
      document.getElementById('diet-flag-vegan').checked = false;
      document.getElementById('diet-flag-gf').checked = false;
      document.getElementById('edit-item-popular').checked = false;
      document.getElementById('edit-item-signature').checked = false;

      // Select active category
      const catSelect = document.getElementById('edit-item-category');
      if (catSelect.options.length > 0) catSelect.selectedIndex = 0;

      // Empty modifier groups
      modifierGroupsState = [];
      renderModifierGroups();

      resetFormDirty();
      document.getElementById('item-modal').classList.add('open');
      document.getElementById('edit-item-name').focus();
    }

    function openItemModal(id) {
      const item = menuData.find(i => i.id === id);
      if (!item) return;

      activeEditingItemId = id;
      document.getElementById('modal-item-title').textContent = 'Edit: ' + item.name;
      document.getElementById('btn-delete-item').style.display = 'inline-flex';
      document.getElementById('btn-save-item').textContent = 'Save Changes';

      document.getElementById('edit-item-name').value = item.name || '';
      document.getElementById('edit-item-desc').value = item.description || '';
      const priceRupees = (item.basePriceMinor ? (item.basePriceMinor / 100) : 0).toFixed(0);
      document.getElementById('edit-item-price').value = priceRupees;
      onPriceInput(priceRupees);
      document.getElementById('edit-item-sla').value = item.prepDurationMinutes || 12;
      document.getElementById('edit-item-station').value = item.station || 'CURRY_LINE';
      document.getElementById('edit-item-image').value = item.imageUrl || '';
      updateImagePreview(item.imageUrl || '');

      // Category select
      const catSelect = document.getElementById('edit-item-category');
      let foundCat = false;
      for (let i = 0; i < catSelect.options.length; i++) {
        if (catSelect.options[i].value === item.category) {
          catSelect.selectedIndex = i;
          foundCat = true;
          break;
        }
      }
      if (!foundCat && catSelect.options.length > 0) catSelect.selectedIndex = 0;

      // Dietary
      const flags = item.dietaryFlags || [];
      document.getElementById('diet-flag-veg').checked = flags.includes('VEG');
      document.getElementById('diet-flag-non-veg').checked = flags.includes('NON_VEG');
      document.getElementById('diet-flag-vegan').checked = flags.includes('VEGAN');
      document.getElementById('diet-flag-gf').checked = flags.includes('GLUTEN_FREE');
      document.getElementById('edit-item-popular').checked = Boolean(item.isPopular);
      document.getElementById('edit-item-signature').checked = Boolean(item.isSignature);

      // Modifiers
      modifierGroupsState = JSON.parse(JSON.stringify(item.modifierGroups || []));
      renderModifierGroups();

      resetFormDirty();
      document.getElementById('item-modal').classList.add('open');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Modifier Groups Editor
    // ─────────────────────────────────────────────────────────────────────────
    function renderModifierGroups() {
      const container = document.getElementById('modifier-groups-list');
      if (!container) return;

      if (modifierGroupsState.length === 0) {
        container.innerHTML = \`
          <div style="font-size: 11px; color: var(--color-stone); text-align: center; padding: 12px; background: rgba(255,255,255,0.015); border-radius: 6px;">
            No modifier groups configured for this dish. Click "+ Add Group" above to add spice profiles, accompaniments, or size variants.
          </div>\`;
        return;
      }

      container.innerHTML = modifierGroupsState.map((grp, gIdx) => \`
        <div class="mod-group-card" data-gidx="\${gIdx}">
          <div class="mod-group-top">
            <input
              type="text"
              placeholder="Group Title (e.g. Spice Level)"
              value="\${escapeHtml(grp.name || '')}"
              oninput="modifierGroupsState[\${gIdx}].name = this.value; markFormDirty();"
              class="form-control"
              style="font-weight: 700; flex: 1;"
            />
            <button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" onclick="deleteModifierGroup(\${gIdx})" title="Delete group">
              ✕
            </button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label style="font-size: 10px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Min Required</label>
              <select class="form-control" style="font-size: 11px; padding: 4px 8px;" onchange="modifierGroupsState[\${gIdx}].minSelections = parseInt(this.value, 10); markFormDirty();">
                <option value="0" \${grp.minSelections === 0 ? 'selected' : ''}>Optional (0)</option>
                <option value="1" \${grp.minSelections >= 1 ? 'selected' : ''}>Required (1)</option>
              </select>
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Max Choices</label>
              <select class="form-control" style="font-size: 11px; padding: 4px 8px;" onchange="modifierGroupsState[\${gIdx}].maxSelections = parseInt(this.value, 10); markFormDirty();">
                <option value="1" \${grp.maxSelections === 1 ? 'selected' : ''}>Single Choice (Radio)</option>
                <option value="2" \${grp.maxSelections === 2 ? 'selected' : ''}>Up to 2 Choices</option>
                <option value="3" \${grp.maxSelections === 3 ? 'selected' : ''}>Up to 3 Choices</option>
                <option value="5" \${grp.maxSelections === 5 ? 'selected' : ''}>Multi (Up to 5)</option>
              </select>
            </div>
          </div>
          <div class="mod-options-list">
            <div style="display: grid; grid-template-columns: 2fr 100px 70px 32px; font-size: 10px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; padding: 2px 4px;">
              <div>Option Label</div>
              <div>Price (+₹)</div>
              <div>Default</div>
              <div></div>
            </div>
            \${(grp.options || []).map((opt, oIdx) => \`
              <div class="mod-option-row">
                <input
                  type="text"
                  placeholder="e.g. Extra Spicy"
                  value="\${escapeHtml(opt.name || '')}"
                  oninput="modifierGroupsState[\${gIdx}].options[\${oIdx}].name = this.value; markFormDirty();"
                  class="form-control"
                  style="font-size: 12px; padding: 4px 8px;"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="+₹0"
                  value="\${(opt.priceDeltaMinor ? (opt.priceDeltaMinor / 100) : 0).toFixed(0)}"
                  oninput="modifierGroupsState[\${gIdx}].options[\${oIdx}].priceDeltaMinor = Math.round(parseFloat(this.value || 0) * 100); markFormDirty();"
                  class="form-control"
                  style="font-size: 12px; padding: 4px 8px;"
                />
                <label style="display: flex; align-items: center; justify-content: center; cursor: pointer;">
                  <input
                    type="checkbox"
                    \${opt.isDefault ? 'checked' : ''}
                    onchange="modifierGroupsState[\${gIdx}].options[\${oIdx}].isDefault = this.checked; markFormDirty();"
                  />
                </label>
                <button type="button" class="btn btn-ghost btn-icon-xs" onclick="deleteModifierOption(\${gIdx}, \${oIdx})" style="color: var(--color-stone);">
                  ✕
                </button>
              </div>
            \`).join('')}
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="addModifierOption(\${gIdx})" style="font-size: 11px;">
              + Add Option
            </button>
          </div>
        </div>
      \`).join('');
    }

    function addModifierGroup() {
      modifierGroupsState.push({
        id: 'mod_' + Date.now().toString(36),
        name: 'New Customizer',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'opt_' + Date.now().toString(36), name: 'Standard', priceDeltaMinor: 0, isDefault: true }
        ]
      });
      renderModifierGroups();
      markFormDirty();
    }

    function deleteModifierGroup(gIdx) {
      modifierGroupsState.splice(gIdx, 1);
      renderModifierGroups();
      markFormDirty();
    }

    function addModifierOption(gIdx) {
      if (!modifierGroupsState[gIdx].options) modifierGroupsState[gIdx].options = [];
      modifierGroupsState[gIdx].options.push({
        id: 'opt_' + Date.now().toString(36),
        name: '',
        priceDeltaMinor: 0,
        isDefault: false
      });
      renderModifierGroups();
      markFormDirty();
    }

    function deleteModifierOption(gIdx, oIdx) {
      modifierGroupsState[gIdx].options.splice(oIdx, 1);
      renderModifierGroups();
      markFormDirty();
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Item Form Validation & Submission (Authoritative minor unit conversion)
    // ─────────────────────────────────────────────────────────────────────────
    async function submitItemForm() {
      clearFieldErrors();
      let hasError = false;

      const name = document.getElementById('edit-item-name').value.trim();
      if (!name) {
        document.getElementById('err-item-name').textContent = 'Dish name is required.';
        hasError = true;
      }

      const category = document.getElementById('edit-item-category').value;
      if (!category) {
        document.getElementById('err-item-category').textContent = 'Please select a valid category.';
        hasError = true;
      }

      const priceVal = parseFloat(document.getElementById('edit-item-price').value);
      if (isNaN(priceVal) || priceVal < 0) {
        document.getElementById('err-item-price').textContent = 'Base price must be a non-negative number.';
        hasError = true;
      }

      const slaVal = parseInt(document.getElementById('edit-item-sla').value, 10);
      if (isNaN(slaVal) || slaVal <= 0) {
        document.getElementById('err-item-sla').textContent = 'Preparation duration must be at least 1 minute.';
        hasError = true;
      }

      if (hasError) return;

      const basePriceMinor = Math.round(priceVal * 100);
      const formattedPrice = '₹' + (basePriceMinor / 100).toFixed(2);
      const description = document.getElementById('edit-item-desc').value.trim();
      const station = document.getElementById('edit-item-station').value;
      const imageUrl = document.getElementById('edit-item-image').value.trim();

      const dietaryFlags = [];
      if (document.getElementById('diet-flag-veg').checked) dietaryFlags.push('VEG');
      if (document.getElementById('diet-flag-non-veg').checked) dietaryFlags.push('NON_VEG');
      if (document.getElementById('diet-flag-vegan').checked) dietaryFlags.push('VEGAN');
      if (document.getElementById('diet-flag-gf').checked) dietaryFlags.push('GLUTEN_FREE');

      const isPopular = document.getElementById('edit-item-popular').checked;
      const isSignature = document.getElementById('edit-item-signature').checked;

      const payload = {
        name,
        category,
        description,
        basePriceMinor,
        formattedPrice,
        prepDurationMinutes: slaVal,
        station,
        imageUrl: imageUrl || undefined,
        dietaryFlags,
        isPopular,
        isSignature,
        modifierGroups: modifierGroupsState.filter(g => g.name && g.name.trim())
      };

      const isEdit = Boolean(activeEditingItemId);
      const url = isEdit ? '/api/restaurant/menu/items/' + encodeURIComponent(activeEditingItemId) : '/api/restaurant/menu/items';
      const method = isEdit ? 'PATCH' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: getStaffHeaders(),
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(isEdit ? '✅ Dish updated authoritatively' : '✅ New dish created in catalog', 'success');
          closeItemModal();
          // Reload page to reflect authoritative server reconciliation across tabs
          setTimeout(() => window.location.reload(), 400);
        } else {
          showToast(data.error || data.message || 'Server rejected dish save', 'error');
        }
      } catch (err) {
        showToast('Network error saving dish: ' + err.message, 'error');
      }
    }

    function promptDeleteItem() {
      if (!activeEditingItemId) return;
      const item = menuData.find(i => i.id === activeEditingItemId);
      const itemName = item ? item.name : 'this dish';

      openConfirmModal(
        'Archive Dish: ' + itemName,
        'Are you sure you want to archive ' + itemName + '? It will no longer appear on guest storefronts or active ordering sessions.',
        async () => {
          try {
            const res = await fetch('/api/restaurant/menu/items/' + encodeURIComponent(activeEditingItemId), {
              method: 'DELETE',
              headers: getStaffHeaders(),
            });
            if (res.ok) {
              showToast('Dish archived successfully', 'success');
              closeItemModal();
              setTimeout(() => window.location.reload(), 400);
            } else {
              showToast('Failed to archive dish.', 'error');
            }
          } catch (err) {
            showToast('Network error archiving dish: ' + err.message, 'error');
          }
        }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Category Taxonomy Management
    // ─────────────────────────────────────────────────────────────────────────
    let activeEditingCategoryId = null;

    function openNewCategoryModal() {
      activeEditingCategoryId = null;
      document.getElementById('category-modal-title').textContent = 'New Menu Category';
      document.getElementById('cat-input-name').value = '';
      document.getElementById('cat-input-desc').value = '';
      document.getElementById('cat-input-color').value = '#D97706';
      document.getElementById('err-cat-name').textContent = '';
      document.getElementById('category-modal').classList.add('open');
      document.getElementById('cat-input-name').focus();
    }

    function openEditCategoryModal(id) {
      const cat = categoriesData.find(c => c.id === id);
      if (!cat) return;
      activeEditingCategoryId = id;
      document.getElementById('category-modal-title').textContent = 'Edit Category: ' + cat.name;
      document.getElementById('cat-input-name').value = cat.name;
      document.getElementById('cat-input-desc').value = cat.description || '';
      document.getElementById('cat-input-color').value = cat.color || '#D97706';
      document.getElementById('err-cat-name').textContent = '';
      document.getElementById('category-modal').classList.add('open');
    }

    function closeCategoryModal() {
      document.getElementById('category-modal').classList.remove('open');
      activeEditingCategoryId = null;
    }

    async function submitCategoryForm() {
      const name = document.getElementById('cat-input-name').value.trim();
      if (!name) {
        document.getElementById('err-cat-name').textContent = 'Category name is required.';
        return;
      }
      const description = document.getElementById('cat-input-desc').value.trim();
      const color = document.getElementById('cat-input-color').value;

      const isEdit = Boolean(activeEditingCategoryId);
      const url = isEdit ? '/api/restaurant/menu/categories/' + encodeURIComponent(activeEditingCategoryId) : '/api/restaurant/menu/categories';
      const method = isEdit ? 'PATCH' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: getStaffHeaders(),
          body: JSON.stringify({ name, description, color })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(isEdit ? 'Category updated' : 'Category created', 'success');
          closeCategoryModal();
          setTimeout(() => window.location.reload(), 400);
        } else {
          document.getElementById('err-cat-name').textContent = data.error || data.message || 'Failed to save category';
        }
      } catch (err) {
        showToast('Network error saving category', 'error');
      }
    }

    async function moveCategoryOrder(catId, delta) {
      const activeCats = categoriesData.filter(c => !c.isArchived).sort((a,b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      const idx = activeCats.findIndex(c => c.id === catId);
      if (idx < 0) return;
      const targetIdx = idx + delta;
      if (targetIdx < 0 || targetIdx >= activeCats.length) return;

      // Swap
      const temp = activeCats[idx];
      activeCats[idx] = activeCats[targetIdx];
      activeCats[targetIdx] = temp;

      const orderedIds = activeCats.map(c => c.id);
      try {
        const res = await fetch('/api/restaurant/menu/categories/reorder', {
          method: 'POST',
          headers: getStaffHeaders(),
          body: JSON.stringify({ orderedIds })
        });
        if (res.ok) {
          showToast('Category sequence updated', 'success');
          setTimeout(() => window.location.reload(), 400);
        } else {
          showToast('Failed to reorder categories', 'error');
        }
      } catch (err) {
        showToast('Network error reordering categories', 'error');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Category Archive & Orphan Protection
    // ─────────────────────────────────────────────────────────────────────────
    let categoryToArchiveId = null;

    function promptArchiveCategory(catId) {
      const cat = categoriesData.find(c => c.id === catId);
      if (!cat) return;
      categoryToArchiveId = catId;

      const assignedDishes = menuData.filter(m => !m.isArchived && (m.category === cat.name || m.categoryId === cat.id));
      const otherCats = categoriesData.filter(c => !c.isArchived && c.id !== catId);

      const summaryEl = document.getElementById('cat-archive-summary-text');
      const selectEl = document.getElementById('cat-reassign-select');

      if (assignedDishes.length === 0) {
        summaryEl.textContent = 'Category "' + cat.name + '" currently has 0 active dishes. Archiving it will remove it from the menu taxonomy.';
        selectEl.parentElement.style.display = 'none';
      } else {
        summaryEl.textContent = 'Category "' + cat.name + '" currently contains ' + assignedDishes.length + ' active dish(es). To avoid orphaned dishes, select a destination category:';
        selectEl.parentElement.style.display = 'block';
        selectEl.innerHTML = otherCats.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
      }

      document.getElementById('category-archive-modal').classList.add('open');
    }

    function closeCategoryArchiveModal() {
      document.getElementById('category-archive-modal').classList.remove('open');
      categoryToArchiveId = null;
    }

    async function confirmCategoryArchive() {
      if (!categoryToArchiveId) return;
      const selectEl = document.getElementById('cat-reassign-select');
      const reassignTo = selectEl.value;

      try {
        const url = '/api/restaurant/menu/categories/' + encodeURIComponent(categoryToArchiveId) + (reassignTo ? '?reassignTo=' + encodeURIComponent(reassignTo) : '');
        const res = await fetch(url, {
          method: 'DELETE',
          headers: getStaffHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Category archived safely without orphaned items', 'success');
          closeCategoryArchiveModal();
          setTimeout(() => window.location.reload(), 400);
        } else {
          showToast(data.message || data.error || 'Failed to archive category', 'error');
        }
      } catch (err) {
        showToast('Network error archiving category', 'error');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Branch Overrides & 86'ing
    // ─────────────────────────────────────────────────────────────────────────
    function toggleItemAvailability(itemId) {
      const btn = document.getElementById('ov-avail-btn-' + itemId);
      const current = btn.getAttribute('data-available') === 'true';
      const next = !current;
      btn.setAttribute('data-available', next ? 'true' : 'false');
      btn.textContent = next ? '● Available' : '○ 86\\'d (Sold Out)';
      btn.className = 'btn btn-sm ' + (next ? 'btn-secondary' : 'btn-danger');
    }

    async function saveBranchOverride(itemId) {
      const priceVal = document.getElementById('ov-price-' + itemId).value.trim();
      const btn = document.getElementById('ov-avail-btn-' + itemId);
      const isAvailable = btn.getAttribute('data-available') === 'true';

      const priceMinor = priceVal ? Math.round(parseFloat(priceVal) * 100) : undefined;
      const formattedPrice = priceMinor ? ('₹' + (priceMinor / 100).toFixed(2)) : undefined;

      try {
        const res = await fetch('/api/restaurant/menu/branch-overrides', {
          method: 'POST',
          headers: getStaffHeaders(),
          body: JSON.stringify({
            itemId,
            branchId: currentBranchId,
            isAvailable,
            priceOverrideMinor: priceMinor,
            formattedPriceOverride: formattedPrice,
          })
        });
        if (res.ok) {
          showToast('Branch override saved for ' + currentBranchId, 'success');
        } else {
          showToast('Failed to save branch override.', 'error');
        }
      } catch (err) {
        showToast('Network error saving override: ' + err.message, 'error');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Confirmation Modal Helper
    // ─────────────────────────────────────────────────────────────────────────
    let confirmCallback = null;

    function openConfirmModal(title, message, onConfirm) {
      document.getElementById('confirm-modal-title').textContent = title;
      document.getElementById('confirm-modal-message').textContent = message;
      confirmCallback = onConfirm;
      document.getElementById('confirm-modal').classList.add('open');
    }

    function closeConfirmModal() {
      document.getElementById('confirm-modal').classList.remove('open');
      confirmCallback = null;
    }

    document.getElementById('confirm-modal-btn').addEventListener('click', () => {
      if (confirmCallback) {
        const cb = confirmCallback;
        closeConfirmModal();
        cb();
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Keyboard Accessibility (Esc to close, Cmd+Enter to save)
    // ─────────────────────────────────────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('confirm-modal').classList.contains('open')) {
          closeConfirmModal();
          return;
        }
        if (document.getElementById('category-archive-modal').classList.contains('open')) {
          closeCategoryArchiveModal();
          return;
        }
        if (document.getElementById('category-modal').classList.contains('open')) {
          closeCategoryModal();
          return;
        }
        if (document.getElementById('item-modal').classList.contains('open')) {
          requestCloseItemModal();
          return;
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (document.getElementById('item-modal').classList.contains('open')) {
          e.preventDefault();
          submitItemForm();
        } else if (document.getElementById('category-modal').classList.contains('open')) {
          e.preventDefault();
          submitCategoryForm();
        }
      }
    });
  </script>
`;
}
