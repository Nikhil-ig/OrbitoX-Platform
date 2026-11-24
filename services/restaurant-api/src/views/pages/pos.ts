/**
 * 🪐 RestaurantOS Modern — Dedicated High-Velocity POS Terminal (SCR-OPS-POS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Split-screen tablet landscape layout matching 'POS take order & checkout · tablet landscape.png':
 * - Left 60%: High velocity menu catalog, search, category pills, tap-to-add dish grid
 * - Right 40%: Live order docket, covers selector, CGST/SGST tax math, UPI/Card/Cash tender
 */

import { MenuItem, TableFloorRecord, BranchRecord, RestaurantOrder } from '../../shared';
import { icon } from '../icons';

export function renderPosTerminal(
  tables: TableFloorRecord[],
  menuItems: MenuItem[],
  branches: BranchRecord[],
  currentBranchId: string,
  orders: RestaurantOrder[] = [],
  tenantName = 'RestaurantOS'
): string {
  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];
  const branchName = currentBranch ? currentBranch.name : 'Main Dining';

  const categories = ['ALL', ...Array.from(new Set(menuItems.map((m) => (m as any).categoryName || m.category || 'Mains')))];

  const menuItemsJson = JSON.stringify(
    menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      categoryName: (m as any).categoryName || m.category || 'Mains',
      price: m.basePriceMinor ? m.basePriceMinor / 100 : 0,
      isVegetarian: (m as any).isVegetarian ?? (m.dietaryFlags ? m.dietaryFlags.includes('VEG') : true),
      description: m.description || '',
    }))
  );

  const tablesJson = JSON.stringify(
    tables.map((t) => ({
      id: t.id,
      number: t.number,
      capacity: t.capacity,
      status: t.activeSessionId ? 'OCCUPIED' : 'AVAILABLE',
      locator: t.locator,
    }))
  );

  return `
  <div class="pos-workspace">
    <!-- Left 60%: Fast Order Builder & Menu Grid -->
    <div class="pos-catalog-panel">
      <!-- Search & Filters Header -->
      <div class="pos-search-header">
        <div class="pos-search-box">
          ${icon('search', { size: 16, color: 'var(--color-secondary)' })}
          <input
            type="text"
            id="pos-search"
            placeholder="Search dishes or item code (e.g. Chai, Naan)..."
            oninput="handleSearch(this.value)"
          />
        </div>
        <div class="pos-table-selector">
          <label>Table:</label>
          <select id="selected-table" onchange="handleTableChange(this.value)">
            ${tables.map((t) => `<option value="${t.number}">Table ${t.number} (${t.capacity}p)</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="pos-cat-bar">
        ${categories
          .map(
            (c, i) => `
          <button
            class="pos-cat-pill ${i === 0 ? 'active' : ''}"
            onclick="filterCategory('${c}', this)"
          >
            ${c}
          </button>
        `
          )
          .join('')}
      </div>

      <!-- Menu Grid -->
      <div class="pos-grid" id="pos-grid">
        ${menuItems
          .map((item) => {
            const price = item.basePriceMinor ? (item.basePriceMinor / 100).toFixed(0) : '0';
            const isVeg = (item as any).isVegetarian ?? (item.dietaryFlags ? item.dietaryFlags.includes('VEG') : true);
            const categoryName = (item as any).categoryName || item.category || 'Mains';
            return `
            <div
              class="pos-dish-card"
              onclick="addItem('${item.id}')"
              data-category="${categoryName}"
              data-name="${item.name.toLowerCase()}"
            >
              <div class="pos-dish-header">
                <span class="veg-dot ${isVeg ? 'veg' : 'non-veg'}"></span>
                <span class="pos-dish-price">₹${price}</span>
              </div>
              <div class="pos-dish-name">${item.name}</div>
              <div class="pos-dish-desc">${item.description || categoryName || 'Freshly prepared'}</div>
              <div class="pos-dish-footer">
                <span class="pos-add-badge">+ Add</span>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </div>

    <!-- Right 40%: Order Docket & Tender Presenter -->
    <div class="pos-docket-panel">
      <!-- Docket Header -->
      <div class="pos-docket-header">
        <div>
          <div class="docket-table-title" id="docket-table-label">Table T-01 · Active Docket</div>
          <div class="docket-sub">${branchName} · Server: Captain Raj</div>
        </div>
        <button class="btn-clear" onclick="clearCart()">Clear</button>
      </div>

      <!-- Items List -->
      <div class="pos-items-list" id="pos-items-list">
        <div class="empty-docket-note">No items added yet.<br>Tap any dish on the left to add.</div>
      </div>

      <!-- Financial Calculation & Taxes -->
      <div class="pos-math-box">
        <div class="pos-math-row">
          <span>Subtotal</span>
          <span id="math-subtotal">₹0.00</span>
        </div>
        <div class="pos-math-row muted">
          <span>CGST (2.5%)</span>
          <span id="math-cgst">₹0.00</span>
        </div>
        <div class="pos-math-row muted">
          <span>SGST (2.5%)</span>
          <span id="math-sgst">₹0.00</span>
        </div>
        <div class="pos-math-row total">
          <span>Total Payable</span>
          <span id="math-total">₹0.00</span>
        </div>
      </div>

      <!-- Tender Methods Bar -->
      <div class="pos-tender-bar">
        <button class="btn-tender active" id="tender-upi" onclick="selectTender('UPI', this)">
          ${icon('analytics', { size: 14 })} UPI QR
        </button>
        <button class="btn-tender" id="tender-card" onclick="selectTender('CARD', this)">
          ${icon('whitelabel', { size: 14 })} Card
        </button>
        <button class="btn-tender" id="tender-cash" onclick="selectTender('CASH', this)">
          ${icon('orders', { size: 14 })} Cash
        </button>
      </div>

      <!-- Action Buttons -->
      <div class="pos-action-bar">
        <button class="btn-kot" onclick="sendKot()">
          ${icon('kds', { size: 16 })} Send KOT
        </button>
        <button class="btn-pay" onclick="processCheckout()">
          ${icon('check', { size: 16 })} Settle & Print Bill
        </button>
      </div>
    </div>
  </div>

  <style>
    .pos-workspace {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 20px;
      height: calc(100vh - 120px);
      min-height: 600px;
    }

    /* Left Panel */
    .pos-catalog-panel {
      background: var(--color-card);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 24px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    }

    .pos-search-header {
      display: flex;
      gap: 14px;
      align-items: center;
    }

    .pos-search-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--color-canvas);
      padding: 10px 16px;
      border-radius: 999px;
      border: 1px solid rgba(0, 0, 0, 0.06);
    }

    .pos-search-box input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-heading);
      width: 100%;
    }

    .pos-table-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-secondary);
    }

    .pos-table-selector select {
      background: var(--color-canvas);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-heading);
      outline: none;
      cursor: pointer;
    }

    .pos-cat-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;
    }

    .pos-cat-bar::-webkit-scrollbar {
      display: none;
    }

    .pos-cat-pill {
      background: var(--color-canvas);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all 140ms ease;
    }

    .pos-cat-pill.active {
      background: var(--color-heading);
      color: #FFF;
      border-color: var(--color-heading);
    }

    .pos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      overflow-y: auto;
      padding-right: 4px;
      flex: 1;
    }

    .pos-dish-card {
      background: var(--color-canvas);
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 16px;
      padding: 14px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 6px;
      transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }

    .pos-dish-card:hover {
      background: #FFF;
      border-color: rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
    }

    .pos-dish-card:active {
      transform: scale(0.98);
    }

    .pos-dish-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .veg-dot {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 2px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .veg-dot.veg {
      border-color: #10B981;
    }

    .veg-dot.veg::after {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
    }

    .veg-dot.non-veg {
      border-color: #EF4444;
    }

    .veg-dot.non-veg::after {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #EF4444;
    }

    .pos-dish-price {
      font-size: 13px;
      font-weight: 800;
      color: var(--color-heading);
    }

    .pos-dish-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-heading);
      line-height: 1.3;
    }

    .pos-dish-desc {
      font-size: 11px;
      color: var(--color-secondary);
      line-height: 1.3;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .pos-dish-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }

    .pos-add-badge {
      font-size: 11px;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.06);
      color: var(--color-heading);
      padding: 3px 8px;
      border-radius: 999px;
    }

    /* Right Docket Panel */
    .pos-docket-panel {
      background: var(--color-card);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 24px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    }

    .pos-docket-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      padding-bottom: 14px;
    }

    .docket-table-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--color-heading);
    }

    .docket-sub {
      font-size: 11px;
      color: var(--color-secondary);
      margin-top: 2px;
    }

    .btn-clear {
      background: transparent;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-secondary);
      cursor: pointer;
    }

    .btn-clear:hover {
      background: rgba(239, 68, 68, 0.08);
      color: #EF4444;
      border-color: #EF4444;
    }

    .pos-items-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .empty-docket-note {
      text-align: center;
      font-size: 12px;
      color: var(--color-tertiary);
      padding: 40px 10px;
      line-height: 1.6;
    }

    .docket-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: var(--color-canvas);
      border-radius: 12px;
    }

    .docket-row-info {
      flex: 1;
    }

    .docket-row-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-heading);
    }

    .docket-row-rate {
      font-size: 11px;
      color: var(--color-secondary);
    }

    .docket-row-stepper {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .docket-btn-step {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      background: #FFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }

    .docket-qty {
      font-size: 12px;
      font-weight: 800;
      min-width: 16px;
      text-align: center;
    }

    .docket-row-total {
      font-size: 12px;
      font-weight: 800;
      color: var(--color-heading);
      min-width: 50px;
      text-align: right;
    }

    .pos-math-box {
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .pos-math-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-heading);
    }

    .pos-math-row.muted {
      color: var(--color-secondary);
      font-weight: 500;
    }

    .pos-math-row.total {
      font-size: 15px;
      font-weight: 800;
      border-top: 1px dashed rgba(0, 0, 0, 0.1);
      padding-top: 8px;
      margin-top: 4px;
    }

    .pos-tender-bar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }

    .btn-tender {
      background: var(--color-canvas);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 120ms ease;
    }

    .btn-tender.active {
      background: var(--color-heading);
      color: #FFF;
      border-color: var(--color-heading);
    }

    .pos-action-bar {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 10px;
    }

    .btn-kot {
      background: #FFF;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 999px;
      padding: 12px;
      font-size: 12px;
      font-weight: 800;
      color: var(--color-heading);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn-pay {
      background: #000;
      border: none;
      border-radius: 999px;
      padding: 12px;
      font-size: 12px;
      font-weight: 800;
      color: #FFF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  </style>

  <script>
    const MENU_ITEMS = ${menuItemsJson};
    const TABLES = ${tablesJson};
    let currentCart = {};
    let activeTender = 'UPI';

    function handleSearch(q) {
      q = q.toLowerCase().trim();
      const cards = document.querySelectorAll('.pos-dish-card');
      cards.forEach((c) => {
        const name = c.getAttribute('data-name') || '';
        c.style.display = name.includes(q) ? 'flex' : 'none';
      });
    }

    function filterCategory(cat, el) {
      document.querySelectorAll('.pos-cat-pill').forEach((p) => p.classList.remove('active'));
      el.classList.add('active');

      const cards = document.querySelectorAll('.pos-dish-card');
      cards.forEach((c) => {
        if (cat === 'ALL' || c.getAttribute('data-category') === cat) {
          c.style.display = 'flex';
        } else {
          c.style.display = 'none';
        }
      });
    }

    function handleTableChange(num) {
      document.getElementById('docket-table-label').innerText = 'Table ' + num + ' · Active Docket';
    }

    function addItem(id) {
      if (!currentCart[id]) {
        currentCart[id] = 1;
      } else {
        currentCart[id]++;
      }
      renderDocket();
    }

    function updateQty(id, delta) {
      if (!currentCart[id]) return;
      currentCart[id] += delta;
      if (currentCart[id] <= 0) {
        delete currentCart[id];
      }
      renderDocket();
    }

    function clearCart() {
      currentCart = {};
      renderDocket();
    }

    function selectTender(method, el) {
      activeTender = method;
      document.querySelectorAll('.btn-tender').forEach((b) => b.classList.remove('active'));
      el.classList.add('active');
    }

    function renderDocket() {
      const container = document.getElementById('pos-items-list');
      const itemIds = Object.keys(currentCart);

      if (itemIds.length === 0) {
        container.innerHTML = '<div class="empty-docket-note">No items added yet.<br>Tap any dish on the left to add.</div>';
        document.getElementById('math-subtotal').innerText = '₹0.00';
        document.getElementById('math-cgst').innerText = '₹0.00';
        document.getElementById('math-sgst').innerText = '₹0.00';
        document.getElementById('math-total').innerText = '₹0.00';
        return;
      }

      let subtotal = 0;
      let html = '';

      itemIds.forEach((id) => {
        const item = MENU_ITEMS.find((m) => m.id === id);
        if (!item) return;
        const qty = currentCart[id];
        const lineTotal = item.price * qty;
        subtotal += lineTotal;

        html += \`
          <div class="docket-row">
            <div class="docket-row-info">
              <div class="docket-row-name">\${item.name}</div>
              <div class="docket-row-rate">₹\${item.price.toFixed(0)} each</div>
            </div>
            <div class="docket-row-stepper">
              <button class="docket-btn-step" onclick="updateQty('\${id}', -1)">-</button>
              <span class="docket-qty">\${qty}</span>
              <button class="docket-btn-step" onclick="updateQty('\${id}', 1)">+</button>
            </div>
            <div class="docket-row-total">₹\${lineTotal.toFixed(0)}</div>
          </div>
        \`;
      });

      container.innerHTML = html;

      const cgst = subtotal * 0.025;
      const sgst = subtotal * 0.025;
      const total = subtotal + cgst + sgst;

      document.getElementById('math-subtotal').innerText = '₹' + subtotal.toFixed(2);
      document.getElementById('math-cgst').innerText = '₹' + cgst.toFixed(2);
      document.getElementById('math-sgst').innerText = '₹' + sgst.toFixed(2);
      document.getElementById('math-total').innerText = '₹' + Math.round(total).toFixed(2);
    }

    function sendKot() {
      const itemIds = Object.keys(currentCart);
      if (itemIds.length === 0) {
        alert('Please add at least one dish before sending KOT.');
        return;
      }
      const table = document.getElementById('selected-table').value;
      alert('Kitchen Order Ticket (KOT) dispatched for ' + table + '! Order sent to grill and kitchen display.');
    }

    function processCheckout() {
      const itemIds = Object.keys(currentCart);
      if (itemIds.length === 0) {
        alert('Docket is empty.');
        return;
      }
      const total = document.getElementById('math-total').innerText;
      const table = document.getElementById('selected-table').value;
      alert('Payment of ' + total + ' via ' + activeTender + ' settled successfully for ' + table + '! Receipt printed.');
      clearCart();
    }
  </script>
  `;
}
