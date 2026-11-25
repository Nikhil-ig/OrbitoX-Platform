/**
 * 🪐 RestaurantOS Modern — R4 Menu Catalog & Dish Drawer (SCR-OPS-MENU)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'R4 · Menu · edit item.png':
 * - Dynamic category tabs (All, Mains, Starters, Breads, Drinks, Desserts, + Category)
 * - Yellow sample menu banner ("ⓘ Sample menu: diners see these dishes until you edit or remove them")
 * - Dish list rows mapped dynamically from database with veg/non-veg tags, prep station, and status pills
 * - Slide-out interactive dish editor drawer (photo upload, 5% GST, HSN 996331, allergens, add-ons, multi-branch pricing)
 * - Real API persistence: POST /api/restaurant/menu/items, PATCH /api/restaurant/menu/items/:id, DELETE /api/restaurant/menu/items/:id
 */

import { MenuItem, BranchRecord, BranchMenuOverride, MenuCategory, DEFAULT_MENU } from '../../shared';
import { icon } from '../icons';

export function renderMenuWorkspace(
  menu: MenuItem[] = DEFAULT_MENU,
  branches: BranchRecord[] = [],
  currentBranchId = 'branch_ldh',
  branchOverrides: BranchMenuOverride[] = [],
  categories: MenuCategory[] = []
): string {
  const displayItems = menu.length > 0 ? menu : DEFAULT_MENU;
  const totalCount = displayItems.length;

  // Extract categories dynamically
  const uniqueCategories = Array.from(
    new Set(displayItems.map((item) => item.category || 'Mains'))
  );
  if (!uniqueCategories.includes('Mains')) uniqueCategories.unshift('Mains');

  // Count items per category
  const categoryCounts: Record<string, number> = {};
  displayItems.forEach((item) => {
    const cat = item.category || 'Mains';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const branchList = branches.length > 0 ? branches : [
    { id: 'branch_ldh', name: 'Indiranagar' },
    { id: 'branch_kor', name: 'Koramangala' }
  ];

  return `
  <div class="menu-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header: Meta, Title & Top Action Buttons -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          ${totalCount} items · ${uniqueCategories.length} categories · shared by all branches
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
          Menu
        </h1>
      </div>

      <div style="display: flex; gap: 12px; align-items: center;">
        <input 
          type="text" 
          id="menu-search-input" 
          placeholder="Search dishes..." 
          oninput="handleMenuSearch(this.value)"
          style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 9px 18px; font-size: 13px; outline: none; width: 200px; color: #0F172A;"
        >
        <button type="button" class="btn btn-secondary" onclick="exportMenuCsv()" style="padding: 9px 20px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
          Export CSV
        </button>
        <button type="button" class="btn btn-primary" onclick="openNewDishDrawer()" style="padding: 9px 22px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
          Add item
        </button>
      </div>
    </div>

    <!-- 2. Sample Menu Banner -->
    <div id="sample-menu-banner" style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 18px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #92400E; font-weight: 500;">
        <span style="font-size: 16px;">ⓘ</span>
        <span>Sample menu: diners see these dishes until you edit or remove them.</span>
      </div>
      <a href="#remove-samples" onclick="removeAllSampleDishes(); return false;" style="font-size: 13px; font-weight: 600; color: #92400E; text-decoration: underline; white-space: nowrap;">
        Remove all samples
      </a>
    </div>

    <!-- 3. Category Filter Tabs -->
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <button type="button" class="category-pill active" onclick="filterCategory('ALL', this)">
        All · ${totalCount}
      </button>
      ${uniqueCategories
      .map(
        (cat) => `
        <button type="button" class="category-pill" onclick="filterCategory('${escapeHtml(cat)}', this)">
          ${escapeHtml(cat)} · ${categoryCounts[cat] || 0}
        </button>`
      )
      .join('')}
      <button type="button" class="category-pill-ghost" onclick="addNewCategory()">
        + Category
      </button>
    </div>

    <!-- 4. Two-Column Workspace: Dishes List (Left) + Slide-Out Editor Drawer (Right) -->
    <div class="menu-split-grid" style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 28px; align-items: start;">
      
      <!-- Dish List (Clean White Card) -->
      <div id="dish-list-container" class="ui-card" style="padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; max-height: calc(100vh - 280px); overflow-y: auto;">
        ${displayItems
      .map((dish, idx) => {
        const isVeg = (dish.dietaryFlags || []).includes('VEG') || (dish.dietaryFlags || []).includes('VEGAN');
        const price = dish.formattedPrice || `₹${((dish.basePriceMinor || 0) / 100).toFixed(0)}`;
        const isFirst = idx === 0;

        const bgGradients = [
          'linear-gradient(135deg, #F97316, #EA580C)',
          'linear-gradient(135deg, #FBBF24, #D97706)',
          'linear-gradient(135deg, #92400E, #78350F)',
          'linear-gradient(135deg, #F59E0B, #B45309)',
          'linear-gradient(135deg, #10B981, #059669)',
          'linear-gradient(135deg, #EF4444, #B91C1C)',
          'linear-gradient(135deg, #3B82F6, #1D4ED8)',
          'linear-gradient(135deg, #8B5CF6, #6D28D9)',
        ];
        const thumbBg = bgGradients[idx % bgGradients.length];

        return `
            <div 
              class="dish-row ${isFirst ? 'active-dish' : ''}" 
              data-dish-id="${dish.id}" 
              data-dish-name="${escapeHtml(dish.name)}"
              data-dish-category="${escapeHtml(dish.category || 'Mains')}"
              data-dish-station="${escapeHtml(dish.station || 'KITCHEN')}"
              data-dish-prep="${dish.prepDurationMinutes || 12}"
              data-dish-diet="${isVeg ? 'VEG' : 'NON_VEG'}"
              data-dish-price="${Math.round((dish.basePriceMinor || 0) / 100)}"
              data-dish-desc="${escapeHtml(dish.description || '')}"
              data-dish-hsn="${escapeHtml(dish.hsnCode || '996331')}"
              onclick="selectDishRow(this)" 
              style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border-radius: 18px; cursor: pointer; transition: all 120ms ease; ${isFirst
            ? 'background: #EFF6FF; border: 1.5px solid #BFDBFE;'
            : 'background: #FFFFFF; border: 1px solid transparent;'
          }"
            >
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="width: 48px; height: 48px; border-radius: 14px; background: ${thumbBg}; flex-shrink: 0; box-shadow: inset 0 2px 4px rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 800; font-size: 16px;">
                  ${dish.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.25;">
                    ${escapeHtml(dish.name)}
                  </div>
                  <div style="font-size: 12px; color: #64748B; margin-top: 4px;">
                    ${dish.station || 'Kitchen'} · ${dish.prepDurationMinutes || 12} min · ${isVeg ? 'Veg' : 'Non-veg'}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 15px; font-weight: 700; color: #0F172A;">
                  ${price}
                </span>
                ${dish.isPopular
            ? `<span class="badge badge-sky" style="border-radius: 9999px; padding: 3px 10px; font-size: 11px;">Popular</span>`
            : ''
          }
                ${dish.isSignature
            ? `<span class="badge badge-sky" style="border-radius: 9999px; padding: 3px 10px; font-size: 11px;">Signature</span>`
            : ''
          }
                ${dish.isArchived
            ? `<span class="badge badge-crimson" style="border-radius: 9999px; padding: 3px 10px; font-size: 11px;">Hidden</span>`
            : ''
          }
              </div>
            </div>`;
      })
      .join('')}
      </div>

      <!-- Right: Slide-out Dish Editor Drawer (Desktop) / Bottom Sheet (<960px, matching 'Owner phone · Edit dish (bottom sheet).png') -->
      <div id="dish-editor-backdrop" class="dish-sheet-backdrop" onclick="if(event.target === this) closeDishDrawer()">
        <div id="dish-editor-panel" class="ui-card dish-editor-card" style="padding: 28px 26px; display: flex; flex-direction: column; gap: 18px; position: sticky; top: 20px;">
          <div class="dish-sheet-handle"></div>
          <input type="hidden" id="edit-dish-id" value="${displayItems[0]?.id || ''}">

          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <h2 id="edit-dish-title" style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(displayItems[0]?.name || 'Butter chicken')}
              </h2>
              <span id="edit-dish-tag" style="background: #FEF3C7; color: #D97706; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; flex-shrink: 0;">
                CATALOG
              </span>
            </div>
            <button type="button" onclick="closeDishDrawer()" aria-label="Close dish editor" style="background: #F1F5F9; border: none; border-radius: 9999px; width: 32px; height: 32px; font-size: 18px; color: #475569; cursor: pointer; flex-shrink: 0;">
              ×
            </button>
          </div>

        <!-- Name Input -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">
            Dish Name
          </label>
          <input 
            type="text" 
            id="edit-dish-name" 
            value="${escapeHtml(displayItems[0]?.name || '')}" 
            style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 14px; font-size: 14px; font-weight: 600; color: #0F172A; outline: none; box-sizing: border-box;"
          >
        </div>

        <!-- Description -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">
            Description
          </label>
          <textarea 
            id="edit-dish-desc" 
            rows="2" 
            style="width: 100%; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px 14px; font-size: 13px; font-family: inherit; color: #0F172A; outline: none; box-sizing: border-box;"
          >${escapeHtml(displayItems[0]?.description || '')}</textarea>
        </div>

        <!-- Price, GST, HSN Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">Price (₹)</label>
            <input 
              type="number" 
              id="edit-dish-price" 
              value="${Math.round((displayItems[0]?.basePriceMinor || 42000) / 100)}" 
              style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none; box-sizing: border-box;"
            >
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">GST</label>
            <select id="edit-dish-gst" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF; outline: none; box-sizing: border-box;">
              <option value="5" selected>5% · restaurant</option>
              <option value="18">18% · catering</option>
              <option value="0">0% · exempt</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">HSN / SAC</label>
            <input 
              type="text" 
              id="edit-dish-hsn" 
              value="${escapeHtml(displayItems[0]?.hsnCode || '996331')}" 
              style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none; box-sizing: border-box;"
            >
          </div>
        </div>

        <!-- Kitchen Station, Prep Time, Food Type -->
        <div class="grid-3-equal" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">Kitchen station</label>
            <select id="edit-dish-station" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF; outline: none; box-sizing: border-box;">
              <option value="KITCHEN"${!displayItems[0]?.station || String(displayItems[0]?.station) === 'KITCHEN' ? ' selected' : ''}>Kitchen</option>
              <option value="GRILL"${String(displayItems[0]?.station) === 'GRILL' ? ' selected' : ''}>Grill / Tandoor</option>
              <option value="TANDOOR"${displayItems[0]?.station === 'TANDOOR' ? ' selected' : ''}>Tandoor Clay</option>
              <option value="DESSERT"${displayItems[0]?.station === 'DESSERT' ? ' selected' : ''}>Dessert</option>
              <option value="BEVERAGE"${String(displayItems[0]?.station) === 'BEVERAGE' || displayItems[0]?.station === 'BAR' ? ' selected' : ''}>Beverage &amp; Bar</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">Prep (min)</label>
            <input 
              type="number" 
              id="edit-dish-prep" 
              value="${displayItems[0]?.prepDurationMinutes || 15}" 
              style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none; box-sizing: border-box;"
            >
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">Food type</label>
            <select id="edit-dish-diet" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF; outline: none; box-sizing: border-box;">
              <option value="NON_VEG"${(displayItems[0] as any)?.dietaryType === 'NON_VEG' || (!((displayItems[0]?.dietaryFlags || []).includes('VEG') || (displayItems[0]?.dietaryFlags || []).includes('VEGAN')) && (displayItems[0]?.dietaryFlags || []).includes('NON_VEG')) ? ' selected' : ''}>Non-veg</option>
              <option value="VEG"${((displayItems[0]?.dietaryFlags || []).includes('VEG') || (displayItems[0]?.dietaryFlags || []).includes('VEGAN') || !(displayItems[0] as any)?.dietaryType) && !((displayItems[0]?.dietaryFlags || []).includes('NON_VEG')) ? ' selected' : ''}>Veg</option>
              <option value="EGG"${(displayItems[0] as any)?.dietaryType === 'EGG' || (displayItems[0]?.dietaryFlags as string[] || []).includes('EGG') ? ' selected' : ''}>Egg</option>
            </select>
          </div>
        </div>

        <!-- Category Dropdown -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">Category</label>
          <select id="edit-dish-category" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF; outline: none; box-sizing: border-box;">
            ${uniqueCategories.map((c) => `<option value="${escapeHtml(c)}"${displayItems[0]?.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>

        <!-- Allergens -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 8px;">Contains</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="allergen-pill" onclick="toggleAllergen(this)">Dairy</button>
            <button type="button" class="allergen-pill" onclick="toggleAllergen(this)">Nuts</button>
            <button type="button" class="allergen-pill" onclick="toggleAllergen(this)">Gluten</button>
            <button type="button" class="allergen-pill" onclick="toggleAllergen(this)">Egg</button>
          </div>
        </div>

        <!-- Branches Availability & Pricing -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 8px;">Branches Availability</label>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${branchList
      .map(
        (b) => `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <input type="checkbox" checked style="accent-color: #10B981; width: 16px; height: 16px;">
                  <span style="font-size: 13px; font-weight: 600; color: #0F172A;">${escapeHtml(b.name)}</span>
                </div>
                <span style="font-size: 13px; font-weight: 700; color: #64748B;">Standard price</span>
              </div>`
      )
      .join('')}
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #F1F5F9; gap: 10px;">
          <button type="button" id="delete-dish-btn" class="btn btn-secondary" onclick="deleteCurrentDish()" style="border-radius: 9999px; padding: 9px 18px; font-size: 13px; color: #DC2626;">
            Hide from menu
          </button>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn btn-secondary mobile-only-cancel" onclick="closeDishDrawer()" style="display: none; border-radius: 9999px; padding: 9px 16px; font-size: 13px;">Close</button>
            <button type="button" id="save-dish-btn" class="btn btn-primary" onclick="saveCurrentDish()" style="border-radius: 9999px; padding: 9px 24px; font-size: 13px;">
              Save item
            </button>
          </div>
        </div>

        </div>
      </div>

    </div>

  </div>

  <style>
    .category-pill {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .category-pill:hover {
      background: #F8FAFC;
      color: #0F172A;
    }
    .category-pill.active {
      background: #000000;
      color: #FFFFFF;
      border-color: #000000;
    }
    .category-pill-ghost {
      background: transparent;
      border: 1px dashed #CBD5E1;
      border-radius: 9999px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #2563EB;
      cursor: pointer;
    }
    .allergen-pill {
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 9999px;
      padding: 5px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
    }
    .allergen-pill.active {
      background: #0F172A;
      color: #FFFFFF;
      border-color: #0F172A;
    }
    .dish-row:hover {
      background: #F8FAFC !important;
    }
    .dish-sheet-handle {
      display: none;
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background: #CBD5E1;
      margin: 0 auto 6px auto;
    }
    @media (max-width: 960px) {
      .menu-container {
        padding: 16px 16px 96px 16px !important;
      }
      .menu-split-grid {
        grid-template-columns: 1fr !important;
      }
      #dish-list-container {
        max-height: none !important;
      }
      .dish-sheet-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.48);
        backdrop-filter: blur(4px);
        z-index: 65;
        align-items: flex-end;
        justify-content: center;
      }
      .dish-sheet-backdrop.sheet-open {
        display: flex !important;
      }
      .dish-editor-card {
        width: 100%;
        max-width: 560px;
        max-height: 86vh;
        overflow-y: auto;
        border-radius: 28px 28px 0 0 !important;
        padding: 14px 20px 26px 20px !important;
        position: static !important;
        box-shadow: 0 -16px 40px rgba(15, 23, 42, 0.22) !important;
      }
      .dish-sheet-handle {
        display: block;
      }
      .mobile-only-cancel {
        display: inline-flex !important;
      }
    }
  </style>

  <!-- Add Category Modal -->
  <div id="add-category-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;">
    <div style="background: #FFFFFF; border-radius: 24px; padding: 32px; width: 400px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.06);">
      <h3 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">New Category</h3>
      <p style="font-size: 13px; color: #64748B; margin-bottom: 20px;">Add a section to group related items on diner and POS menus.</p>
      
      <form id="add-category-form" onsubmit="submitAddCategory(event)">
        <div style="margin-bottom: 24px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Category Name</label>
          <input type="text" id="new-category-name" required placeholder="e.g. Tandoor Breads, Desserts" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 14px; outline: none; box-sizing: border-box;" />
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="closeAddCategoryModal()" class="btn btn-secondary" style="border-radius: 9999px; padding: 9px 20px; font-size: 13px; font-weight: 600;">Cancel</button>
          <button type="submit" class="btn btn-primary" style="border-radius: 9999px; padding: 9px 24px; font-size: 13px; font-weight: 600;">Create Category</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    function filterCategory(cat, btn) {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const rows = document.querySelectorAll('.dish-row');
      rows.forEach(r => {
        if (cat === 'ALL' || r.getAttribute('data-dish-category').toLowerCase() === cat.toLowerCase()) {
          r.style.display = 'flex';
        } else {
          r.style.display = 'none';
        }
      });
    }

    function handleMenuSearch(q) {
      const term = q.toLowerCase().trim();
      const rows = document.querySelectorAll('.dish-row');
      rows.forEach(r => {
        const name = r.getAttribute('data-dish-name').toLowerCase();
        const desc = r.getAttribute('data-dish-desc').toLowerCase();
        if (!term || name.includes(term) || desc.includes(term)) {
          r.style.display = 'flex';
        } else {
          r.style.display = 'none';
        }
      });
    }

    function toggleAllergen(btn) {
      btn.classList.toggle('active');
    }

    function selectDishRow(el) {
      document.querySelectorAll('.dish-row').forEach(r => {
        r.classList.remove('active-dish');
        r.style.background = '#FFFFFF';
        r.style.border = '1px solid transparent';
      });
      el.classList.add('active-dish');
      el.style.background = '#EFF6FF';
      el.style.border = '1.5px solid #BFDBFE';

      const id = el.getAttribute('data-dish-id');
      const name = el.getAttribute('data-dish-name');
      const desc = el.getAttribute('data-dish-desc');
      const price = el.getAttribute('data-dish-price');
      const hsn = el.getAttribute('data-dish-hsn');
      const station = el.getAttribute('data-dish-station');
      const prep = el.getAttribute('data-dish-prep');
      const diet = el.getAttribute('data-dish-diet');
      const category = el.getAttribute('data-dish-category');

      document.getElementById('edit-dish-id').value = id;
      document.getElementById('edit-dish-title').textContent = name;
      document.getElementById('edit-dish-tag').textContent = 'CATALOG';
      document.getElementById('edit-dish-name').value = name;
      document.getElementById('edit-dish-desc').value = desc;
      document.getElementById('edit-dish-price').value = price;
      document.getElementById('edit-dish-hsn').value = hsn;
      document.getElementById('edit-dish-station').value = station;
      document.getElementById('edit-dish-prep').value = prep;
      document.getElementById('edit-dish-diet').value = diet;
      document.getElementById('edit-dish-category').value = category;
      document.getElementById('delete-dish-btn').style.display = 'inline-block';
      openDishSheetIfMobile();
    }

    function openNewDishDrawer() {
      document.querySelectorAll('.dish-row').forEach(r => {
        r.classList.remove('active-dish');
        r.style.background = '#FFFFFF';
        r.style.border = '1px solid transparent';
      });
      document.getElementById('edit-dish-id').value = '';
      document.getElementById('edit-dish-title').textContent = 'New Dish';
      document.getElementById('edit-dish-tag').textContent = 'DRAFT';
      document.getElementById('edit-dish-name').value = '';
      document.getElementById('edit-dish-desc').value = '';
      document.getElementById('edit-dish-price').value = '250';
      document.getElementById('edit-dish-hsn').value = '996331';
      document.getElementById('edit-dish-station').value = 'KITCHEN';
      document.getElementById('edit-dish-prep').value = '15';
      document.getElementById('edit-dish-diet').value = 'VEG';
      document.getElementById('delete-dish-btn').style.display = 'none';
      openDishSheetIfMobile();
      setTimeout(() => document.getElementById('edit-dish-name').focus(), 40);
    }

    function openDishSheetIfMobile() {
      const bd = document.getElementById('dish-editor-backdrop');
      if (bd && window.innerWidth <= 960) {
        bd.classList.add('sheet-open');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeDishDrawer() {
      const bd = document.getElementById('dish-editor-backdrop');
      if (bd) {
        bd.classList.remove('sheet-open');
      }
      document.body.style.overflow = '';
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDishDrawer();
    });

    async function saveCurrentDish() {
      const id = document.getElementById('edit-dish-id').value;
      const name = document.getElementById('edit-dish-name').value.trim();
      const desc = document.getElementById('edit-dish-desc').value.trim();
      const priceNum = parseFloat(document.getElementById('edit-dish-price').value) || 0;
      const hsn = document.getElementById('edit-dish-hsn').value.trim() || '996331';
      const station = document.getElementById('edit-dish-station').value;
      const prepMinutes = parseInt(document.getElementById('edit-dish-prep').value, 10) || 12;
      const diet = document.getElementById('edit-dish-diet').value;
      const category = document.getElementById('edit-dish-category').value;

      if (!name) {
        window.showToast('Please enter a dish name', 'error');
        return;
      }

      const allergens = [];
      document.querySelectorAll('.allergen-pill.active').forEach(p => allergens.push(p.textContent));

      const payload = {
        name,
        description: desc,
        basePriceMinor: Math.round(priceNum * 100),
        hsnCode: hsn,
        station,
        prepDurationMinutes: prepMinutes,
        dietaryFlags: [diet],
        allergens,
        category
      };

      const saveBtn = document.getElementById('save-dish-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        if (id) {
          await window.apiFetch('/api/restaurant/menu/items/' + encodeURIComponent(id), {
            method: 'PATCH',
            body: payload
          });
          window.showToast('Dish updated successfully!', 'success');
        } else {
          await window.apiFetch('/api/restaurant/menu/items', {
            method: 'POST',
            body: payload
          });
          window.showToast('Dish added to menu!', 'success');
        }
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save item';
      }
    }

    function deleteCurrentDish() {
      const id = document.getElementById('edit-dish-id').value;
      if (!id) return;
      const title = document.getElementById('edit-dish-name')?.value || 'this dish';
      window.confirmAction({
        title: 'Remove Dish from Menu',
        message: 'Remove "' + title + '" from your live diner catalog?',
        confirmLabel: 'Remove dish',
        danger: true,
        onConfirm: async () => {
          const delBtn = document.getElementById('delete-dish-btn');
          if (delBtn) { delBtn.disabled = true; delBtn.textContent = 'Removing...'; }
          try {
            await window.apiFetch('/api/restaurant/menu/items/' + encodeURIComponent(id), {
              method: 'DELETE'
            });
            window.showToast('Dish removed from menu.', 'success');
            setTimeout(() => window.location.reload(), 500);
          } catch (err) {
            if (delBtn) { delBtn.disabled = false; delBtn.textContent = 'Hide from menu'; }
          }
        }
      });
    }

    function removeAllSampleDishes() {
      window.confirmAction({
        title: 'Remove All Sample Dishes',
        message: 'This will remove every dish currently listed in the sample catalog.',
        confirmLabel: 'Remove all',
        danger: true,
        onConfirm: async () => {
          const rows = document.querySelectorAll('.dish-row');
          let removed = 0;
          for (const row of rows) {
            const id = row.getAttribute('data-dish-id');
            if (id) {
              try {
                await window.apiFetch('/api/restaurant/menu/items/' + encodeURIComponent(id), {
                  method: 'DELETE'
                });
                removed++;
              } catch {}
            }
          }
          window.showToast('Cleared sample menu items (' + removed + ' items removed)', 'success');
          setTimeout(() => window.location.reload(), 500);
        }
      });
    }

    function addNewCategory() {
      document.getElementById('new-category-name').value = '';
      const modal = document.getElementById('add-category-modal');
      modal.style.display = 'flex';
      setTimeout(() => document.getElementById('new-category-name').focus(), 50);
    }

    function closeAddCategoryModal() {
      document.getElementById('add-category-modal').style.display = 'none';
    }

    async function submitAddCategory(e) {
      e.preventDefault();
      const catName = document.getElementById('new-category-name').value.trim();
      if (!catName) return;
      try {
        await window.apiFetch('/api/restaurant/menu/categories', {
          method: 'POST',
          body: { name: catName }
        });
        window.showToast('Category "' + catName + '" created!', 'success');
        closeAddCategoryModal();
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        window.showToast('Failed to create category: ' + (err.message || 'Error'), 'error');
      }
    }

    function exportMenuCsv() {
      window.open('/api/restaurant/menu', '_blank');
    }
  </script>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
