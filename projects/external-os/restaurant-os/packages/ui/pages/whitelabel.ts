/**
 * 🏷️ RestaurantOS 3.0 White-Label & Custom Domains Studio
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete brand identity, multi-location overrides, and DNS domain lifecycle:
 * - Brand identity (Name, Tagline, Logos, App Icon, Color Palette)
 * - Custom Domains, Subdomains & SSL verification state machine
 * - Multi-branch brand inheritance & branch-level overrides
 * - Scoped Custom CSS styling
 */

import { TenantBrandConfig, BranchRecord } from '../../domain';
import { icon } from '../icons';

export function renderWhiteLabelWorkspace(
  brand: TenantBrandConfig,
  branches: BranchRecord[],
  selectedBranchId = 'branch_ldh'
): string {
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const branchOverride = brand.branchOverrides?.[selectedBranchId] || {};

  return `
  <div style="padding: 24px 32px; max-width: 1300px; margin: 0 auto; width: 100%;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 20px;">
      <div>
        <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: var(--color-copper); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
          <span style="display: flex; align-items: center; gap: 6px;">${icon('tag', { size: 14, color: 'var(--color-copper)' })} White-Label & Domains</span>
          <span style="color: var(--border-strong);">|</span>
          <span style="color: var(--color-stone);">OrbitoX Multi-Tenancy Architecture</span>
        </div>
        <h1 style="font-size: 26px; font-weight: 800; color: var(--color-linen); letter-spacing: -0.02em;">
          Brand Identity, Custom Domains & SSL
        </h1>
        <p style="font-size: 13px; color: var(--color-stone); margin-top: 4px; max-width: 680px;">
          White-label configuration completely isolates your restaurant brand. Custom domains, logos, app icons, and color tokens propagate instantly to diner mobile ordering, digital receipts, and web surfaces.
        </p>
      </div>

      <div style="display: flex; gap: 10px;">
        <button onclick="saveBrandSettings()" id="btn-save-brand" class="btn btn-primary btn-sm" style="font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
          ${icon('save', { size: 14, color: '#FFFFFF' })}
          <span>Save Brand Configuration</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs / Sections -->
    <div style="display: grid; grid-template-columns: 260px 1fr; gap: 28px;">
      <!-- Left Anchor Navigation -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button onclick="switchBrandTab('identity')" id="tab-btn-identity" class="brand-tab-btn active" style="text-align: left; padding: 12px 16px; border-radius: 8px; background: var(--color-copper-subtle); color: var(--color-copper); font-size: 13px; font-weight: 700; border: 1px solid var(--color-copper); cursor: pointer; display: flex; align-items: center; gap: 8px;">
          ${icon('palette', { size: 15, color: 'currentColor' })}
          <span>Brand Identity & Assets</span>
        </button>
        <button onclick="switchBrandTab('domain')" id="tab-btn-domain" class="brand-tab-btn" style="text-align: left; padding: 12px 16px; border-radius: 8px; background: var(--color-charcoal); color: var(--color-stone); font-size: 13px; font-weight: 600; border: 1px solid var(--border-subtle); cursor: pointer; display: flex; align-items: center; gap: 8px;">
          ${icon('globe', { size: 15, color: 'currentColor' })}
          <span>Custom Domains & DNS</span>
        </button>
        <button onclick="switchBrandTab('locations')" id="tab-btn-locations" class="brand-tab-btn" style="text-align: left; padding: 12px 16px; border-radius: 8px; background: var(--color-charcoal); color: var(--color-stone); font-size: 13px; font-weight: 600; border: 1px solid var(--border-subtle); cursor: pointer; display: flex; align-items: center; gap: 8px;">
          ${icon('locations', { size: 15, color: 'currentColor' })}
          <span>Branch Inheritance Overrides</span>
        </button>
        <button onclick="switchBrandTab('seo')" id="tab-btn-seo" class="brand-tab-btn" style="text-align: left; padding: 12px 16px; border-radius: 8px; background: var(--color-charcoal); color: var(--color-stone); font-size: 13px; font-weight: 600; border: 1px solid var(--border-subtle); cursor: pointer; display: flex; align-items: center; gap: 8px;">
          ${icon('search', { size: 15, color: 'currentColor' })}
          <span>SEO & Social Metadata</span>
        </button>
        <button onclick="switchBrandTab('css')" id="tab-btn-css" class="brand-tab-btn" style="text-align: left; padding: 12px 16px; border-radius: 8px; background: var(--color-charcoal); color: var(--color-stone); font-size: 13px; font-weight: 600; border: 1px solid var(--border-subtle); cursor: pointer; display: flex; align-items: center; gap: 8px;">
          ${icon('code', { size: 15, color: 'currentColor' })}
          <span>Scoped Custom CSS</span>
        </button>
      </div>

      <!-- Right Form Content -->
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 14px; padding: 28px;">
        <!-- TAB 1: Brand Identity -->
        <div id="section-identity" class="brand-section-pane" style="display: flex; flex-direction: column; gap: 20px;">
          <h2 style="font-size: 18px; font-weight: 800; color: var(--color-linen); margin-bottom: 4px;">
            Primary Brand Identity
          </h2>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Restaurant Legal / Brand Name</label>
              <input
                type="text"
                id="brand-name"
                value="${brand.restaurantName || ''}"
                style="width: 100%; margin-top: 6px; padding: 9px 14px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;"
              />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Tagline / Subtitle</label>
              <input
                type="text"
                id="brand-tagline"
                value="${brand.tagline || ''}"
                style="width: 100%; margin-top: 6px; padding: 9px 14px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;"
              />
            </div>
          </div>

          <!-- Color Tokens -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 18px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-linen); margin-bottom: 12px;">Brand Color Theme</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Primary Accent</label>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
                  <input type="color" id="brand-color-primary" value="${brand.primaryColor || '#C86B3C'}" style="width: 36px; height: 36px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; cursor: pointer;" />
                  <input type="text" id="brand-color-primary-text" value="${brand.primaryColor || '#C86B3C'}" oninput="document.getElementById('brand-color-primary').value = this.value" style="flex: 1; padding: 8px 10px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-family: var(--font-mono); font-size: 12px;" />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Secondary Highlight</label>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
                  <input type="color" id="brand-color-secondary" value="${brand.secondaryColor || '#D99A45'}" style="width: 36px; height: 36px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; cursor: pointer;" />
                  <input type="text" id="brand-color-secondary-text" value="${brand.secondaryColor || '#D99A45'}" oninput="document.getElementById('brand-color-secondary').value = this.value" style="flex: 1; padding: 8px 10px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-family: var(--font-mono); font-size: 12px;" />
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Success / Operational Sage</label>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
                  <input type="color" id="brand-color-accent" value="${brand.accentColor || '#5D9A7A'}" style="width: 36px; height: 36px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; cursor: pointer;" />
                  <input type="text" id="brand-color-accent-text" value="${brand.accentColor || '#5D9A7A'}" oninput="document.getElementById('brand-color-accent').value = this.value" style="flex: 1; padding: 8px 10px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-family: var(--font-mono); font-size: 12px;" />
                </div>
              </div>
            </div>
          </div>

          <!-- Assets & Logos -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 18px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-linen); margin-bottom: 12px;">Logos & App Icons</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Vector Logo URL (SVG / PNG)</label>
                <input
                  type="text"
                  id="brand-logo-url"
                  value="${brand.logoUrl || ''}"
                  style="width: 100%; margin-top: 6px; padding: 9px 14px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 12px;"
                />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">PWA App Icon URL (192x192 PNG)</label>
                <input
                  type="text"
                  id="brand-app-icon"
                  value="${brand.appIconUrl || ''}"
                  style="width: 100%; margin-top: 6px; padding: 9px 14px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 12px;"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: Custom Domains & DNS -->
        <div id="section-domain" class="brand-section-pane" style="display: none; flex-direction: column; gap: 20px;">
          <h2 style="font-size: 18px; font-weight: 800; color: var(--color-linen); margin-bottom: 4px;">
            Domain & Subdomain Routing
          </h2>

          <!-- Platform Subdomain -->
          <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 10px; padding: 18px;">
            <div style="font-size: 12px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; margin-bottom: 6px;">Included Platform Subdomain</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <input
                type="text"
                id="brand-subdomain"
                value="${brand.subdomain || 'bistro.orbitox.live'}"
                style="flex: 1; padding: 9px 14px; background: #0E1218; border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-family: var(--font-mono); font-size: 13px;"
              />
              <span class="badge badge-sage">Active (Instant)</span>
            </div>
            <div style="font-size: 11px; color: var(--color-muted); margin-top: 6px;">
              Automatically routed by OrbitoX Multi-Tenant Engine. Zero DNS configuration needed.
            </div>
          </div>

          <!-- Custom Domain -->
          <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 10px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 12px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Branded Custom Domain (CNAME)</div>
              <span id="domain-status-badge" class="badge ${brand.domainStatus === 'ACTIVE' ? 'badge-sage' : brand.domainStatus === 'PENDING_DNS' ? 'badge-amber' : 'badge-neutral'}">
                ${brand.domainStatus || 'UNCONFIGURED'}
              </span>
            </div>

            <div style="display: flex; gap: 10px; align-items: center;">
              <input
                type="text"
                id="brand-custom-domain"
                placeholder="e.g. dine.yourrestaurant.com"
                value="${brand.customDomain || ''}"
                style="flex: 1; padding: 9px 14px; background: #0E1218; border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-family: var(--font-mono); font-size: 13px;"
              />
              <button onclick="verifyDomainDNS()" id="btn-verify-dns" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icon('search', { size: 12, color: 'currentColor' })}
                <span>Verify DNS Records</span>
              </button>
            </div>

            <!-- DNS Guide Box -->
            <div style="margin-top: 14px; background: #0A0D12; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px; font-size: 12px; color: var(--color-stone);">
              <div style="font-weight: 700; color: var(--color-linen); margin-bottom: 6px;">Required DNS Record Configuration</div>
              <div style="display: grid; grid-template-columns: 120px 200px 1fr; gap: 8px; font-family: var(--font-mono); font-size: 11px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                <span style="color: var(--color-copper);">TYPE: CNAME</span>
                <span>HOST: dine</span>
                <span style="color: var(--color-sage);">TARGET: ingress.orbitox.live</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11px; color: var(--color-muted);">
                <span style="display: inline-flex; align-items: center; gap: 4px;">${icon('shield-check', { size: 13, color: 'var(--color-sage)' })} SSL Readiness:</span>
                <strong style="color: var(--color-sage);">${brand.sslStatus || 'ACTIVE'}</strong>
                <span>(Automated Let's Encrypt Wildcard Provisioning)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: Multi-Branch Overrides -->
        <div id="section-locations" class="brand-section-pane" style="display: none; flex-direction: column; gap: 20px;">
          <h2 style="font-size: 18px; font-weight: 800; color: var(--color-linen); margin-bottom: 4px;">
            Multi-Location Branding Inheritance
          </h2>
          <p style="font-size: 13px; color: var(--color-stone);">
            Branches automatically inherit platform-level brand identity unless explicitly overridden.
          </p>

          <div style="display: flex; gap: 10px; margin-bottom: 12px;">
            ${branches
      .map(
        (b) => `
              <button
                onclick="selectBranchOverride('${b.id}')"
                id="btn-branch-override-${b.id}"
                class="branch-override-btn ${b.id === selectedBranchId ? 'active' : ''}"
                style="padding: 8px 14px; border-radius: 6px; border: 1px solid ${b.id === selectedBranchId ? 'var(--color-copper)' : 'var(--border-default)'}; background: ${b.id === selectedBranchId ? 'var(--color-copper-subtle)' : 'var(--color-elevated)'}; color: ${b.id === selectedBranchId ? 'var(--color-copper)' : 'var(--color-stone)'}; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;"
              >
                ${icon('map-pin', { size: 12, color: b.id === selectedBranchId ? 'var(--color-copper)' : 'var(--color-stone)' })}
                <span>${b.name} (${b.code})</span>
              </button>`
      )
      .join('')}
          </div>

          <div id="branch-override-form" style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
              <div>
                <span style="font-size: 13px; font-weight: 800; color: var(--color-linen);" id="branch-form-heading">Configuring ${currentBranch.name}</span>
                <span id="branch-override-status-tag" style="margin-left: 8px; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: ${branchOverride.restaurantName || branchOverride.primaryColor ? 'rgba(200, 107, 60, 0.2)' : 'rgba(255, 255, 255, 0.08)'}; color: ${branchOverride.restaurantName || branchOverride.primaryColor ? 'var(--color-copper)' : 'var(--color-stone)'}; font-weight: 700;">
                  ${branchOverride.restaurantName || branchOverride.primaryColor ? 'Custom Overrides Active' : 'Inheriting All Brand Defaults'}
                </span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button
                  type="button"
                  id="btn-reset-branch-override"
                  onclick="resetBranchOverride()"
                  class="btn btn-secondary btn-sm"
                  style="font-size: 12px; padding: 6px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;"
                >
                  ${icon('refresh', { size: 12, color: 'currentColor' })}
                  <span>Reset to Brand Default</span>
                </button>
                <button
                  type="button"
                  id="btn-save-branch-override"
                  onclick="saveBranchOverride()"
                  class="btn btn-primary btn-sm"
                  style="font-size: 12px; padding: 6px 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;"
                >
                  ${icon('save', { size: 12, color: '#FFF' })}
                  <span>Save Branch Override</span>
                </button>
              </div>
            </div>

            <!-- Feedback Message -->
            <div id="branch-override-msg" style="display: none; padding: 10px 14px; border-radius: 6px; font-size: 12px; font-weight: 600;"></div>

            <!-- Field 1: Name -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Branch Display Name Override</label>
                <span id="badge-name-status" style="font-size: 10px; color: ${branchOverride.restaurantName ? 'var(--color-copper)' : 'var(--color-stone)'}; font-weight: 600;">
                  ${branchOverride.restaurantName ? 'Overridden' : `Inheriting: "${brand.restaurantName}"`}
                </span>
              </div>
              <input
                type="text"
                id="branch-override-name"
                value="${branchOverride.restaurantName || ''}"
                placeholder="Leave blank to inherit '${brand.restaurantName}'"
                style="width: 100%; margin-top: 6px; padding: 9px 14px; background: #0E1218; border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;"
              />
            </div>

            <!-- Field 2: Tagline -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Tagline / Branch Subtitle</label>
                <span id="badge-tagline-status" style="font-size: 10px; color: ${branchOverride.tagline ? 'var(--color-copper)' : 'var(--color-stone)'}; font-weight: 600;">
                  ${branchOverride.tagline ? 'Overridden' : `Inheriting: "${brand.tagline || 'None'}"`}
                </span>
              </div>
              <input
                type="text"
                id="branch-override-tagline"
                value="${branchOverride.tagline || ''}"
                placeholder="Leave blank to inherit '${brand.tagline || 'Brand Tagline'}'"
                style="width: 100%; margin-top: 6px; padding: 9px 14px; background: #0E1218; border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;"
              />
            </div>

            <!-- Field 3: Primary Color -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Branch Primary Accent Color</label>
                <span id="badge-color-status" style="font-size: 10px; color: ${branchOverride.primaryColor ? 'var(--color-copper)' : 'var(--color-stone)'}; font-weight: 600;">
                  ${branchOverride.primaryColor ? 'Overridden' : `Inheriting: "${brand.primaryColor || '#C86B3C'}"`}
                </span>
              </div>
              <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
                <input
                  type="color"
                  id="branch-override-color"
                  value="${branchOverride.primaryColor || brand.primaryColor || '#C86B3C'}"
                  oninput="document.getElementById('branch-override-color-text').value = this.value"
                  style="width: 36px; height: 36px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; cursor: pointer;"
                />
                <input
                  type="text"
                  id="branch-override-color-text"
                  value="${branchOverride.primaryColor || ''}"
                  placeholder="Leave blank to inherit '${brand.primaryColor || '#C86B3C'}'"
                  oninput="if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(this.value)) document.getElementById('branch-override-color').value = this.value"
                  style="flex: 1; padding: 8px 10px; background: #0E1218; border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-family: var(--font-mono); font-size: 12px;"
                />
              </div>
            </div>

            <!-- Field 4: Subdomain -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Branch Subdomain</label>
                <span id="badge-subdomain-status" style="font-size: 10px; color: ${branchOverride.subdomain ? 'var(--color-copper)' : 'var(--color-stone)'}; font-weight: 600;">
                  ${branchOverride.subdomain ? 'Overridden' : 'Inheriting default branch slug'}
                </span>
              </div>
              <input
                type="text"
                id="branch-override-subdomain"
                value="${branchOverride.subdomain || ''}"
                placeholder="e.g. ${selectedBranchId === 'branch_chd' ? 'chd.orbitox.live' : 'delhi.orbitox.live'}"
                style="width: 100%; margin-top: 6px; padding: 9px 14px; background: #0E1218; border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-family: var(--font-mono); font-size: 13px;"
              />
            </div>

            <!-- Field 5: Phone -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Direct Outlet Contact Phone</label>
                <span id="badge-phone-status" style="font-size: 10px; color: ${branchOverride.phone ? 'var(--color-copper)' : 'var(--color-stone)'}; font-weight: 600;">
                  ${branchOverride.phone ? 'Overridden' : 'Inheriting Brand Contact'}
                </span>
              </div>
              <input
                type="tel"
                id="branch-override-phone"
                value="${branchOverride.phone || ''}"
                placeholder="e.g. +91 161 500 1234"
                style="width: 100%; margin-top: 6px; padding: 9px 14px; background: #0E1218; border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;"
              />
            </div>
          </div>
        </div>

        <!-- TAB 4: SEO & Social Metadata -->
        <div id="section-seo" class="brand-section-pane" style="display: none; flex-direction: column; gap: 20px;">
          <h2 style="font-size: 18px; font-weight: 800; color: var(--color-linen); margin-bottom: 4px;">
            SEO & Open Graph Social Sharing
          </h2>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Meta Title Tag (Search Engines & Browser Tab)</label>
            <input
              type="text"
              id="brand-seo-title"
              value="${brand.seo?.title || ''}"
              style="width: 100%; margin-top: 6px; padding: 9px 14px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 13px;"
            />
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Meta Description</label>
            <textarea
              id="brand-seo-desc"
              rows="3"
              style="width: 100%; margin-top: 6px; padding: 9px 14px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 12px; resize: vertical;"
            >${brand.seo?.description || ''}</textarea>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">OpenGraph Sharing Preview Image URL</label>
            <input
              type="text"
              id="brand-seo-og"
              value="${brand.seo?.ogImage || ''}"
              style="width: 100%; margin-top: 6px; padding: 9px 14px; background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 6px; color: var(--color-linen); font-size: 12px;"
            />
          </div>
        </div>

        <!-- TAB 5: Scoped Custom CSS -->
        <div id="section-css" class="brand-section-pane" style="display: none; flex-direction: column; gap: 16px;">
          <h2 style="font-size: 18px; font-weight: 800; color: var(--color-linen); margin-bottom: 4px;">
            Scoped Tenant Custom CSS
          </h2>
          <p style="font-size: 12px; color: var(--color-stone);">
            Advanced styling scoped exclusively to your tenant storefront. Arbitrary cross-tenant script execution is cryptographically sandboxed.
          </p>
          <textarea
            id="brand-custom-css"
            rows="10"
            style="width: 100%; padding: 12px; background: #07090C; border: 1px solid var(--border-default); border-radius: 8px; color: #10B981; font-family: var(--font-mono); font-size: 12px; line-height: 1.5; resize: vertical;"
          >${brand.customCss || '/* Scoped tenant CSS */'}</textarea>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentBrand = ${JSON.stringify(brand)};
    let activeBranchId = '${selectedBranchId}';

    function switchBrandTab(tab) {
      document.querySelectorAll('.brand-tab-btn').forEach(btn => {
        btn.style.background = 'var(--color-charcoal)';
        btn.style.color = 'var(--color-stone)';
        btn.style.borderColor = 'var(--border-subtle)';
      });
      document.querySelectorAll('.brand-section-pane').forEach(p => p.style.display = 'none');

      const activeBtn = document.getElementById('tab-btn-' + tab);
      const activePane = document.getElementById('section-' + tab);
      if (activeBtn) {
        activeBtn.style.background = 'var(--color-copper-subtle)';
        activeBtn.style.color = 'var(--color-copper)';
        activeBtn.style.borderColor = 'var(--color-copper)';
      }
      if (activePane) {
        activePane.style.display = 'flex';
      }
    }

    async function verifyDomainDNS() {
      const customDomain = document.getElementById('brand-custom-domain').value.trim();
      const btn = document.getElementById('btn-verify-dns');
      btn.innerText = 'Checking DNS...';

      try {
        const res = await fetch('/api/restaurant/branding/verify-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: customDomain })
        });
        const data = await res.json();
        const badge = document.getElementById('domain-status-badge');
        if (data.status === 'ACTIVE' || data.status === 'VERIFIED') {
          badge.className = 'badge badge-sage';
          badge.innerText = data.status;
          alert('DNS Verified! Domain is ready to serve HTTPS traffic.');
        } else {
          badge.className = 'badge badge-amber';
          badge.innerText = 'PENDING_DNS';
          alert('DNS check: ' + (data.message || 'CNAME propagation still pending.'));
        }
      } catch (err) {
        alert('DNS verification failed.');
      } finally {
        btn.innerText = 'Verify DNS Records';
      }
    }

    async function saveBrandSettings() {
      const btn = document.getElementById('btn-save-brand');
      btn.innerText = 'Saving...';

      const payload = {
        restaurantName: document.getElementById('brand-name').value,
        tagline: document.getElementById('brand-tagline').value,
        primaryColor: document.getElementById('brand-color-primary').value,
        secondaryColor: document.getElementById('brand-color-secondary').value,
        accentColor: document.getElementById('brand-color-accent').value,
        logoUrl: document.getElementById('brand-logo-url').value,
        appIconUrl: document.getElementById('brand-app-icon').value,
        subdomain: document.getElementById('brand-subdomain').value,
        customDomain: document.getElementById('brand-custom-domain').value,
        seo: {
          title: document.getElementById('brand-seo-title').value,
          description: document.getElementById('brand-seo-desc').value,
          ogImage: document.getElementById('brand-seo-og').value,
        },
        customCss: document.getElementById('brand-custom-css').value,
      };

      try {
        const res = await fetch('/api/restaurant/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Brand configuration saved successfully and published across channels!');
          window.location.reload();
        } else {
          alert('Save failed: ' + (data.error || 'Server error'));
        }
      } catch (err) {
        alert('Network error saving branding.');
      } finally {
        btn.innerText = 'Save Brand Configuration';
      }
    }

    function getAuthHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      const token = (window.__STAFF_SESSION__ && window.__STAFF_SESSION__.token) || localStorage.getItem('staff_token');
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return headers;
    }

    function showBranchMsg(text, isError) {
      const msg = document.getElementById('branch-override-msg');
      if (!msg) return;
      msg.style.display = 'block';
      msg.style.background = isError ? 'rgba(217, 56, 58, 0.15)' : 'rgba(46, 133, 64, 0.15)';
      msg.style.color = isError ? '#FF6B6B' : '#5D9A7A';
      msg.style.border = isError ? '1px solid rgba(217, 56, 58, 0.3)' : '1px solid rgba(46, 133, 64, 0.3)';
      msg.textContent = text;
      setTimeout(() => { if (msg) msg.style.display = 'none'; }, 5000);
    }

    async function selectBranchOverride(bId) {
      activeBranchId = bId;
      document.querySelectorAll('.branch-override-btn').forEach(btn => {
        btn.style.background = 'var(--color-elevated)';
        btn.style.color = 'var(--color-stone)';
        btn.style.borderColor = 'var(--border-default)';
      });
      const activeBtn = document.getElementById('btn-branch-override-' + bId);
      if (activeBtn) {
        activeBtn.style.background = 'var(--color-copper-subtle)';
        activeBtn.style.color = 'var(--color-copper)';
        activeBtn.style.borderColor = 'var(--color-copper)';
      }

      const heading = document.getElementById('branch-form-heading');
      if (heading && activeBtn) {
        heading.textContent = 'Configuring ' + (activeBtn.querySelector('span')?.textContent || bId);
      }

      try {
        const res = await fetch('/api/restaurant/branding/branch-overrides?branchId=' + encodeURIComponent(bId));
        if (res.ok) {
          const data = await res.json();
          const ov = data.override || {};
          const isOverridden = Boolean(data.isOverridden);

          document.getElementById('branch-override-name').value = ov.restaurantName || '';
          document.getElementById('branch-override-tagline').value = ov.tagline || '';
          document.getElementById('branch-override-color').value = ov.primaryColor || currentBrand.primaryColor || '#C86B3C';
          document.getElementById('branch-override-color-text').value = ov.primaryColor || '';
          document.getElementById('branch-override-subdomain').value = ov.subdomain || '';
          document.getElementById('branch-override-phone').value = ov.phone || '';

          // Update Status Tag
          const statusTag = document.getElementById('branch-override-status-tag');
          if (statusTag) {
            statusTag.textContent = isOverridden ? 'Custom Overrides Active' : 'Inheriting All Brand Defaults';
            statusTag.style.background = isOverridden ? 'rgba(200, 107, 60, 0.2)' : 'rgba(255, 255, 255, 0.08)';
            statusTag.style.color = isOverridden ? 'var(--color-copper)' : 'var(--color-stone)';
          }

          // Update Field Inheritance Badges
          const nameBadge = document.getElementById('badge-name-status');
          if (nameBadge) {
            nameBadge.textContent = ov.restaurantName ? 'Overridden' : 'Inheriting: "' + currentBrand.restaurantName + '"';
            nameBadge.style.color = ov.restaurantName ? 'var(--color-copper)' : 'var(--color-stone)';
          }
          const tagBadge = document.getElementById('badge-tagline-status');
          if (tagBadge) {
            tagBadge.textContent = ov.tagline ? 'Overridden' : 'Inheriting: "' + (currentBrand.tagline || 'None') + '"';
            tagBadge.style.color = ov.tagline ? 'var(--color-copper)' : 'var(--color-stone)';
          }
          const colBadge = document.getElementById('badge-color-status');
          if (colBadge) {
            colBadge.textContent = ov.primaryColor ? 'Overridden' : 'Inheriting: "' + (currentBrand.primaryColor || '#C86B3C') + '"';
            colBadge.style.color = ov.primaryColor ? 'var(--color-copper)' : 'var(--color-stone)';
          }
          const subBadge = document.getElementById('badge-subdomain-status');
          if (subBadge) {
            subBadge.textContent = ov.subdomain ? 'Overridden' : 'Inheriting default branch slug';
            subBadge.style.color = ov.subdomain ? 'var(--color-copper)' : 'var(--color-stone)';
          }
          const phoneBadge = document.getElementById('badge-phone-status');
          if (phoneBadge) {
            phoneBadge.textContent = ov.phone ? 'Overridden' : 'Inheriting Brand Contact';
            phoneBadge.style.color = ov.phone ? 'var(--color-copper)' : 'var(--color-stone)';
          }
        }
      } catch (err) {
        console.error('Failed to fetch branch overrides:', err);
      }
    }

    async function saveBranchOverride() {
      const btn = document.getElementById('btn-save-branch-override');
      btn.disabled = true;
      btn.innerText = 'Saving...';

      const payload = {
        branchId: activeBranchId,
        restaurantName: document.getElementById('branch-override-name').value.trim(),
        tagline: document.getElementById('branch-override-tagline').value.trim(),
        primaryColor: document.getElementById('branch-override-color-text').value.trim() || document.getElementById('branch-override-color').value,
        subdomain: document.getElementById('branch-override-subdomain').value.trim(),
        phone: document.getElementById('branch-override-phone').value.trim(),
      };

      try {
        const res = await fetch('/api/restaurant/branding/branch-overrides', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showBranchMsg('Branch overrides saved durably and published!', false);
          if (!currentBrand.branchOverrides) currentBrand.branchOverrides = {};
          currentBrand.branchOverrides[activeBranchId] = data.override;
          selectBranchOverride(activeBranchId);
        } else {
          showBranchMsg('Failed to save override: ' + (data.message || data.error || 'Server error'), true);
        }
      } catch (err) {
        showBranchMsg('Network error saving branch override.', true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '${icon('save', { size: 12, color: '#FFF' })} <span>Save Branch Override</span>';
      }
    }

    async function resetBranchOverride() {
      if (!confirm('Are you sure you want to reset all overrides for this branch back to the platform brand defaults?')) {
        return;
      }
      const btn = document.getElementById('btn-reset-branch-override');
      btn.disabled = true;
      btn.innerText = 'Resetting...';

      try {
        const res = await fetch('/api/restaurant/branding/branch-overrides/' + encodeURIComponent(activeBranchId), {
          method: 'DELETE',
          headers: getAuthHeaders(),
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showBranchMsg('Branch overrides cleared. Now inheriting platform brand defaults cleanly.', false);
          if (currentBrand.branchOverrides) {
            delete currentBrand.branchOverrides[activeBranchId];
          }
          selectBranchOverride(activeBranchId);
        } else {
          showBranchMsg('Failed to reset: ' + (data.message || data.error || 'Server error'), true);
        }
      } catch (err) {
        showBranchMsg('Network error resetting branch overrides.', true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '${icon('refresh', { size: 12, color: 'currentColor' })} <span>Reset to Brand Default</span>';
      }
    }
  </script>
`;
}
