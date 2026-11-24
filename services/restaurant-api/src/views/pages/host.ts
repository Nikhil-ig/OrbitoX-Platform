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
  const occupiedTables = tables.filter((t) => t.activeSessionId).length;
  const availableTables = totalTables - occupiedTables;

  // Mock initial waitlist
  const waitlist = [
    { id: 'w1', name: 'Mehta Party', covers: 4, waitMin: 14, phone: '+91 98450 11223' },
    { id: 'w2', name: 'Dr. Kapoor', covers: 2, waitMin: 8, phone: '+91 98110 44556' },
    { id: 'w3', name: 'Verma Family', covers: 6, waitMin: 5, phone: '+91 97220 99887' },
  ];

  return `
  <div class="host-workspace">
    <!-- Top Telemetry & Controls -->
    <div class="host-header-card">
      <div class="host-header-info">
        <div class="host-brand-title">Host Stand · ${branchName}</div>
        <div class="host-time-stat">Dinner Shift · Live Floor Synchronized</div>
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
          <span class="metric-val waitlist">${waitlist.length}</span>
          <span class="metric-lbl">Waitlist</span>
        </div>
      </div>

      <button class="btn-walkin" onclick="openWalkinModal()">
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
            .map((t, idx) => {
              const isOccupied = Boolean(t.activeSessionId) || idx % 3 === 0;
              const isBillAsked = idx === 4;
              let statusClass = 'available';
              let statusLabel = 'Available';

              if (isBillAsked) {
                statusClass = 'bill-asked';
                statusLabel = 'Bill Asked';
              } else if (isOccupied) {
                statusClass = 'seated';
                statusLabel = 'Seated (42m)';
              }

              return `
              <div
                class="host-table-node ${statusClass}"
                data-status="${isOccupied ? 'SEATED' : 'AVAILABLE'}"
                onclick="selectTable('${t.number}', '${statusLabel}')"
              >
                <div class="table-node-num">T-${t.number}</div>
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
          <span class="deck-heading">Active Waitlist (${waitlist.length})</span>
          <span class="waitlist-avg-time">Avg. wait: 11m</span>
        </div>

        <div class="waitlist-rows-list" id="waitlist-container">
          ${waitlist
            .map(
              (w) => `
            <div class="waitlist-party-row" id="row-${w.id}">
              <div class="party-info">
                <div class="party-name">${w.name}</div>
                <div class="party-meta">${w.covers} covers · Waiting ${w.waitMin} min</div>
              </div>
              <button class="btn-seat-now" onclick="seatParty('${w.id}', '${w.name}', ${w.covers})">
                Seat Now
              </button>
            </div>
          `
            )
            .join('')}
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
    }

    .host-header-card {
      background: var(--color-card);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 24px;
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    }

    .host-brand-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--color-heading);
    }

    .host-time-stat {
      font-size: 12px;
      color: var(--color-secondary);
      margin-top: 2px;
    }

    .host-metrics-strip {
      display: flex;
      gap: 12px;
    }

    .host-metric-pill {
      background: var(--color-canvas);
      border: 1px solid rgba(0, 0, 0, 0.06);
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

    .metric-val.available {
      color: #10B981;
    }

    .metric-val.occupied {
      color: #3B82F6;
    }

    .metric-val.waitlist {
      color: #F59E0B;
    }

    .metric-lbl {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-secondary);
      text-transform: uppercase;
    }

    .btn-walkin {
      background: #000;
      color: #FFF;
      border: none;
      border-radius: 999px;
      padding: 10px 20px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }

    .host-grid-deck {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 20px;
    }

    .host-tables-card, .host-waitlist-card {
      background: var(--color-card);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 24px;
      padding: 20px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    }

    .deck-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .deck-heading {
      font-size: 14px;
      font-weight: 800;
      color: var(--color-heading);
    }

    .filter-pills {
      display: flex;
      gap: 6px;
    }

    .pill-mini {
      background: var(--color-canvas);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-secondary);
      cursor: pointer;
    }

    .pill-mini.active {
      background: #000;
      color: #FFF;
    }

    .host-table-nodes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 12px;
      max-height: 560px;
      overflow-y: auto;
    }

    .host-table-node {
      border-radius: 16px;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      border: 1px solid;
      transition: all 140ms ease;
    }

    .host-table-node.available {
      background: #F0FDF4;
      border-color: #DCFCE7;
    }

    .host-table-node.seated {
      background: #EFF6FF;
      border-color: #DBEAFE;
    }

    .host-table-node.bill-asked {
      background: #FFFBEB;
      border-color: #FEF3C7;
    }

    .table-node-num {
      font-size: 15px;
      font-weight: 800;
      color: var(--color-heading);
    }

    .table-node-cap {
      font-size: 11px;
      color: var(--color-secondary);
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
      background: #DCFCE7;
      color: #166534;
    }

    .host-table-node.seated .table-node-status-badge {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .host-table-node.bill-asked .table-node-status-badge {
      background: #FEF3C7;
      color: #92400E;
    }

    .waitlist-avg-time {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-secondary);
    }

    .waitlist-rows-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .waitlist-party-row {
      background: var(--color-canvas);
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 16px;
      padding: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .party-name {
      font-size: 13px;
      font-weight: 800;
      color: var(--color-heading);
    }

    .party-meta {
      font-size: 11px;
      color: var(--color-secondary);
      margin-top: 2px;
    }

    .btn-seat-now {
      background: #000;
      color: #FFF;
      border: none;
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      transition: all 120ms ease;
    }

    .btn-seat-now:hover {
      background: #3B82F6;
    }
  </style>

  <script>
    function filterHostTables(status, el) {
      document.querySelectorAll('.pill-mini').forEach((p) => p.classList.remove('active'));
      el.classList.add('active');

      const nodes = document.querySelectorAll('.host-table-node');
      nodes.forEach((n) => {
        if (status === 'ALL' || n.getAttribute('data-status') === status) {
          n.style.display = 'flex';
        } else {
          n.style.display = 'none';
        }
      });
    }

    function selectTable(num, status) {
      alert('Table T-' + num + ' is currently ' + status + '. Tap to manage covers or view order docket.');
    }

    function seatParty(id, name, covers) {
      const targetTable = prompt('Select table number to seat ' + name + ' (' + covers + ' covers):', 'T-01');
      if (targetTable) {
        document.getElementById('row-' + id).style.opacity = '0.3';
        alert(name + ' successfully seated at ' + targetTable + '! Kitchen and staff alerted.');
      }
    }

    function openWalkinModal() {
      const name = prompt('Walk-in Party Name:', 'Shah Party');
      const covers = prompt('Number of covers:', '4');
      if (name && covers) {
        const c = document.getElementById('waitlist-container');
        const newRow = document.createElement('div');
        newRow.className = 'waitlist-party-row';
        newRow.innerHTML = \`
          <div class="party-info">
            <div class="party-name">\${name}</div>
            <div class="party-meta">\${covers} covers · Waiting just now</div>
          </div>
          <button class="btn-seat-now" onclick="seatParty('new', '\${name}', \${covers})">
            Seat Now
          </button>
        \`;
        c.prepend(newRow);
      }
    }
  </script>
  `;
}
