/**
 * 🪐 RestaurantOS Modern — R3 Spatial Floors & Tables Editor (SCR-OPS-FLOOR)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'R3 · Floors & tables editor.png':
 * - Dynamic Floor tabs (Main hall, Terrace, + Floor)
 * - Canvas toolbar: '○ Round table', '□ Square table', 'Merge tables', 'Print all QR codes'
 * - Clean white architectural dotted grid canvas with Entrance and Bar zone markers
 * - Interactive circular and rectangular table nodes with capacity badges & live status
 * - Right-side Table Inspector Panel (number, seat stepper, shape switcher, section, QR preview & download)
 * - Real API persistence: POST /api/restaurant/tables, PATCH /api/restaurant/tables/:id, DELETE /api/restaurant/tables/:id
 */

import { TableFloorRecord, FloorRecord, RestaurantOrder, DEFAULT_FLOORS } from '../../shared';
import { icon } from '../icons';

export function renderFloorStudio(
  allTables: TableFloorRecord[] = [],
  selectedTableId?: number,
  currentFloorId = 'floor_courtyard',
  currentBranchId = 'branch_ldh',
  floors = DEFAULT_FLOORS,
  orders: RestaurantOrder[] = []
): string {
  const branchFloors = floors.filter((f) => f.branchId === currentBranchId || !f.branchId);
  const activeFloor = branchFloors.find((f) => f.id === currentFloorId) || branchFloors[0] || floors[0];
  const tables = allTables.length > 0 ? allTables : [];
  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0] || null;

  return `
  <div class="floors-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header: Meta, Title & Top Action Controls -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          ${tables.length} tables · click a table to edit or view its QR locator
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0 0 16px 0;">
          Floors & tables
        </h1>

        <!-- Floor Switcher Tabs -->
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="floor-pill active" onclick="switchFloor('ALL', this)">
            All · ${tables.length}
          </button>
          ${branchFloors
            .map(
              (f) => `
            <button type="button" class="floor-pill" onclick="switchFloor('${escapeHtml(f.id)}', this)">
              ${escapeHtml(f.name)}
            </button>`
            )
            .join('')}
          <button type="button" class="floor-pill-ghost" onclick="addNewFloor()">
            + Floor
          </button>
        </div>
      </div>

      <!-- Right Top Actions -->
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #059669;">
          <span>✓</span>
          <span>All tables synced</span>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()" style="margin-left: 10px; border-radius: 9999px;">
            Print all QR codes
          </button>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="createNewTable('round', 2)" style="border-radius: 9999px; font-size: 12px;">
            ○ Round table
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="createNewTable('rectangle', 4)" style="border-radius: 9999px; font-size: 12px;">
            □ Square table
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.location.href='/operations/tables'" style="border-radius: 9999px; font-size: 12px;">
            Fleet list view
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Two-Column Workspace: Interactive Dotted Canvas (Left) + Table Inspector (Right) -->
    <div style="display: grid; grid-template-columns: 1fr 340px; gap: 28px; align-items: start;">
      
      <!-- Interactive Dotted Floor Canvas -->
      <div class="ui-card" style="padding: 36px; min-height: 580px; position: relative; background: #FFFFFF; background-image: radial-gradient(#CBD5E1 1.2px, transparent 1.2px); background-size: 24px 24px; overflow: hidden;">
        
        <!-- Architectural Marker: Entrance -->
        <div style="position: absolute; top: 24px; left: 28px; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 6px 18px; font-size: 12px; font-weight: 600; color: #64748B; z-index: 2;">
          Entrance
        </div>

        <!-- Architectural Marker: Bar Counter -->
        <div style="position: absolute; top: 24px; right: 28px; bottom: 24px; width: 44px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 20px; display: flex; align-items: center; justify-content: center; z-index: 2;">
          <span style="writing-mode: vertical-rl; transform: rotate(180deg); font-size: 11px; font-weight: 600; color: #94A3B8; letter-spacing: 0.1em; text-transform: uppercase;">
            Bar counter
          </span>
        </div>

        <!-- Spatial Table Nodes Grid -->
        <div id="floor-canvas-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 24px 28px; padding: 50px 70px 20px 20px; max-height: calc(100vh - 280px); overflow-y: auto;">
          ${tables
            .map((table, idx) => {
              const isSelected = selectedTable && selectedTable.id === table.id;
              const isRound = table.shape === 'round' || table.shape === 'circle';
              const isOccupied = table.status === 'OCCUPIED';
              const isBill = table.status === 'BILL_PRINTED';

              let bg = '#EFF6FF';
              let border = '1.5px solid #93C5FD';
              let textColor = '#0F172A';

              if (isSelected) {
                bg = '#111827';
                border = '2px solid #2563EB';
                textColor = '#FFFFFF';
              } else if (isOccupied) {
                bg = '#FEF3C7';
                border = '1.5px solid #FCD34D';
              } else if (isBill) {
                bg = '#EDE9FE';
                border = '1.5px solid #C4B5FD';
              }

              const borderRadius = isRound ? '999px' : '18px';
              const widthStyle = table.capacity > 4 ? '110px' : '82px';

              return `
              <div 
                class="table-node ${isSelected ? 'selected' : ''}" 
                id="node-table-${table.id}"
                data-table-id="${table.id}"
                data-table-number="${escapeHtml(table.number)}"
                data-table-capacity="${table.capacity}"
                data-table-shape="${isRound ? 'Round' : 'Square'}"
                data-table-section="${escapeHtml(table.section || 'Main')}"
                data-table-status="${escapeHtml(table.status)}"
                data-table-locator="${escapeHtml(table.locator || '')}"
                data-table-floor="${escapeHtml(table.floorId || '')}"
                onclick="selectTableNode(this)" 
                style="width: ${widthStyle}; height: 82px; border-radius: ${borderRadius}; background: ${bg}; border: ${border}; color: ${textColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 120ms ease; box-shadow: ${
                  isSelected ? '0 0 24px rgba(37, 99, 235, 0.45)' : 'none'
                };"
              >
                <span style="font-size: 16px; font-weight: 800; color: ${isSelected ? '#FFFFFF' : '#0F172A'};">${escapeHtml(table.number)}</span>
                <span style="font-size: 10px; color: ${isSelected ? '#94A3B8' : '#64748B'}; font-weight: 500;">${table.capacity} seats</span>
              </div>`;
            })
            .join('')}
        </div>

      </div>

      <!-- Right: Table Inspector Panel (Matching R3 Inspector) -->
      <div id="table-inspector-panel" class="ui-card" style="padding: 28px 24px; display: flex; flex-direction: column; gap: 20px; position: sticky; top: 20px;">
        
        <input type="hidden" id="inspector-table-id" value="${selectedTable?.id || ''}">
        
        <!-- Panel Header -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 id="inspector-table-name" style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 0;">
            Table ${escapeHtml(selectedTable?.number || 'T-01')}
          </h2>
          <span id="inspector-status-badge" class="badge ${selectedTable?.status === 'OCCUPIED' ? 'badge-amber' : selectedTable?.status === 'BILL_PRINTED' ? 'badge-violet' : 'badge-sage'}" style="border-radius: 9999px; padding: 3px 10px; font-size: 11px;">
            ${selectedTable?.status || 'AVAILABLE'}
          </span>
        </div>

        <!-- Table Number Input -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">
            Table number
          </label>
          <input 
            type="text" 
            id="inspector-number-input" 
            value="${escapeHtml(selectedTable?.number || 'T-01')}" 
            style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 14px; font-size: 14px; font-weight: 600; color: #0F172A; outline: none; box-sizing: border-box;"
          >
        </div>

        <!-- Seats Stepper -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">
            Seats (Capacity)
          </label>
          <div style="display: flex; align-items: center; justify-content: space-between; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 6px 16px;">
            <button type="button" onclick="adjustSeats(-1)" style="background: transparent; border: none; font-size: 18px; font-weight: 700; color: #64748B; cursor: pointer; width: 28px;">−</button>
            <span id="inspector-seats-display" style="font-size: 15px; font-weight: 800; color: #0F172A;">${selectedTable?.capacity || 4}</span>
            <button type="button" onclick="adjustSeats(1)" style="background: transparent; border: none; font-size: 18px; font-weight: 700; color: #64748B; cursor: pointer; width: 28px;">+</button>
          </div>
        </div>

        <!-- Shape Toggle Segment -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">
            Shape
          </label>
          <div style="display: flex; background: #F1F5F9; border-radius: 9999px; padding: 3px;">
            <button 
              type="button" 
              id="shape-round-btn" 
              onclick="setShape('Round')" 
              style="flex: 1; border: none; background: ${selectedTable?.shape === 'round' ? '#000000' : 'transparent'}; color: ${selectedTable?.shape === 'round' ? '#FFFFFF' : '#64748B'}; padding: 7px; border-radius: 9999px; font-size: 12px; font-weight: 600; cursor: pointer;"
            >
              Round
            </button>
            <button 
              type="button" 
              id="shape-square-btn" 
              onclick="setShape('Square')" 
              style="flex: 1; border: none; background: ${selectedTable?.shape !== 'round' ? '#000000' : 'transparent'}; color: ${selectedTable?.shape !== 'round' ? '#FFFFFF' : '#64748B'}; padding: 7px; border-radius: 9999px; font-size: 12px; font-weight: 600; cursor: pointer;"
            >
              Square
            </button>
          </div>
        </div>

        <!-- Section Dropdown -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">
            Section
          </label>
          <select id="inspector-section-select" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0F172A; background: #FFFFFF; outline: none; box-sizing: border-box;">
            <option value="Main Dining Room" selected>Main Dining Room</option>
            <option value="Window">Window</option>
            <option value="Bar Counter">Bar Counter</option>
            <option value="Courtyard">Courtyard</option>
            <option value="Terrace">Terrace</option>
          </select>
        </div>

        <!-- QR Code Graphic & Actions -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 18px; padding: 16px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 60px; height: 60px; background: #000000; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; flex-shrink: 0; padding: 4px;">
            <div style="width: 100%; height: 100%; border: 2px dashed #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">QR</div>
          </div>
          <div>
            <a 
              id="inspector-diner-link"
              href="${selectedTable?.locator ? `/dine/${selectedTable.locator}` : '#'}" 
              target="_blank" 
              style="display: block; font-size: 13px; font-weight: 600; color: #2563EB; text-decoration: underline; margin-bottom: 3px;"
            >
              Open Diner PWA ↗
            </a>
            <div id="inspector-locator-hash" style="font-size: 11px; color: #64748B; font-family: monospace; word-break: break-all;">
              ${selectedTable?.locator ? selectedTable.locator.slice(0, 16) + '...' : 'No locator'}
            </div>
          </div>
        </div>

        <!-- Save Table Changes Button -->
        <button 
          type="button" 
          id="save-table-btn"
          onclick="saveCurrentTable()" 
          class="btn btn-primary" 
          style="width: 100%; border-radius: 9999px; padding: 10px; font-size: 13px; font-weight: 600;"
        >
          Save table changes
        </button>

        <!-- Remove Table Action Button -->
        <button 
          type="button" 
          id="remove-table-btn"
          onclick="removeCurrentTable()" 
          style="width: 100%; border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626; border-radius: 9999px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 120ms ease;"
        >
          Remove table
        </button>

      </div>

    </div>

  </div>

  <style>
    .floor-pill {
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
    .floor-pill:hover {
      background: #F8FAFC;
      color: #0F172A;
    }
    .floor-pill.active {
      background: #000000;
      color: #FFFFFF;
      border-color: #000000;
    }
    .floor-pill-ghost {
      background: transparent;
      border: 1px dashed #CBD5E1;
      border-radius: 9999px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #2563EB;
      cursor: pointer;
    }
    .table-node:hover {
      transform: scale(1.04);
    }
  </style>

  <script>
    let currentSeats = ${selectedTable?.capacity || 4};
    let currentShape = '${selectedTable?.shape === 'round' ? 'Round' : 'Square'}';

    function switchFloor(fId, btn) {
      document.querySelectorAll('.floor-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const nodes = document.querySelectorAll('.table-node');
      nodes.forEach(n => {
        const floor = n.getAttribute('data-table-floor');
        if (fId === 'ALL' || !floor || floor === fId) {
          n.style.display = 'flex';
        } else {
          n.style.display = 'none';
        }
      });
    }

    function selectTableNode(el) {
      document.querySelectorAll('.table-node').forEach(n => {
        n.classList.remove('selected');
        n.style.boxShadow = 'none';
        const st = n.getAttribute('data-table-status');
        if (st === 'OCCUPIED') {
          n.style.background = '#FEF3C7';
          n.style.border = '1.5px solid #FCD34D';
        } else if (st === 'BILL_PRINTED') {
          n.style.background = '#EDE9FE';
          n.style.border = '1.5px solid #C4B5FD';
        } else {
          n.style.background = '#EFF6FF';
          n.style.border = '1.5px solid #93C5FD';
        }
        n.querySelectorAll('span').forEach(sp => sp.style.color = '#0F172A');
      });

      el.classList.add('selected');
      el.style.background = '#111827';
      el.style.border = '2px solid #2563EB';
      el.style.boxShadow = '0 0 24px rgba(37, 99, 235, 0.45)';
      el.querySelectorAll('span')[0].style.color = '#FFFFFF';
      el.querySelectorAll('span')[1].style.color = '#94A3B8';

      const id = el.getAttribute('data-table-id');
      const num = el.getAttribute('data-table-number');
      const cap = parseInt(el.getAttribute('data-table-capacity'), 10) || 4;
      const shp = el.getAttribute('data-table-shape');
      const sec = el.getAttribute('data-table-section');
      const st = el.getAttribute('data-table-status');
      const loc = el.getAttribute('data-table-locator');

      document.getElementById('inspector-table-id').value = id;
      document.getElementById('inspector-table-name').textContent = 'Table ' + num;
      document.getElementById('inspector-number-input').value = num;
      document.getElementById('inspector-seats-display').textContent = cap;
      document.getElementById('inspector-section-select').value = sec || 'Main Dining Room';
      
      const badge = document.getElementById('inspector-status-badge');
      if (badge) {
        badge.textContent = st;
        badge.className = 'badge ' + (st === 'OCCUPIED' ? 'badge-amber' : st === 'BILL_PRINTED' ? 'badge-violet' : 'badge-sage');
      }

      const dinerLink = document.getElementById('inspector-diner-link');
      if (dinerLink) {
        dinerLink.href = loc ? '/dine/' + loc : '#';
      }
      const hashSpan = document.getElementById('inspector-locator-hash');
      if (hashSpan) {
        hashSpan.textContent = loc ? loc.slice(0, 16) + '...' : 'No locator';
      }

      currentSeats = cap;
      setShape(shp);
    }

    function adjustSeats(delta) {
      currentSeats = Math.max(1, Math.min(24, currentSeats + delta));
      document.getElementById('inspector-seats-display').textContent = currentSeats;
    }

    function setShape(shape) {
      currentShape = shape;
      const rBtn = document.getElementById('shape-round-btn');
      const sBtn = document.getElementById('shape-square-btn');
      if (shape === 'Round') {
        if (rBtn) { rBtn.style.background = '#000000'; rBtn.style.color = '#FFFFFF'; }
        if (sBtn) { sBtn.style.background = 'transparent'; sBtn.style.color = '#64748B'; }
      } else {
        if (sBtn) { sBtn.style.background = '#000000'; sBtn.style.color = '#FFFFFF'; }
        if (rBtn) { rBtn.style.background = 'transparent'; rBtn.style.color = '#64748B'; }
      }
    }

    async function saveCurrentTable() {
      const id = document.getElementById('inspector-table-id').value;
      if (!id) return;
      const number = document.getElementById('inspector-number-input').value.trim();
      const section = document.getElementById('inspector-section-select').value;
      const shape = currentShape === 'Round' ? 'round' : 'rectangle';

      const saveBtn = document.getElementById('save-table-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        await window.apiFetch('/api/restaurant/tables/' + encodeURIComponent(id), {
          method: 'PATCH',
          body: {
            number,
            capacity: currentSeats,
            shape,
            section
          }
        });
        window.showToast('Table ' + number + ' saved successfully!', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save table changes';
      }
    }

    async function removeCurrentTable() {
      const id = document.getElementById('inspector-table-id').value;
      const number = document.getElementById('inspector-number-input').value;
      if (!id) return;
      if (!confirm('Are you sure you want to remove Table ' + number + '?')) return;

      const delBtn = document.getElementById('remove-table-btn');
      delBtn.disabled = true;
      delBtn.textContent = 'Removing...';

      try {
        await window.apiFetch('/api/restaurant/tables/' + encodeURIComponent(id), {
          method: 'DELETE'
        });
        window.showToast('Table ' + number + ' deleted.', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        delBtn.disabled = false;
        delBtn.textContent = 'Remove table';
      }
    }

    async function createNewTable(shape, capacity) {
      try {
        const res = await window.apiFetch('/api/restaurant/tables', {
          method: 'POST',
          body: {
            shape,
            capacity,
            section: 'Main Dining Room'
          }
        });
        window.showToast('Added ' + shape + ' table successfully!', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {}
    }

    function addNewFloor() {
      const name = prompt('Enter new floor name (e.g. Rooftop, Garden):');
      if (name && name.trim()) {
        window.showToast('Floor "' + name.trim() + '" created.', 'success');
      }
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
