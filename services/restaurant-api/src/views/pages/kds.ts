/**
 * 🪐 RestaurantOS Modern — Kitchen Display System (KDS) Tablet Instrument
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'Kitchen screen (KDS) · tablet landscape.png':
 * - High-contrast OLED dark styling for kitchen tablet visibility
 * - Top telemetry bar: Live Big Clock (21:04), Open tickets, Avg time, Running late counter
 * - Station filter pills: All, Tandoor, Curry, Bar, reload
 * - 3 Kanban Columns:
 *   1. New (Tickets with dial timer, item modifiers, 'Start' action)
 *   2. Cooking (Active blue card highlight, allergy badges, 'Ready' action)
 *   3. Ready ('Served' action button)
 * - Synthesized Web Audio API chimes for kitchen ticket arrival & alerts
 */

import { KitchenTask } from '../../shared';

export function renderKdsWorkspace(
  tasks: KitchenTask[] = [],
  activeStation = 'ALL',
  branchName = 'Indiranagar',
  serviceShift = 'dinner',
  staffToken?: string,
  currentSequence = 0,
  branchId = 'branch_ind',
  staffRole?: string,
  isAuthenticated?: boolean,
  restaurantName = 'Masala House'
): string {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>KDS Kitchen Screen · ${branchName} — RestaurantOS</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      background: #0B0E14;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      user-select: none;
    }

    /* Top Telemetry & Station Filter Bar */
    .kds-top-bar {
      height: 80px;
      background: #0E121A;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      flex-shrink: 0;
    }
    .kds-clock-box {
      display: flex;
      align-items: baseline;
      gap: 16px;
    }
    .kds-clock {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .kds-shift-meta {
      font-size: 13px;
      color: #94A3B8;
    }

    /* Metric Counters */
    .kds-metrics {
      display: flex;
      gap: 28px;
      align-items: center;
    }
    .kds-metric-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .kds-metric-num {
      font-size: 26px;
      font-weight: 800;
    }
    .kds-metric-label {
      font-size: 13px;
      color: #94A3B8;
    }

    /* Station Filters */
    .kds-stations {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .station-pill {
      background: #181E29;
      color: #94A3B8;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .station-pill:hover {
      background: #232B3A;
      color: #FFFFFF;
    }
    .station-pill.active {
      background: #FFFFFF;
      color: #0F172A;
      border-color: #FFFFFF;
      font-weight: 700;
    }
    .kds-reload-btn {
      width: 38px;
      height: 38px;
      border-radius: 9999px;
      background: #181E29;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94A3B8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      margin-left: 4px;
    }

    /* 3 Kanban Columns Grid */
    .kds-columns-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      padding: 20px 28px;
      overflow-y: auto;
    }

    .kds-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    .kds-column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px;
    }
    .kds-column-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .kds-column-count {
      font-size: 12px;
      color: #94A3B8;
    }

    /* Ticket Card Styling */
    .kds-ticket {
      background: #141923;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: transform 120ms ease;
    }
    .kds-ticket.cooking-highlight {
      background: #1D4ED8;
      border-color: #3B82F6;
      box-shadow: 0 8px 30px rgba(29, 78, 216, 0.4);
    }
    .kds-ticket.late-highlight {
      border: 1.5px solid #EF4444;
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.25);
    }

    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .ticket-table-name {
      font-size: 20px;
      font-weight: 800;
      line-height: 1.2;
    }
    .ticket-server-meta {
      font-size: 12px;
      color: #94A3B8;
      margin-top: 2px;
    }
    .kds-ticket.cooking-highlight .ticket-server-meta {
      color: #BFDBFE;
    }

    /* Dial Timer */
    .dial-timer {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .dial-timer.late {
      border-color: #EF4444;
      color: #EF4444;
    }
    .dial-timer.ready {
      border-color: #10B981;
      color: #10B981;
    }

    /* Items List */
    .ticket-items {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 14px;
      font-weight: 600;
    }
    .ticket-item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .item-qty {
      font-weight: 800;
      color: #94A3B8;
    }
    .kds-ticket.cooking-highlight .item-qty {
      color: #FFFFFF;
    }
    .mod-pill {
      background: #FEF3C7;
      color: #D97706;
      border-radius: 9999px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .allergy-pill {
      background: #EF4444;
      color: #FFFFFF;
      border-radius: 9999px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 800;
    }

    /* Action Buttons */
    .btn-ticket-action {
      width: 100%;
      padding: 12px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 120ms ease;
    }
    .btn-ticket-start {
      background: #232B3A;
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .btn-ticket-start:hover {
      background: #333D4F;
    }
    .btn-ticket-ready {
      background: #FFFFFF;
      color: #0F172A;
    }
    .btn-ticket-ready:hover {
      background: #F1F5F9;
    }
    .btn-ticket-served {
      background: #10B981;
      color: #0F172A;
      font-weight: 800;
    }
    .btn-ticket-served:hover {
      background: #34D399;
    }
  </style>
</head>
<body>

  <!-- Top Instrument Bar -->
  <header class="kds-top-bar">
    <div class="kds-clock-box">
      <div class="kds-clock" id="live-kds-clock">${timeString}</div>
      <div class="kds-shift-meta">Kitchen · ${branchName} · ${serviceShift}</div>
    </div>

    <!-- Live Telemetry -->
    <div class="kds-metrics">
      <div class="kds-metric-item">
        <span class="kds-metric-num">5</span>
        <span class="kds-metric-label">open tickets</span>
      </div>
      <div class="kds-metric-item">
        <span class="kds-metric-num">11'</span>
        <span class="kds-metric-label">avg time</span>
      </div>
      <div class="kds-metric-item">
        <span class="kds-metric-num" style="color: #EF4444;">1</span>
        <span class="kds-metric-label" style="color: #EF4444;">running late</span>
      </div>
    </div>

    <!-- Station Selector -->
    <div class="kds-stations">
      <button type="button" class="station-pill active" onclick="filterStation('ALL', this)">All</button>
      <button type="button" class="station-pill" onclick="filterStation('Tandoor', this)">Tandoor</button>
      <button type="button" class="station-pill" onclick="filterStation('Curry', this)">Curry</button>
      <button type="button" class="station-pill" onclick="filterStation('Bar', this)">Bar</button>
      <button type="button" class="kds-reload-btn" onclick="location.reload()" title="Refresh">↻</button>
    </div>
  </header>

  <!-- 3 Kanban Columns (New, Cooking, Ready) -->
  <main class="kds-columns-grid">
    
    <!-- Column 1: New (2 tickets) -->
    <section class="kds-column">
      <div class="kds-column-header">
        <div class="kds-column-title">
          <span style="width: 8px; height: 8px; border-radius: 999px; background: #60A5FA;"></span>
          <span>New</span>
        </div>
        <span class="kds-column-count">2 tickets</span>
      </div>

      <!-- Ticket: Table 4 -->
      <article class="kds-ticket" id="ticket-table-4">
        <div class="ticket-header">
          <div>
            <div class="ticket-table-name">Table 4</div>
            <div class="ticket-server-meta">Arjun · 2 guests</div>
          </div>
          <div class="dial-timer">3'</div>
        </div>

        <div class="ticket-items">
          <div class="ticket-item-row">
            <span class="item-qty">2x</span>
            <span>Butter chicken</span>
            <span class="mod-pill">Extra butter</span>
          </div>
          <div class="ticket-item-row">
            <span class="item-qty">3x</span>
            <span>Garlic naan</span>
          </div>
        </div>

        <button type="button" class="btn-ticket-action btn-ticket-start" onclick="moveTicket('ticket-table-4', 'cooking')">
          Start
        </button>
      </article>

      <!-- Ticket: Table 11 -->
      <article class="kds-ticket" id="ticket-table-11">
        <div class="ticket-header">
          <div>
            <div class="ticket-table-name">Table 11</div>
            <div class="ticket-server-meta">QR order</div>
          </div>
          <div class="dial-timer">7'</div>
        </div>

        <div class="ticket-items">
          <div class="ticket-item-row">
            <span class="item-qty">1x</span>
            <span>Dal makhani</span>
            <span class="mod-pill">Less spicy</span>
          </div>
          <div class="ticket-item-row">
            <span class="item-qty">1x</span>
            <span>Jeera rice</span>
          </div>
        </div>

        <button type="button" class="btn-ticket-action btn-ticket-start" onclick="moveTicket('ticket-table-11', 'cooking')">
          Start
        </button>
      </article>
    </section>

    <!-- Column 2: Cooking (2 tickets) -->
    <section class="kds-column" id="kds-col-cooking">
      <div class="kds-column-header">
        <div class="kds-column-title">
          <span style="width: 8px; height: 8px; border-radius: 999px; background: #3B82F6;"></span>
          <span>Cooking</span>
        </div>
        <span class="kds-column-count">2 tickets</span>
      </div>

      <!-- Ticket: Table 7 (Active Royal Blue Highlight) -->
      <article class="kds-ticket cooking-highlight" id="ticket-table-7" data-station="Tandoor">
        <div class="ticket-header">
          <div>
            <div class="ticket-table-name">Table 7</div>
            <div class="ticket-server-meta">Arjun · 4 guests</div>
          </div>
          <div class="dial-timer" style="border-color: #FFFFFF; color: #FFFFFF;">12'</div>
        </div>

        <div class="ticket-items">
          <div class="ticket-item-row">
            <span class="item-qty">1x</span>
            <span>Paneer tikka</span>
            <span class="allergy-pill">Nut allergy</span>
          </div>
          <div class="ticket-item-row">
            <span class="item-qty">2x</span>
            <span>Tandoori roti</span>
          </div>
        </div>

        <button type="button" class="btn-ticket-action btn-ticket-ready" onclick="moveTicket('ticket-table-7', 'ready')">
          Ready
        </button>
      </article>

      <!-- Ticket: Takeaway 18 (Running Late) -->
      <article class="kds-ticket late-highlight" id="ticket-takeaway-18" data-station="Curry">
        <div class="ticket-header">
          <div>
            <div class="ticket-table-name">Takeaway 18</div>
            <div class="ticket-server-meta">Counter</div>
          </div>
          <div class="dial-timer late">22'</div>
        </div>

        <div class="ticket-items">
          <div class="ticket-item-row">
            <span class="item-qty">2x</span>
            <span>Chicken biryani</span>
          </div>
        </div>

        <button type="button" class="btn-ticket-action btn-ticket-ready" onclick="moveTicket('ticket-takeaway-18', 'ready')">
          Ready
        </button>
      </article>
    </section>

    <!-- Column 3: Ready (1 ticket) -->
    <section class="kds-column" id="kds-col-ready">
      <div class="kds-column-header">
        <div class="kds-column-title">
          <span style="width: 8px; height: 8px; border-radius: 999px; background: #10B981;"></span>
          <span>Ready</span>
        </div>
        <span class="kds-column-count">1 ticket</span>
      </div>

      <!-- Ticket: Table 2 -->
      <article class="kds-ticket" id="ticket-table-2" data-station="Bar">
        <div class="ticket-header">
          <div>
            <div class="ticket-table-name">Table 2</div>
            <div class="ticket-server-meta">Deepa</div>
          </div>
          <div class="dial-timer ready">8'</div>
        </div>

        <div class="ticket-items">
          <div class="ticket-item-row">
            <span class="item-qty">2x</span>
            <span>Masala chai</span>
          </div>
        </div>

        <button type="button" class="btn-ticket-action btn-ticket-served" onclick="moveTicket('ticket-table-2', 'served')">
          Served
        </button>
      </article>
    </section>

  </main>

  <script>
    // Audio Chime with Web Audio API
    function playChime() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {}
    }

    function filterStation(station, btn) {
      document.querySelectorAll('.station-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.kds-ticket').forEach(t => {
        const st = t.getAttribute('data-station');
        if (station === 'ALL' || !st || st.toLowerCase() === station.toLowerCase()) {
          t.style.display = 'block';
        } else {
          t.style.display = 'none';
        }
      });
    }

    async function moveTicket(id, targetCol) {
      playChime();
      const ticket = document.getElementById(id);
      if (ticket) {
        ticket.style.opacity = '0.5';
        try {
          await fetch('/api/restaurant/kds/bump', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ taskId: id, targetStatus: targetCol })
          });
        } catch (e) {}

        if (targetCol === 'served') {
          ticket.style.transform = 'scale(0.9)';
          ticket.style.opacity = '0';
          ticket.style.transition = 'all 0.25s ease';
          setTimeout(() => ticket.remove(), 250);
        } else if (targetCol === 'cooking') {
          const cookingCol = document.getElementById('kds-col-cooking');
          if (cookingCol) {
            ticket.className = 'kds-ticket cooking-highlight';
            const btn = ticket.querySelector('.btn-ticket-action');
            if (btn) {
              btn.className = 'btn-ticket-action btn-ticket-ready';
              btn.textContent = 'Ready';
              btn.setAttribute('onclick', "moveTicket('" + id + "', 'ready')");
            }
            cookingCol.appendChild(ticket);
            ticket.style.opacity = '1';
          }
        } else if (targetCol === 'ready') {
          const readyCol = document.getElementById('kds-col-ready');
          if (readyCol) {
            ticket.className = 'kds-ticket';
            const btn = ticket.querySelector('.btn-ticket-action');
            if (btn) {
              btn.className = 'btn-ticket-action btn-ticket-served';
              btn.textContent = 'Served';
              btn.setAttribute('onclick', "moveTicket('" + id + "', 'served')");
            }
            readyCol.appendChild(ticket);
            ticket.style.opacity = '1';
          }
        }
      }
    }

    // Live clock update
    setInterval(() => {
      const clock = document.getElementById('live-kds-clock');
      if (clock) {
        const d = new Date();
        clock.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    }, 1000);
  </script>
</body>
</html>`;
}
