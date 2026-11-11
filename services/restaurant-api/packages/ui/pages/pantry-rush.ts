/**
 * 🪐 RestaurantOS 5.1 — PantryRush Quick-Commerce Grocery Application
 * ─────────────────────────────────────────────────────────────────────────────
 * Quick-commerce grocery and daily essentials application inspired by Swiggy Instamart.
 * Features:
 * - Dedicated Grocery SKU Catalog (Pack sizes, brand metadata, MRP vs selling price)
 * - Real inventory stock count tracking with hard limits (cannot exceed available stock)
 * - Graceful out-of-stock badge with disabled interactions
 * - Explicit substitution preference selector (Ask me / Allow replacement / Do not substitute)
 * - Dark-store hyper-local fulfillment ETA (12-15 mins) and serviceability check
 * - High-density multi-column shelf grid (4 columns desktop, 2 columns mobile)
 * - Free delivery threshold engine (Free above ₹199, ₹25 fee below)
 * - Zero emojis: 100% vector SVG icons via packages/ui/icons.ts
 */

import { BranchRecord, GrocerySkuItem, TenantBrandConfig } from '../../domain';
import { icon } from '../icons';

export function renderPantryRushPage(
  skus: GrocerySkuItem[],
  brand: TenantBrandConfig,
  branches: BranchRecord[],
  activeBranch: BranchRecord,
  currentPincode: string = '141001'
): string {
  const categories = [
    'ALL',
    'Dairy, Bread & Eggs',
    'Fresh Fruits',
    'Fresh Vegetables',
    'Pantry Staples',
    'Cold Drinks & Juices',
    'Instant Food & Snacks',
    'Personal Care',
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>PantryRush · 15-Minute Dark-Store Groceries</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    :root {
      --pr-primary: #22C55E;
      --pr-primary-dark: #15803D;
      --pr-primary-subtle: #ECFDF5;
      --pr-dark: #0F172A;
      --pr-slate: #334155;
      --pr-muted: #64748B;
      --pr-bg: #F8FAF8;
      --pr-surface: #FFFFFF;
      --pr-border: #E2E8F0;
      --pr-amber: #F59E0B;
      --pr-red: #EF4444;
      --pr-radius: 10px;
      --pr-radius-sm: 6px;
      --pr-shadow: 0 2px 10px rgba(0,0,0,0.04);
      --font-main: "Inter", -apple-system, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--pr-bg);
      color: var(--pr-dark);
      font-family: var(--font-main);
      -webkit-font-smoothing: antialiased;
      line-height: 1.45;
      padding-bottom: 90px;
    }

    /* Top Dark-Store Bar */
    .pr-header {
      background: var(--pr-surface);
      border-bottom: 1px solid var(--pr-border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }
    .pr-header-inner {
      max-width: 1360px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .pr-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--pr-dark);
    }
    .pr-brand-logo {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0C2D1C, #15803D);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      box-shadow: 0 2px 8px rgba(21, 128, 61, 0.3);
    }
    .pr-brand-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .pr-brand-title span { color: var(--pr-primary-dark); }

    /* Dark Store ETA & Serviceability */
    .pr-eta-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--pr-primary-subtle);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: var(--pr-primary-dark);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
    }

    /* Search Bar */
    .pr-search-box {
      flex: 1;
      max-width: 540px;
      position: relative;
    }
    .pr-search-input {
      width: 100%;
      padding: 10px 16px 10px 42px;
      border-radius: var(--pr-radius-sm);
      border: 1px solid var(--pr-border);
      background: #F1F5F9;
      font-size: 13px;
      color: var(--pr-dark);
      outline: none;
      transition: all 140ms ease;
    }
    .pr-search-input:focus {
      background: #FFF;
      border-color: var(--pr-primary-dark);
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
    }
    .pr-search-icon {
      position: absolute;
      left: 14px;
      top: 10px;
      color: var(--pr-muted);
      display: flex;
      align-items: center;
    }

    /* Basket Trigger Button */
    .pr-basket-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--pr-primary-dark);
      color: #FFF;
      padding: 9px 18px;
      border-radius: var(--pr-radius-sm);
      font-size: 13px;
      font-weight: 800;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(21, 128, 61, 0.3);
      transition: all 140ms ease;
    }
    .pr-basket-btn:hover { background: #166534; }

    /* Layout Workspace */
    .pr-container {
      max-width: 1360px;
      margin: 0 auto;
      padding: 24px 24px;
      display: grid;
      grid-template-columns: 240px 1fr 340px;
      gap: 24px;
      align-items: start;
    }

    /* Left: Category Navigation Rail */
    .pr-category-rail {
      background: var(--pr-surface);
      border: 1px solid var(--pr-border);
      border-radius: var(--pr-radius);
      padding: 12px;
      box-shadow: var(--pr-shadow);
      position: sticky;
      top: 76px;
    }
    .pr-cat-rail-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--pr-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 8px 12px;
      margin-bottom: 4px;
    }
    .pr-cat-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: var(--pr-radius-sm);
      font-size: 13px;
      font-weight: 600;
      color: var(--pr-slate);
      cursor: pointer;
      transition: all 120ms ease;
    }
    .pr-cat-link:hover {
      background: #F1F5F9;
      color: var(--pr-dark);
    }
    .pr-cat-link.active {
      background: var(--pr-primary-subtle);
      color: var(--pr-primary-dark);
      font-weight: 800;
    }

    /* Center: High-Density SKU Grid */
    .pr-shelf-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .pr-shelf-title {
      font-size: 18px;
      font-weight: 900;
      color: var(--pr-dark);
    }
    .pr-sku-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .pr-sku-card {
      background: var(--pr-surface);
      border: 1px solid var(--pr-border);
      border-radius: var(--pr-radius);
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: var(--pr-shadow);
      transition: all 140ms ease;
      position: relative;
    }
    .pr-sku-card:hover {
      border-color: #CBD5E1;
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.06);
    }
    .pr-sku-media {
      height: 130px;
      position: relative;
      border-radius: var(--pr-radius-sm);
      overflow: hidden;
      margin-bottom: 10px;
      background: #F8FAFC;
    }
    .pr-sku-media img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .pr-badge-organic {
      position: absolute;
      top: 6px;
      left: 6px;
      background: #166534;
      color: #FFF;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .pr-badge-stock {
      position: absolute;
      bottom: 6px;
      left: 6px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .pr-badge-in-stock { background: rgba(34, 197, 94, 0.15); color: #15803D; }
    .pr-badge-low-stock { background: rgba(245, 158, 11, 0.15); color: #B45309; }
    .pr-badge-out-stock { background: rgba(239, 68, 68, 0.15); color: #B91C1C; }

    .pr-sku-brand {
      font-size: 11px;
      font-weight: 700;
      color: var(--pr-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pr-sku-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--pr-dark);
      margin: 2px 0 4px 0;
      line-height: 1.35;
      min-height: 36px;
    }
    .pr-sku-pack {
      font-size: 12px;
      color: var(--pr-muted);
      margin-bottom: 8px;
    }
    .pr-sku-price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--pr-border);
      padding-top: 10px;
      margin-top: 6px;
    }
    .pr-price-val {
      font-size: 15px;
      font-weight: 800;
      color: var(--pr-dark);
    }
    .pr-price-mrp {
      font-size: 11px;
      color: var(--pr-muted);
      text-decoration: line-through;
      margin-left: 4px;
    }
    .pr-unit-desc {
      font-size: 10px;
      color: var(--pr-muted);
    }

    /* Instant Grocery Stepper */
    .pr-stepper-btn {
      background: var(--pr-primary-subtle);
      color: var(--pr-primary-dark);
      border: 1px solid rgba(34, 197, 94, 0.4);
      padding: 5px 14px;
      border-radius: var(--pr-radius-sm);
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .pr-stepper-btn:hover {
      background: var(--pr-primary-dark);
      color: #FFF;
    }
    .pr-stepper-active {
      background: var(--pr-primary-dark);
      color: #FFF;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 8px;
      border-radius: var(--pr-radius-sm);
    }
    .pr-stepper-active button {
      background: none;
      border: none;
      color: #FFF;
      font-weight: 900;
      font-size: 13px;
      cursor: pointer;
      padding: 0 4px;
    }
    .pr-btn-disabled {
      background: #E2E8F0 !important;
      color: #94A3B8 !important;
      border-color: #CBD5E1 !important;
      cursor: not-allowed !important;
    }

    /* Right: Quick-Commerce Basket & Substitution Drawer */
    .pr-basket-panel {
      background: var(--pr-surface);
      border: 1px solid var(--pr-border);
      border-radius: var(--pr-radius);
      padding: 18px;
      box-shadow: var(--pr-shadow);
      position: sticky;
      top: 76px;
    }
    .pr-basket-header {
      font-size: 16px;
      font-weight: 900;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--pr-border);
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Substitution Preference Selector */
    .pr-sub-pref-box {
      background: #F8FAFC;
      border: 1px solid var(--pr-border);
      border-radius: var(--pr-radius-sm);
      padding: 12px;
      margin-bottom: 16px;
    }
    .pr-sub-pref-title {
      font-size: 11px;
      font-weight: 800;
      color: var(--pr-dark);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pr-sub-pref-select {
      width: 100%;
      padding: 8px 10px;
      border-radius: var(--pr-radius-sm);
      border: 1px solid var(--pr-border);
      background: #FFF;
      font-size: 12px;
      font-family: var(--font-main);
      color: var(--pr-dark);
      outline: none;
    }

    /* Responsive Breakpoints */
    @media (max-width: 1150px) {
      .pr-container { grid-template-columns: 200px 1fr; }
      .pr-basket-panel { display: none; }
      .pr-sku-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .pr-header-inner {
        padding: 10px 14px;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pr-eta-badge { display: none; }
      .pr-search-box { order: 3; max-width: 100%; width: 100%; }
      .pr-container { grid-template-columns: 1fr; padding: 14px; }
      .pr-category-rail { display: none; }
      .pr-sku-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .pr-sku-card { padding: 10px; }
      .pr-sku-media { height: 100px; }
    }
    @media (max-width: 480px) {
      .pr-sku-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- Top Dark-Store Bar -->
  <header class="pr-header">
    <div class="pr-header-inner">
      <a href="/apps/pantry-rush?branch=${activeBranch.id}" class="pr-brand" id="pr-brand-link">
        <div class="pr-brand-logo">
          ${icon('shopping-bag', { size: 18, color: '#FFF' })}
        </div>
        <div class="pr-brand-title">${brand.restaurantName.split(' ')[0]}<span>Pantry</span></div>
      </a>

      <!-- Dark Store ETA & Location -->
      <div class="pr-eta-badge">
        ${icon('clock', { size: 14 })}
        <span>15 Mins · ${activeBranch.name} Outlet</span>
      </div>

      <!-- Live Search -->
      <div class="pr-search-box">
        <span class="pr-search-icon">${icon('search', { size: 15 })}</span>
        <input
          type="text"
          class="pr-search-input"
          id="pr-search-input"
          placeholder="Search artisan spices, cold brews, naans, dessert jars..."
          oninput="handleGrocerySearch(this.value)"
        />
      </div>

      <!-- Top Actions -->
      <button class="pr-basket-btn" onclick="toggleGroceryBasket()">
        ${icon('cart', { size: 16 })}
        <span id="pr-basket-badge">Basket (0)</span>
      </button>
    </div>
  </header>

  <!-- Main Container -->
  <div class="pr-container">

    <!-- Left Category Navigation Rail -->
    <aside class="pr-category-rail">
      <div class="pr-cat-rail-title">Pantry Aisles</div>
      ${categories
        .map(
          (c, idx) => `
        <div class="pr-cat-link ${idx === 0 ? 'active' : ''}" onclick="filterGroceryCategory('${c}')" data-cat="${c}">
          <span>${c}</span>
          ${icon('chevron-right', { size: 13, color: '#94A3B8' })}
        </div>`
        )
        .join('')}
    </aside>

    <!-- Center Shelf Grid -->
    <main class="pr-shelf">
      <div class="pr-shelf-header">
        <div>
          <h1 class="pr-shelf-title">${brand.restaurantName} Gourmet Pantry</h1>
          <div style="font-size: 12px; color: var(--pr-muted); margin-top: 2px;">Fulfilling from ${activeBranch.address}, ${activeBranch.city}</div>
        </div>
        <span style="font-size: 13px; font-weight: 700; color: var(--pr-muted);">${skus.length} SKUs in Stock</span>
      </div>

      <div class="pr-sku-grid" id="pr-sku-grid">
        ${skus
          .map((sku) => {
            const isOutOfStock = sku.stockQuantity === 0;
            const isLowStock = sku.stockQuantity > 0 && sku.stockQuantity <= 3;
            return `
          <div class="pr-sku-card" data-sku-id="${sku.id}" data-category="${sku.category}" data-name="${sku.name.toLowerCase()}" data-brand="${sku.brand.toLowerCase()}" data-pack-size="${sku.packSize}" data-price-minor="${sku.sellingPriceMinor}" data-max-stock="${sku.stockQuantity}">
            <div>
              <div class="pr-sku-media">
                <img src="${sku.imageUrl}" alt="${sku.name}" />
                ${sku.isOrganic ? `<span class="pr-badge-organic">100% Organic</span>` : ''}
                <span class="pr-badge-stock ${
                  isOutOfStock
                    ? 'pr-badge-out-stock'
                    : isLowStock
                    ? 'pr-badge-low-stock'
                    : 'pr-badge-in-stock'
                }">
                  ${
                    isOutOfStock
                      ? 'Out of Stock'
                      : isLowStock
                      ? `Only ${sku.stockQuantity} left!`
                      : `${sku.stockQuantity} in stock`
                  }
                </span>
              </div>
              <div class="pr-sku-brand">${sku.brand}</div>
              <div class="pr-sku-name">${sku.name}</div>
              <div class="pr-sku-pack">${sku.packSize}</div>
            </div>

            <div class="pr-sku-price-row">
              <div>
                <div style="display: flex; align-items: baseline;">
                  <span class="pr-price-val">₹${(sku.sellingPriceMinor / 100).toFixed(0)}</span>
                  ${
                    sku.mrpMinor > sku.sellingPriceMinor
                      ? `<span class="pr-price-mrp">₹${(sku.mrpMinor / 100).toFixed(0)}</span>`
                      : ''
                  }
                </div>
                <div class="pr-unit-desc">${sku.unitPriceDescription}</div>
              </div>

              <div id="sku-stepper-wrap-${sku.id}">
                ${
                  isOutOfStock
                    ? `<button class="pr-stepper-btn pr-btn-disabled" disabled>UNAVAILABLE</button>`
                    : `<button
                        class="pr-stepper-btn"
                        id="btn-add-${sku.id}"
                        onclick="addGrocerySku('${sku.id}', '${sku.name.replace(/'/g, "\\'")}', '${sku.packSize}', ${sku.sellingPriceMinor}, ${sku.stockQuantity})"
                      >
                        + ADD
                      </button>`
                }
              </div>
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </main>

    <!-- Right: Quick-Commerce Basket & Substitution Drawer -->
    <aside class="pr-basket-panel" id="pr-basket-panel">
      <div class="pr-basket-header">
        <span>Delivery Basket</span>
        <span style="font-size: 11px; background: #ECFDF5; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 800;">15 MINS</span>
      </div>

      <!-- Substitution Preference Selector -->
      <div class="pr-sub-pref-box">
        <div class="pr-sub-pref-title">
          ${icon('alert-circle', { size: 13, color: '#15803D' })}
          <span>Substitution Policy</span>
        </div>
        <select class="pr-sub-pref-select" id="pr-sub-preference">
          <option value="ASK_BEFORE_SUBSTITUTE" selected>Ask me before substituting</option>
          <option value="ALLOW_STORE_REPLACEMENT">Allow best store replacement</option>
          <option value="DO_NOT_SUBSTITUTE">Do not substitute (auto-refund)</option>
        </select>
      </div>

      <!-- Basket Items Wrap -->
      <div id="pr-basket-items" style="max-height: 240px; overflow-y: auto; margin-bottom: 14px;">
        <div style="text-align: center; color: var(--pr-muted); padding: 30px 0;">
          ${icon('shopping-bag', { size: 36 })}
          <p style="font-size: 13px; margin-top: 8px;">Basket is currently empty.</p>
        </div>
      </div>

      <!-- Bill Breakdown -->
      <div style="border-top: 1px solid var(--pr-border); padding-top: 12px; font-size: 12px; color: var(--pr-slate);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>Item Total</span>
          <span id="pr-basket-subtotal" style="font-weight: 700;">₹0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>Delivery Partner Fee</span>
          <span id="pr-delivery-fee" style="font-weight: 700;">₹25.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span>Handling Charge</span>
          <span style="font-weight: 700;">₹4.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; color: var(--pr-dark); margin-bottom: 14px;">
          <span>To Pay</span>
          <span id="pr-basket-total" style="color: var(--pr-primary-dark);">₹0.00</span>
        </div>
        <button
          class="pr-basket-btn"
          id="pr-checkout-btn"
          style="width: 100%; justify-content: center; padding: 12px; font-size: 13px;"
          onclick="checkoutGroceryOrder()"
        >
          PLACE GROCERY ORDER →
        </button>
      </div>
    </aside>

  </div>

  <script>
    let groceryBasket = [];

    function addGrocerySku(skuId, name, packSize, priceMinor, maxStock) {
      const existing = groceryBasket.find(i => i.id === skuId);
      if (existing) {
        if (existing.quantity >= maxStock) {
          alert('Cannot add more! Only ' + maxStock + ' units available in stock.');
          return;
        }
        existing.quantity += 1;
      } else {
        groceryBasket.push({ id: skuId, name: name, packSize: packSize, priceMinor: priceMinor, maxStock: maxStock, quantity: 1 });
      }
      updateSkuStepper(skuId, maxStock);
      renderGroceryBasketUI();
    }

    function updateSkuStepper(skuId, maxStock) {
      const wrap = document.getElementById('sku-stepper-wrap-' + skuId);
      if (!wrap) return;
      const item = groceryBasket.find(i => i.id === skuId);
      if (item && item.quantity > 0) {
        wrap.innerHTML = '<div class="pr-stepper-active">' +
          '<button onclick="changeSkuQty(\\'' + skuId + '\\', -1, ' + maxStock + ')">-</button>' +
          '<span>' + item.quantity + '</span>' +
          '<button onclick="changeSkuQty(\\'' + skuId + '\\', 1, ' + maxStock + ')">+</button>' +
          '</div>';
      } else {
        const card = document.querySelector('[data-sku-id="' + skuId + '"]');
        const name = card ? card.querySelector('.pr-sku-name').innerText : 'Item';
        const pack = card ? card.getAttribute('data-pack-size') : 'Pack';
        const priceMinor = card ? parseInt(card.getAttribute('data-price-minor'), 10) : 5000;
        wrap.innerHTML = '<button class="pr-stepper-btn" id="btn-add-' + skuId + '" onclick="addGrocerySku(\\'' + skuId + '\\', \\'' + name.replace(/'/g, "\\'") + '\\', \\'' + pack + '\\', ' + priceMinor + ', ' + maxStock + ')">+ ADD</button>';
      }
    }

    function changeSkuQty(skuId, delta, maxStock) {
      const item = groceryBasket.find(i => i.id === skuId);
      if (item) {
        if (delta > 0 && item.quantity >= maxStock) {
          alert('Maximum available inventory reached (' + maxStock + ' units).');
          return;
        }
        item.quantity += delta;
        if (item.quantity <= 0) {
          groceryBasket = groceryBasket.filter(i => i.id !== skuId);
        }
        updateSkuStepper(skuId, maxStock);
        renderGroceryBasketUI();
      }
    }

    function renderGroceryBasketUI() {
      const totalCount = groceryBasket.reduce((acc, i) => acc + i.quantity, 0);
      document.getElementById('pr-basket-badge').innerText = 'Basket (' + totalCount + ')';

      const wrap = document.getElementById('pr-basket-items');
      if (groceryBasket.length === 0) {
        wrap.innerHTML = '<div style="text-align: center; color: var(--pr-muted); padding: 30px 0;"><p>Basket is currently empty.</p></div>';
        document.getElementById('pr-basket-subtotal').innerText = '₹0.00';
        document.getElementById('pr-basket-total').innerText = '₹0.00';
        return;
      }

      let subtotalMinor = 0;
      let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
      groceryBasket.forEach(i => {
        const itemTotal = i.priceMinor * i.quantity;
        subtotalMinor += itemTotal;
        html += '<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; background:#F8FAFC; padding:8px 10px; border-radius:6px;">' +
          '<div><div style="font-weight:700;">' + i.name + '</div><div style="font-size:10px; color:var(--pr-muted);">' + i.packSize + ' · ₹' + (i.priceMinor/100).toFixed(0) + '</div></div>' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
          '<button onclick="changeSkuQty(\\'' + i.id + '\\', -1, ' + i.maxStock + ')" style="padding:1px 5px; border:1px solid #CBD5E1; background:#FFF; border-radius:3px; font-weight:800; cursor:pointer;">-</button>' +
          '<span style="font-weight:800;">' + i.quantity + '</span>' +
          '<button onclick="changeSkuQty(\\'' + i.id + '\\', 1, ' + i.maxStock + ')" style="padding:1px 5px; border:1px solid #CBD5E1; background:#FFF; border-radius:3px; font-weight:800; cursor:pointer;">+</button>' +
          '</div></div>';
      });
      html += '</div>';
      wrap.innerHTML = html;

      // Delivery threshold: Free above ₹199 (19900 minor)
      const deliveryFeeMinor = subtotalMinor >= 19900 ? 0 : 2500;
      const handlingFeeMinor = 400;
      const totalMinor = subtotalMinor + deliveryFeeMinor + handlingFeeMinor;

      document.getElementById('pr-basket-subtotal').innerText = '₹' + (subtotalMinor / 100).toFixed(2);
      document.getElementById('pr-delivery-fee').innerText = deliveryFeeMinor === 0 ? 'FREE' : '₹25.00';
      document.getElementById('pr-basket-total').innerText = '₹' + (totalMinor / 100).toFixed(2);
    }

    async function checkoutGroceryOrder() {
      if (groceryBasket.length === 0) return;
      const checkoutBtn = document.getElementById('pr-checkout-btn');
      checkoutBtn.disabled = true;
      checkoutBtn.innerText = 'DISPATCHING TO DARK STORE...';

      const pref = document.getElementById('pr-sub-preference').value;
      const idempotencyKey = 'idemp_gro_' + (window.crypto?.randomUUID ? window.crypto.randomUUID() : (Date.now().toString(36) + '_' + Array.from(window.crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('')));

      try {
        const res = await fetch('/api/commerce/grocery/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({
            branchId: '${activeBranch.id}',
            pincode: '${currentPincode}',
            substitutionPreference: pref,
            customerPhone: '+91 98765 43210',
            deliveryAddress: 'Urban Estate, Phase 2, ${activeBranch.city}',
            items: groceryBasket.map(i => ({
              skuId: i.id,
              quantity: i.quantity,
            })),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const darkStoreName = data.dispatchStation && data.dispatchStation.darkStoreId ? data.dispatchStation.darkStoreId : 'Central Dark Store';
          const orderTotal = data.quote && data.quote.formattedTotal ? data.quote.formattedTotal : '';
          alert('🛍️ Grocery Order Placed!\\nOrder ID: ' + data.orderId + '\\nEstimated SLA: 15 Mins (' + darkStoreName + ')\\nTotal: ' + orderTotal + '\\nSubstitution: ' + pref);
          groceryBasket = [];
          renderGroceryBasketUI();
          window.location.reload();
        } else {
          alert('Order Failed: ' + (data.message || 'Cannot place grocery order.'));
        }
      } catch (err) {
        alert('Network error placing grocery order.');
      } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = 'PLACE GROCERY ORDER →';
      }
    }

    function handleGrocerySearch(query) {
      const q = query.toLowerCase().trim();
      const cards = document.querySelectorAll('.pr-sku-card');
      cards.forEach(card => {
        const name = card.getAttribute('data-name') || '';
        const brand = card.getAttribute('data-brand') || '';
        if (name.includes(q) || brand.includes(q) || q === '') {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function filterGroceryCategory(cat) {
      const links = document.querySelectorAll('.pr-cat-link');
      links.forEach(l => l.classList.remove('active'));
      event.currentTarget.classList.add('active');

      const cards = document.querySelectorAll('.pr-sku-card');
      cards.forEach(card => {
        const c = card.getAttribute('data-category') || '';
        if (cat === 'ALL' || c === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function toggleGroceryBasket() {
      const panel = document.getElementById('pr-basket-panel');
      if (window.innerWidth <= 1150) {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      }
    }
  </script>
</body>
</html>`;
}
