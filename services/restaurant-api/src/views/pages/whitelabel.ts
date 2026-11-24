/**
 * 🪐 RestaurantOS Modern — R6 Settings, Custom Domain, GST & Payments (SCR-OPS-SETTINGS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'R6 · Settings brand, domain, GST, payments.png':
 * - Brand Card (Logo upload, Hex colour picker, Diner template switcher)
 * - Custom Domain Card (CNAME DNS verification, live DNS status badge, Check now action)
 * - GST & Invoicing Card (Verified GSTIN, invoice prefix format, tax invoice radio modes)
 * - Diner Payments Card (Razorpay direct merchant connect)
 * - Danger Zone (Export all data & 30-day scheduled restaurant deletion)
 */

import { TenantBrandConfig, BranchRecord } from '../../shared';

export function renderWhiteLabelWorkspace(
  brand: TenantBrandConfig,
  branches: BranchRecord[] = [],
  selectedBranchId = 'branch_ldh'
): string {
  const brandName = (brand as any).displayName || brand.restaurantName || 'Maxora Resto';

  return `
  <div class="settings-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 28px;">
    
    <!-- 1. Header -->
    <div>
      <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
        Settings
      </h1>
    </div>

    <!-- 2. Settings Grid (Row 1: Brand, Custom Domain, GST & Invoices) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px; align-items: stretch;">
      
      <!-- Card 1: Brand -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0;">
            Brand
          </h2>

          <!-- Logo Uploader -->
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; border-radius: 14px; background: #FB923C; color: #FFFFFF; font-weight: 800; font-size: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${brandName.charAt(0).toUpperCase()}
            </div>
            <div>
              <a href="#upload-logo" onclick="alert('Upload brand logo'); return false;" style="font-size: 13px; font-weight: 600; color: #2563EB; text-decoration: underline;">
                Upload logo
              </a>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Square PNG or SVG, at least 512 px
              </div>
            </div>
          </div>

          <!-- Brand Colour -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <span style="font-size: 13px; font-weight: 600; color: #0F172A;">Brand colour</span>
            <div style="display: flex; align-items: center; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 4px 12px;">
              <span style="width: 14px; height: 14px; border-radius: 999px; background: #FB923C;"></span>
              <span style="font-size: 12px; font-family: monospace; font-weight: 700; color: #0F172A;">#FB923C</span>
            </div>
          </div>

          <!-- Diner Template -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; font-weight: 600; color: #0F172A;">Diner template</span>
            <a href="/studio" style="font-size: 13px; font-weight: 600; color: #2563EB; text-decoration: none;">
              Saffron · <span style="text-decoration: underline;">change</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Card 2: Your Own Web Address (Custom Domain) -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
              Your own web address
            </h2>
            <span style="background: #FEF3C7; color: #D97706; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
              Waiting for DNS
            </span>
          </div>

          <input type="text" value="order.masalahouse.in" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none; margin-bottom: 16px;">

          <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">
            Add this record where you bought your domain:
          </div>

          <!-- DNS Records Box -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 12px 14px; font-size: 12px; display: flex; flex-direction: column; gap: 8px; font-family: monospace;">
            <div style="display: flex; justify-content: space-between; color: #64748B;">
              <span>Type</span>
              <span style="color: #0F172A; font-weight: 700;">CNAME</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748B;">Name</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #0F172A; font-weight: 700;">order</span>
                <button type="button" onclick="navigator.clipboard.writeText('order'); alert('Copied: order');" style="background: transparent; border: none; font-size: 11px; font-weight: 600; color: #2563EB; cursor: pointer;">Copy</button>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748B;">Value</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #0F172A; font-weight: 700;">edge.orbitox.io</span>
                <button type="button" onclick="navigator.clipboard.writeText('edge.orbitox.io'); alert('Copied: edge.orbitox.io');" style="background: transparent; border: none; font-size: 11px; font-weight: 600; color: #2563EB; cursor: pointer;">Copy</button>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
          <div style="font-size: 11px; color: #64748B;">
            Last checked 3 min ago · HTTPS is set up automatically
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="alert('Checking CNAME DNS resolution... Validated!')" style="padding: 7px 16px; font-size: 12px; border-radius: 9999px;">
            Check now
          </button>
        </div>
      </div>

      <!-- Card 3: GST & Invoices -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
              GST & invoices
            </h2>
            <span style="background: #ECFDF5; color: #059669; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
              GSTIN verified
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px;">GSTIN</label>
              <input type="text" value="29ABCDE1234F1Z5" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none;">
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px;">Invoice prefix</label>
              <input type="text" value="MH/25-26/" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none;">
            </div>
          </div>

          <div style="font-size: 12px; font-weight: 600; color: #0F172A; margin-bottom: 10px;">
            If a branch has no GSTIN
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
            <label style="display: flex; align-items: center; gap: 8px; color: #0F172A; cursor: pointer;">
              <input type="radio" name="gst_mode" checked style="accent-color: #000000;">
              <span>Don't issue tax invoices (safest)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; color: #64748B; cursor: pointer;">
              <input type="radio" name="gst_mode" style="accent-color: #000000;">
              <span>Issue a bill of supply</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; color: #64748B; cursor: pointer;">
              <input type="radio" name="gst_mode" style="accent-color: #000000;">
              <span>Issue a plain receipt</span>
            </label>
          </div>
        </div>

        <div style="font-size: 11px; color: #64748B; margin-top: 16px;">
          Check with your accountant before changing this.
        </div>
      </div>

    </div>

    <!-- 3. Diner Payments Card -->
    <div class="ui-card" style="padding: 28px; max-width: 600px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
          Diner payments
        </h2>
        <span style="background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
          Not connected
        </span>
      </div>

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 0 0 20px 0;">
        Let diners pay at the table with UPI or card. Money goes straight to your own Razorpay account; OrbitoX never holds it.
      </p>

      <div style="display: flex; align-items: center; gap: 16px;">
        <button type="button" class="btn btn-primary" onclick="alert('Connecting to Razorpay Merchant OAuth...')" style="padding: 9px 22px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
          Connect Razorpay
        </button>
        <span style="font-size: 12px; color: #64748B;">
          Until then: pay at counter
        </span>
      </div>
    </div>

    <!-- 4. Danger Zone -->
    <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 24px; padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 15px; font-weight: 800; color: #E11D48; margin-bottom: 4px;">
          Danger zone
        </div>
        <div style="font-size: 13px; color: #9F1239;">
          Download everything, or delete Masala House. Deletion waits 30 days and can be cancelled until then.
        </div>
      </div>

      <div style="display: flex; gap: 10px; align-items: center;">
        <button type="button" onclick="alert('Exporting signed Merkle archive of all tenant data...')" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; border-radius: 9999px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer;">
          Export all data
        </button>
        <button type="button" onclick="if(prompt('Type masala-house to confirm deletion:') === 'masala-house') alert('Tenant deletion scheduled in 30 days.');" style="background: #DC2626; border: none; color: #FFFFFF; border-radius: 9999px; padding: 9px 20px; font-size: 13px; font-weight: 600; cursor: pointer;">
          Delete restaurant...
        </button>
      </div>
    </div>

  </div>
  `;
}
