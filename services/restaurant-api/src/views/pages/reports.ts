/**
 * 🪐 RestaurantOS Modern — Reports & Business Intelligence (SCR-OPS-REPORTS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'Reports · desktop.png':
 * - Time switcher: Day, Week, Month
 * - Sales Hero card (₹3.4L, +20% vs last week, 7-day pin chart with Friday peak badge ₹67,400)
 * - 3 Lower Analytical Decks:
 *   1. Top dishes tonight leaderboard
 *   2. Busiest hours histogram with staff scheduling advisory
 *   3. Branch revenue split with average ticket size and dwell times
 */

import { RestaurantOrder, KitchenTask, TableFloorRecord } from '../../shared';
import { icon } from '../icons';

export function renderReportsWorkspace(
  orders: RestaurantOrder[] = [],
  tasks: KitchenTask[] = [],
  tables: TableFloorRecord[] = []
): string {
  return `
  <div class="reports-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header: Meta, Title & Time Switcher -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          Maxora Resto · both branches
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
          Reports
        </h1>
      </div>

      <!-- Day / Week / Month Switcher -->
      <div style="display: flex; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <button type="button" class="report-tab" onclick="switchReportTab('day', this)">
          Day
        </button>
        <button type="button" class="report-tab active" onclick="switchReportTab('week', this)">
          Week
        </button>
        <button type="button" class="report-tab" onclick="switchReportTab('month', this)">
          Month
        </button>
      </div>
    </div>

    <!-- 2. Sales Hero Card (₹3.4L, +20%, Pin Chart) -->
    <div class="ui-card" style="padding: 32px 36px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 24px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
          <div style="width: 28px; height: 28px; border-radius: 9999px; background: #F1F5F9; display: flex; align-items: center; justify-content: center;">
            ${icon('reports', { size: 14, color: '#0F172A' })}
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0;">
            Sales
          </h2>
        </div>
        <div style="font-size: 13px; color: #64748B; margin-left: 38px;">
          This week, including GST
        </div>

        <div style="margin-top: 32px;">
          <div style="font-size: 48px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; line-height: 1;">
            ₹3.4L
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #10B981; margin-top: 6px;">
            +20% vs last week
          </div>
        </div>
      </div>

      <!-- 7-Day Pin Bar Chart with Friday Peak Badge -->
      <div style="display: flex; gap: 32px; align-items: flex-end; padding-bottom: 8px;">
        ${[
          { day: 'M', height: 75 },
          { day: 'T', height: 60 },
          { day: 'W', height: 85 },
          { day: 'T', height: 95 },
          { day: 'F', height: 120, peak: '₹67,400' },
          { day: 'S', height: 110 },
          { day: 'S', height: 85 },
        ].map((col) => `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
            ${col.peak ? `
              <span style="background: #000000; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; white-space: nowrap; margin-bottom: -2px;">
                ${col.peak}
              </span>` : ''}
            <div style="width: 6px; height: ${col.height}px; background: #E2E8F0; border-radius: 999px; position: relative;">
              <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; border-radius: 999px; background: ${col.peak ? '#000000' : '#3B82F6'};"></div>
            </div>
            <span style="font-size: 12px; font-weight: 600; color: ${col.peak ? '#0F172A' : '#64748B'};">
              ${col.day}
            </span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 3. Three Analytical Cards Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
      
      <!-- Card 1: Top Dishes Tonight (Solid Black Container) -->
      <div style="background: #0F172A; color: #FFFFFF; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 18px;">
        <h3 style="font-size: 17px; font-weight: 700; color: #FFFFFF; margin: 0;">
          Top dishes
        </h3>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <!-- Rank 1: Butter Chicken -->
          <div style="background: #FFFFFF; color: #0F172A; border-radius: 9999px; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="width: 22px; height: 22px; border-radius: 999px; background: #000000; color: #FFFFFF; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                1
              </span>
              <span style="font-size: 13px; font-weight: 700;">Butter chicken</span>
            </div>
            <span style="font-size: 13px; font-weight: 800;">214</span>
          </div>

          <!-- Rank 2: Garlic Naan -->
          <div style="background: #1E293B; color: #FFFFFF; border-radius: 9999px; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="width: 22px; height: 22px; border-radius: 999px; background: #334155; color: #94A3B8; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                2
              </span>
              <span style="font-size: 13px; font-weight: 600;">Garlic naan</span>
            </div>
            <span style="font-size: 13px; font-weight: 700; color: #94A3B8;">402</span>
          </div>

          <!-- Rank 3: Dal Makhani -->
          <div style="background: #1E293B; color: #FFFFFF; border-radius: 9999px; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="width: 22px; height: 22px; border-radius: 999px; background: #334155; color: #94A3B8; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                3
              </span>
              <span style="font-size: 13px; font-weight: 600;">Dal makhani</span>
            </div>
            <span style="font-size: 13px; font-weight: 700; color: #94A3B8;">171</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Busiest Hours -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0;">
            Busiest hours
          </h3>

          <!-- Hours Histogram -->
          <div style="display: flex; gap: 10px; align-items: flex-end; height: 110px; padding-bottom: 8px;">
            ${[
              { hour: '12', h: 35, blue: false },
              { hour: '14', h: 55, blue: false },
              { hour: '16', h: 40, blue: false },
              { hour: '18', h: 80, blue: true },
              { hour: '20', h: 105, blue: true },
              { hour: '22', h: 65, blue: false },
            ].map((col) => `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="width: 100%; height: ${col.h}px; background: ${col.blue ? '#2563EB' : '#E2E8F0'}; border-radius: 8px;"></div>
                <span style="font-size: 11px; font-weight: 600; color: #64748B;">${col.hour}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="font-size: 12px; color: #64748B; margin-top: 14px;">
          Peak 8–10 pm. Consider an extra server on Fridays.
        </div>
      </div>

      <!-- Card 3: Branches Split -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 18px 0;">
            Branches
          </h3>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                <span>Indiranagar</span>
                <span style="font-weight: 700; color: #0F172A;">₹2.3L</span>
              </div>
              <div style="height: 6px; background: #000000; border-radius: 999px;"></div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                <span>Koramangala</span>
                <span style="font-weight: 700; color: #0F172A;">₹1.1L</span>
              </div>
              <div style="height: 6px; background: #93C5FD; border-radius: 999px;"></div>
            </div>
          </div>
        </div>

        <!-- Metrics Row -->
        <div style="display: flex; gap: 16px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #F1F5F9;">
          <div style="background: #F8FAFC; border-radius: 16px; padding: 12px 18px; flex: 1;">
            <div style="font-size: 22px; font-weight: 800; color: #0F172A;">₹642</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">avg. bill</div>
          </div>
          <div style="background: #F8FAFC; border-radius: 16px; padding: 12px 18px; flex: 1;">
            <div style="font-size: 22px; font-weight: 800; color: #0F172A;">48'</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">avg. stay</div>
          </div>
        </div>
      </div>

    </div>

  </div>

  <style>
    .report-tab {
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
    .report-tab:hover {
      color: #0F172A;
    }
    .report-tab.active {
      background: #000000;
      color: #FFFFFF;
    }
  </style>

  <script>
    function switchReportTab(tab, btn) {
      document.querySelectorAll('.report-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  </script>
  `;
}
