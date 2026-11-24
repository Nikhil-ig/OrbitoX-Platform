/**
 * 🪐 RestaurantOS Modern — Orders Docket Workspace (SCR-OPS-ORDERS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'Orders · desktop.png':
 * - Status filter tabs: Live, Completed, Cancelled
 * - Realtime order pipeline metric strip (12 in progress, 3 New, 5 Cooking, 2 Ready, 1 Late)
 * - Dynamic order docket cards with status badges, elapsed timers, items count, and tender amounts
 */

import { RestaurantOrder, BranchRecord, DEFAULT_BRANCHES } from '../../shared';

export function renderOrdersWorkspace(
  initialOrders: RestaurantOrder[] = [],
  branches: BranchRecord[] = DEFAULT_BRANCHES,
  currentBranchId?: string
): string {
  return `
  <div class="orders-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header: Meta, Title & Tabs -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          Indiranagar · tonight
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
          Orders
        </h1>
      </div>

      <!-- Live / Completed / Cancelled Tabs -->
      <div style="display: flex; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <button type="button" class="order-tab active" onclick="switchOrderTab('live', this)">
          Live
        </button>
        <button type="button" class="order-tab" onclick="switchOrderTab('completed', this)">
          Completed
        </button>
        <button type="button" class="order-tab" onclick="switchOrderTab('cancelled', this)">
          Cancelled
        </button>
      </div>
    </div>

    <!-- 2. Pipeline Summary Bar -->
    <div style="background: #FFFFFF; border-radius: 24px; border: 1px solid rgba(0,0,0,0.06); padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
      <div>
        <div style="font-size: 42px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; line-height: 1;">
          12
        </div>
        <div style="font-size: 13px; color: #64748B; margin-top: 6px; font-weight: 500;">
          orders in progress right now
        </div>
      </div>

      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <!-- 3 New -->
        <div style="background: #F1F5F9; border-radius: 18px; padding: 14px 20px; min-width: 90px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: #0F172A;">3</div>
          <div style="font-size: 11px; font-weight: 600; color: #64748B; margin-top: 2px;">New</div>
        </div>

        <!-- 5 Cooking (Solid Black Card) -->
        <div style="background: #111827; border-radius: 18px; padding: 14px 20px; min-width: 90px; text-align: center; color: #FFFFFF;">
          <div style="font-size: 22px; font-weight: 800;">5</div>
          <div style="font-size: 11px; font-weight: 600; color: #94A3B8; margin-top: 2px;">Cooking</div>
        </div>

        <!-- 2 Ready -->
        <div style="background: #F1F5F9; border-radius: 18px; padding: 14px 20px; min-width: 90px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: #0F172A;">2</div>
          <div style="font-size: 11px; font-weight: 600; color: #64748B; margin-top: 2px;">Ready</div>
        </div>

        <!-- 1 Running Late -->
        <div style="background: #FEE2E2; border-radius: 18px; padding: 14px 20px; min-width: 100px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: #DC2626;">1</div>
          <div style="font-size: 11px; font-weight: 600; color: #DC2626; margin-top: 2px;">Running late</div>
        </div>
      </div>
    </div>

    <!-- 3. Order Docket Cards Grid (Matching Orders desktop mockup) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
      
      <!-- Card 1: Table 7 (Cooking - Solid Black Card) -->
      <div style="background: #111827; color: #FFFFFF; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 20px; font-weight: 800;">Table 7</div>
            <span style="background: #FFFFFF; color: #111827; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">Cooking</span>
          </div>
          <div style="font-size: 12px; color: #94A3B8;">Arjun · 7 items · dine-in</div>

          <!-- Progress Segments -->
          <div style="display: flex; gap: 4px; margin: 16px 0;">
            <div style="flex: 1; height: 4px; background: #FFFFFF; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #FFFFFF; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #374151; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #374151; border-radius: 999px;"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 24px; font-weight: 800;">₹1,670</span>
          <span style="font-size: 12px; color: #94A3B8;">12 min</span>
        </div>
      </div>

      <!-- Card 2: Table 11 (New) -->
      <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">Table 11</div>
            <span style="background: #F1F5F9; color: #475569; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">New</span>
          </div>
          <div style="font-size: 12px; color: #64748B;">QR self-order · 2 items</div>

          <!-- Progress Segments -->
          <div style="display: flex; gap: 4px; margin: 16px 0;">
            <div style="flex: 1; height: 4px; background: #000000; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 999px;"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 24px; font-weight: 800; color: #0F172A;">₹640</span>
          <span style="font-size: 12px; color: #64748B;">1 min</span>
        </div>
      </div>

      <!-- Card 3: Takeaway 18 (Running Late - Red Accent) -->
      <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px; border: 1.5px solid #FCA5A5; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.08);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">Takeaway 18</div>
            <span style="background: #FEE2E2; color: #DC2626; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">Late</span>
          </div>
          <div style="font-size: 12px; color: #64748B;">Counter · 2 items</div>

          <!-- Progress Segments -->
          <div style="display: flex; gap: 4px; margin: 16px 0;">
            <div style="flex: 1; height: 4px; background: #EF4444; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #EF4444; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 999px;"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 24px; font-weight: 800; color: #0F172A;">₹798</span>
          <span style="font-size: 12px; font-weight: 700; color: #DC2626;">24 min</span>
        </div>
      </div>

      <!-- Card 4: Table 3 (Bill Asked) -->
      <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">Table 3</div>
            <span style="background: #000000; color: #FFFFFF; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">Bill asked</span>
          </div>
          <div style="font-size: 12px; color: #64748B;">Deepa · 9 items</div>

          <!-- Progress Segments -->
          <div style="display: flex; gap: 4px; margin: 16px 0;">
            <div style="flex: 1; height: 4px; background: #000000; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #000000; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #000000; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #000000; border-radius: 999px;"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 24px; font-weight: 800; color: #0F172A;">₹2,140</span>
          <span style="font-size: 12px; color: #64748B;">58 min</span>
        </div>
      </div>

      <!-- Card 5: Table 2 (Ready) -->
      <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">Table 2</div>
            <span style="background: #ECFDF5; color: #059669; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">Ready</span>
          </div>
          <div style="font-size: 12px; color: #64748B;">QR self-order · 2 items</div>

          <!-- Progress Segments -->
          <div style="display: flex; gap: 4px; margin: 16px 0;">
            <div style="flex: 1; height: 4px; background: #000000; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #000000; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 999px;"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 24px; font-weight: 800; color: #0F172A;">₹189</span>
          <span style="font-size: 12px; color: #64748B;">16 min</span>
        </div>
      </div>

      <!-- Card 6: Table 9 (New) -->
      <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 20px; font-weight: 800; color: #0F172A;">Table 9</div>
            <span style="background: #F1F5F9; color: #475569; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">New</span>
          </div>
          <div style="font-size: 12px; color: #64748B;">Arjun · 4 items</div>

          <!-- Progress Segments -->
          <div style="display: flex; gap: 4px; margin: 16px 0;">
            <div style="flex: 1; height: 4px; background: #000000; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 999px;"></div>
            <div style="flex: 1; height: 4px; background: #E2E8F0; border-radius: 999px;"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 24px; font-weight: 800; color: #0F172A;">₹1,060</span>
          <span style="font-size: 12px; color: #64748B;">just now</span>
        </div>
      </div>

    </div>

  </div>

  <style>
    .order-tab {
      background: transparent;
      border: none;
      border-radius: 9999px;
      padding: 7px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .order-tab:hover {
      color: #0F172A;
    }
    .order-tab.active {
      background: #000000;
      color: #FFFFFF;
    }
  </style>

  <script>
    function switchOrderTab(tab, btn) {
      document.querySelectorAll('.order-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  </script>
  `;
}
