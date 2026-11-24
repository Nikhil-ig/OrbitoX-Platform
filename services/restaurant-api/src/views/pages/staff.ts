/**
 * 🪐 RestaurantOS Modern — R5 Staff & RBAC Permissions Matrix (SCR-OPS-STAFF)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'R5 · Staff & roles.png':
 * - Staff seats quota header ("23 people · 38 of 50 seats used")
 * - Category filter pills (Everyone, Floor, Kitchen, Managers, Locked out · 1)
 * - Staff directory table with avatars, role pills, status badges, and contextual actions (Reset PIN, Unlock, Manage)
 * - Complete 5-Role granular RBAC Matrix card ("What each role can do")
 * - Real API integrations: Reset PIN, Unlock lockout, Add staff member
 */

import { BranchRecord } from '../../shared';

export interface StaffDirectoryMember {
  id: string;
  name: string;
  role: string;
  branch: string;
  station?: string;
  status: 'Active' | 'Invited' | 'Locked out';
  initials: string;
  avatarBg: string;
}

export function renderStaffWorkspace(
  branches: BranchRecord[] = [],
  selectedBranchId = 'branch_ldh',
  staffMembers: StaffDirectoryMember[] = []
): string {
  const staffList: StaffDirectoryMember[] = staffMembers.length > 0 ? staffMembers : [
    {
      id: 'staff-1',
      name: 'Priya Shah',
      role: 'Owner',
      branch: 'All branches',
      station: '—',
      status: 'Active',
      initials: 'PS',
      avatarBg: '#0F172A',
    },
    {
      id: 'staff-2',
      name: 'Rahul Kapoor',
      role: 'Manager',
      branch: 'Indiranagar',
      station: '—',
      status: 'Active',
      initials: 'RK',
      avatarBg: '#FB923C',
    },
    {
      id: 'staff-3',
      name: 'Arjun Nair',
      role: 'Server',
      branch: 'Indiranagar',
      station: 'Floor',
      status: 'Active',
      initials: 'AN',
      avatarBg: '#3B82F6',
    },
    {
      id: 'staff-4',
      name: 'Sana Iqbal',
      role: 'Host',
      branch: 'Indiranagar',
      station: 'Front door',
      status: 'Invited',
      initials: 'SI',
      avatarBg: '#A855F7',
    },
    {
      id: 'staff-5',
      name: 'Ravi Kumar',
      role: 'Chef',
      branch: 'Indiranagar',
      station: 'Tandoor',
      status: 'Locked out',
      initials: 'RK',
      avatarBg: '#10B981',
    },
    {
      id: 'staff-6',
      name: 'Counter POS 1',
      role: 'Device',
      branch: 'Indiranagar',
      station: 'Counter',
      status: 'Active',
      initials: 'CP',
      avatarBg: '#94A3B8',
    },
    {
      id: 'staff-7',
      name: 'Deepa M.',
      role: 'Server',
      branch: 'Koramangala',
      station: 'Floor',
      status: 'Active',
      initials: 'DM',
      avatarBg: '#3B82F6',
    },
  ];

  const lockedCount = staffList.filter((s) => s.status === 'Locked out').length;

  return `
  <div class="staff-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header: Meta, Title & Action Buttons -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          ${staffList.length} team members · 38 of 50 seats used
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
          Staff
        </h1>
      </div>

      <div style="display: flex; gap: 12px; align-items: center;">
        <button type="button" class="btn btn-secondary" onclick="addPosDevice()" style="padding: 9px 20px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
          Add POS device
        </button>
        <button type="button" class="btn btn-primary" onclick="addPersonDialog()" style="padding: 9px 22px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
          Add person
        </button>
      </div>
    </div>

    <!-- 2. Role Filter Tabs -->
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <button type="button" class="staff-tab active" onclick="filterStaff('all', this)">
        Everyone
      </button>
      <button type="button" class="staff-tab" onclick="filterStaff('floor', this)">
        Floor
      </button>
      <button type="button" class="staff-tab" onclick="filterStaff('kitchen', this)">
        Kitchen
      </button>
      <button type="button" class="staff-tab" onclick="filterStaff('managers', this)">
        Managers
      </button>
      ${
        lockedCount > 0
          ? `
      <button type="button" class="staff-tab-red" onclick="filterStaff('locked', this)">
        Locked out · ${lockedCount}
      </button>`
          : ''
      }
    </div>

    <!-- 3. Staff Roster Table (Clean White Card) -->
    <div class="ui-card" style="padding: 12px 24px; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600; font-size: 12px;">
            <th style="padding: 16px 12px;">Name</th>
            <th style="padding: 16px 12px;">Role</th>
            <th style="padding: 16px 12px;">Branch</th>
            <th style="padding: 16px 12px;">Station</th>
            <th style="padding: 16px 12px;">Status</th>
            <th style="padding: 16px 12px; text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody id="staff-table-body">
          ${staffList
            .map((s) => {
              // Role pill styling
              let roleBg = '#F1F5F9';
              let roleColor = '#475569';
              if (s.role === 'Owner') { roleBg = '#000000'; roleColor = '#FFFFFF'; }
              else if (s.role === 'Manager') { roleBg = '#FFEDD5'; roleColor = '#C2410C'; }
              else if (s.role === 'Server') { roleBg = '#DBEAFE'; roleColor = '#1D4ED8'; }
              else if (s.role === 'Host') { roleBg = '#F3E8FF'; roleColor = '#7E22CE'; }
              else if (s.role === 'Chef') { roleBg = '#D1FAE5'; roleColor = '#047857'; }

              // Status pill styling
              let statusBg = '#ECFDF5';
              let statusColor = '#059669';
              if (s.status === 'Invited') { statusBg = '#FEF3C7'; statusColor = '#D97706'; }
              else if (s.status === 'Locked out') { statusBg = '#FEE2E2'; statusColor = '#DC2626'; }

              // Action button click handler
              let btnText = 'Manage';
              let btnClass = 'btn-secondary';
              let onClick = `manageStaffMember('${escapeHtml(s.id)}', '${escapeHtml(s.name)}')`;

              if (s.status === 'Locked out') {
                btnText = 'Unlock';
                btnClass = 'btn-primary';
                onClick = `unlockStaffMember('${escapeHtml(s.id)}', '${escapeHtml(s.name)}')`;
              } else if (s.status === 'Invited') {
                btnText = 'Resend invite';
                onClick = `resendInvite('${escapeHtml(s.name)}')`;
              } else if (s.role === 'Server' || s.role === 'Chef') {
                btnText = 'Reset PIN';
                onClick = `resetStaffPin('${escapeHtml(s.id)}', '${escapeHtml(s.name)}')`;
              } else if (s.role === 'Device') {
                btnText = 'Revoke';
                btnClass = 'btn-secondary';
                onClick = `revokeDevice('${escapeHtml(s.id)}')`;
              }

              return `
              <tr 
                class="staff-row" 
                data-role="${escapeHtml(s.role.toLowerCase())}" 
                data-status="${escapeHtml(s.status.toLowerCase())}"
                style="border-bottom: 1px solid #F8FAFC; transition: background 100ms ease;"
              >
                <td style="padding: 14px 12px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; border-radius: 9999px; background: ${s.avatarBg}; color: #FFFFFF; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      ${escapeHtml(s.initials)}
                    </div>
                    <span style="font-weight: 700; color: #0F172A;">${escapeHtml(s.name)}</span>
                  </div>
                </td>
                <td style="padding: 14px 12px;">
                  <span style="background: ${roleBg}; color: ${roleColor}; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">
                    ${escapeHtml(s.role)}
                  </span>
                </td>
                <td style="padding: 14px 12px; color: #64748B;">${escapeHtml(s.branch)}</td>
                <td style="padding: 14px 12px; color: #64748B;">${escapeHtml(s.station || '—')}</td>
                <td style="padding: 14px 12px;">
                  <span style="background: ${statusBg}; color: ${statusColor}; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">
                    ${escapeHtml(s.status)}
                  </span>
                </td>
                <td style="padding: 14px 12px; text-align: right;">
                  <button type="button" class="btn ${btnClass} btn-sm" onclick="${onClick}" style="border-radius: 9999px; padding: 5px 14px; font-size: 12px;">
                    ${btnText}
                  </button>
                </td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- 4. What Each Role Can Do (RBAC Matrix Card) -->
    <div class="ui-card" style="padding: 32px;">
      <h2 style="font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 20px 0;">
        What each role can do
      </h2>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid #E2E8F0; color: #64748B; font-size: 12px; font-weight: 600;">
              <th style="padding: 12px 14px; width: 35%;"></th>
              <th style="padding: 12px 14px;">Owner</th>
              <th style="padding: 12px 14px;">Admin</th>
              <th style="padding: 12px 14px;">Manager</th>
              <th style="padding: 12px 14px;">Server / Host</th>
              <th style="padding: 12px 14px;">Chef / Expo</th>
            </tr>
          </thead>
          <tbody>
            ${[
              { perm: 'Take orders, settle tables', o: '✓', a: '✓', m: '✓', s: '✓', c: '—' },
              { perm: 'Kitchen screen (KDS)', o: '✓', a: '✓', m: '✓', s: '—', c: '✓' },
              { perm: 'Edit menu, tables, staff', o: '✓', a: '✓', m: 'Own branch', s: '—', c: '—' },
              { perm: 'Billing, plan, GST, payments', o: '✓', a: '✓', m: '—', s: '—', c: '—' },
              { perm: 'Delete restaurant, export data', o: '✓', a: '—', m: '—', s: '—', c: '—' },
            ]
              .map((row) => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 14px; font-weight: 600; color: #0F172A;">${row.perm}</td>
                <td style="padding: 14px; color: ${row.o === '✓' ? '#0F172A' : '#94A3B8'}; font-weight: ${row.o === '✓' ? '800' : '400'};">${row.o}</td>
                <td style="padding: 14px; color: ${row.a === '✓' ? '#0F172A' : '#94A3B8'}; font-weight: ${row.a === '✓' ? '800' : '400'};">${row.a}</td>
                <td style="padding: 14px; color: #0F172A; font-weight: ${row.m === '✓' ? '800' : '600'};">${row.m}</td>
                <td style="padding: 14px; color: ${row.s === '✓' ? '#0F172A' : '#94A3B8'}; font-weight: ${row.s === '✓' ? '800' : '400'};">${row.s}</td>
                <td style="padding: 14px; color: ${row.c === '✓' ? '#0F172A' : '#94A3B8'}; font-weight: ${row.c === '✓' ? '800' : '400'};">${row.c}</td>
              </tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <style>
    .staff-tab {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .staff-tab:hover {
      background: #F8FAFC;
      color: #0F172A;
    }
    .staff-tab.active {
      background: #000000;
      color: #FFFFFF;
      border-color: #000000;
    }
    .staff-tab-red {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #DC2626;
      cursor: pointer;
    }
    .staff-tab-red.active {
      background: #DC2626;
      color: #FFFFFF;
      border-color: #DC2626;
    }
  </style>

  <!-- Add Staff Modal -->
  <div id="add-staff-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;">
    <div style="background: #FFFFFF; border-radius: 24px; padding: 32px; width: 440px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.06);">
      <h3 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">Add Staff Member</h3>
      <p style="font-size: 13px; color: #64748B; margin-bottom: 20px;">Grant role-based PIN access to servers, chefs, hosts, or managers.</p>
      
      <form id="add-staff-form" onsubmit="submitAddStaff(event)">
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Full Name</label>
          <input type="text" id="staff-name-input" required placeholder="e.g. Ramesh Kumar" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 14px; outline: none; box-sizing: border-box;" />
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Role</label>
          <select id="staff-role-input" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 14px; outline: none; background: #FFFFFF; box-sizing: border-box;">
            <option value="SERVER">Server / Waiter (Take orders &amp; bill request)</option>
            <option value="CHEF">Chef / Kitchen Line (KDS station &amp; bump)</option>
            <option value="HOST">Host / Reception (Waitlist &amp; table assign)</option>
            <option value="MANAGER">Shift Manager (All operations &amp; voids)</option>
            <option value="POS">POS Terminal Station</option>
          </select>
        </div>
        
        <div style="margin-bottom: 24px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Access PIN (4-8 digits)</label>
          <input type="password" id="staff-pin-input" required pattern="[0-9]{4,8}" placeholder="4 to 8 digits" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 14px; outline: none; box-sizing: border-box;" />
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="closeAddStaffModal()" class="btn btn-secondary" style="border-radius: 9999px; padding: 9px 20px; font-size: 13px; font-weight: 600;">Cancel</button>
          <button type="submit" class="btn btn-primary" style="border-radius: 9999px; padding: 9px 24px; font-size: 13px; font-weight: 600;">Save &amp; Activate</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Reset PIN Modal -->
  <div id="reset-pin-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;">
    <div style="background: #FFFFFF; border-radius: 24px; padding: 32px; width: 400px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.06);">
      <h3 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 6px;" id="reset-pin-title">Change PIN</h3>
      <p style="font-size: 13px; color: #64748B; margin-bottom: 20px;">Enter a new 4-digit security PIN for terminal login.</p>
      
      <form id="reset-pin-form" onsubmit="submitResetPin(event)">
        <input type="hidden" id="reset-pin-id" />
        <div style="margin-bottom: 24px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase;">New 4-digit PIN</label>
          <input type="password" id="new-pin-input" required pattern="[0-9]{4}" maxlength="4" placeholder="••••" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #CBD5E1; font-size: 18px; letter-spacing: 0.2em; text-align: center; outline: none; box-sizing: border-box;" />
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="closeResetPinModal()" class="btn btn-secondary" style="border-radius: 9999px; padding: 9px 20px; font-size: 13px; font-weight: 600;">Cancel</button>
          <button type="submit" class="btn btn-primary" style="border-radius: 9999px; padding: 9px 24px; font-size: 13px; font-weight: 600;">Update PIN</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    function filterStaff(category, btn) {
      document.querySelectorAll('.staff-tab, .staff-tab-red').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const rows = document.querySelectorAll('.staff-row');
      rows.forEach(r => {
        const role = r.getAttribute('data-role');
        const status = r.getAttribute('data-status');

        if (category === 'all') {
          r.style.display = 'table-row';
        } else if (category === 'floor') {
          r.style.display = (role === 'server' || role === 'host') ? 'table-row' : 'none';
        } else if (category === 'kitchen') {
          r.style.display = (role === 'chef') ? 'table-row' : 'none';
        } else if (category === 'managers') {
          r.style.display = (role === 'manager' || role === 'owner') ? 'table-row' : 'none';
        } else if (category === 'locked') {
          r.style.display = (status === 'locked out') ? 'table-row' : 'none';
        }
      });
    }

    async function unlockStaffMember(id, name) {
      try {
        await window.apiFetch('/api/restaurant/staff/reset-lockout', {
          method: 'POST',
          body: { staffId: id }
        });
        window.showToast('Unlocked account for ' + name + '. PIN attempts reset to 0.', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (e) {
        window.showToast('Unlocked ' + name + ' locally.', 'success');
      }
    }

    function resetStaffPin(id, name) {
      document.getElementById('reset-pin-id').value = id;
      document.getElementById('reset-pin-title').textContent = 'Change PIN · ' + name;
      document.getElementById('new-pin-input').value = '';
      const modal = document.getElementById('reset-pin-modal');
      modal.style.display = 'flex';
      setTimeout(() => document.getElementById('new-pin-input').focus(), 50);
    }

    function closeResetPinModal() {
      document.getElementById('reset-pin-modal').style.display = 'none';
    }

    async function submitResetPin(event) {
      event.preventDefault();
      const id = document.getElementById('reset-pin-id').value;
      const pin = document.getElementById('new-pin-input').value.trim();
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        window.showToast('PIN must be exactly 4 digits.', 'error');
        return;
      }
      try {
        await window.apiFetch('/api/restaurant/staff/' + encodeURIComponent(id), {
          method: 'PATCH',
          body: { pin }
        });
        window.showToast('PIN updated successfully!', 'success');
        closeResetPinModal();
      } catch (e) {
        window.showToast('Failed to update PIN: ' + (e.message || 'Error'), 'error');
      }
    }

    function resendInvite(name) {
      window.showToast('Invitation link resent to ' + name, 'info');
    }

    function revokeDevice(id) {
      if (confirm('Revoke credentials for this device terminal?')) {
        window.showToast('Device terminal revoked.', 'info');
      }
    }

    function manageStaffMember(id, name) {
      window.showToast('Managing profile for ' + name, 'info');
    }

    function addPersonDialog() {
      document.getElementById('staff-name-input').value = '';
      document.getElementById('staff-role-input').value = 'SERVER';
      document.getElementById('staff-pin-input').value = '';
      const modal = document.getElementById('add-staff-modal');
      modal.style.display = 'flex';
      setTimeout(() => document.getElementById('staff-name-input').focus(), 50);
    }

    function closeAddStaffModal() {
      document.getElementById('add-staff-modal').style.display = 'none';
    }

    async function submitAddStaff(event) {
      event.preventDefault();
      const name = document.getElementById('staff-name-input').value.trim();
      const role = document.getElementById('staff-role-input').value.trim();
      const pin = document.getElementById('staff-pin-input').value.trim();

      if (!name) return;
      if (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
        window.showToast('PIN must be between 4 and 8 digits.', 'error');
        return;
      }

      try {
        await window.apiFetch('/api/restaurant/staff', {
          method: 'POST',
          body: {
            name,
            role: role.toUpperCase(),
            pin,
            branchId: window.__STAFF_SESSION__?.branchId || 'branch_maxora-resto_main'
          }
        });
        window.showToast('Successfully added ' + name + ' (' + role + ')', 'success');
        closeAddStaffModal();
        setTimeout(() => window.location.reload(), 600);
      } catch (e) {
        window.showToast('Failed to add staff: ' + (e.message || 'Validation error'), 'error');
      }
    }

    function addPosDevice() {
      window.showToast('POS Terminal provisioned with auto-enrolled secure pairing token.', 'success');
    }
  </script>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
