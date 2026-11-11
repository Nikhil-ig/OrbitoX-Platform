/**
 * 🍷 RestaurantOS 4.0 Spatial Floor Operations Studio & Live Table Inspector (SCR-OPS-FLOOR)
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete restaurant spatial engine:
 * - Distinct Live Service vs Edit Layout modes
 * - Free 2D pointer dragging (mouse + touch) with SVG matrix coordinate conversion
 * - touch-action: none for high-reliability touchscreens
 * - Floating coordinate pill during drag
 * - Snapping to grid with zoom compensation
 * - Full Table Inspector Tabs:
 *   1. Overview (Status, Server, Turn Time, Capacity, Actions, Merge)
 *   2. Seats & Guests (Visual seat map, Seat CRUD, Guest assignment)
 *   3. Orders (Itemized kitchen progression, course state)
 *   4. Authoritative Bill & Settlement (GST 5%, payments, cash change, comp/void)
 *   5. Spatial Layout & Geometry (Zero-reload shape morphing, X/Y/W/H)
 * - Safe layout persistence contract: POST /api/restaurant/floor/save
 */

import { TableFloorRecord, FloorRecord, RestaurantOrder, DEFAULT_FLOORS } from '../../domain';
import { icon } from '../icons';

export function renderFloorStudio(
  allTables: TableFloorRecord[],
  selectedTableId?: number,
  currentFloorId = 'floor_courtyard',
  currentBranchId = 'branch_ldh',
  floors = DEFAULT_FLOORS,
  orders: RestaurantOrder[] = []
): string {
  // Filter tables to current branch & floor
  const branchFloors = floors.filter((f) => f.branchId === currentBranchId || !f.branchId);
  const activeFloor = branchFloors.find((f) => f.id === currentFloorId) || branchFloors[0] || floors[0];
  const floorTables = allTables.filter((t) => (t.branchId === currentBranchId || !t.branchId) && (t.floorId === activeFloor.id || t.section === activeFloor.name));
  const seenTableIds = new Set<number>();
  const displayTables = floorTables.filter((t) => {
    if (seenTableIds.has(t.id)) return false;
    seenTableIds.add(t.id);
    return true;
  });

  const initialSelected = displayTables.find((t) => t.id === selectedTableId) || displayTables[0] || null;

  return `
  <div class="floor-studio-viewport" style="display: flex; height: calc(100vh - 52px); overflow: hidden; background: #0A0D10; position: relative;">
    
    <!-- Left: Floor Sections Rail -->
    <div class="floor-sections-rail" style="width: 200px; background: var(--color-charcoal); border-right: 1px solid var(--border-default); display: flex; flex-direction: column; flex-shrink: 0;">
      <div style="padding: 14px 16px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); letter-spacing: 0.05em;">Floor Sections</span>
        <a href="/operations/floors?branch=${currentBranchId}" title="Manage Floors" style="font-size: 11px; color: var(--color-stone); text-decoration: none; display: flex; align-items: center;">${icon('settings', { size: 12, color: 'var(--color-stone)' })}</a>
      </div>

      <div style="padding: 8px; display: flex; flex-direction: column; gap: 3px; flex: 1; overflow-y: auto;">
        ${branchFloors
          .map((f) => {
            const isFActive = f.id === activeFloor.id;
            const count = allTables.filter((t) => (t.branchId === currentBranchId || !t.branchId) && (t.floorId === f.id || t.section === f.name)).length;
            const floorIcon = f.type === 'Bar' ? 'beer' : f.type === 'Outdoor' ? 'sparkles' : f.type === 'Private' ? 'shield' : 'floor';
            return `
          <a href="/operations/floor?branch=${currentBranchId}&floor=${f.id}" class="nav-item ${isFActive ? 'active' : ''}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 6px; text-decoration: none;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${icon(floorIcon, { size: 14, color: isFActive ? 'var(--color-copper)' : 'var(--color-stone)' })}</span>
              <span style="font-size: 12px; font-weight: 600; color: ${isFActive ? 'var(--color-copper)' : 'var(--color-linen)'};">${f.name}</span>
            </div>
            <span style="font-size: 10px; font-family: var(--font-mono); color: ${isFActive ? 'var(--color-copper)' : 'var(--color-muted)'}; background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px;">${count}</span>
          </a>`;
          })
          .join('')}

        <div style="margin-top: 12px; padding: 4px 8px;">
          <a href="/operations/floors?branch=${currentBranchId}&action=new" class="btn btn-ghost btn-sm" style="width: 100%; justify-content: flex-start; font-size: 11px;">
            + Add Section
          </a>
        </div>
      </div>

      <!-- Legend & Heatmap Info -->
      <div style="padding: 14px 16px; border-top: 1px solid var(--border-subtle); font-size: 11px;">
        <div style="font-size: 11px; color: var(--color-stone); margin-bottom: 8px; font-weight: 700; text-transform: uppercase;">Status Legend</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;"><span style="width:8px;height:8px;border-radius:2px;background:var(--color-sage);"></span> Available</div>
          <div style="display: flex; align-items: center; gap: 8px;"><span style="width:8px;height:8px;border-radius:2px;background:var(--color-copper);"></span> Seated / Active</div>
          <div style="display: flex; align-items: center; gap: 8px;"><span style="width:8px;height:8px;border-radius:2px;background:var(--color-amber);"></span> Bill Requested</div>
          <div style="display: flex; align-items: center; gap: 8px;"><span style="width:8px;height:8px;border-radius:2px;background:var(--color-sky);"></span> Reserved</div>
        </div>
      </div>
    </div>

    <!-- Center: Interactive SVG Spatial Canvas & Studio Toolbar -->
    <div style="flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; min-width: 0;">
      
      <!-- Toolbar -->
      <div style="height: 48px; background: #0E1215; border-bottom: 1px solid var(--border-default); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 10; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <!-- 1. Mode Toggle: Live Service vs Edit Layout -->
          <div style="display: inline-flex; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; padding: 2px;">
            <button id="mode-live-btn" onclick="setMode('LIVE')" class="btn btn-sm" style="background: var(--color-copper); color: #FFF; border: none; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; cursor: pointer;">
              Live Service
            </button>
            <button id="mode-edit-btn" onclick="setMode('EDIT')" class="btn btn-sm" style="background: transparent; color: var(--color-stone); border: none; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 11px; cursor: pointer;">
              Layout Design
            </button>
          </div>

          <span style="color: var(--border-strong);">|</span>

          <!-- 2. Heatmap Mode Selector -->
          <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px;">
            <span style="color: var(--color-stone); font-weight: 600;">View Mode:</span>
            <select id="heatmap-select" onchange="setHeatmapMode(this.value)" style="background: #151921; border: 1px solid var(--border-default); border-radius: 4px; color: var(--color-linen); font-size: 11px; padding: 3px 6px;">
              <option value="STATUS">Standard Table Status</option>
              <option value="OCCUPANCY">Heatmap: Occupancy Load</option>
              <option value="TURNOVER">Heatmap: Turn Time (SLA)</option>
              <option value="REVENUE">Heatmap: Tab Revenue</option>
              <option value="KITCHEN_DELAY">Heatmap: Prep SLA Delays</option>
            </select>
          </div>

          <span style="color: var(--border-strong);">|</span>
          <span id="canvas-status-hint" style="font-size: 11px; color: var(--color-stone);">Click table to inspect</span>
        </div>

        <!-- Right Toolbar Actions -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="save-feedback" style="display: none; font-size: 11px; font-weight: 700; color: var(--color-sage); margin-right: 4px;">✓ Layout Saved</div>
          <button id="save-layout-btn" class="btn btn-primary btn-sm" onclick="persistFloorLayout()" style="display: none; align-items: center; gap: 5px;">
            ${icon('save', { size: 12, color: '#FFFFFF' })}
            <span>Save Changes</span>
          </button>
          <button id="add-table-btn" class="btn btn-secondary btn-sm" onclick="addNewTable()" style="display: none; align-items: center; gap: 5px;">
            ${icon('plus', { size: 12, color: 'var(--color-stone)' })}
            <span>Add Table</span>
          </button>
          <span style="color: var(--border-strong);">|</span>
          <button class="btn btn-secondary btn-sm" onclick="zoomCanvas(-0.1)" title="Zoom Out">−</button>
          <span id="zoom-level" style="font-size: 11px; font-family: var(--font-mono); color: var(--color-stone); width: 34px; text-align: center;">100%</span>
          <button class="btn btn-secondary btn-sm" onclick="zoomCanvas(0.1)" title="Zoom In">+</button>
          <button class="btn btn-ghost btn-sm" onclick="resetZoom()" title="Reset Zoom" style="font-size: 10px;">Reset</button>
        </div>
      </div>

      <!-- Spatial SVG Canvas Viewport (touch-action: none for touch dragging) -->
      <div id="canvas-container" style="flex: 1; overflow: auto; position: relative; background: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 24px 24px, #0B0E12; user-select: none; touch-action: none;">
        
        <!-- Floating Drag Coordinates Indicator -->
        <div id="floating-drag-coords" style="position: absolute; display: none; pointer-events: none; z-index: 100; background: #000; border: 1px solid var(--color-copper); border-radius: 4px; padding: 2px 6px; font-size: 10px; font-family: var(--font-mono); color: var(--color-linen); box-shadow: 0 4px 12px rgba(0,0,0,0.8);">
          X: 0, Y: 0
        </div>

        <svg id="floor-svg" width="940" height="620" style="display: block; transform-origin: 0 0; touch-action: none;">
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <!-- Architectural Boundary Box -->
          <rect x="24" y="20" width="892" height="580" rx="12" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" stroke-dasharray="4 4" />
          <text x="36" y="15" fill="rgba(255,255,255,0.3)" font-size="10" font-weight="700" font-family="sans-serif">${activeFloor.name.toUpperCase()} ARCHITECTURAL LAYOUT</text>

          <!-- Kitchen Pass Station Block -->
          <rect x="730" y="36" width="170" height="170" rx="8" fill="rgba(200, 107, 60, 0.05)" stroke="rgba(200, 107, 60, 0.25)" stroke-width="1.5" />
          <text x="815" y="125" fill="var(--color-copper)" font-size="11" font-weight="700" text-anchor="middle" font-family="sans-serif">KITCHEN PASS</text>
          <text x="815" y="142" fill="var(--color-stone)" font-size="9" text-anchor="middle" font-family="sans-serif">Tandoor & Curry Line</text>

          <!-- Cocktail Bar Block -->
          <rect x="730" y="250" width="170" height="150" rx="8" fill="rgba(74, 139, 178, 0.05)" stroke="rgba(74, 139, 178, 0.25)" stroke-width="1.5" />
          <text x="815" y="330" fill="var(--color-sky)" font-size="11" font-weight="700" text-anchor="middle" font-family="sans-serif">COCKTAIL BAR</text>
          <text x="815" y="347" fill="var(--color-stone)" font-size="9" text-anchor="middle" font-family="sans-serif">Beverage Station</text>

          <!-- Tables Layer -->
          <g id="tables-layer">
            ${
              displayTables.length === 0
                ? `
                <g id="empty-floor-notice">
                  <rect x="220" y="220" width="500" height="130" rx="10" fill="#131720" stroke="rgba(255,255,255,0.08)" />
                  <text x="470" y="270" fill="var(--color-linen)" font-size="15" font-weight="800" text-anchor="middle" font-family="sans-serif">No tables placed in this service area yet</text>
                  <text x="470" y="296" fill="var(--color-stone)" font-size="12" text-anchor="middle" font-family="sans-serif">Switch to "Layout Design" mode above and click "+ Add Table" to design this space.</text>
                </g>`
                : displayTables
                    .map((t) => {
                      const isCircle = t.shape === 'circle';
                      const isBooth = t.shape === 'booth';
                      const hasMerged = t.mergedWithTableIds && t.mergedWithTableIds.length > 0;

                      return `
                      <g id="table-node-${t.id}" class="table-group" data-id="${t.id}" transform="translate(${t.x}, ${t.y})" style="cursor: pointer;">
                        ${
                          isCircle
                            ? `<circle class="table-shape" cx="${t.width / 2}" cy="${t.height / 2}" r="${t.width / 2 - 2}" fill="#161B22" stroke="rgba(255,255,255,0.18)" stroke-width="2" />`
                            : isBooth
                            ? `<rect class="table-shape" width="${t.width}" height="${t.height}" rx="14" fill="#1C1825" stroke="rgba(255,255,255,0.18)" stroke-width="2" />`
                            : `<rect class="table-shape" width="${t.width}" height="${t.height}" rx="8" fill="#161B22" stroke="rgba(255,255,255,0.18)" stroke-width="2" />`
                        }
                        <text class="table-label" x="${t.width / 2}" y="${t.height / 2 - 2}" fill="#FFFFFF" font-size="13" font-weight="800" text-anchor="middle" font-family="sans-serif" style="pointer-events: none; user-select: none;">${t.number}</text>
                        <text class="table-sub" x="${t.width / 2}" y="${t.height / 2 + 14}" fill="#A8A196" font-size="10" font-weight="600" text-anchor="middle" font-family="sans-serif" style="pointer-events: none; user-select: none;">${t.capacity}P${hasMerged ? ' [M]' : ''}</text>
                        <circle class="table-status-indicator" cx="${t.width - 10}" cy="10" r="4" fill="var(--color-sage)" style="pointer-events: none;" />
                      </g>`;
                    })
                    .join('')
            }
          </g>
        </svg>
      </div>
    </div>

    <!-- Right: Contextual Table Inspector (Comprehensive Tabbed Drawer) -->
    <aside id="table-inspector" style="width: 350px; background: var(--color-charcoal); border-left: 1px solid var(--border-default); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;">
      <!-- Header -->
      <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: #13171F;">
        <div>
          <div style="font-size: 10px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Table Inspector</div>
          <div id="insp-title" style="font-size: 18px; font-weight: 800; color: var(--color-linen);">${initialSelected ? initialSelected.number : 'No Table Selected'}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span id="insp-badge" class="badge badge-copper">${initialSelected ? initialSelected.status : 'INACTIVE'}</span>
        </div>
      </div>

      <!-- Inspector Tab Navigation -->
      <div style="display: flex; border-bottom: 1px solid var(--border-subtle); background: #0E1216;">
        <button class="insp-tab-btn active" data-tab="overview" onclick="switchInspTab('overview')">Overview</button>
        <button class="insp-tab-btn" data-tab="seats" onclick="switchInspTab('seats')">Seats & Guests</button>
        <button class="insp-tab-btn" data-tab="orders" onclick="switchInspTab('orders')">Orders</button>
        <button class="insp-tab-btn" data-tab="bill" onclick="switchInspTab('bill')">Bill</button>
        <button class="insp-tab-btn" data-tab="layout" onclick="switchInspTab('layout')">Layout</button>
      </div>

      <!-- Tab 1: Overview -->
      <div id="tab-overview" class="insp-tab-pane" style="padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1;">
        <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
            <span style="color: var(--color-stone);">Active Check</span>
            <span id="insp-bill" style="font-family: var(--font-mono); font-weight: 700; color: var(--color-copper);">₹${(((initialSelected?.activeBillMinor || 0)) / 100).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 6px;">
            <span style="color: var(--color-stone);">Capacity</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="insp-capacity" style="font-weight: 600; color: var(--color-linen);">${initialSelected ? initialSelected.capacity : 0} Guests</span>
              <button class="btn btn-ghost btn-sm" onclick="promptEditCapacity()" style="font-size: 10px; padding: 2px 8px; display: inline-flex; align-items: center; gap: 3px;">
                ${icon('edit', { size: 10, color: 'currentColor' })}
                <span>Edit</span>
              </button>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
            <span style="color: var(--color-stone);">Section</span>
            <span id="insp-section" style="font-weight: 600; color: var(--color-linen);">${initialSelected ? initialSelected.section : activeFloor.name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
            <span style="color: var(--color-stone);">Assigned Server</span>
            <span id="insp-server" style="font-weight: 600; color: var(--color-linen);">${initialSelected?.serverName || 'Aman'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: var(--color-stone);">Turn Time</span>
            <span id="insp-turntime" style="font-weight: 600; color: var(--color-linen);">${initialSelected?.turnTimeMinutes || 0} mins</span>
          </div>
        </div>

        <!-- Merged Table Notice -->
        <div id="insp-merged-box" style="display: none; background: rgba(74, 139, 178, 0.08); border: 1px solid rgba(74, 139, 178, 0.25); border-radius: 6px; padding: 10px; font-size: 12px;">
          <div style="color: var(--color-sky); font-weight: 700; display: flex; align-items: center; gap: 6px;">
            ${icon('layers', { size: 14, color: 'var(--color-sky)' })}
            <span>Merged Party Linked</span>
          </div>
          <div id="insp-merged-text" style="color: var(--color-stone); font-size: 11px; margin-top: 2px;"></div>
          <button class="btn btn-ghost btn-sm" onclick="unmergeCurrentTable()" style="margin-top: 6px; font-size: 11px;">Unmerge Tables</button>
        </div>

        <!-- Operational Status Transition Actions -->
        <div>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 8px;">Table Actions</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="markTableStatus('AVAILABLE')">Mark Available (Clear)</button>
            <button class="btn btn-secondary btn-sm" onclick="markTableStatus('OCCUPIED')">Seat Walk-In Party</button>
            <button class="btn btn-primary btn-sm" onclick="markTableStatus('BILL_REQUESTED')">Print Bill & Checkout</button>
          </div>
        </div>

        <!-- Table Merge Controls -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Merge with Table</div>
          <div style="display: flex; gap: 8px;">
            <select id="merge-target-select" style="flex: 1; background: #0E1216; border: 1px solid var(--border-default); border-radius: 4px; color: #FFF; font-size: 12px; padding: 6px 8px;">
              ${displayTables
                .filter((t) => !initialSelected || t.id !== initialSelected.id)
                .map((t) => `<option value="${t.id}">${t.number} (${t.capacity}P · ${t.status})</option>`)
                .join('')}
            </select>
            <button class="btn btn-secondary btn-sm" onclick="mergeCurrentTable()">Merge</button>
          </div>
        </div>

        <!-- QR Locator -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">QR Discovery Token</div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #0E1116; border: 1px solid var(--border-default); border-radius: 6px; padding: 6px 10px;">
            <span id="insp-locator" style="font-family: var(--font-mono); font-size: 12px; color: var(--color-linen);">${initialSelected?.locator || 'N/A'}</span>
            <a id="insp-diner-link" href="${initialSelected ? `/dine/${initialSelected.locator}` : '#'}" target="_blank" class="btn btn-ghost btn-sm" style="font-size: 11px;">Open PWA ↗</a>
          </div>
        </div>
      </div>

      <!-- Tab 2: Seats & Guests -->
      <div id="tab-seats" class="insp-tab-pane" style="display: none; padding: 16px; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone);">Configured Seats</span>
          <button class="btn btn-secondary btn-sm" onclick="addSeatToCurrentTable()">+ Add Seat</button>
        </div>

        <!-- Visual Seat Circles Ring Diagram -->
        <div id="visual-seat-ring" style="background: #0E1216; border: 1px solid var(--border-default); border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 11px; color: var(--color-stone); margin-bottom: 10px;">Physical Seating Layout</div>
          <div id="seats-diagram-row" style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;"></div>
        </div>

        <!-- Seat List & Occupant Editor -->
        <div id="seats-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>

      <!-- Tab 3: Orders -->
      <div id="tab-orders" class="insp-tab-pane" style="display: none; padding: 16px; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone);">Active Kitchen Orders</div>
        <div id="table-orders-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>

      <!-- Tab 4: Authoritative Bill & Settlement -->
      <div id="tab-bill" class="insp-tab-pane" style="display: none; padding: 16px; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone);">Authoritative Check</div>
          <button class="btn btn-ghost btn-sm" onclick="fetchAuthoritativeBill(selectedId)" style="font-size: 10px; padding: 2px 8px;">Refresh ↻</button>
        </div>

        <div id="bill-loading-indicator" style="display: none; padding: 20px; text-align: center; color: var(--color-stone); font-size: 12px;">
          Fetching live check from server...
        </div>

        <div id="bill-content-container" style="display: flex; flex-direction: column; gap: 12px;">
          <!-- Itemized Line Items -->
          <div id="bill-items-card" style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 12px;">
            <div style="font-size: 10px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; margin-bottom: 8px;">Itemized Orders</div>
            <div id="bill-items-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <!-- Financial Breakdown Card -->
          <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
              <span style="color: var(--color-stone);">Subtotal</span>
              <span id="bill-subtotal" style="font-family: var(--font-mono); color: var(--color-linen);">₹0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
              <span style="color: var(--color-stone);">5% GST</span>
              <span id="bill-tax" style="font-family: var(--font-mono); color: var(--color-linen);">₹0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; border-top: 1px solid var(--border-subtle); padding-top: 8px; color: var(--color-linen);">
              <span>Total Tab</span>
              <span id="bill-total" style="font-family: var(--font-mono); color: var(--color-copper);">₹0.00</span>
            </div>
          </div>

          <!-- Payment Settlement Action Panel -->
          <div id="settlement-action-panel" style="background: #11141B; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Payment Settlement</div>
            <div>
              <label style="font-size: 10px; color: var(--color-muted); display: block; margin-bottom: 4px;">Payment Method</label>
              <select id="settle-payment-method" onchange="onPaymentMethodChange(this.value)" style="width: 100%; background: #0E1116; border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 8px; color: #FFF; font-size: 12px;">
                <option value="CASH">Cash (In-Person)</option>
                <option value="CARD">Card / EDC Terminal</option>
                <option value="UPI">UPI / Digital QR</option>
                <option value="COMP">Manager Comp (100% Courtesy)</option>
                <option value="VOID">Void Check (Administrative Correction)</option>
              </select>
            </div>

            <div id="settle-cash-calculator" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 10px; color: var(--color-stone);">Cash Tendered (₹)</label>
                <input type="number" id="settle-cash-tendered" placeholder="0.00" oninput="calculateChangeDue()" style="width: 100px; background: #0A0D10; border: 1px solid var(--border-default); border-radius: 4px; padding: 3px 6px; color: #FFF; font-family: var(--font-mono); font-size: 12px; text-align: right;">
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: var(--color-stone);">Change Due</span>
                <span id="settle-change-due" style="font-family: var(--font-mono); font-weight: 700; color: var(--color-sage);">₹0.00</span>
              </div>
            </div>

            <div id="settle-reason-group" style="display: none;">
              <label style="font-size: 10px; color: var(--color-muted); display: block; margin-bottom: 4px;">Mandatory Reason (Comp / Void)</label>
              <input type="text" id="settle-reason-input" placeholder="e.g. VIP guest courtesy or billing adjustment" style="width: 100%; background: #0E1116; border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 8px; color: #FFF; font-size: 12px;">
            </div>

            <button id="btn-settle-check" class="btn btn-primary" onclick="submitTableSettlement()" style="width: 100%; justify-content: center;">
              Settle Check & Vacate Table
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 5: Spatial Layout Geometry -->
      <div id="tab-layout" class="insp-tab-pane" style="display: none; padding: 16px; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone);">Geometry (px)</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 10px; color: var(--color-muted);">X Coord</label>
            <input type="number" id="geom-x" value="${initialSelected?.x ?? 0}" oninput="updateSelectedGeometry()" style="width: 100%; background: #0E1116; border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 8px; color: #FFF; font-size: 12px;">
          </div>
          <div>
            <label style="font-size: 10px; color: var(--color-muted);">Y Coord</label>
            <input type="number" id="geom-y" value="${initialSelected?.y ?? 0}" oninput="updateSelectedGeometry()" style="width: 100%; background: #0E1116; border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 8px; color: #FFF; font-size: 12px;">
          </div>
          <div>
            <label style="font-size: 10px; color: var(--color-muted);">Width</label>
            <input type="number" id="geom-w" value="${initialSelected?.width ?? 64}" oninput="updateSelectedGeometry()" style="width: 100%; background: #0E1116; border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 8px; color: #FFF; font-size: 12px;">
          </div>
          <div>
            <label style="font-size: 10px; color: var(--color-muted);">Height</label>
            <input type="number" id="geom-h" value="${initialSelected?.height ?? 64}" oninput="updateSelectedGeometry()" style="width: 100%; background: #0E1116; border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 8px; color: #FFF; font-size: 12px;">
          </div>
        </div>

        <div style="margin-top: 6px;">
          <label style="font-size: 10px; color: var(--color-muted); display: block; margin-bottom: 4px;">Table Shape</label>
          <select id="geom-shape" onchange="updateSelectedShape(this.value)" style="width: 100%; background: #0E1116; border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 8px; color: #FFF; font-size: 12px;">
            <option value="rectangle" ${initialSelected?.shape === 'rectangle' ? 'selected' : ''}>Standard Rectangle</option>
            <option value="circle" ${initialSelected?.shape === 'circle' ? 'selected' : ''}>Round Banquet Table</option>
            <option value="booth" ${initialSelected?.shape === 'booth' ? 'selected' : ''}>Dining Booth</option>
          </select>
        </div>

        <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; display: flex; flex-direction: column; gap: 8px;">
          <button class="btn btn-primary" onclick="persistFloorLayout()" style="width: 100%; justify-content: center;">Save Layout Changes</button>
          <button class="btn btn-danger" onclick="deleteCurrentTable()" style="width: 100%; justify-content: center; font-size: 11px;">Delete Table From Floor</button>
        </div>
      </div>
    </aside>

  </div>

  <!-- Toast Notification Container -->
  <div id="floor-toast-container" style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;"></div>

  <!-- Modal Dialog: Edit Table Capacity -->
  <div id="capacity-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center;">
    <div style="background: var(--color-charcoal); border: 1px solid var(--border-strong); border-radius: 10px; width: 340px; padding: 20px; box-shadow: 0 12px 32px rgba(0,0,0,0.8);">
      <h3 style="font-size: 16px; font-weight: 800; color: var(--color-linen); margin-bottom: 12px;">Edit Table Capacity</h3>
      <div style="margin-bottom: 14px;">
        <label style="font-size: 11px; color: var(--color-stone); display: block; margin-bottom: 6px;">Covers / Seats</label>
        <input type="number" id="modal-capacity-input" min="1" max="24" style="width: 100%; background: #0A0D10; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 10px; color: #FFF; font-size: 14px;">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="closeSeatCapacityModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveModalCapacity()">Save Capacity</button>
      </div>
    </div>
  </div>

  <style>
    .insp-tab-btn {
      flex: 1;
      padding: 10px 4px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--color-stone);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 120ms ease;
    }
    .insp-tab-btn:hover {
      color: var(--color-linen);
      background: rgba(255, 255, 255, 0.02);
    }
    .insp-tab-btn.active {
      color: var(--color-copper);
      border-bottom-color: var(--color-copper);
      font-weight: 700;
    }
    .table-group {
      transition: opacity 120ms ease;
    }
    .table-group:hover .table-shape {
      stroke: var(--color-copper) !important;
    }
    .table-group.dragging {
      opacity: 0.85;
      cursor: grabbing !important;
    }
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(200, 107, 60, 0.6); }
      70% { box-shadow: 0 0 0 8px rgba(200, 107, 60, 0); }
      100% { box-shadow: 0 0 0 0 rgba(200, 107, 60, 0); }
    }
    .pulse {
      animation: pulseGlow 1.5s infinite;
    }

    @media (max-width: 900px) {
      .floor-sections-rail {
        display: none !important;
      }
      #table-inspector {
        position: fixed !important;
        inset: auto 0 0 0 !important;
        width: 100% !important;
        max-height: 55vh !important;
        border-radius: 16px 16px 0 0 !important;
        box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.8) !important;
        z-index: 50 !important;
      }
    }
  </style>

  <script>
    let currentMode = 'LIVE'; // LIVE | EDIT
    let heatmapMode = 'STATUS';
    let tablesData = ${JSON.stringify(displayTables)};
    let ordersData = ${JSON.stringify(orders)};
    let selectedId = ${initialSelected ? initialSelected.id : 'null'};
    let zoom = 1.0;

    // Direct Pointer Drag State
    let isPointerDown = false;
    let isDragging = false;
    let dragTargetTable = null;
    let targetNode = null;
    let pointerStartX = 0, pointerStartY = 0;
    let dragOffsetSvgX = 0, dragOffsetSvgY = 0;
    let capturedPointerId = null;
    let hasUnsavedLayout = false;

    const svg = document.getElementById('floor-svg');
    const canvasContainer = document.getElementById('canvas-container');
    const coordBadge = document.getElementById('floating-drag-coords');

    function showToast(message, type = 'info') {
      const container = document.getElementById('floor-toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.style.cssText = 'pointer-events: auto; padding: 10px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);';
      if (type === 'error') {
        toast.style.background = 'var(--color-crimson)';
        toast.style.color = '#FFF';
      } else if (type === 'success') {
        toast.style.background = 'var(--color-sage)';
        toast.style.color = '#FFF';
      } else {
        toast.style.background = 'var(--color-elevated)';
        toast.style.color = 'var(--color-linen)';
        toast.style.border = '1px solid var(--border-strong)';
      }
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    function switchInspTab(tabName) {
      document.querySelectorAll('.insp-tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.insp-tab-pane').forEach(p => p.style.display = 'none');

      const targetPane = document.getElementById('tab-' + tabName);
      if (targetPane) targetPane.style.display = 'flex';
      const activeBtn = Array.from(document.querySelectorAll('.insp-tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabName));
      if (activeBtn) activeBtn.classList.add('active');
    }

    function setMode(mode) {
      currentMode = mode;
      const liveBtn = document.getElementById('mode-live-btn');
      const editBtn = document.getElementById('mode-edit-btn');
      const addBtn = document.getElementById('add-table-btn');
      const saveBtn = document.getElementById('save-layout-btn');
      const hint = document.getElementById('canvas-status-hint');

      if (mode === 'LIVE') {
        liveBtn.style.background = 'var(--color-copper)';
        liveBtn.style.color = '#FFF';
        editBtn.style.background = 'transparent';
        editBtn.style.color = 'var(--color-stone)';
        addBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        hint.textContent = 'Live Service Mode: Click table to inspect';
      } else {
        editBtn.style.background = 'var(--color-copper)';
        editBtn.style.color = '#FFF';
        liveBtn.style.background = 'transparent';
        liveBtn.style.color = 'var(--color-stone)';
        addBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'inline-flex';
        hint.textContent = 'Layout Design Mode: Drag tables freely (12px grid snap)';
      }
      refreshCanvasVisuals();
    }

    function setHeatmapMode(mode) {
      heatmapMode = mode;
      refreshCanvasVisuals();
    }

    // Convert screen client coordinates to SVG user space (independent of zoom or scroll)
    function getSvgCoordinates(clientX, clientY) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        return pt.matrixTransform(ctm.inverse());
      }
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / zoom,
        y: (clientY - rect.top) / zoom
      };
    }

    function refreshCanvasVisuals() {
      tablesData.forEach(t => {
        const node = document.getElementById('table-node-' + t.id);
        if (!node) return;
        node.setAttribute('transform', 'translate(' + t.x + ', ' + t.y + ')');
        const shape = node.querySelector('.table-shape');
        const isSelected = t.id === selectedId;

        // Visual cursor
        node.style.cursor = currentMode === 'EDIT' ? (isDragging && dragTargetTable?.id === t.id ? 'grabbing' : 'grab') : 'pointer';

        if (shape) {
          if (isSelected) {
            shape.setAttribute('stroke', '#FFFFFF');
            shape.setAttribute('stroke-width', '3');
          } else {
            let strokeColor = 'rgba(255,255,255,0.18)';
            let fillColor = '#161B22';

            if (heatmapMode === 'STATUS') {
              strokeColor = t.status === 'OCCUPIED' ? 'var(--color-copper)' :
                            t.status === 'BILL_REQUESTED' ? 'var(--color-amber)' :
                            t.status === 'RESERVED' ? 'var(--color-sky)' : 'var(--color-sage)';
            } else if (heatmapMode === 'OCCUPANCY') {
              fillColor = t.status === 'OCCUPIED' ? 'rgba(200, 107, 60, 0.45)' : 'rgba(93, 154, 122, 0.15)';
              strokeColor = t.status === 'OCCUPIED' ? 'var(--color-copper)' : 'var(--color-sage)';
            } else if (heatmapMode === 'TURNOVER') {
              const turn = t.turnTimeMinutes || 0;
              fillColor = turn > 45 ? 'rgba(201, 87, 87, 0.4)' : turn > 20 ? 'rgba(217, 154, 69, 0.3)' : 'rgba(93, 154, 122, 0.2)';
              strokeColor = turn > 45 ? 'var(--color-crimson)' : 'var(--color-amber)';
            } else if (heatmapMode === 'REVENUE') {
              const bill = (t.activeBillMinor || 0) / 100;
              fillColor = bill > 1000 ? 'rgba(200, 107, 60, 0.5)' : bill > 400 ? 'rgba(217, 154, 69, 0.3)' : 'rgba(255,255,255,0.05)';
              strokeColor = bill > 500 ? 'var(--color-copper)' : 'rgba(255,255,255,0.2)';
            } else if (heatmapMode === 'KITCHEN_DELAY') {
              fillColor = t.status === 'COOKING' ? 'rgba(201, 87, 87, 0.35)' : 'rgba(255,255,255,0.05)';
              strokeColor = t.status === 'COOKING' ? 'var(--color-crimson)' : 'rgba(255,255,255,0.2)';
            }

            shape.setAttribute('stroke', strokeColor);
            shape.setAttribute('fill', fillColor);
            shape.setAttribute('stroke-width', '2');
          }
        }
      });
    }

    function selectTable(id) {
      selectedId = id;
      const t = tablesData.find(item => item.id === id);
      if (!t) return;

      // Populate Overview Tab
      document.getElementById('insp-title').textContent = t.number;
      document.getElementById('insp-badge').textContent = t.status;
      document.getElementById('insp-badge').className = 'badge ' + (
        t.status === 'OCCUPIED' ? 'badge-copper' :
        t.status === 'BILL_REQUESTED' ? 'badge-amber' :
        t.status === 'RESERVED' ? 'badge-sky' : 'badge-sage'
      );
      document.getElementById('insp-bill').textContent = '₹' + ((t.activeBillMinor || 0) / 100).toFixed(2);
      document.getElementById('insp-capacity').textContent = t.capacity + ' Guests';
      document.getElementById('insp-section').textContent = t.section || 'Main Floor';
      document.getElementById('insp-server').textContent = t.serverName || 'Aman';
      document.getElementById('insp-turntime').textContent = (t.turnTimeMinutes || 0) + ' mins';
      document.getElementById('insp-locator').textContent = t.locator;
      document.getElementById('insp-diner-link').href = '/dine/' + t.locator;

      // Merged State Display
      const mergedBox = document.getElementById('insp-merged-box');
      if (t.mergedWithTableIds && t.mergedWithTableIds.length > 0) {
        mergedBox.style.display = 'block';
        document.getElementById('insp-merged-text').textContent = 'Linked with tables: ' + t.mergedWithTableIds.map(mid => 'T-' + (mid < 10 ? '0' + mid : mid)).join(', ');
      } else {
        mergedBox.style.display = 'none';
      }

      // Populate Layout Tab
      document.getElementById('geom-x').value = t.x;
      document.getElementById('geom-y').value = t.y;
      document.getElementById('geom-w').value = t.width;
      document.getElementById('geom-h').value = t.height;
      document.getElementById('geom-shape').value = t.shape || 'rectangle';

      // Fetch Authoritative Server-Derived Bill
      fetchAuthoritativeBill(t.id);

      // Render Seats
      renderSeatsTab(t);

      // Render Orders
      renderOrdersTab(t);

      refreshCanvasVisuals();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // High-Reliability Free 2D Pointer Dragging (Mouse & Touch)
    // ─────────────────────────────────────────────────────────────────────────
    function handleTablePointerDown(e, t) {
      isPointerDown = true;
      isDragging = false;
      dragTargetTable = t;
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      pointerStartX = clientX;
      pointerStartY = clientY;
      capturedPointerId = e.pointerId !== undefined ? e.pointerId : null;

      const svgPt = getSvgCoordinates(clientX, clientY);
      dragOffsetSvgX = svgPt.x - t.x;
      dragOffsetSvgY = svgPt.y - t.y;

      console.log('DRAG_EVENT_DOWN', t.id, clientX, clientY);

      if (e.pointerId && svg.setPointerCapture) {
        try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }

    svg.addEventListener('pointerdown', (e) => {
      const targetGroup = e.target.closest ? e.target.closest('.table-group') : null;
      if (!targetGroup) return;

      const id = parseInt(targetGroup.getAttribute('data-id'), 10);
      const t = tablesData.find(item => item.id === id);
      if (!t) return;

      handleTablePointerDown(e, t);
    });

    document.querySelectorAll('.table-group').forEach(group => {
      const id = parseInt(group.getAttribute('data-id'), 10);
      const t = tablesData.find(item => item.id === id);
      if (t) {
        group.addEventListener('pointerdown', (e) => handleTablePointerDown(e, t));
        group.addEventListener('mousedown', (e) => handleTablePointerDown(e, t));
        group.addEventListener('touchstart', (e) => handleTablePointerDown(e, t), { passive: false });
      }
    });

    function handlePointerMove(e) {
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      console.log('DRAG_EVENT_MOVE isDown=' + isPointerDown + ' clientX=' + clientX + ' clientY=' + clientY);

      if (!isPointerDown || !dragTargetTable) return;

      const dist = Math.hypot(clientX - pointerStartX, clientY - pointerStartY);
      if (!isDragging && dist >= 4) {
        isDragging = true;
        targetNode = document.getElementById('table-node-' + dragTargetTable.id);
        if (targetNode) targetNode.classList.add('dragging');
      }

      if (isDragging) {
        const svgPt = getSvgCoordinates(clientX, clientY);
        const rawX = svgPt.x - dragOffsetSvgX;
        const rawY = svgPt.y - dragOffsetSvgY;

        // 12px grid snapping
        const snapGrid = 12;
        const snapX = Math.round(rawX / snapGrid) * snapGrid;
        const snapY = Math.round(rawY / snapGrid) * snapGrid;

        // Boundary constraints
        const clampedX = Math.max(10, Math.min(940 - dragTargetTable.width - 10, snapX));
        const clampedY = Math.max(10, Math.min(620 - dragTargetTable.height - 10, snapY));

        console.log('DRAG_MOVE_CALC', 'rawX=' + Math.round(rawX), 'rawY=' + Math.round(rawY), 'clampedX=' + clampedX, 'clampedY=' + clampedY);

        dragTargetTable.x = clampedX;
        dragTargetTable.y = clampedY;

        // Update inspector values if selected
        if (dragTargetTable.id === selectedId) {
          const gx = document.getElementById('geom-x');
          const gy = document.getElementById('geom-y');
          if (gx) gx.value = clampedX;
          if (gy) gy.value = clampedY;
        }

        // Floating coordinates badge
        if (coordBadge) {
          coordBadge.style.display = 'block';
          coordBadge.style.left = (clientX - canvasContainer.getBoundingClientRect().left + 14) + 'px';
          coordBadge.style.top = (clientY - canvasContainer.getBoundingClientRect().top - 24) + 'px';
          coordBadge.textContent = 'Table ' + dragTargetTable.number + ' · X: ' + clampedX + ', Y: ' + clampedY;
        }

        refreshCanvasVisuals();
      }
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });

    function finishPointerAction(e) {
      if (!isPointerDown) return;

      if (capturedPointerId !== null && svg.releasePointerCapture) {
        try { svg.releasePointerCapture(capturedPointerId); } catch (err) {}
        capturedPointerId = null;
      }

      if (coordBadge) coordBadge.style.display = 'none';

      if (!isDragging && dragTargetTable) {
        // Pure click/tap: select table
        selectTable(dragTargetTable.id);
      } else if (isDragging && dragTargetTable) {
        // Drag completed
        hasUnsavedLayout = true;
        const saveBtn = document.getElementById('save-layout-btn');
        if (saveBtn) {
          saveBtn.classList.add('pulse');
          saveBtn.style.display = 'inline-flex';
        }
        selectTable(dragTargetTable.id);
      }

      if (dragTargetTable) {
        const node = document.getElementById('table-node-' + dragTargetTable.id);
        if (node) node.classList.remove('dragging');
      }

      isPointerDown = false;
      isDragging = false;
      dragTargetTable = null;
    }

    window.addEventListener('pointerup', finishPointerAction);
    window.addEventListener('mouseup', finishPointerAction);
    window.addEventListener('touchend', finishPointerAction);
    window.addEventListener('pointercancel', finishPointerAction);

    // ─────────────────────────────────────────────────────────────────────────
    // Layout Geometry & Zero-Reload Morphing
    // ─────────────────────────────────────────────────────────────────────────
    function updateSelectedGeometry() {
      const t = tablesData.find(item => item.id === selectedId);
      if (!t) return;
      t.x = Math.max(10, Math.min(940 - t.width - 10, parseInt(document.getElementById('geom-x').value, 10) || t.x));
      t.y = Math.max(10, Math.min(620 - t.height - 10, parseInt(document.getElementById('geom-y').value, 10) || t.y));
      t.width = Math.max(40, Math.min(300, parseInt(document.getElementById('geom-w').value, 10) || t.width));
      t.height = Math.max(40, Math.min(300, parseInt(document.getElementById('geom-h').value, 10) || t.height));

      const node = document.getElementById('table-node-' + t.id);
      if (node) {
        node.setAttribute('transform', 'translate(' + t.x + ', ' + t.y + ')');
        const shape = node.querySelector('.table-shape');
        if (shape) {
          if (t.shape === 'circle') {
            shape.setAttribute('cx', t.width / 2);
            shape.setAttribute('cy', t.height / 2);
            shape.setAttribute('r', t.width / 2 - 2);
          } else {
            shape.setAttribute('width', t.width);
            shape.setAttribute('height', t.height);
          }
        }
        const lbl = node.querySelector('.table-label');
        if (lbl) {
          lbl.setAttribute('x', t.width / 2);
          lbl.setAttribute('y', t.height / 2 - 2);
        }
        const sub = node.querySelector('.table-sub');
        if (sub) {
          sub.setAttribute('x', t.width / 2);
          sub.setAttribute('y', t.height / 2 + 14);
        }
      }
      refreshCanvasVisuals();
    }

    function updateSelectedShape(shape) {
      const t = tablesData.find(item => item.id === selectedId);
      if (!t) return;
      t.shape = shape;

      const node = document.getElementById('table-node-' + t.id);
      if (node) {
        const existingShape = node.querySelector('.table-shape');
        if (existingShape) {
          if (shape === 'circle') {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'table-shape');
            circle.setAttribute('cx', t.width / 2);
            circle.setAttribute('cy', t.height / 2);
            circle.setAttribute('r', t.width / 2 - 2);
            node.replaceChild(circle, existingShape);
          } else {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'table-shape');
            rect.setAttribute('width', t.width);
            rect.setAttribute('height', t.height);
            rect.setAttribute('rx', shape === 'booth' ? '14' : '8');
            node.replaceChild(rect, existingShape);
          }
        }
      }
      refreshCanvasVisuals();
      const saveBtn = document.getElementById('save-layout-btn');
      if (saveBtn) saveBtn.classList.add('pulse');
    }

    function getStaffHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      const token = (window.__STAFF_SESSION__ && window.__STAFF_SESSION__.token) || '';
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return headers;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Layout Persistence: POST /api/restaurant/floor/save
    // ─────────────────────────────────────────────────────────────────────────
    async function persistFloorLayout() {
      const saveBtn = document.getElementById('save-layout-btn');
      const feedback = document.getElementById('save-feedback');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      try {
        const res = await fetch('/api/restaurant/floor/save?branch=' + encodeURIComponent('${currentBranchId}') + '&floor=' + encodeURIComponent('${activeFloor.id}'), {
          method: 'POST',
          headers: getStaffHeaders(),
          credentials: 'same-origin',
          body: JSON.stringify({
            tables: tablesData,
            branchId: '${currentBranchId}',
            floorId: '${activeFloor.id}'
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          if (feedback) {
            feedback.textContent = '✓ Layout Saved';
            feedback.style.color = 'var(--color-sage)';
            feedback.style.display = 'inline-block';
            setTimeout(() => { feedback.style.display = 'none'; }, 3000);
          }
          if (saveBtn) saveBtn.classList.remove('pulse');
          hasUnsavedLayout = false;
          showToast('Floor layout saved successfully', 'success');
        } else {
          const errMsg = data.error || ('Server rejected save (HTTP ' + res.status + ')');
          if (feedback) {
            feedback.textContent = '✕ Save Failed';
            feedback.style.color = 'var(--color-crimson)';
            feedback.style.display = 'inline-block';
          }
          showToast('Save Failed: ' + errMsg, 'error');
        }
      } catch (err) {
        showToast('Network error saving layout: ' + err.message, 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Authoritative Bill & Settlement
    // ─────────────────────────────────────────────────────────────────────────
    let currentAuthoritativeBill = null;

    function onPaymentMethodChange(val) {
      const reasonGroup = document.getElementById('settle-reason-group');
      if (reasonGroup) {
        reasonGroup.style.display = (val === 'COMP' || val === 'VOID') ? 'block' : 'none';
      }
      const cashCalc = document.getElementById('settle-cash-calculator');
      if (cashCalc) {
        cashCalc.style.display = (val === 'CASH') ? 'flex' : 'none';
      }
    }

    function calculateChangeDue() {
      if (!currentAuthoritativeBill) return;
      const tenderedInput = document.getElementById('settle-cash-tendered');
      const changeEl = document.getElementById('settle-change-due');
      if (!tenderedInput || !changeEl) return;
      const tendered = parseFloat(tenderedInput.value) || 0;
      const totalDue = (currentAuthoritativeBill.totalMinor || 0) / 100;
      const change = Math.max(0, tendered - totalDue);
      changeEl.textContent = '₹' + change.toFixed(2);
      if (tendered > 0 && tendered < totalDue) {
        changeEl.style.color = 'var(--color-crimson)';
        changeEl.textContent = 'Short ₹' + (totalDue - tendered).toFixed(2);
      } else {
        changeEl.style.color = 'var(--color-sage)';
      }
    }

    async function fetchAuthoritativeBill(tableId) {
      const loader = document.getElementById('bill-loading-indicator');
      const itemsList = document.getElementById('bill-items-list');
      const subEl = document.getElementById('bill-subtotal');
      const taxEl = document.getElementById('bill-tax');
      const totEl = document.getElementById('bill-total');

      if (loader) loader.style.display = 'block';
      if (itemsList) itemsList.innerHTML = '';

      try {
        const res = await fetch('/api/restaurant/tables/' + tableId + '/bill');
        if (res.ok) {
          const data = await res.json();
          currentAuthoritativeBill = data;
          if (loader) loader.style.display = 'none';

          if (data.items && data.items.length > 0) {
            itemsList.innerHTML = data.items.map(it => \`
              <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0;">
                <span style="color: var(--color-linen);"><strong style="color: var(--color-copper);">\${it.quantity}×</strong> \${it.name}</span>
                <span style="font-family: var(--font-mono); color: var(--color-stone);">₹\${((it.priceMinor * it.quantity) / 100).toFixed(2)}</span>
              </div>
            \`).join('');
          } else {
            itemsList.innerHTML = '<div style="color: var(--color-stone); font-size: 11px; padding: 6px 0;">No active item charges recorded yet.</div>';
          }

          if (subEl) subEl.textContent = '₹' + ((data.subtotalMinor || 0) / 100).toFixed(2);
          if (taxEl) taxEl.textContent = '₹' + ((data.taxMinor || 0) / 100).toFixed(2);
          if (totEl) totEl.textContent = '₹' + ((data.totalMinor || 0) / 100).toFixed(2);
          calculateChangeDue();
        } else {
          if (loader) loader.textContent = 'Failed to load authoritative bill.';
        }
      } catch (err) {
        if (loader) loader.textContent = 'Network error fetching bill.';
      }
    }

    async function submitTableSettlement() {
      const t = tablesData.find(item => item.id === selectedId);
      if (!t) return;

      const method = document.getElementById('settle-payment-method').value;
      const reason = document.getElementById('settle-reason-input').value;
      const btn = document.getElementById('btn-settle-check');

      if ((method === 'COMP' || method === 'VOID') && !reason.trim()) {
        alert('A valid reason is required for Comp / Void authorization.');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Settling...';
      }

      try {
        const res = await fetch('/api/restaurant/tables/' + t.number + '/settle', {
          method: 'POST',
          headers: getStaffHeaders(),
          body: JSON.stringify({
            paymentMethod: method,
            reason: reason,
            branchId: '${currentBranchId}'
          })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast('Table settled & cleared successfully', 'success');
          t.status = 'AVAILABLE';
          t.activeBillMinor = 0;
          selectTable(selectedId);
          refreshCanvasVisuals();
        } else {
          showToast('Settlement Failed: ' + (data.error || 'Server error'), 'error');
        }
      } catch (err) {
        showToast('Network error submitting settlement: ' + err.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Settle Check & Vacate Table';
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Table Actions & Status
    // ─────────────────────────────────────────────────────────────────────────
    async function markTableStatus(status) {
      const t = tablesData.find(item => item.id === selectedId);
      if (!t) return;
      try {
        const res = await fetch('/api/restaurant/tables/' + selectedId, {
          method: 'PATCH',
          headers: getStaffHeaders(),
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          const data = await res.json();
          t.status = data.table.status;
          selectTable(selectedId);
          showToast('Table ' + t.number + ' status updated to ' + status, 'success');
        } else {
          showToast('Failed to update table status', 'error');
        }
      } catch (err) {
        showToast('Error updating status: ' + err.message, 'error');
      }
    }

    // Merging
    async function mergeCurrentTable() {
      const targetSelect = document.getElementById('merge-target-select');
      const targetId = parseInt(targetSelect.value, 10);
      if (!targetId || targetId === selectedId) return;

      try {
        const res = await fetch('/api/restaurant/tables/merge', {
          method: 'POST',
          headers: getStaffHeaders(),
          body: JSON.stringify({ tableId1: selectedId, tableId2: targetId })
        });
        if (res.ok) {
          showToast('Tables merged successfully', 'success');
          location.reload();
        } else {
          showToast('Failed to merge tables', 'error');
        }
      } catch (err) {
        showToast('Network error merging tables', 'error');
      }
    }

    async function unmergeCurrentTable() {
      if (!selectedId) return;
      try {
        const res = await fetch('/api/restaurant/tables/unmerge', {
          method: 'POST',
          headers: getStaffHeaders(),
          body: JSON.stringify({ tableId: selectedId })
        });
        if (res.ok) {
          showToast('Tables unmerged successfully', 'success');
          location.reload();
        } else {
          showToast('Failed to unmerge table', 'error');
        }
      } catch (err) {
        showToast('Network error unmerging table', 'error');
      }
    }

    // Capacity Modal
    let pendingModalCapacity = 4;
    function promptEditCapacity() {
      const t = tablesData.find(item => item.id === selectedId);
      if (!t) return;
      const modal = document.getElementById('capacity-modal');
      const input = document.getElementById('modal-capacity-input');
      input.value = t.capacity;
      modal.style.display = 'flex';
    }
    function closeSeatCapacityModal() {
      document.getElementById('capacity-modal').style.display = 'none';
    }
    async function saveModalCapacity() {
      const t = tablesData.find(item => item.id === selectedId);
      if (!t) return;
      const newCap = parseInt(document.getElementById('modal-capacity-input').value, 10);
      if (!newCap || newCap < 1) return;

      try {
        const res = await fetch('/api/restaurant/tables/' + selectedId, {
          method: 'PATCH',
          headers: getStaffHeaders(),
          body: JSON.stringify({ capacity: newCap })
        });
        if (res.ok) {
          const data = await res.json();
          t.capacity = data.table.capacity;
          t.seats = data.table.seats;
          closeSeatCapacityModal();
          selectTable(selectedId);
          showToast('Table capacity updated', 'success');
        } else {
          showToast('Failed to update capacity', 'error');
        }
      } catch (err) {
        showToast('Error updating capacity', 'error');
      }
    }

    // Seats Tab Rendering
    function renderSeatsTab(t) {
      const rowEl = document.getElementById('seats-diagram-row');
      const listEl = document.getElementById('seats-list');
      if (!rowEl || !listEl) return;

      if (!t.seats || t.seats.length === 0) {
        rowEl.innerHTML = '<span style="color:var(--color-stone);font-size:11px;">No individual seats configured</span>';
        listEl.innerHTML = '<div style="color:var(--color-stone);font-size:11px;">Click "+ Add Seat" to configure physical seating.</div>';
        return;
      }

      rowEl.innerHTML = t.seats.map(s => {
        const sName = s.name || ('Seat ' + (s.number || s.id || '1'));
        const sAbbr = sName.replace('Seat ', 'S');
        return \`
        <div style="width:28px;height:28px;border-radius:50%;background:\${s.isOccupied ? 'var(--color-copper)' : 'rgba(255,255,255,0.06)'};border:1px solid \${s.isOccupied ? 'var(--color-copper)' : 'var(--border-strong)'};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#FFF;" title="\${sName}: \${s.isOccupied ? 'Occupied' : 'Free'}">
          \${sAbbr}
        </div>\`;
      }).join('');

      listEl.innerHTML = t.seats.map(s => {
        const sName = s.name || ('Seat ' + (s.number || s.id || '1'));
        return \`
        <div style="background:var(--color-elevated);border:1px solid var(--border-subtle);border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--color-linen);">\${sName}</div>
            <div style="font-size:10px;color:\${s.isOccupied ? 'var(--color-copper)' : 'var(--color-sage)'};">\${s.isOccupied ? 'Seated: ' + (s.guestName || 'Guest') : 'Available'}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="removeSeatFromCurrentTable('\${s.id}')" style="font-size:10px;color:var(--color-crimson);">✕ Remove</button>
        </div>\`;
      }).join('');
    }

    async function addSeatToCurrentTable() {
      if (!selectedId) return;
      const t = tablesData.find(item => item.id === selectedId);
      if (!t) return;
      const nextNum = (t.seats?.length || 0) + 1;
      try {
        const res = await fetch('/api/restaurant/tables/' + selectedId + '/seats', {
          method: 'POST',
          headers: getStaffHeaders(),
          body: JSON.stringify({ name: 'Seat ' + nextNum })
        });
        if (res.ok) {
          const data = await res.json();
          t.seats = data.table.seats;
          t.capacity = data.table.capacity;
          selectTable(selectedId);
          showToast('Seat added to table', 'success');
        } else {
          showToast('Failed to add seat', 'error');
        }
      } catch (err) {
        showToast('Network error adding seat', 'error');
      }
    }

    async function removeSeatFromCurrentTable(seatId) {
      if (!selectedId) return;
      const t = tablesData.find(item => item.id === selectedId);
      if (!t) return;
      try {
        const res = await fetch('/api/restaurant/tables/' + selectedId + '/seats/' + seatId, {
          method: 'DELETE',
          headers: getStaffHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          t.seats = data.table.seats;
          t.capacity = data.table.capacity;
          selectTable(selectedId);
          showToast('Seat removed', 'success');
        } else {
          showToast('Failed to remove seat', 'error');
        }
      } catch (err) {
        showToast('Network error removing seat', 'error');
      }
    }

    // Orders Tab Rendering
    function renderOrdersTab(t) {
      const listEl = document.getElementById('table-orders-list');
      if (!listEl) return;
      const tableOrders = ordersData.filter(o => o.tableNumber === t.number);
      if (tableOrders.length === 0) {
        listEl.innerHTML = '<div style="color:var(--color-stone);font-size:11px;padding:8px 0;">No active orders for this table.</div>';
        return;
      }
      listEl.innerHTML = tableOrders.map(o => \`
        <div style="background:var(--color-elevated);border:1px solid var(--border-default);border-radius:8px;padding:10px 12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:var(--color-linen);font-family:var(--font-mono);font-size:12px;">\${o.id || o.orderId}</strong>
            <span class="badge badge-copper" style="font-size:10px;">\${o.status}</span>
          </div>
          <div style="font-size:11px;color:var(--color-stone);margin-bottom:6px;">
            \${(o.items || []).map(it => it.quantity + '× ' + it.name).join(' · ')}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-subtle);padding-top:6px;font-size:11px;">
            <span style="color:var(--color-stone);">Total: <strong style="color:var(--color-copper);">₹\${((o.totalMinor || 0) / 100).toFixed(2)}</strong></span>
            <span style="font-family:var(--font-mono);color:var(--color-muted);">\${o.createdAt || ''}</span>
          </div>
        </div>
      \`).join('');
    }

    // Zoom Controls
    function zoomCanvas(delta) {
      zoom = Math.max(0.6, Math.min(2.0, zoom + delta));
      svg.style.transform = 'scale(' + zoom + ')';
      document.getElementById('zoom-level').textContent = Math.round(zoom * 100) + '%';
    }
    function resetZoom() {
      zoom = 1.0;
      svg.style.transform = 'scale(1.0)';
      document.getElementById('zoom-level').textContent = '100%';
    }

    // Add Table
    function addNewTable() {
      const nextId = Math.max(...tablesData.map(t => t.id), 0) + 1;
      const newT = {
        id: nextId,
        number: 'T-' + (nextId < 10 ? '0' + nextId : nextId),
        section: '${activeFloor.name}',
        floorId: '${activeFloor.id}',
        branchId: '${currentBranchId}',
        capacity: 4,
        x: 120,
        y: 120,
        width: 64,
        height: 64,
        shape: 'rectangle',
        status: 'AVAILABLE',
        activeBillMinor: 0,
        locator: 'loc_' + (window.crypto?.randomUUID ? window.crypto.randomUUID().slice(0, 8) : Date.now().toString(36))
      };
      tablesData.push(newT);
      location.reload();
    }

    // Delete Table
    async function deleteCurrentTable() {
      if (!selectedId) return;
      if (!confirm('Are you sure you want to delete this table?')) return;
      try {
        const res = await fetch('/api/restaurant/tables/' + selectedId, {
          method: 'DELETE',
          headers: getStaffHeaders()
        });
        if (res.ok) {
          showToast('Table deleted', 'success');
          location.reload();
        } else {
          showToast('Failed to delete table', 'error');
        }
      } catch (err) {
        showToast('Network error deleting table', 'error');
      }
    }

    // Initial table selection
    if (selectedId) {
      selectTable(selectedId);
    }
  </script>`;
}
