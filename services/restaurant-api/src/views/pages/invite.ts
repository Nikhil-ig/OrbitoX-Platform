/**
 * 🪐 RestaurantOS — Owner Invite Claiming Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Warm Noir aesthetic matching RestaurantOS design tokens.
 * Single-use owner onboarding flow: set secure PIN & claim restaurant console.
 */

import { RestaurantTokens } from '../tokens';

export function renderOwnerInvitePage(token: string, tenantName = 'RestaurantOS'): string {
  const t = RestaurantTokens;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim Restaurant Ownership — ${tenantName}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: ${t.colors.ink};
      color: ${t.colors.linen};
      font-family: ${t.typography.staffFont};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: ${t.colors.charcoal};
      border: 1px solid ${t.colors.surfaceBorder};
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
    }
    .brand-mark {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: ${t.colors.copperSubtle};
      border: 1px solid ${t.colors.copperBorder};
      color: ${t.colors.copper};
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    h1 {
      font-family: ${t.typography.guestHeadFont};
      font-size: 28px;
      font-weight: 500;
      letter-spacing: -0.01em;
      margin-bottom: 8px;
      color: ${t.colors.linen};
    }
    p.subtitle {
      color: ${t.colors.stone};
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: ${t.colors.stone};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      background: ${t.colors.elevated};
      border: 1px solid ${t.colors.surfaceBorder};
      border-radius: 8px;
      padding: 12px 14px;
      color: ${t.colors.linen};
      font-family: inherit;
      font-size: 15px;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    input:focus {
      border-color: ${t.colors.copper};
      box-shadow: 0 0 0 3px ${t.colors.focusRing};
    }
    input.pin-input {
      font-family: ${t.typography.monoFont};
      font-size: 22px;
      letter-spacing: 0.3em;
      text-align: center;
    }
    .hint {
      font-size: 12px;
      color: ${t.colors.muted};
      margin-top: 6px;
    }
    .btn-submit {
      width: 100%;
      background: ${t.colors.copper};
      color: #FFF;
      border: none;
      border-radius: 8px;
      padding: 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 28px;
      transition: background 0.15s ease;
    }
    .btn-submit:hover {
      background: ${t.colors.copperHover};
    }
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .alert-error {
      display: none;
      background: ${t.colors.crimsonSubtle};
      border: 1px solid rgba(201, 87, 87, 0.3);
      color: ${t.colors.crimson};
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .alert-success {
      display: none;
      background: ${t.colors.sageSubtle};
      border: 1px solid rgba(93, 154, 122, 0.3);
      color: ${t.colors.sage};
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand-mark">
      <span>🪐</span>
      <span>Owner Onboarding</span>
    </div>
    <h1>Claim Your Restaurant</h1>
    <p class="subtitle">Set your private owner security PIN to activate your credentials and unlock the command console.</p>

    <div id="error-box" class="alert-error"></div>
    <div id="success-box" class="alert-success"></div>

    <form id="invite-form">
      <div class="form-group">
        <label for="owner-name">Owner Full Name</label>
        <input type="text" id="owner-name" placeholder="e.g. Chef Vikram Oberoi" required />
      </div>

      <div class="form-group">
        <label for="owner-pin">Create Staff PIN (4–6 Digits)</label>
        <input type="password" id="owner-pin" class="pin-input" maxlength="6" inputmode="numeric" placeholder="••••" required />
        <div class="hint">Use a secret 4–6 digit PIN for POS and operations login. Avoid trivial sequences like 1234 or 0000.</div>
      </div>

      <div class="form-group">
        <label for="confirm-pin">Confirm Staff PIN</label>
        <input type="password" id="confirm-pin" class="pin-input" maxlength="6" inputmode="numeric" placeholder="••••" required />
      </div>

      <button type="submit" id="submit-btn" class="btn-submit">
        <span>Activate & Enter Console</span>
        <span>→</span>
      </button>
    </form>
  </div>

  <script>
    const token = ${JSON.stringify(token)};
    const form = document.getElementById('invite-form');
    const errBox = document.getElementById('error-box');
    const okBox = document.getElementById('success-box');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.style.display = 'none';
      okBox.style.display = 'none';

      const name = document.getElementById('owner-name').value.trim();
      const pin = document.getElementById('owner-pin').value.trim();
      const confirmPin = document.getElementById('confirm-pin').value.trim();

      if (!pin || pin.length < 4 || pin.length > 6 || !/^\\d+$/.test(pin)) {
        errBox.textContent = 'PIN must be between 4 and 6 numeric digits.';
        errBox.style.display = 'block';
        return;
      }
      if (pin !== confirmPin) {
        errBox.textContent = 'PINs do not match. Please re-enter.';
        errBox.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Activating...';

      try {
        const res = await fetch('/api/restaurant/auth/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, pin, name })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Failed to activate invite');
        }

        // Store staff token and redirect
        localStorage.setItem('restaurant_staff_token', data.token);
        document.cookie = 'restaurant_staff_token=' + data.token + '; path=/; SameSite=Lax';

        okBox.textContent = '🎉 Restaurant activated! Redirecting to Operations Console...';
        okBox.style.display = 'block';
        form.style.display = 'none';

        setTimeout(() => {
          window.location.href = '/operations';
        }, 1200);
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Activate & Enter Console</span> <span>→</span>';
      }
    });
  </script>
</body>
</html>`;
}

export function renderSuspendedTenantPage(restaurantName = 'Restaurant'): string {
  const t = RestaurantTokens;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${restaurantName} — Temporarily Unavailable</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: ${t.colors.ink};
      color: ${t.colors.linen};
      font-family: ${t.typography.staffFont};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: ${t.colors.charcoal};
      border: 1px solid ${t.colors.surfaceBorder};
      border-radius: 16px;
      padding: 48px 40px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
    }
    .icon {
      font-size: 40px;
      margin-bottom: 20px;
    }
    h1 {
      font-family: ${t.typography.guestHeadFont};
      font-size: 26px;
      font-weight: 500;
      color: ${t.colors.linen};
      margin-bottom: 12px;
    }
    p {
      color: ${t.colors.stone};
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: ${t.colors.amberSubtle};
      border: 1px solid rgba(217, 154, 69, 0.3);
      color: ${t.colors.amber};
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🪐</div>
    <div class="badge">Temporarily Unavailable</div>
    <h1 style="margin-top: 16px;">${restaurantName}</h1>
    <p>This dining storefront and service portal is currently paused for scheduled maintenance or administrative review. Please check back shortly or reach out to management.</p>
  </div>
</body>
</html>`;
}
