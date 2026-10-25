/**
 * 🍷 RestaurantOS Owner Onboarding Checklist & Setup Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive 6-step guided checklist for new restaurant owners:
 * 1. CLAIM_INVITE
 * 2. SET_PIN
 * 3. BRANDING_CONFIGURED (with integrated image upload)
 * 4. MENU_CUSTOMIZED
 * 5. TABLES_REVIEWED
 * 6. PAYMENTS_CONNECTED
 */

import { OnboardingState, OnboardingStepKey } from '../../domain/owner-self-service';
import { icon } from '../icons';

export function renderOnboardingWorkspace(
  state: OnboardingState,
  brand: any,
  branchName = 'Main Dining'
): string {
  const stepsConfig: Array<{
    key: OnboardingStepKey;
    title: string;
    description: string;
    link: string;
    linkLabel: string;
  }> = [
    {
      key: 'CLAIM_INVITE',
      title: 'Claim Owner Invite & License',
      description: 'Cryptographic ownership handshake and tenant licensing established.',
      link: '/white-label',
      linkLabel: 'View Tenant Status',
    },
    {
      key: 'SET_PIN',
      title: 'Configure Staff Security PINs',
      description: 'Set master 4-digit supervisor PIN and staff access codes.',
      link: '/staff',
      linkLabel: 'Manage Staff & PINs',
    },
    {
      key: 'BRANDING_CONFIGURED',
      title: 'Brand Theme, Logo & Visuals',
      description: 'Upload high-res vector logo, accent palette, and custom favicon.',
      link: '/white-label',
      linkLabel: 'White-Label Branding',
    },
    {
      key: 'MENU_CUSTOMIZED',
      title: 'Menu Catalog & Pricing',
      description: 'Customize dishes, modifier groups, and kitchen preparation stations.',
      link: '/menu',
      linkLabel: 'Open Menu Catalog',
    },
    {
      key: 'TABLES_REVIEWED',
      title: 'Tables Fleet & QR Stand Placards',
      description: 'Verify spatial table layout, seat capacities, and print diner QR stands.',
      link: '/operations/tables',
      linkLabel: 'View Tables Fleet',
    },
    {
      key: 'PAYMENTS_CONNECTED',
      title: 'Razorpay Gateway & Statutory GST',
      description: 'Configure encrypted live API keys and webhook for automated composite GST invoicing.',
      link: '/white-label',
      linkLabel: 'Connect Razorpay',
    },
  ];

  const percent = state?.percentComplete ?? 0;
  const isFullyOnboarded = state?.isFullyOnboarded ?? false;
  const completedCount = state?.completedStepsCount ?? 0;
  const totalCount = state?.totalStepsCount ?? 6;

  const stepsHtml = stepsConfig.map((s, idx) => {
    const isDone = Boolean(state?.steps?.[s.key]);
    return `
      <div class="onboarding-step-card ${isDone ? 'is-complete' : ''}" id="step-${s.key}">
        <div class="step-status-icon">
          ${isDone ? icon('check', { size: 18, color: '#3EB489' }) : `<span class="step-num">${idx + 1}</span>`}
        </div>
        <div class="step-content">
          <div class="step-title-row">
            <h3 class="step-title">${s.title}</h3>
            <span class="step-badge ${isDone ? 'done' : 'pending'}">${isDone ? 'Completed' : 'Action Required'}</span>
          </div>
          <p class="step-desc">${s.description}</p>
          <div class="step-actions">
            <a href="${s.link}" class="btn-step-link">${s.linkLabel} →</a>
            <button class="btn-toggle-step" onclick="toggleOnboardingStep('${s.key}', ${!isDone})">
              ${isDone ? 'Mark Incomplete' : 'Mark Completed'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
  <div class="onboarding-container">
    <div class="onboarding-header">
      <div>
        <h1 class="onboarding-title">Restaurant Onboarding & Setup</h1>
        <p class="onboarding-subtitle">Complete these 6 foundational steps to launch your digital dining room and storefront.</p>
      </div>
      <div class="onboarding-score-card">
        <div class="score-label">Launch Readiness</div>
        <div class="score-percentage">${percent}%</div>
        <div class="score-meta">${completedCount} of ${totalCount} steps completed</div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar-container">
      <div class="progress-bar-fill" style="width: ${percent}%;"></div>
    </div>

    ${isFullyOnboarded ? `
    <div class="readiness-banner ready">
      <span style="font-size: 20px;">🎉</span>
      <div>
        <strong>Your Restaurant is 100% Launch-Ready!</strong>
        <p style="margin: 2px 0 0 0; font-size: 13px; color: #E2E8F0;">All foundational systems, branding, menu, and payment gateways are active.</p>
      </div>
    </div>
    ` : ''}

    <div class="onboarding-grid">
      <!-- Steps Column -->
      <div class="steps-column">
        ${stepsHtml}
      </div>

      <!-- Quick Upload & Brand Preview Sidebar -->
      <div class="sidebar-column">
        <div class="sidebar-card">
          <h2 class="sidebar-title">Quick Asset Upload</h2>
          <p class="sidebar-desc">Upload restaurant logo or hero banner with magic-byte format validation.</p>
          
          <div class="upload-zone" id="upload-zone" onclick="document.getElementById('file-input').click()">
            <input type="file" id="file-input" style="display: none;" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange="handleFileUpload(event)" />
            <div id="upload-icon" style="margin-bottom: 8px;">${icon('whitelabel', { size: 28, color: 'var(--color-copper)' })}</div>
            <div style="font-size: 13px; font-weight: 700; color: #F1F5F9;">Drop logo image or click to browse</div>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">PNG, JPEG, WebP, SVG (Max 2MB)</div>
          </div>

          <div id="upload-feedback" style="display: none; margin-top: 12px; font-size: 12px; padding: 10px; border-radius: 6px;"></div>

          <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94A3B8; margin-bottom: 8px;">Current Brand Preview</div>
            <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px;">
              ${brand?.logoUrl ? `<img id="preview-logo-img" src="${brand.logoUrl}" alt="Logo" style="height: 36px; max-width: 80px; object-fit: contain;" />` : `<div style="width: 36px; height: 36px; background: var(--color-copper); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #FFF;">${(brand?.restaurantName || 'R')[0]}</div>`}
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #F8FAFC;">${brand?.restaurantName || 'OrbitoX Bistro'}</div>
                <div style="font-size: 11px; color: #A0AEC0;">${branchName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <style>
    .onboarding-container {
      max-width: 1080px;
      margin: 0 auto;
      padding: 24px;
    }
    .onboarding-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 20px;
    }
    .onboarding-title {
      font-size: 26px;
      font-weight: 800;
      color: #F8FAFC;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }
    .onboarding-subtitle {
      font-size: 14px;
      color: #94A3B8;
      margin: 0;
      max-width: 580px;
      line-height: 1.5;
    }
    .onboarding-score-card {
      background: #151821;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px 24px;
      text-align: right;
      min-width: 160px;
    }
    .score-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94A3B8;
    }
    .score-percentage {
      font-size: 32px;
      font-weight: 900;
      color: var(--color-copper);
      line-height: 1.1;
      margin: 4px 0;
    }
    .score-meta {
      font-size: 12px;
      color: #A0AEC0;
    }
    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: #1E2330;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 28px;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-copper) 0%, #3EB489 100%);
      border-radius: 999px;
      transition: width 0.4s ease;
    }
    .readiness-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(62, 180, 137, 0.12);
      border: 1px solid rgba(62, 180, 137, 0.35);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 24px;
      color: #F8FAFC;
    }
    .onboarding-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .onboarding-grid {
        grid-template-columns: 1fr;
      }
      .onboarding-header {
        flex-direction: column;
      }
      .onboarding-score-card {
        text-align: left;
        width: 100%;
      }
    }
    .steps-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .onboarding-step-card {
      background: #151821;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      gap: 16px;
      transition: border-color 0.2s;
    }
    .onboarding-step-card.is-complete {
      border-color: rgba(62, 180, 137, 0.3);
      background: rgba(21, 24, 33, 0.7);
    }
    .step-status-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #1C212E;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .step-num {
      font-size: 13px;
      font-weight: 800;
      color: #94A3B8;
    }
    .step-content {
      flex: 1;
    }
    .step-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .step-title {
      font-size: 16px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0;
    }
    .step-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .step-badge.done {
      background: rgba(62, 180, 137, 0.15);
      color: #3EB489;
    }
    .step-badge.pending {
      background: rgba(200, 107, 60, 0.15);
      color: var(--color-copper);
    }
    .step-desc {
      font-size: 13px;
      color: #94A3B8;
      margin: 0 0 14px 0;
      line-height: 1.4;
    }
    .step-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-step-link {
      color: var(--color-copper);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
    .btn-step-link:hover {
      text-decoration: underline;
    }
    .btn-toggle-step {
      background: #1E2330;
      color: #CBD5E1;
      border: 1px solid rgba(255,255,255,0.08);
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-toggle-step:hover {
      background: #252C3D;
      color: #FFF;
    }
    .sidebar-card {
      background: #151821;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 20px;
    }
    .sidebar-title {
      font-size: 16px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0 0 4px 0;
    }
    .sidebar-desc {
      font-size: 12px;
      color: #94A3B8;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }
    .upload-zone {
      border: 2px dashed rgba(255,255,255,0.15);
      border-radius: 10px;
      padding: 24px 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .upload-zone:hover {
      border-color: var(--color-copper);
      background: rgba(200, 107, 60, 0.04);
    }
  </style>

  <script>
    async function toggleOnboardingStep(step, completed) {
      try {
        const res = await fetch('/api/restaurant/onboarding/step', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ step: step, completed: completed })
        });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          alert('Failed to update step: ' + (data.message || data.error));
        }
      } catch (err) {
        alert('Network error updating onboarding step');
      }
    }

    async function handleFileUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const feedback = document.getElementById('upload-feedback');
      feedback.style.display = 'block';
      feedback.style.background = 'rgba(255,255,255,0.05)';
      feedback.style.color = '#CBD5E1';
      feedback.textContent = 'Uploading and validating image...';

      const reader = new FileReader();
      reader.onload = async function() {
        const base64 = reader.result;
        try {
          const res = await fetch('/api/restaurant/branding/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, kind: 'logo' })
          });
          const result = await res.json();
          if (res.ok && result.success) {
            feedback.style.background = 'rgba(62, 180, 137, 0.15)';
            feedback.style.color = '#3EB489';
            feedback.textContent = 'Logo uploaded successfully!';
            setTimeout(function() { window.location.reload(); }, 1000);
          } else {
            feedback.style.background = 'rgba(224, 82, 82, 0.15)';
            feedback.style.color = '#E05252';
            feedback.textContent = 'Upload failed: ' + (result.message || result.error);
          }
        } catch (err) {
          feedback.style.background = 'rgba(224, 82, 82, 0.15)';
          feedback.style.color = '#E05252';
          feedback.textContent = 'Network error during upload';
        }
      };
      reader.readAsDataURL(file);
    }
  </script>
  `;
}
