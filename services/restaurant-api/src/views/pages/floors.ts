/**
 * 📐 RestaurantOS 2.0 Floor & Service Area Management Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * Real floor and spatial layout management:
 * - Floor Areas (Name, Type, Capacity, Active Layout, Status)
 * - Service-Specific Layouts (Dinner Layout, Lunch Rush, Event)
 * - Real CRUD actions: Switch Layout, Add Service Area, Rename, Archive, Open in Spatial Editor
 */

import { FloorRecord, BranchRecord } from '../../shared';
import { icon } from '../icons';

export function renderFloorsWorkspace(floors: FloorRecord[], currentBranch: BranchRecord): string {
  const branchFloors = floors.filter((f) => f.branchId === currentBranch.id);

  return `
  <div style="padding: 24px; max-width: 1200px; margin: 0 auto; width: 100%;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
          ${currentBranch.name} · Architectural Spaces
        </div>
        <h1 style="font-size: 24px; font-weight: 800; color: var(--color-linen); letter-spacing: -0.02em;">
          Service Areas & Service Layouts
        </h1>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary btn-sm" onclick="openAddFloorModal()">+ Add Service Area</button>
      </div>
    </div>

    <!-- Floors Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px;">
      ${branchFloors
      .map((floor) => {
        const layouts = floor.serviceLayouts || [
          { id: 'lay_default', name: floor.activeLayout || 'Standard Layout', description: 'Default service configuration', tableCount: (floor.tableIds || []).length },
        ];

        return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div style="font-size: 18px; font-weight: 800; color: var(--color-linen);">${floor.name}</div>
                <div style="font-size: 12px; color: var(--color-stone); margin-top: 2px;">
                  Type: <strong style="color:var(--color-copper);">${floor.type}</strong> · Cap: <strong style="color:var(--color-linen);">${floor.capacity} guests</strong>
                </div>
              </div>
              <span class="badge badge-sage">● Active Area</span>
            </div>

            <!-- Active Service Layout Badge & Selector -->
            <div style="background: var(--color-elevated); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 8px; display: flex; justify-content: space-between;">
                <span>Active Service Layout</span>
                <span style="color: var(--color-copper); font-weight: 800;">${floor.tableIds.length} Tables</span>
              </div>
              <div style="font-size: 14px; font-weight: 700; color: var(--color-linen); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                ${icon('layout-grid', { size: 13, color: 'var(--color-copper)' })} <span>${floor.activeLayout}</span>
              </div>

              <!-- Available Configured Layouts -->
              <div style="font-size: 11px; color: var(--color-stone); margin-top: 8px; border-top: 1px solid var(--border-subtle); pt: 8px; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-weight: 600; color: var(--color-muted); margin-top: 4px;">Available Shifts / Layouts:</div>
                ${layouts
            .map(
              (lay) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                    <span>• ${lay.name} (${lay.tableCount} tables)</span>
                    ${lay.name === floor.activeLayout
                  ? `<span style="font-size: 10px; color: var(--color-copper); font-weight: 700;">ACTIVE</span>`
                  : `<button class="btn btn-ghost btn-sm" style="font-size: 10px; padding: 2px 6px;" onclick="switchLayout('${floor.id}', '${lay.name}')">Activate</button>`
                }
                  </div>`
            )
            .join('')}
              </div>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <button class="btn btn-secondary btn-sm" onclick="renameFloor('${floor.id}', '${floor.name}')">Rename</button>
            <a href="/operations/floor?branch=${currentBranch.id}&floor=${floor.id}" class="btn btn-primary btn-sm">
              Open Spatial Canvas ↗
            </a>
          </div>
        </div>`;
      })
      .join('')}
    </div>
  </div>

  <!-- Add Floor Modal -->
  <div id="floor-modal" class="cmdk-backdrop" onclick="if(event.target === this) closeFloorModal()">
    <div style="background: #14181F; border: 1px solid var(--border-strong); border-radius: 12px; width: 100%; max-width: 480px; padding: 24px; box-shadow: 0 16px 40px rgba(0,0,0,0.8);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <h3 style="font-size: 18px; font-weight: 800; color: #FFF;">Add Service Area / Floor</h3>
        <button class="btn btn-ghost btn-sm" onclick="closeFloorModal()" aria-label="Close">${icon('x', { size: 16 })}</button>
      </div>

      <form id="floor-form" onsubmit="handleFloorSubmit(event)" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Area / Floor Name</label>
          <input type="text" id="floor-name" required placeholder="e.g. Garden Pavilion" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Area Type</label>
            <select id="floor-type" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
              <option value="Dining">Dining</option>
              <option value="Bar">Bar Lounge</option>
              <option value="Outdoor">Outdoor Patio</option>
              <option value="Private">Private Dining (PDR)</option>
              <option value="Custom">Custom Zone</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Max Seating Capacity</label>
            <input type="number" id="floor-capacity" required value="40" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); margin-bottom: 6px;">Default Service Layout Name</label>
          <input type="text" id="floor-layout" required value="Dinner Layout" style="width: 100%; background: #0E1216; border: 1px solid var(--border-default); border-radius: 6px; padding: 8px 12px; color: #FFF; font-size: 13px;">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
          <button type="button" class="btn btn-secondary" onclick="closeFloorModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-floor-btn">Create Service Area</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    function openAddFloorModal() {
      document.getElementById('floor-name').value = '';
      document.getElementById('floor-modal').classList.add('open');
    }
  <!-- Rename Floor Modal (replaces native prompt) -->
  <div id="rename-floor-modal" onclick="if(event.target === this) closeRenameFloorModal()" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;">
    <div style="background: #FFFFFF; border-radius: 24px; padding: 28px; width: 380px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
      <h3 style="font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 8px 0;">Rename Service Area</h3>
      <form onsubmit="submitRenameFloor(event)">
        <input type="hidden" id="rename-floor-id" />
        <input type="text" id="rename-floor-input" required placeholder="Service area name" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 14px; margin-bottom: 18px; box-sizing: border-box;" />
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="closeRenameFloorModal()" class="btn btn-secondary" style="border-radius: 9999px; padding: 8px 18px; font-size: 13px;">Cancel</button>
          <button type="submit" class="btn btn-primary" style="border-radius: 9999px; padding: 8px 20px; font-size: 13px;">Save Name</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    function closeFloorModal() {
      document.getElementById('floor-modal').classList.remove('open');
    }

    async function switchLayout(floorId, layoutName) {
      try {
        const res = await fetch('/api/restaurant/floors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SWITCH_LAYOUT',
            floorId,
            layoutName,
          }),
        });
        if (res.ok) window.location.reload();
        else if (window.showToast) window.showToast('Failed to switch layout', 'error');
      } catch (err) {
        if (window.showToast) window.showToast('Failed to switch layout', 'error');
      }
    }

    function renameFloor(floorId, currentName) {
      document.getElementById('rename-floor-id').value = floorId;
      document.getElementById('rename-floor-input').value = currentName || '';
      document.getElementById('rename-floor-modal').style.display = 'flex';
      setTimeout(() => document.getElementById('rename-floor-input').focus(), 40);
    }

    function closeRenameFloorModal() {
      document.getElementById('rename-floor-modal').style.display = 'none';
    }

    async function submitRenameFloor(e) {
      e.preventDefault();
      const floorId = document.getElementById('rename-floor-id').value;
      const newName = document.getElementById('rename-floor-input').value.trim();
      if (!newName) return;
      try {
        const res = await fetch('/api/restaurant/floors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'RENAME', floorId, name: newName }),
        });
        if (res.ok) window.location.reload();
        else if (window.showToast) window.showToast('Failed to rename service area', 'error');
      } catch {
        if (window.showToast) window.showToast('Network error renaming service area', 'error');
      }
    }

    async function handleFloorSubmit(e) {
      e.preventDefault();
      const saveBtn = document.getElementById('save-floor-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Creating...';

      const floorPayload = {
        id: 'floor_' + Date.now().toString(36),
        branchId: '${currentBranch.id}',
        name: document.getElementById('floor-name').value.trim(),
        type: document.getElementById('floor-type').value,
        capacity: parseInt(document.getElementById('floor-capacity').value, 10) || 40,
        activeLayout: document.getElementById('floor-layout').value.trim(),
        status: 'ACTIVE',
        tableIds: [],
        serviceLayouts: [
          { id: 'lay_' + Date.now(), name: document.getElementById('floor-layout').value.trim(), description: 'Initial configured layout', tableCount: 0 }
        ]
      };

      try {
        const res = await fetch('/api/restaurant/floors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(floorPayload),
        });
        if (res.ok) {
          window.location.reload();
        } else {
          if (window.showToast) window.showToast('Failed to save floor', 'error');
        }
      } catch (err) {
        if (window.showToast) window.showToast('Network error saving floor', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Create Service Area';
      }
    }
  </script>
`;
}
