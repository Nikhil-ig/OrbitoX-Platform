/**
 * 🪐 RestaurantOS Modern — R3 Spatial Floors & Tables Editor (SCR-OPS-FLOOR)
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative floor & spatial layout studio:
 * - Persistent floor creation (POST /api/restaurant/floors) scoped by tenant & branch
 * - Interactive spatial canvas with 12px snap drag-and-drop & arrow-key positioning
 * - Collision detection preventing overlapping table placement
 * - Real layout persistence (POST /api/restaurant/floor/save) & Inspector CRUD
 * - Integrated confirmation modal (zero native confirm()/alert())
 */

import { TableFloorRecord, RestaurantOrder, DEFAULT_FLOORS } from '../../shared';

export function renderFloorStudio(
  allTables: TableFloorRecord[] = [],
  selectedTableId?: number,
  currentFloorId = 'floor_courtyard',
  currentBranchId = 'branch_ldh',
  floors = DEFAULT_FLOORS,
  _orders: RestaurantOrder[] = []
): string {
  const branchFloors = floors.filter((f) => f.branchId === currentBranchId || !f.branchId);
  const activeFloor = branchFloors.find((f) => f.id === currentFloorId) || branchFloors[0] || floors[0];
  const initialFloorTab = branchFloors.some((f) => f.id === currentFloorId) ? currentFloorId : 'ALL';
  const tables = allTables.length > 0 ? allTables : [];
  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0] || null;

  const isRoundShape = (shape?: string): boolean => {
    const s = String(shape || '').toLowerCase();
    return s === 'circle' || s === 'round';
  };

  return `
  <div class="floors-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header: Meta, Title & Top Action Controls -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          ${tables.length} tables across ${branchFloors.length} dining area${branchFloors.length === 1 ? '' : 's'} · drag or use arrow keys to position
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0 0 16px 0;">
          Floors &amp; tables
        </h1>

        <!-- Floor Switcher Tabs -->
        <div id="floor-tabs-bar" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button type="button" class="floor-pill ${initialFloorTab === 'ALL' ? 'active' : ''}" data-floor-id="ALL" onclick="switchFloor('ALL', this)">
            All · ${tables.length}
          </button>
          ${branchFloors
            .map((f) => {
              const count = tables.filter((t) => t.floorId === f.id).length;
              return `
                <button type="button" class="floor-pill ${initialFloorTab === f.id ? 'active' : ''}" data-floor-id="${escapeHtml(f.id)}" onclick="switchFloor('${escapeHtml(f.id)}', this)">
                  ${escapeHtml(f.name)} (${count})
                </button>`;
            })
            .join('')}
          <button type="button" id="add-floor-trigger" class="floor-pill-ghost" onclick="addNewFloor()">
            + Floor
          </button>
        </div>
      </div>

      <!-- Right Top Actions -->
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; flex-wrap: wrap; justify-content: flex-end;">
          <span id="layout-sync-indicator" style="color: #059669;">✓ All tables synced</span>
          <button type="button" id="save-layout-btn" class="btn btn-primary btn-sm" onclick="saveSpatialLayout()" style="border-radius: 9999px; font-size: 12px; padding: 6px 14px;" disabled>
            Save floor layout
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()" style="border-radius: 9999px;">
            Print all QR codes
          </button>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
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

    <!-- 2. Two-Column Workspace: Interactive Spatial Canvas (Left) + Table Inspector (Right) -->
    <div class="floor-split-grid" style="display: grid; grid-template-columns: 1fr 340px; gap: 28px; align-items: start;">
      
      <!-- Interactive Dotted Floor Canvas -->
      <div id="floor-canvas-stage" class="ui-card" style="padding: 20px; min-height: 580px; position: relative; background: #FFFFFF; background-image: radial-gradient(#CBD5E1 1.2px, transparent 1.2px); background-size: 24px 24px; overflow: auto;">
        
        <!-- Architectural Marker: Entrance -->
        <div style="position: sticky; top: 4px; left: 8px; display: inline-block; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 5px 16px; font-size: 12px; font-weight: 600; color: #64748B; z-index: 3; margin-bottom: 12px;">
          Entrance · Drag tables to arrange floor map (12px snap)
        </div>

        <!-- Spatial Table Nodes Canvas -->
        <div id="floor-canvas-grid" style="touch-action: none;">
          ${tables
            .map((table, idx) => {
              const isSelected = selectedTable && selectedTable.id === table.id;
              const isRound = isRoundShape(table.shape);
              const isOccupied = table.status === 'OCCUPIED';
              const isBill = table.status === 'BILL_REQUESTED';

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

              const px = Number.isFinite(Number(table.x)) && Number(table.x) > 0
                ? Math.round(Number(table.x) / 12) * 12
                : (idx % 5) * 120 + 24;
              const py = Number.isFinite(Number(table.y)) && Number(table.y) > 0
                ? Math.round(Number(table.y) / 12) * 12
                : Math.floor(idx / 5) * 108 + 24;

              const widthPx = table.capacity > 4 ? 108 : 84;
              const heightPx = 84;
              const borderRadius = isRound ? '999px' : '18px';
              const visibleOnInitial = initialFloorTab === 'ALL' || !table.floorId || table.floorId === initialFloorTab;

              return `
              <div
                class="table-node ${isSelected ? 'selected' : ''}"
                id="node-table-${table.id}"
                role="button"
                tabindex="0"
                aria-label="Table ${escapeHtml(table.number)}, ${table.capacity} seats, ${escapeHtml(table.status)}"
                data-table-id="${table.id}"
                data-table-number="${escapeHtml(table.number)}"
                data-table-capacity="${table.capacity}"
                data-table-shape="${isRound ? 'Round' : 'Square'}"
                data-table-section="${escapeHtml(table.section || 'Main Dining Room')}"
                data-table-status="${escapeHtml(table.status)}"
                data-table-locator="${escapeHtml(table.locator || '')}"
                data-table-floor="${escapeHtml(table.floorId || activeFloor?.id || '')}"
                data-table-x="${px}"
                data-table-y="${py}"
                data-table-width="${widthPx}"
                data-table-height="${heightPx}"
                style="display: ${visibleOnInitial ? 'flex' : 'none'}; left: ${px}px; top: ${py}px; width: ${widthPx}px; height: ${heightPx}px; border-radius: ${borderRadius}; background: ${bg}; border: ${border}; color: ${textColor}; flex-direction: column; align-items: center; justify-content: center; cursor: grab; user-select: none; touch-action: none; transition: box-shadow 120ms ease; box-shadow: ${isSelected ? '0 0 24px rgba(37, 99, 235, 0.45)' : '0 2px 6px rgba(15,23,42,0.06)'};"
              >
                <span style="font-size: 15px; font-weight: 800; color: ${isSelected ? '#FFFFFF' : '#0F172A'}; pointer-events: none;">${escapeHtml(table.number)}</span>
                <span style="font-size: 10px; color: ${isSelected ? '#94A3B8' : '#64748B'}; font-weight: 500; pointer-events: none;">${table.capacity} seats</span>
              </div>`;
            })
            .join('')}
        </div>

      </div>

      <!-- Right: Table Inspector Panel -->
      <div id="table-inspector-panel" class="ui-card" style="padding: 26px 22px; display: flex; flex-direction: column; gap: 18px; position: sticky; top: 20px;">
        
        <input type="hidden" id="inspector-table-id" value="${selectedTable?.id || ''}">
        
        <!-- Panel Header -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 id="inspector-table-name" style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 0;">
            Table ${escapeHtml(selectedTable?.number || 'T-01')}
          </h2>
          <span id="inspector-status-badge" class="badge ${selectedTable?.status === 'OCCUPIED' ? 'badge-amber' : selectedTable?.status === 'BILL_REQUESTED' ? 'badge-violet' : 'badge-sage'}" style="border-radius: 9999px; padding: 3px 10px; font-size: 11px;">
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
            <button type="button" onclick="adjustSeats(-1)" aria-label="Decrease seats" style="background: transparent; border: none; font-size: 18px; font-weight: 700; color: #64748B; cursor: pointer; width: 28px;">−</button>
            <span id="inspector-seats-display" style="font-size: 15px; font-weight: 800; color: #0F172A;">${selectedTable?.capacity || 4}</span>
            <button type="button" onclick="adjustSeats(1)" aria-label="Increase seats" style="background: transparent; border: none; font-size: 18px; font-weight: 700; color: #64748B; cursor: pointer; width: 28px;">+</button>
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
              style="flex: 1; border: none; background: ${isRoundShape(selectedTable?.shape) ? '#000000' : 'transparent'}; color: ${isRoundShape(selectedTable?.shape) ? '#FFFFFF' : '#64748B'}; padding: 7px; border-radius: 9999px; font-size: 12px; font-weight: 600; cursor: pointer;"
            >
              Round
            </button>
            <button
              type="button"
              id="shape-square-btn"
              onclick="setShape('Square')"
              style="flex: 1; border: none; background: ${!isRoundShape(selectedTable?.shape) ? '#000000' : 'transparent'}; color: ${!isRoundShape(selectedTable?.shape) ? '#FFFFFF' : '#64748B'}; padding: 7px; border-radius: 9999px; font-size: 12px; font-weight: 600; cursor: pointer;"
            >
              Square
            </button>
          </div>
        </div>

        <!-- Floor / Zone Assignment & Coordinates -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px;">Floor area</label>
            <select id="inspector-floor-select" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px; font-size: 12px; font-weight: 600; color: #0F172A; background: #FFFFFF; box-sizing: border-box;">
              ${branchFloors.map((f) => `<option value="${escapeHtml(f.id)}" ${f.id === (selectedTable?.floorId || activeFloor?.id) ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px;">Position (X, Y)</label>
            <div style="display: flex; gap: 6px;">
              <input type="number" step="12" min="12" max="1200" id="inspector-x-input" value="${Math.round((Number(selectedTable?.x) || 24) / 12) * 12}" onchange="applyInspectorPosition()" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 10px; padding: 7px 6px; font-size: 12px; font-weight: 600; text-align: center; box-sizing: border-box;" aria-label="X coordinate">
              <input type="number" step="12" min="12" max="900" id="inspector-y-input" value="${Math.round((Number(selectedTable?.y) || 24) / 12) * 12}" onchange="applyInspectorPosition()" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 10px; padding: 7px 6px; font-size: 12px; font-weight: 600; text-align: center; box-sizing: border-box;" aria-label="Y coordinate">
            </div>
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
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 18px; padding: 14px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 54px; height: 54px; background: #000000; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; flex-shrink: 0; padding: 4px;">
            <div style="width: 100%; height: 100%; border: 2px dashed #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">QR</div>
          </div>
          <div style="min-width: 0;">
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
          onclick="openRemoveTableModal()"
          style="width: 100%; border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626; border-radius: 9999px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 120ms ease;"
        >
          Remove table
        </button>

      </div>

    </div>

  </div>

  <style>
    #floor-canvas-grid {
      position: relative;
      min-width: 660px;
      min-height: 520px;
      width: 100%;
    }
    .table-node {
      position: absolute;
    }
    .table-node:focus {
      outline: 3px solid #3B82F6;
      outline-offset: 2px;
    }
    @media (max-width: 960px) {
      .floors-container {
        padding: 16px 16px 88px 16px !important;
      }
      .floor-split-grid {
        grid-template-columns: 1fr !important;
      }
      #table-inspector-panel {
        position: static !important;
      }
    }
    @media (max-width: 768px) {
      #floor-canvas-grid {
        min-width: 0;
        min-height: 0;
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 14px;
      }
      .table-node {
        position: static !important;
        width: 100% !important;
      }
    }
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
      transform: scale(1.03);
    }
  </style>

  <!-- Add Floor Modal -->
  <div id="add-floor-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;">
    <div style="background: #FFFFFF; border-radius: 24px; padding: 32px; width: 420px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.06);">
      <h3 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">New Dining Area</h3>
      <p style="font-size: 13px; color: #64748B; margin-bottom: 20px;">Add a persistent floor zone (e.g. Rooftop, Courtyard, Private Dining).</p>
      
      <form id="add-floor-form" onsubmit="submitAddFloor(event)">
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Area Name</label>
          <input type="text" id="new-floor-name" required minlength="2" maxlength="60" placeholder="e.g. Rooftop Terrace" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 14px; outline: none; box-sizing: border-box;" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 22px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Zone Type</label>
            <select id="new-floor-type" style="width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 13px; background: #FFFFFF; box-sizing: border-box;">
              <option value="Dining">Dining</option>
              <option value="Outdoor">Outdoor</option>
              <option value="Bar">Bar</option>
              <option value="Private">Private</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Capacity</label>
            <input type="number" id="new-floor-capacity" min="1" max="500" value="24" required style="width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 13px; box-sizing: border-box;" />
          </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="closeAddFloorModal()" class="btn btn-secondary" style="border-radius: 9999px; padding: 9px 20px; font-size: 13px; font-weight: 600;">Cancel</button>
          <button type="submit" id="submit-add-floor-btn" class="btn btn-primary" style="border-radius: 9999px; padding: 9px 24px; font-size: 13px; font-weight: 600;">Create Area</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Remove Table Confirmation Modal (replaces native confirm()) -->
  <div id="remove-table-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;">
    <div style="background: #FFFFFF; border-radius: 24px; padding: 28px; width: 400px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.06);">
      <h3 style="font-size: 19px; font-weight: 800; color: #0F172A; margin: 0 0 8px 0;">Remove Table</h3>
      <p id="remove-table-msg" style="font-size: 13px; color: #475569; margin: 0 0 20px 0; line-height: 1.5;">
        Are you sure you want to remove this table? Its active QR locator will be retired.
      </p>
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" onclick="closeRemoveTableModal()" class="btn btn-secondary" style="border-radius: 9999px; padding: 9px 20px; font-size: 13px; font-weight: 600;">Cancel</button>
        <button type="button" id="confirm-remove-table-btn" onclick="confirmRemoveCurrentTable()" style="border: none; background: #DC2626; color: #FFFFFF; border-radius: 9999px; padding: 9px 22px; font-size: 13px; font-weight: 600; cursor: pointer;">Confirm Remove</button>
      </div>
    </div>
  </div>

  <script>
    const BRANCH_ID = '${escapeHtml(currentBranchId)}';
    const DEFAULT_FLOOR_ID = '${escapeHtml(activeFloor?.id || 'floor_ground')}';
    const SNAP_PX = 12;
    let activeFloorTab = '${escapeHtml(initialFloorTab)}';
    let currentSeats = ${selectedTable?.capacity || 4};
    let currentShape = '${isRoundShape(selectedTable?.shape) ? 'Round' : 'Square'}';
    let hasUnsavedLayout = false;
    let TABLES_MODEL = ${JSON.stringify(
      tables.map((t, idx) => ({
        id: t.id,
        number: t.number,
        capacity: t.capacity,
        status: t.status,
        x: Number.isFinite(Number(t.x)) && Number(t.x) > 0 ? Math.round(Number(t.x) / 12) * 12 : (idx % 5) * 120 + 24,
        y: Number.isFinite(Number(t.y)) && Number(t.y) > 0 ? Math.round(Number(t.y) / 12) * 12 : Math.floor(idx / 5) * 108 + 24,
        width: t.width || 84,
        height: t.height || 84,
        shape: t.shape || 'rectangle',
        section: t.section || 'Main Dining Room',
        floorId: t.floorId || activeFloor?.id || 'floor_ground',
        branchId: t.branchId || currentBranchId,
        locator: t.locator || '',
      }))
    )};

    function markLayoutDirty(isDirty) {
      hasUnsavedLayout = isDirty;
      const syncEl = document.getElementById('layout-sync-indicator');
      const saveLayoutBtn = document.getElementById('save-layout-btn');
      if (syncEl) {
        syncEl.textContent = isDirty ? '● Unsaved position changes' : '✓ All tables synced';
        syncEl.style.color = isDirty ? '#D97706' : '#059669';
      }
      if (saveLayoutBtn) {
        saveLayoutBtn.disabled = !isDirty;
      }
    }

    function boxesOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      const pad = 6;
      return ax < bx + bw - pad && ax + aw - pad > bx && ay < by + bh - pad && ay + ah - pad > by;
    }

    function hasCollisionForTable(tableId, nextX, nextY) {
      const target = TABLES_MODEL.find((t) => Number(t.id) === Number(tableId));
      if (!target) return false;
      const w = Number(target.width) || 84;
      const h = Number(target.height) || 84;
      return TABLES_MODEL.some((other) => {
        if (Number(other.id) === Number(tableId)) return false;
        if (other.floorId !== target.floorId) return false;
        return boxesOverlap(nextX, nextY, w, h, Number(other.x) || 0, Number(other.y) || 0, Number(other.width) || 84, Number(other.height) || 84);
      });
    }

    function updateTableNodePosition(tableId, rawX, rawY) {
      const snappedX = Math.max(12, Math.min(1200, Math.round(rawX / SNAP_PX) * SNAP_PX));
      const snappedY = Math.max(12, Math.min(900, Math.round(rawY / SNAP_PX) * SNAP_PX));
      if (hasCollisionForTable(tableId, snappedX, snappedY)) {
        return false;
      }
      const el = document.getElementById('node-table-' + tableId);
      const model = TABLES_MODEL.find((t) => Number(t.id) === Number(tableId));
      if (el && model) {
        model.x = snappedX;
        model.y = snappedY;
        el.style.left = snappedX + 'px';
        el.style.top = snappedY + 'px';
        el.setAttribute('data-table-x', String(snappedX));
        el.setAttribute('data-table-y', String(snappedY));
        if (document.getElementById('inspector-table-id')?.value == String(tableId)) {
          const xi = document.getElementById('inspector-x-input');
          const yi = document.getElementById('inspector-y-input');
          if (xi) xi.value = String(snappedX);
          if (yi) yi.value = String(snappedY);
        }
        markLayoutDirty(true);
      }
      return true;
    }

    // Bind pointer dragging & keyboard positioning on all table nodes
    (function initCanvasInteractions() {
      const nodes = document.querySelectorAll('.table-node');
      nodes.forEach((el) => {
        let dragState = null;

        el.addEventListener('pointerdown', (e) => {
          if (window.innerWidth <= 768) {
            selectTableNode(el);
            return;
          }
          selectTableNode(el);
          const id = Number(el.getAttribute('data-table-id'));
          const startX = Number(el.getAttribute('data-table-x')) || 24;
          const startY = Number(el.getAttribute('data-table-y')) || 24;
          dragState = { id, ptrStartX: e.clientX, ptrStartY: e.clientY, startX, startY, moved: false };
          el.style.cursor = 'grabbing';
          if (el.setPointerCapture) {
            try { el.setPointerCapture(e.pointerId); } catch {}
          }
        });

        el.addEventListener('pointermove', (e) => {
          if (!dragState) return;
          const dx = e.clientX - dragState.ptrStartX;
          const dy = e.clientY - dragState.ptrStartY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.moved = true;
          if (!dragState.moved) return;
          updateTableNodePosition(dragState.id, dragState.startX + dx, dragState.startY + dy);
        });

        const endDrag = (e) => {
          if (!dragState) return;
          dragState = null;
          el.style.cursor = 'grab';
          if (el.releasePointerCapture) {
            try { el.releasePointerCapture(e.pointerId); } catch {}
          }
        };
        el.addEventListener('pointerup', endDrag);
        el.addEventListener('pointercancel', endDrag);

        el.addEventListener('keydown', (e) => {
          const id = Number(el.getAttribute('data-table-id'));
          const step = e.shiftKey ? 24 : 12;
          const curX = Number(el.getAttribute('data-table-x')) || 24;
          const curY = Number(el.getAttribute('data-table-y')) || 24;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectTableNode(el);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (!updateTableNodePosition(id, curX + step, curY) && window.showToast) window.showToast('Another table occupies that position.', 'error');
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (!updateTableNodePosition(id, curX - step, curY) && window.showToast) window.showToast('Another table occupies that position.', 'error');
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!updateTableNodePosition(id, curX, curY + step) && window.showToast) window.showToast('Another table occupies that position.', 'error');
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!updateTableNodePosition(id, curX, curY - step) && window.showToast) window.showToast('Another table occupies that position.', 'error');
          }
        });
      });
    })();

    function applyInspectorPosition() {
      const id = Number(document.getElementById('inspector-table-id').value);
      if (!id) return;
      const x = Number(document.getElementById('inspector-x-input').value) || 24;
      const y = Number(document.getElementById('inspector-y-input').value) || 24;
      if (!updateTableNodePosition(id, x, y)) {
        if (window.showToast) window.showToast('Cannot place table overlapping another table.', 'error');
      }
    }

    function switchFloor(fId, btn) {
      activeFloorTab = fId;
      document.querySelectorAll('.floor-pill').forEach(p => p.classList.remove('active'));
      if (btn) btn.classList.add('active');
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
        n.style.boxShadow = '0 2px 6px rgba(15,23,42,0.06)';
        const st = n.getAttribute('data-table-status');
        if (st === 'OCCUPIED') {
          n.style.background = '#FEF3C7';
          n.style.border = '1.5px solid #FCD34D';
        } else if (st === 'BILL_REQUESTED') {
          n.style.background = '#EDE9FE';
          n.style.border = '1.5px solid #C4B5FD';
        } else {
          n.style.background = '#EFF6FF';
          n.style.border = '1.5px solid #93C5FD';
        }
        const spans = n.querySelectorAll('span');
        if (spans[0]) spans[0].style.color = '#0F172A';
        if (spans[1]) spans[1].style.color = '#64748B';
      });

      el.classList.add('selected');
      el.style.background = '#111827';
      el.style.border = '2px solid #2563EB';
      el.style.boxShadow = '0 0 24px rgba(37, 99, 235, 0.45)';
      const selSpans = el.querySelectorAll('span');
      if (selSpans[0]) selSpans[0].style.color = '#FFFFFF';
      if (selSpans[1]) selSpans[1].style.color = '#94A3B8';

      const id = el.getAttribute('data-table-id');
      const num = el.getAttribute('data-table-number');
      const cap = parseInt(el.getAttribute('data-table-capacity'), 10) || 4;
      const shp = el.getAttribute('data-table-shape');
      const sec = el.getAttribute('data-table-section');
      const st = el.getAttribute('data-table-status');
      const loc = el.getAttribute('data-table-locator');
      const flr = el.getAttribute('data-table-floor');
      const px = el.getAttribute('data-table-x') || '24';
      const py = el.getAttribute('data-table-y') || '24';

      document.getElementById('inspector-table-id').value = id;
      document.getElementById('inspector-table-name').textContent = 'Table ' + num;
      document.getElementById('inspector-number-input').value = num;
      document.getElementById('inspector-seats-display').textContent = cap;
      document.getElementById('inspector-section-select').value = sec || 'Main Dining Room';
      const flrSel = document.getElementById('inspector-floor-select');
      if (flrSel && flr) flrSel.value = flr;
      const xi = document.getElementById('inspector-x-input');
      const yi = document.getElementById('inspector-y-input');
      if (xi) xi.value = px;
      if (yi) yi.value = py;

      const badge = document.getElementById('inspector-status-badge');
      if (badge) {
        badge.textContent = st;
        badge.className = 'badge ' + (st === 'OCCUPIED' ? 'badge-amber' : st === 'BILL_REQUESTED' ? 'badge-violet' : 'badge-sage');
      }

      const dinerLink = document.getElementById('inspector-diner-link');
      if (dinerLink) dinerLink.href = loc ? '/dine/' + loc : '#';
      const hashSpan = document.getElementById('inspector-locator-hash');
      if (hashSpan) hashSpan.textContent = loc ? loc.slice(0, 16) + '...' : 'No locator';

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

    async function saveSpatialLayout() {
      const saveLayoutBtn = document.getElementById('save-layout-btn');
      if (saveLayoutBtn) {
        saveLayoutBtn.disabled = true;
        saveLayoutBtn.textContent = 'Saving layout...';
      }
      const targetFloor = activeFloorTab !== 'ALL' ? activeFloorTab : DEFAULT_FLOOR_ID;
      const tablesForFloor = TABLES_MODEL.filter((t) => activeFloorTab === 'ALL' ? t.floorId === targetFloor : t.floorId === activeFloorTab);
      const payloadTables = tablesForFloor.length > 0 ? tablesForFloor : TABLES_MODEL;
      try {
        await window.apiFetch('/api/restaurant/floor/save?branch=' + encodeURIComponent(BRANCH_ID) + '&floor=' + encodeURIComponent(targetFloor), {
          method: 'POST',
          body: {
            branchId: BRANCH_ID,
            tables: payloadTables
          }
        });
        markLayoutDirty(false);
        if (window.showToast) window.showToast('Spatial floor positions persisted.', 'success');
      } catch (err) {
        if (saveLayoutBtn) saveLayoutBtn.disabled = false;
      } finally {
        if (saveLayoutBtn) saveLayoutBtn.textContent = 'Save floor layout';
      }
    }

    async function saveCurrentTable() {
      const id = document.getElementById('inspector-table-id').value;
      if (!id) return;
      const number = document.getElementById('inspector-number-input').value.trim();
      const section = document.getElementById('inspector-section-select').value;
      const floorId = document.getElementById('inspector-floor-select')?.value || DEFAULT_FLOOR_ID;
      const x = Math.round((Number(document.getElementById('inspector-x-input')?.value) || 24) / SNAP_PX) * SNAP_PX;
      const y = Math.round((Number(document.getElementById('inspector-y-input')?.value) || 24) / SNAP_PX) * SNAP_PX;
      const shape = currentShape === 'Round' ? 'round' : 'rectangle';

      if (hasCollisionForTable(Number(id), x, y)) {
        if (window.showToast) window.showToast('Another table occupies (' + x + ', ' + y + '). Choose a free position.', 'error');
        return;
      }

      const saveBtn = document.getElementById('save-table-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        await window.apiFetch('/api/restaurant/tables/' + encodeURIComponent(id), {
          method: 'PATCH',
          body: { number, capacity: currentSeats, shape, section, floorId, x, y }
        });
        if (hasUnsavedLayout) {
          await saveSpatialLayout();
        }
        window.showToast('Table ' + number + ' saved successfully!', 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save table changes';
      }
    }

    function openRemoveTableModal() {
      const id = document.getElementById('inspector-table-id').value;
      const number = document.getElementById('inspector-number-input').value;
      if (!id) return;
      const msg = document.getElementById('remove-table-msg');
      if (msg) {
        msg.textContent = 'Are you sure you want to remove Table ' + number + '? Its QR code locator will be retired.';
      }
      document.getElementById('remove-table-modal').style.display = 'flex';
    }

    function closeRemoveTableModal() {
      document.getElementById('remove-table-modal').style.display = 'none';
    }

    async function confirmRemoveCurrentTable() {
      const id = document.getElementById('inspector-table-id').value;
      const number = document.getElementById('inspector-number-input').value;
      if (!id) return;

      const delBtn = document.getElementById('confirm-remove-table-btn');
      delBtn.disabled = true;
      delBtn.textContent = 'Removing...';

      try {
        await window.apiFetch('/api/restaurant/tables/' + encodeURIComponent(id), {
          method: 'DELETE'
        });
        closeRemoveTableModal();
        window.showToast('Table ' + number + ' deleted.', 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        delBtn.disabled = false;
        delBtn.textContent = 'Confirm Remove';
      }
    }

    async function createNewTable(shape, capacity) {
      const targetFloor = activeFloorTab !== 'ALL' ? activeFloorTab : DEFAULT_FLOOR_ID;
      let nextX = 24;
      let nextY = 24;
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 5; col++) {
          const cx = col * 120 + 24;
          const cy = row * 108 + 24;
          const collides = TABLES_MODEL.some(
            (t) => t.floorId === targetFloor && boxesOverlap(cx, cy, 90, 90, Number(t.x) || 0, Number(t.y) || 0, Number(t.width) || 84, Number(t.height) || 84)
          );
          if (!collides) {
            nextX = cx;
            nextY = cy;
            row = 99;
            break;
          }
        }
      }

      try {
        await window.apiFetch('/api/restaurant/tables', {
          method: 'POST',
          body: {
            shape,
            capacity,
            section: 'Main Dining Room',
            floorId: targetFloor,
            branchId: BRANCH_ID,
            x: nextX,
            y: nextY
          }
        });
        window.showToast('Added ' + shape + ' table successfully!', 'success');
        setTimeout(() => {
          window.location.href = '/operations/floor?branch=' + encodeURIComponent(BRANCH_ID) + '&floor=' + encodeURIComponent(targetFloor);
        }, 500);
      } catch (err) {}
    }

    function addNewFloor() {
      document.getElementById('new-floor-name').value = '';
      document.getElementById('new-floor-capacity').value = '24';
      const modal = document.getElementById('add-floor-modal');
      modal.style.display = 'flex';
      setTimeout(() => document.getElementById('new-floor-name').focus(), 50);
    }

    function closeAddFloorModal() {
      document.getElementById('add-floor-modal').style.display = 'none';
    }

    async function submitAddFloor(e) {
      e.preventDefault();
      const name = document.getElementById('new-floor-name').value.trim();
      const type = document.getElementById('new-floor-type')?.value || 'Dining';
      const capacity = Number(document.getElementById('new-floor-capacity')?.value || 24);
      if (!name) return;

      const btn = document.getElementById('submit-add-floor-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
      try {
        const res = await window.apiFetch('/api/restaurant/floors', {
          method: 'POST',
          body: {
            branchId: BRANCH_ID,
            name,
            type,
            capacity
          }
        });
        const createdFloor = res.data || res.floor;
        closeAddFloorModal();
        window.showToast('Floor area "' + (createdFloor?.name || name) + '" persisted!', 'success');
        const nextFloorId = createdFloor?.id || DEFAULT_FLOOR_ID;
        setTimeout(() => {
          window.location.href = '/operations/floor?branch=' + encodeURIComponent(BRANCH_ID) + '&floor=' + encodeURIComponent(nextFloorId);
        }, 500);
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Create Area'; }
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
