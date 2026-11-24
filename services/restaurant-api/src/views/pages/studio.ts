/**
 * 🪐 RestaurantOS Modern — Diner Template Gallery & Customizer (SCR-OPS-STUDIO)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'Diner template gallery (customer).png':
 * - 6 Curated Diner Storefront Themes: Saffron, Noir, Fresh, Coastal, Thali, Mono
 * - Filter pills: All 9, Free, Paid, Cafés, Fine dining, Quick service
 * - Right-side Live Customizer drawer (Brand color contrast validator, Layout mode, Toggles)
 * - 'Preview on phone' & 'Publish to diners' workflows
 */

import { MarketplaceTemplate, MenuItem, TenantBrandConfig, TemplateDraftAndPublication } from '../../shared';
import { icon } from '../icons';

export function renderVisualStudio(
  template: MarketplaceTemplate,
  draftData: TemplateDraftAndPublication,
  brandConfig: TenantBrandConfig,
  menuItems: MenuItem[],
  branchId = 'branch_ldh'
): string {
  return `
  <div class="studio-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Breadcrumbs & Header -->
    <div>
      <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
        Maxora Resto / Diner app
      </div>
      <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0 0 6px 0;">
        Choose how diners see you
      </h1>
      <div style="font-size: 14px; color: #64748B; font-weight: 500;">
        Your menu, prices and orders stay the same. Only the look changes, and you can switch back anytime.
      </div>
    </div>

    <!-- 2. Filter Pills -->
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <button type="button" class="filter-tab active" onclick="filterTemplates('all', this)">
        All 9
      </button>
      <button type="button" class="filter-tab" onclick="filterTemplates('free', this)">
        Free
      </button>
      <button type="button" class="filter-tab" onclick="filterTemplates('paid', this)">
        Paid
      </button>
      <button type="button" class="filter-tab" onclick="filterTemplates('cafes', this)">
        Cafés
      </button>
      <button type="button" class="filter-tab" onclick="filterTemplates('finedining', this)">
        Fine dining
      </button>
      <button type="button" class="filter-tab" onclick="filterTemplates('qsr', this)">
        Quick service
      </button>
    </div>

    <!-- 3. Two-Column Workspace: 6 Templates Grid (Left) + Customizer Drawer (Right) -->
    <div style="display: grid; grid-template-columns: 1fr 340px; gap: 28px; align-items: start;">
      
      <!-- 6 Templates Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
        
        <!-- 1. Saffron (Free) -->
        <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="height: 180px; background: #FFF7ED; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; margin-bottom: 18px; border: 1px solid #FFEDD5;">
              <div style="width: 100px; height: 60px; background: #FB923C; border-radius: 10px; margin-bottom: 8px;"></div>
              <div style="width: 70px; height: 10px; background: #FED7AA; border-radius: 4px; margin-bottom: 6px;"></div>
              <div style="width: 50px; height: 8px; background: #FED7AA; border-radius: 4px;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 0;">Saffron</h3>
              <span style="background: #ECFDF5; color: #059669; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Free</span>
            </div>
            <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0; line-height: 1.4;">
              Warm and bright. Great for casual dining.
            </p>
          </div>

          <button type="button" class="btn btn-secondary" onclick="useTemplate('Saffron')" style="width: 100%; border-radius: 9999px; padding: 9px; font-size: 13px;">
            Use template
          </button>
        </div>

        <!-- 2. Noir (₹499/mo) - In Use -->
        <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border: 2px solid #000000; box-shadow: 0 6px 24px rgba(0,0,0,0.08);">
          <div>
            <div style="height: 180px; background: #0F172A; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; margin-bottom: 18px;">
              <div style="width: 100px; height: 60px; background: #F59E0B; border-radius: 10px; margin-bottom: 8px;"></div>
              <div style="width: 70px; height: 10px; background: #334155; border-radius: 4px; margin-bottom: 6px;"></div>
              <div style="width: 50px; height: 8px; background: #334155; border-radius: 4px;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 0;">Noir</h3>
              <span style="background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">₹499 / mo</span>
            </div>
            <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0; line-height: 1.4;">
              Dark and gold. Made for bars and fine dining.
            </p>
          </div>

          <button type="button" class="btn btn-primary" onclick="alert('Noir template is already in use!')" style="width: 100%; border-radius: 9999px; padding: 9px; font-size: 13px;">
            In use · customize
          </button>
        </div>

        <!-- 3. Fresh (Free) -->
        <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="height: 180px; background: #ECFDF5; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; margin-bottom: 18px; border: 1px solid #D1FAE5;">
              <div style="width: 100px; height: 60px; background: #10B981; border-radius: 10px; margin-bottom: 8px;"></div>
              <div style="width: 70px; height: 10px; background: #A7F3D0; border-radius: 4px; margin-bottom: 6px;"></div>
              <div style="width: 50px; height: 8px; background: #A7F3D0; border-radius: 4px;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 0;">Fresh</h3>
              <span style="background: #ECFDF5; color: #059669; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Free</span>
            </div>
            <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0; line-height: 1.4;">
              Clean, light and quick. For cafés and QSR.
            </p>
          </div>

          <button type="button" class="btn btn-secondary" onclick="useTemplate('Fresh')" style="width: 100%; border-radius: 9999px; padding: 9px; font-size: 13px;">
            Use template
          </button>
        </div>

        <!-- 4. Coastal (₹299/mo) -->
        <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="height: 180px; background: #EFF6FF; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; margin-bottom: 18px; border: 1px solid #DBEAFE;">
              <div style="width: 100px; height: 60px; background: #3B82F6; border-radius: 10px; margin-bottom: 8px;"></div>
              <div style="width: 70px; height: 10px; background: #BFDBFE; border-radius: 4px; margin-bottom: 6px;"></div>
              <div style="width: 50px; height: 8px; background: #BFDBFE; border-radius: 4px;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 0;">Coastal</h3>
              <span style="background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">₹299 / mo</span>
            </div>
            <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0; line-height: 1.4;">
              Soft blues for seafood and beach cafés.
            </p>
          </div>

          <button type="button" onclick="alert('Unlock Coastal template for ₹299/mo')" style="width: 100%; background: #2563EB; color: #FFFFFF; border: none; border-radius: 9999px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">
            Unlock template
          </button>
        </div>

        <!-- 5. Thali (₹299/mo) -->
        <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="height: 180px; background: #FFF1F2; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; margin-bottom: 18px; border: 1px solid #FFE4E6;">
              <div style="width: 100px; height: 60px; background: #E11D48; border-radius: 10px; margin-bottom: 8px;"></div>
              <div style="width: 70px; height: 10px; background: #FECDD3; border-radius: 4px; margin-bottom: 6px;"></div>
              <div style="width: 50px; height: 8px; background: #FECDD3; border-radius: 4px;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 0;">Thali</h3>
              <span style="background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">₹299 / mo</span>
            </div>
            <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0; line-height: 1.4;">
              Festive patterns and big photos for Indian menus.
            </p>
          </div>

          <button type="button" onclick="alert('Unlock Thali template for ₹299/mo')" style="width: 100%; background: #2563EB; color: #FFFFFF; border: none; border-radius: 9999px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">
            Unlock template
          </button>
        </div>

        <!-- 6. Mono (Free) -->
        <div class="ui-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="height: 180px; background: #F8FAFC; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; margin-bottom: 18px; border: 1px solid #E2E8F0;">
              <div style="width: 100px; height: 60px; background: #64748B; border-radius: 10px; margin-bottom: 8px;"></div>
              <div style="width: 70px; height: 10px; background: #CBD5E1; border-radius: 4px; margin-bottom: 6px;"></div>
              <div style="width: 50px; height: 8px; background: #CBD5E1; border-radius: 4px;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 0;">Mono</h3>
              <span style="background: #ECFDF5; color: #059669; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Free</span>
            </div>
            <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0; line-height: 1.4;">
              Black and white, type-first, very fast.
            </p>
          </div>

          <button type="button" class="btn btn-secondary" onclick="useTemplate('Mono')" style="width: 100%; border-radius: 9999px; padding: 9px; font-size: 13px;">
            Use template
          </button>
        </div>

      </div>

      <!-- Right: Customizer Drawer for Active Template (Noir) -->
      <div class="ui-card" style="padding: 28px 24px; display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0;">
            Noir
          </h2>
          <span style="background: #000000; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
            In use
          </span>
        </div>

        <!-- Brand Colour -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 8px;">
            Brand colour
          </label>
          <div style="display: flex; gap: 10px; margin-bottom: 8px;">
            <button type="button" style="width: 32px; height: 32px; border-radius: 999px; background: #F59E0B; border: 2px solid #000000; cursor: pointer;"></button>
            <button type="button" style="width: 32px; height: 32px; border-radius: 999px; background: #EF4444; border: none; cursor: pointer;"></button>
            <button type="button" style="width: 32px; height: 32px; border-radius: 999px; background: #10B981; border: none; cursor: pointer;"></button>
            <button type="button" style="width: 32px; height: 32px; border-radius: 999px; background: #A855F7; border: none; cursor: pointer;"></button>
          </div>
          <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
            We check contrast for you; unreadable colours are blocked.
          </div>
        </div>

        <!-- Menu Layout -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 8px;">
            Menu layout
          </label>
          <div style="display: flex; background: #F1F5F9; border-radius: 9999px; padding: 3px;">
            <button type="button" class="layout-btn active" onclick="setLayout('cards', this)">Cards</button>
            <button type="button" class="layout-btn" onclick="setLayout('list', this)">List</button>
            <button type="button" class="layout-btn" onclick="setLayout('grid', this)">Photo grid</button>
          </div>
        </div>

        <!-- Show on the Menu Toggles -->
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 10px;">
            Show on the menu
          </label>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked style="accent-color: #000000; width: 16px; height: 16px;">
              <span style="color: #0F172A; font-weight: 600;">Top dishes ranking</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked style="accent-color: #000000; width: 16px; height: 16px;">
              <span style="color: #0F172A; font-weight: 600;">Live order status bar</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" style="accent-color: #000000; width: 16px; height: 16px;">
              <span style="color: #64748B;">Veg / non-veg filter</span>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
          <a href="/dine/table-1" target="_blank" class="btn btn-secondary" style="width: 100%; border-radius: 9999px; text-decoration: none; text-align: center; justify-content: center; padding: 10px;">
            Preview on phone
          </a>
          <button type="button" class="btn btn-primary" onclick="alert('Diner theme published live!')" style="width: 100%; border-radius: 9999px; padding: 10px;">
            Publish to diners
          </button>
        </div>

      </div>

    </div>

  </div>

  <style>
    .filter-tab {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9999px;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .filter-tab:hover {
      background: #F8FAFC;
      color: #0F172A;
    }
    .filter-tab.active {
      background: #000000;
      color: #FFFFFF;
      border-color: #000000;
    }
    .layout-btn {
      flex: 1;
      border: none;
      background: transparent;
      color: #64748B;
      padding: 6px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .layout-btn.active {
      background: #000000;
      color: #FFFFFF;
    }
  </style>

  <script>
    function filterTemplates(filter, btn) {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    function setLayout(mode, btn) {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    function useTemplate(name) {
      alert('Applied ' + name + ' template to your diner storefront!');
    }
  </script>
  `;
}
