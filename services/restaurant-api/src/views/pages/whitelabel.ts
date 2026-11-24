/**
 * 🪐 RestaurantOS Modern — R6 Settings, Custom Domain, GST & Payments (SCR-OPS-SETTINGS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches 'R6 · Settings brand, domain, GST, payments.png' with live persistence:
 * - Brand Card (Logo upload, Hex colour picker, Diner template switcher)
 * - Custom Domain Card (CNAME DNS verification, live DNS status badge, Check now action)
 * - GST & Invoicing Card (Verified GSTIN, invoice prefix, unregistered mode selector + Save)
 * - Diner Payments Card (Razorpay merchant credentials config modal + status badge)
 * - Danger Zone (Real export & deletion workspace link)
 */

import { TenantBrandConfig, BranchRecord } from '../../shared';

function esc(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderWhiteLabelWorkspace(
  brand: TenantBrandConfig,
  branches: BranchRecord[] = [],
  selectedBranchId = 'branch_ldh'
): string {
  const brandName = (brand as any)?.displayName || brand?.restaurantName || 'RestaurantOS';
  const primaryColor = (brand as any)?.primaryColor || '#FB923C';
  const customDomain = brand?.customDomain || '';
  const gstin = (brand as any)?.gstin || '';
  const invoicePrefix = (brand as any)?.invoicePrefix || 'INV/25-26/';
  const unregisteredMode = (brand as any)?.unregisteredInvoiceMode || 'refuse';
  const activeTemplate = (brand?.activeTemplateId || 'tmpl_haute_gastronomy')
    .replace(/^tmpl_/, '')
    .replace(/_/g, ' ');
  const isDomainVerified = brand?.domainStatus === 'VERIFIED';
  const razorpayConfigured = Boolean((brand as any)?.razorpayKeyId);
  const controlPlaneUrl = process.env.ORBITOX_CONTROL_PLANE_URL || 'http://localhost:3005';

  return `
  <div class="settings-container" style="padding: 24px 32px 64px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 28px;">
    
    <!-- 1. Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
        Settings
      </h1>
      <button type="button" id="save-settings-btn" class="btn btn-primary" onclick="saveWhiteLabelSettings()" style="padding: 10px 22px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
        Save settings
      </button>
    </div>

    <!-- 2. Settings Grid (Row 1: Brand, Custom Domain, GST & Invoices) -->
    <div class="settings-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; align-items: stretch;">
      
      <!-- Card 1: Brand -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0;">
            Brand
          </h2>

          <!-- Logo Uploader -->
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; border-radius: 14px; background: ${esc(primaryColor)}; color: #FFFFFF; font-weight: 800; font-size: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${esc(brandName.charAt(0).toUpperCase())}
            </div>
            <div>
              <input type="file" id="logo-file-input" accept="image/png,image/svg+xml,image/jpeg" style="display: none;" onchange="uploadBrandLogo(this)" />
              <button type="button" onclick="document.getElementById('logo-file-input').click()" style="background: none; border: none; padding: 0; font-size: 13px; font-weight: 600; color: #2563EB; text-decoration: underline; cursor: pointer;">
                Upload logo
              </button>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Square PNG or SVG, at least 512 px
              </div>
            </div>
          </div>

          <!-- Brand Colour -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px;">
            <span style="font-size: 13px; font-weight: 600; color: #0F172A;">Brand colour</span>
            <label style="display: flex; align-items: center; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 4px 12px; cursor: pointer;">
              <input type="color" id="brand-color-input" value="${esc(primaryColor)}" oninput="document.getElementById('brand-color-hex').textContent = this.value.toUpperCase()" style="width: 18px; height: 18px; border: none; background: transparent; padding: 0; cursor: pointer;" />
              <span id="brand-color-hex" style="font-size: 12px; font-family: monospace; font-weight: 700; color: #0F172A;">${esc(primaryColor.toUpperCase())}</span>
            </label>
          </div>

          <!-- Diner Template -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; font-weight: 600; color: #0F172A;">Diner template</span>
            <a href="/studio" style="font-size: 13px; font-weight: 600; color: #2563EB; text-decoration: none; text-transform: capitalize;">
              ${esc(activeTemplate)} · <span style="text-decoration: underline;">change</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Card 2: Your Own Web Address (Custom Domain) -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 8px; flex-wrap: wrap;">
            <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
              Your own web address
            </h2>
            <span id="domain-status-badge" style="background: ${isDomainVerified ? '#ECFDF5' : '#FEF3C7'}; color: ${isDomainVerified ? '#059669' : '#D97706'}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
              ${isDomainVerified ? 'Verified · HTTPS Active' : 'Waiting for DNS'}
            </span>
          </div>

          <input type="text" id="custom-domain-input" value="${esc(customDomain)}" placeholder="order.yourrestaurant.com" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none; margin-bottom: 16px; box-sizing: border-box;">

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
                <button type="button" onclick="copyRecordValue('order')" style="background: transparent; border: none; font-size: 11px; font-weight: 600; color: #2563EB; cursor: pointer;">Copy</button>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748B;">Value</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #0F172A; font-weight: 700;">edge.orbitox.io</span>
                <button type="button" onclick="copyRecordValue('edge.orbitox.io')" style="background: transparent; border: none; font-size: 11px; font-weight: 600; color: #2563EB; cursor: pointer;">Copy</button>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; gap: 10px; flex-wrap: wrap;">
          <div style="font-size: 11px; color: #64748B;">
            HTTPS certificate provisioned via CNAME
          </div>
          <button type="button" id="check-dns-btn" class="btn btn-primary btn-sm" onclick="verifyCustomDomain()" style="padding: 7px 16px; font-size: 12px; border-radius: 9999px;">
            Check now
          </button>
        </div>
      </div>

      <!-- Card 3: GST & Invoices -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 8px; flex-wrap: wrap;">
            <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
              GST &amp; invoices
            </h2>
            <span style="background: ${gstin ? '#ECFDF5' : '#F1F5F9'}; color: ${gstin ? '#059669' : '#64748B'}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
              ${gstin ? 'GSTIN configured' : 'GSTIN not set'}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px;">GSTIN</label>
              <input type="text" id="gstin-input" value="${esc(gstin)}" placeholder="29ABCDE1234F1Z5" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none; box-sizing: border-box;">
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px;">Invoice prefix</label>
              <input type="text" id="invoice-prefix-input" value="${esc(invoicePrefix)}" style="width: 100%; border: 1px solid #E2E8F0; border-radius: 12px; padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0F172A; outline: none; box-sizing: border-box;">
            </div>
          </div>

          <div style="font-size: 12px; font-weight: 600; color: #0F172A; margin-bottom: 10px;">
            If a branch has no GSTIN
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
            <label style="display: flex; align-items: center; gap: 8px; color: #0F172A; cursor: pointer;">
              <input type="radio" name="gst_mode" value="refuse" ${unregisteredMode === 'refuse' ? 'checked' : ''} style="accent-color: #000000;">
              <span>Don't issue tax invoices (safest)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; color: #64748B; cursor: pointer;">
              <input type="radio" name="gst_mode" value="bill_of_supply" ${unregisteredMode === 'bill_of_supply' ? 'checked' : ''} style="accent-color: #000000;">
              <span>Issue a bill of supply</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; color: #64748B; cursor: pointer;">
              <input type="radio" name="gst_mode" value="receipt" ${unregisteredMode === 'receipt' ? 'checked' : ''} style="accent-color: #000000;">
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
        <span style="background: ${razorpayConfigured ? '#ECFDF5' : '#F1F5F9'}; color: ${razorpayConfigured ? '#059669' : '#64748B'}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
          ${razorpayConfigured ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 0 0 20px 0;">
        Let diners pay at the table with UPI or card. Money goes straight to your own Razorpay account; OrbitoX never holds it.
      </p>

      <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <button type="button" class="btn btn-primary" onclick="openRazorpayModal()" style="padding: 9px 22px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
          ${razorpayConfigured ? 'Update Razorpay keys' : 'Connect Razorpay'}
        </button>
        <span style="font-size: 12px; color: #64748B;">
          ${razorpayConfigured ? 'Direct UPI / Card checkout active' : 'Until then: pay at counter'}
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
          Download everything, or delete ${esc(brandName)}. Deletion waits 30 days and can be cancelled until then.
        </div>
      </div>

      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <a href="${controlPlaneUrl}/console/data-rights" target="_blank" rel="noopener noreferrer" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; border-radius: 9999px; padding: 9px 18px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer;">
          Export all data
        </a>
        <a href="${controlPlaneUrl}/console/data-rights" target="_blank" rel="noopener noreferrer" style="background: #DC2626; border: none; color: #FFFFFF; border-radius: 9999px; padding: 9px 20px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer;">
          Data deletion options
        </a>
      </div>
    </div>

  </div>

  <!-- Razorpay Config Modal -->
  <div id="razorpay-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;">
    <div style="background: #FFFFFF; border-radius: 24px; padding: 28px; width: 420px; max-width: 92vw; box-shadow: 0 20px 40px rgba(0,0,0,0.18);">
      <h3 style="font-size: 19px; font-weight: 800; color: #0F172A; margin: 0 0 6px 0;">Configure Razorpay Gateway</h3>
      <p style="font-size: 13px; color: #64748B; margin: 0 0 18px 0;">Enter your merchant Key ID &amp; Secret to accept table UPI/Card payments.</p>
      <form onsubmit="saveRazorpayConfig(event)">
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">Key ID</label>
          <input type="text" id="rzp-key-id" required placeholder="rzp_live_..." style="width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 13px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">Key Secret</label>
          <input type="password" id="rzp-key-secret" required placeholder="••••••••••••" style="width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 13px; box-sizing: border-box;" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="document.getElementById('razorpay-modal').style.display='none'" class="btn btn-secondary" style="border-radius: 9999px; padding: 8px 18px; font-size: 13px;">Cancel</button>
          <button type="submit" class="btn btn-primary" style="border-radius: 9999px; padding: 8px 20px; font-size: 13px;">Save Credentials</button>
        </div>
      </form>
    </div>
  </div>

  <style>
    @media (max-width: 768px) {
      .settings-container {
        padding: 16px 16px 88px 16px !important;
      }
      .settings-grid {
        grid-template-columns: 1fr !important;
      }
    }
  </style>

  <script>
    function copyRecordValue(val) {
      if (navigator.clipboard) navigator.clipboard.writeText(val).catch(() => {});
      if (window.showToast) window.showToast('Copied ' + val + ' to clipboard.', 'success');
    }

    async function saveWhiteLabelSettings() {
      const btn = document.getElementById('save-settings-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
      try {
        const primaryColor = document.getElementById('brand-color-input').value;
        const customDomain = document.getElementById('custom-domain-input').value.trim();
        const gstin = document.getElementById('gstin-input').value.trim().toUpperCase();
        const invoicePrefix = document.getElementById('invoice-prefix-input').value.trim();
        const modeEl = document.querySelector('input[name="gst_mode"]:checked');
        const unregisteredInvoiceMode = modeEl ? modeEl.value : 'refuse';

        await window.apiFetch('/api/restaurant/settings/whitelabel', {
          method: 'POST',
          body: { primaryColor, customDomain, gstin, invoicePrefix, unregisteredInvoiceMode }
        });
        if (window.showToast) window.showToast('Settings saved to tenant configuration.', 'success');
      } catch (err) {
        if (window.showToast) window.showToast((err && err.message) || 'Failed to save settings.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save settings'; }
      }
    }

    async function verifyCustomDomain() {
      const domain = document.getElementById('custom-domain-input').value.trim();
      if (!domain) {
        if (window.showToast) window.showToast('Enter a domain name first.', 'error');
        return;
      }
      const btn = document.getElementById('check-dns-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
      try {
        const res = await window.apiFetch('/api/restaurant/domains/verify', {
          method: 'POST',
          body: { domain }
        });
        if (window.showToast) window.showToast(res.message || 'Domain verification succeeded.', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        if (window.showToast) window.showToast((err && err.message) || 'DNS verification pending.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Check now'; }
      }
    }

    async function uploadBrandLogo(input) {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await window.apiFetch('/api/restaurant/uploads/logo', {
            method: 'POST',
            body: { dataUrl: reader.result, filename: file.name }
          });
          if (window.showToast) window.showToast('Logo uploaded successfully.', 'success');
        } catch (err) {
          if (window.showToast) window.showToast((err && err.message) || 'Logo upload failed.', 'error');
        }
      };
      reader.readAsDataURL(file);
    }

    function openRazorpayModal() {
      const modal = document.getElementById('razorpay-modal');
      if (modal) modal.style.display = 'flex';
    }

    async function saveRazorpayConfig(e) {
      e.preventDefault();
      try {
        const keyId = document.getElementById('rzp-key-id').value.trim();
        const keySecret = document.getElementById('rzp-key-secret').value.trim();
        await window.apiFetch('/api/restaurant/payments/config', {
          method: 'POST',
          body: { provider: 'razorpay', keyId, keySecret }
        });
        document.getElementById('razorpay-modal').style.display = 'none';
        if (window.showToast) window.showToast('Razorpay credentials saved.', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        if (window.showToast) window.showToast((err && err.message) || 'Failed to save payment config.', 'error');
      }
    }
  </script>
  `;
}
