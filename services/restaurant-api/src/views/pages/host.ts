/**
 * 🪐 RestaurantOS Modern — Dedicated Host Stand & Waitlist Station (SCR-OPS-HOST)
 * ─────────────────────────────────────────────────────────────────────────────
 * Tablet portrait layout matching 'Host stand · tablet portrait.png':
 * - Top telemetry bar: Covers seated, capacity percentage, active waitlist count
 * - Live floor plan matrix with instant seating status (Available, Seated, Bill Asked, Dirty)
 * - Waiting parties queue with 1-tap 'Seat Now' assignment
 */

import { TableFloorRecord, BranchRecord } from '../../shared';
import { icon } from '../icons';

export function renderHostStand(
  tables: TableFloorRecord[],
  branches: BranchRecord[],
  currentBranchId: string,
  tenantName = 'RestaurantOS'
): string {
  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];
  const branchName = currentBranch ? currentBranch.name : 'Main Dining';

  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => Boolean(t.activeSessionId) || t.status === 'OCCUPIED' || t.status === 'BILL_REQUESTED').length;
  const availableTables = totalTables - occupiedTables;

  // Active session waitlist state (can be appended live via Walk-in Party modal)
  const waitlist: Array<{ id: string; name: string; covers: number; waitMin: number; phone?: string }> = [];

  return `
  <div class="host-workspace">
    <!-- Top Telemetry & Controls -->
    <div class="host-header-card">
      <div class="host-header-info">
        <div class="host-brand-title">Host Stand · ${branchName}</div>
        <div class="host-time-stat">${tenantName} · Live Floor Synchronized</div>
      </div>

      <div class="host-metrics-strip">
        <div class="host-metric-pill">
          <span class="metric-val available">${availableTables}</span>
          <span class="metric-lbl">Available</span>
        </div>
        <div class="host-metric-pill">
          <span class="metric-val occupied">${occupiedTables}</span>
          <span class="metric-lbl">Seated</span>
        </div>
        <div class="host-metric-pill">
          <span class="metric-val waitlist" id="waitlist-count">${waitlist.length}</span>
          <span class="metric-lbl">Waitlist</span>
        </div>
      </div>

      <button type="button" class="btn-walkin" onclick="openWalkinModal()">
        + Walk-in Party
      </button>
    </div>

    <!-- Main Dual Deck: Tables Matrix + Waitlist -->
    <div class="host-grid-deck">
      <!-- Floor Tables Grid -->
      <div class="host-tables-card">
        <div class="deck-title-bar">
          <span class="deck-heading">Live Tables (${tables.length})</span>
          <div class="filter-pills">
            <span class="pill-mini active" onclick="filterHostTables('ALL', this)">All</span>
            <span class="pill-mini" onclick="filterHostTables('AVAILABLE', this)">Available</span>
            <span class="pill-mini" onclick="filterHostTables('SEATED', this)">Seated</span>
          </div>
        </div>

        <div class="host-table-nodes-grid" id="host-table-nodes">
          ${tables
      .map((t) => {
        const isOccupied = Boolean(t.activeSessionId) || t.status === 'OCCUPIED';
        const isBillAsked = t.status === 'BILL_REQUESTED';
        let statusClass = 'available';
        let statusLabel = 'Available';
        let filterStatus = 'AVAILABLE';

        if (isBillAsked) {
          statusClass = 'bill-asked';
          statusLabel = 'Bill Asked';
          filterStatus = 'SEATED';
        } else if (isOccupied) {
          statusClass = 'seated';
          statusLabel = 'Seated';
          filterStatus = 'SEATED';
        }

        const displayNum = String(t.number || '').startsWith('T-') ? t.number : `T-${t.number}`;

        return `
              <div
                class="host-table-node ${statusClass}"
                data-table-number="${t.number}"
                data-status="${filterStatus}"
                onclick="selectTable('${t.number}', '${statusLabel}', this)"
              >
                <div class="table-node-num">${displayNum}</div>
                <div class="table-node-cap">${t.capacity} covers</div>
                <div class="table-node-status-badge">${statusLabel}</div>
              </div>
            `;
      })
      .join('')}
        </div>
      </div>

      <!-- Active Waitlist Panel -->
      <div class="host-waitlist-card">
        <div class="deck-title-bar">
          <span class="deck-heading">Walk-in Queue</span>
          <span class="waitlist-avg-time" id="selected-table-indicator">Select an available table</span>
        </div>

        <div class="waitlist-rows-list" id="waitlist-container">
          <div id="waitlist-empty" style="text-align: center; padding: 28px 14px; color: var(--color-secondary); font-size: 13px; line-height: 1.5;">
            No parties waiting. Tap <strong>+ Walk-in Party</strong> to register guests or tap an available table to seat immediately.
          </div>
        </div>
      </div>
    </div>
  </div>

  <style>
    .host-workspace {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
      background: #0D1017;
      border-radius: 28px;
      padding: 24px;
      color: #F8FAFC;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .host-header-card {
      background: #141923;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .host-metrics-strip {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .host-grid-deck {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 20px;
    }

    @media (max-width: 900px) {
      .host-grid-deck {
        grid-template-columns: 1fr;
      }
    }

    .host-brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #F8FAFC;
    }

    .host-time-stat {
      font-size: 12px;
      color: #94A3B8;
      margin-top: 2px;
    }

    .host-metric-pill {
      background: #0D1017;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric-val {
      font-size: 14px;
      font-weight: 800;
    }

    .metric-val.available { color: #34D399; }
    .metric-val.occupied { color: #60A5FA; }
    .metric-val.waitlist { color: #FBBF24; }

    .metric-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #94A3B8;
      text-transform: uppercase;
    }

    .btn-walkin {
      background: #2563EB;
      color: #FFF;
      border: none;
      border-radius: 999px;
      padding: 10px 20px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
    }

    .host-tables-card, .host-waitlist-card {
      background: #141923;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 20px;
    }

    .deck-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-wrap: wrap;
      gap: 8px;
    }

    .deck-heading {
      font-size: 14px;
      font-weight: 800;
      color: #F8FAFC;
    }

    .filter-pills {
      display: flex;
      gap: 6px;
    }

    .pill-mini {
      background: #0D1017;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      color: #94A3B8;
      cursor: pointer;
    }

    .pill-mini.active {
      background: #FFFFFF;
      color: #0F172A;
    }

    .host-table-nodes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
      max-height: 560px;
      overflow-y: auto;
    }

    .host-table-node {
      border-radius: 18px;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      border: 1.5px dashed rgba(52, 211, 153, 0.4);
      background: #0D1017;
      transition: all 140ms ease;
    }

    .host-table-node.available {
      background: rgba(16, 185, 129, 0.06);
      border: 1.5px dashed rgba(52, 211, 153, 0.45);
    }

    .host-table-node.seated {
      background: #1D4ED8;
      border: 1.5px solid #3B82F6;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
    }

    .host-table-node.bill-asked {
      background: rgba(245, 158, 11, 0.16);
      border: 1.5px solid #F59E0B;
    }

    .table-node-num {
      font-size: 15px;
      font-weight: 800;
      color: #F8FAFC;
    }

    .table-node-cap {
      font-size: 11px;
      color: #CBD5E1;
    }

    .table-node-status-badge {
      font-size: 10px;
      font-weight: 800;
      border-radius: 999px;
      padding: 2px 8px;
      margin-top: 4px;
      text-transform: uppercase;
    }

    .host-table-node.available .table-node-status-badge {
      background: rgba(16, 185, 129, 0.18);
      color: #34D399;
    }

    .host-table-node.seated .table-node-status-badge {
      background: rgba(255, 255, 255, 0.18);
      color: #FFFFFF;
    }

    .host-table-node.bill-asked .table-node-status-badge {
      background: rgba(245, 158, 11, 0.25);
      color: #FCD34D;
    }

    .waitlist-avg-time {
      font-size: 11px;
      font-weight: 700;
      color: #94A3B8;
    }

    .waitlist-rows-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .waitlist-party-row {
      background: #0D1017;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .party-name {
      font-size: 13px;
      font-weight: 800;
      color: #F8FAFC;
    }

    .party-meta {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 2px;
    }

    .btn-seat-now {
      background: #2563EB;
      color: #FFF;
      border: none;
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
    }
  </style>

  <!-- Walk-in Party Modal -->
  <div id="walkin-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;">
    <div style="background: #FFFFFF; border-radius: 24px; padding: 32px; width: 400px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.06);">
      <h3 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">Register Walk-In Party</h3>
      <p style="font-size: 13px; color: #64748B; margin-bottom: 20px;">Add guests to waitlist or seat immediately.</p>
      
      <form id="walkin-form" onsubmit="submitWalkin(event)">
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Party Name</label>
          <input type="text" id="walkin-name" required placeholder="e.g. Verma Family" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 14px; outline: none; box-sizing: border-box;" />
        </div>
        
        <div style="margin-bottom: 24px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Covers (Guests)</label>
          <input type="number" id="walkin-covers" required min="1" max="24" value="4" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 14px; outline: none; box-sizing: border-box;" />
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="closeWalkinModal()" class="btn btn-secondary" style="border-radius: 9999px; padding: 9px 20px; font-size: 13px; font-weight: 600;">Cancel</button>
          <button type="submit" class="btn btn-primary" style="border-radius: 9999px; padding: 9px 24px; font-size: 13px; font-weight: 600;">Add to Waitlist</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let selectedHostTable = '';

    function filterHostTables(status, el) {
      document.querySelectorAll('.pill-mini').forEach((p) => p.classList.remove('active'));
      if (el) el.classList.add('active');

      const nodes = document.querySelectorAll('.host-table-node');
      nodes.forEach((n) => {
        if (status === 'ALL' || n.getAttribute('data-status') === status) {
          n.style.display = 'flex';
        } else {
          n.style.display = 'none';
        }
      });
    }

    function selectTable(num, status, el) {
      selectedHostTable = num;
      document.querySelectorAll('.host-table-node').forEach((n) => {
        n.style.outline = 'none';
      });
      if (el) {
        el.style.outline = '2px solid #0F172A';
      }
      const ind = document.getElementById('selected-table-indicator');
      if (ind) {
        ind.textContent = 'Selected: ' + num + ' (' + status + ')';
      }
      if (window.showToast) {
        window.showToast(num + ' is ' + status + '. Select a walk-in party or Seat Now.', 'info');
      }
    }

    async function seatParty(id, name, covers) {
      const targetTable =
        selectedHostTable ||
        document.querySelector('.host-table-node[data-status="AVAILABLE"]')?.getAttribute('data-table-number');
      if (!targetTable) {
        if (window.showToast) window.showToast('No available table found to seat party.', 'error');
        return;
      }
      try {
        await window.apiFetch('/api/restaurant/sessions/join', {
          method: 'POST',
          body: { tableNumber: targetTable, guestName: name }
        });
        const row = document.getElementById('row-' + id);
        if (row) row.remove();
        const cntEl = document.getElementById('waitlist-count');
        if (cntEl) cntEl.textContent = String(document.querySelectorAll('.waitlist-party-row').length);
        if (window.showToast) {
          window.showToast(name + ' (' + covers + ' covers) seated at ' + targetTable, 'success');
        }
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        if (window.showToast) {
          window.showToast((err && err.message) || 'Unable to seat party right now.', 'error');
        }
      }
    }

    function openWalkinModal() {
      const nameInput = document.getElementById('walkin-name');
      const coversInput = document.getElementById('walkin-covers');
      if (nameInput) nameInput.value = '';
      if (coversInput) coversInput.value = '4';
      const modal = document.getElementById('walkin-modal');
      if (modal) modal.style.display = 'flex';
      setTimeout(() => nameInput && nameInput.focus(), 50);
    }

    function closeWalkinModal() {
      const modal = document.getElementById('walkin-modal');
      if (modal) modal.style.display = 'none';
    }

    function submitWalkin(e) {
      e.preventDefault();
      const nameEl = document.getElementById('walkin-name');
      const coversEl = document.getElementById('walkin-covers');
      const name = nameEl ? nameEl.value.trim() : '';
      const covers = coversEl ? coversEl.value.trim() : '';
      if (!name || !covers) return;

      const c = document.getElementById('waitlist-container');
      const emptyEl = document.getElementById('waitlist-empty');
      if (emptyEl) emptyEl.style.display = 'none';

      if (c) {
        const partyId = 'w_' + Date.now();
        const newRow = document.createElement('div');
        newRow.className = 'waitlist-party-row';
        newRow.id = 'row-' + partyId;

        const info = document.createElement('div');
        info.className = 'party-info';

        const pName = document.createElement('div');
        pName.className = 'party-name';
        pName.textContent = name;

        const pMeta = document.createElement('div');
        pMeta.className = 'party-meta';
        pMeta.textContent = covers + ' covers · Waiting just now';

        info.appendChild(pName);
        info.appendChild(pMeta);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-seat-now';
        btn.textContent = 'Seat Now';
        btn.addEventListener('click', () => seatParty(partyId, name, Number(covers)));

        newRow.appendChild(info);
        newRow.appendChild(btn);
        c.prepend(newRow);
      }

      const cntEl = document.getElementById('waitlist-count');
      if (cntEl) cntEl.textContent = String(document.querySelectorAll('.waitlist-party-row').length);

      closeWalkinModal();
      if (window.showToast) {
        window.showToast('Added ' + name + ' to walk-in queue.', 'success');
      }
    }
  </script>
  `;
}
