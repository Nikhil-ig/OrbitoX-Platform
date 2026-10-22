/**
 * 📍 RestaurantOS 2.0 Branch & Locations Management Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * Real multi-location operations workspace:
 * - Branch Identity (Name, Code, Address, City, Timezone, Currency)
 * - Operational Status & Health
 * - Service Area & Table fleets
 * - Real CRUD actions: Switch, Edit, Duplicate, Deactivate, Add Branch
 */

import { BranchRecord } from '../../domain';
import { icon } from '../icons';

export function renderLocationsWorkspace(branches: BranchRecord[], currentBranchId: string): string {
  const activeBranch = branches.find((b) => b.id === currentBranchId) || branches[0];

  return `
  <div style="padding: 24px; max-width: 1200px; margin: 0 auto; width: 100%;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
          Organization & Outlets
        </div>
        <h1 style="font-size: 24px; font-weight: 800; color: var(--color-linen); letter-spacing: -0.02em;">
          Restaurant Locations & Branches
        </h1>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary btn-sm" onclick="openAddBranchModal()">+ Add New Branch</button>
      </div>
    </div>

    <!-- Active Location Spotlight Banner -->
    <div style="background: linear-gradient(180deg, #181E27 0%, #11151D 100%); border: 1px solid var(--border-strong); border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
          <span style="font-size: 20px; font-weight: 800; color: #FFF;">${activeBranch.name}</span>
          <span class="badge badge-copper">${activeBranch.code}</span>
          <span class="badge badge-sage">● Active Context</span>
        </div>
        <div style="font-size: 13px; color: var(--color-stone);">
          ${activeBranch.address}, ${activeBranch.city} · ${activeBranch.timezone} · Currency: <strong style="color:var(--color-linen);">${activeBranch.currency}</strong>
        </div>
      </div>
      <div style="display: flex; gap: 16px; text-align: right;">
        <div>
          <div style="font-size: 11px; color: var(--color-stone); text-transform: uppercase;">Service Areas</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--color-linen);">${activeBranch.serviceAreasCount} Floors</div>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--color-stone); text-transform: uppercase;">Active Fleet</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--color-copper);">${activeBranch.activeTablesCount} Tables</div>
        </div>
      </div>
    </div>

    <!-- Branches Fleet Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px;">
      ${branches
        .map((branch) => {
          const isActive = branch.id === currentBranchId;
          const isOperational = branch.status === 'OPERATIONAL';

          return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-color: ${isActive ? 'var(--color-copper)' : 'var(--border-default)'};">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div style="font-size: 17px; font-weight: 800; color: var(--color-linen);">${branch.name}</div>
                <div style="font-size: 12px; color: var(--color-stone); margin-top: 2px;">Code: <code style="color:var(--color-copper);">${branch.code}</code></div>
              </div>
              <span class="badge ${isOperational ? 'badge-sage' : 'badge-neutral'}">
                ${isOperational ? '● Operational' : '○ Setup'}
              </span>
            </div>

            <div style="background: var(--color-elevated); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.6; color: var(--color-stone); margin-bottom: 16px;">
              <div style="display:flex;align-items:center;gap:6px;">${icon('map-pin', { size: 12 })} <strong>Address:</strong> ${branch.address}, ${branch.city}</div>
              <div style="display:flex;align-items:center;gap:6px;">${icon('clock', { size: 12 })} <strong>Timezone:</strong> ${branch.timezone}</div>
              <div style="display:flex;align-items:center;gap:6px;">${icon('credit-card', { size: 12 })} <strong>Currency:</strong> ${branch.currency}</div>
              <div><strong>Floors:</strong> ${branch.serviceAreasCount} Service Areas</div>
              <div><strong>Tables:</strong> ${branch.activeTablesCount} Configured</div>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="editBranch('${branch.id}')">Edit</button>
              <button class="btn btn-secondary btn-sm" onclick="duplicateBranch('${branch.id}')">Duplicate</button>
            </div>
            ${
              isActive
                ? `<span style="font-size: 11px; font-weight: 700; color: var(--color-sage);">Currently Selected</span>`
                : `<a href="/operations/locations?branch=${branch.id}" class="btn btn-primary btn-sm">Switch Branch →</a>`
            }
          </div>
        </div>`;
        })
        .join('')}
    </div>
  </div>

  <!-- Add / Edit Branch Modal -->
  <div id="branch-modal" class="cmdk-backdrop" onclick="if(event.target === this) closeBranchModal()">
    <div style="background: #14181F; border: 1px solid var(--border-strong); border-radius: 12px; width: 100%; max-width: 500px; padding: 24px; box-shadow: 0 16px 40px rgba(0,0,0,0.8);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <h3 id="modal-branch-title" style="font-size: 18px; font-weight: 800; color: #FFF;">Add Restaurant Branch</h3>
        <button class="btn btn-ghost btn-sm" onclick="closeBranchModal()" aria-label="Close">${icon('x', { size: 16 })}</button>
      </div>

      <form id="branch-form" onsubmit="handleBranchSubmit(event)" style="display: flex; flex-direction: column; gap: 14px;">
        <input type="hidden" id="branch-id" value="">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Branch Name</label>
          <input type="text" id="branch-name" required placeholder="e.g. Amritsar Golden Temple Road" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Branch Code</label>
            <input type="text" id="branch-code" required placeholder="e.g. ASR-01" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">City</label>
            <input type="text" id="branch-city" required placeholder="e.g. Amritsar" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
          </div>
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Street Address</label>
          <input type="text" id="branch-address" required placeholder="e.g. Heritage Street, Town Hall" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Timezone</label>
            <input type="text" id="branch-tz" value="Asia/Kolkata" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Currency</label>
            <input type="text" id="branch-currency" value="INR" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
          <button type="button" class="btn btn-secondary" onclick="closeBranchModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-branch-btn">Save Branch</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const branchesData = ${JSON.stringify(branches)};

    function openAddBranchModal() {
      document.getElementById('modal-branch-title').textContent = 'Add Restaurant Branch';
      document.getElementById('branch-id').value = '';
      document.getElementById('branch-name').value = '';
      document.getElementById('branch-code').value = '';
      document.getElementById('branch-city').value = '';
      document.getElementById('branch-address').value = '';
      document.getElementById('branch-modal').classList.add('open');
    }

    function editBranch(id) {
      const b = branchesData.find(item => item.id === id);
      if (!b) return;
      document.getElementById('modal-branch-title').textContent = 'Edit Branch: ' + b.name;
      document.getElementById('branch-id').value = b.id;
      document.getElementById('branch-name').value = b.name;
      document.getElementById('branch-code').value = b.code;
      document.getElementById('branch-city').value = b.city;
      document.getElementById('branch-address').value = b.address;
      document.getElementById('branch-tz').value = b.timezone;
      document.getElementById('branch-currency').value = b.currency;
      document.getElementById('branch-modal').classList.add('open');
    }

    function duplicateBranch(id) {
      const b = branchesData.find(item => item.id === id);
      if (!b) return;
      document.getElementById('modal-branch-title').textContent = 'Duplicate Branch: ' + b.name;
      document.getElementById('branch-id').value = '';
      document.getElementById('branch-name').value = b.name + ' (Copy)';
      document.getElementById('branch-code').value = b.code + '-CP';
      document.getElementById('branch-city').value = b.city;
      document.getElementById('branch-address').value = b.address;
      document.getElementById('branch-tz').value = b.timezone;
      document.getElementById('branch-currency').value = b.currency;
      document.getElementById('branch-modal').classList.add('open');
    }

    function closeBranchModal() {
      document.getElementById('branch-modal').classList.remove('open');
    }

    async function handleBranchSubmit(e) {
      e.preventDefault();
      const saveBtn = document.getElementById('save-branch-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const branchPayload = {
        id: document.getElementById('branch-id').value || ('branch_' + Date.now().toString(36)),
        name: document.getElementById('branch-name').value.trim(),
        code: document.getElementById('branch-code').value.trim().toUpperCase(),
        city: document.getElementById('branch-city').value.trim(),
        address: document.getElementById('branch-address').value.trim(),
        timezone: document.getElementById('branch-tz').value.trim(),
        currency: document.getElementById('branch-currency').value.trim(),
        status: 'OPERATIONAL',
        serviceAreasCount: 1,
        activeTablesCount: 6,
      };

      try {
        const res = await fetch('/api/restaurant/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(branchPayload),
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Failed to save branch');
        }
      } catch (err) {
        alert('Network error saving branch');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Branch';
      }
    }
  </script>
`;
}
