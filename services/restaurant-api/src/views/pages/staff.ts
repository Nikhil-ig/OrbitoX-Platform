/**
 * 🪐 RestaurantOS Modern — R5 Staff & RBAC Permissions Matrix (SCR-OPS-STAFF)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'R5 · Staff & roles.png':
 * - Staff seats quota header ("23 people · 38 of 50 seats used")
 * - Category filter pills (Everyone, Floor, Kitchen, Managers, Locked out · 1)
 * - Staff directory table with avatars, role pills, status badges, and contextual actions (Reset PIN, Unlock, Manage)
 * - Complete 5-Role granular RBAC Matrix card ("What each role can do")
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
  const staffList = staffMembers.length > 0 ? staffMembers : [
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

  return `
  <div class="staff-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header: Meta, Title & Action Buttons -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          23 people · 38 of 50 seats used
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
          Staff
        </h1>
      </div>

      <div style="display: flex; gap: 12px; align-items: center;">
        <button type="button" class="btn btn-secondary" onclick="alert('Registering POS Device terminal...')" style="padding: 9px 20px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
          Add POS device
        </button>
        <button type="button" class="btn btn-primary" onclick="alert('Invite staff member dialog')" style="padding: 9px 22px; font-size: 13px; font-weight: 600; border-radius: 9999px;">
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
      <button type="button" class="staff-tab-red" onclick="filterStaff('locked', this)">
        Locked out · 1
      </button>
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
        <tbody>
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

              // Button styling
              let btnText = 'Manage';
              let btnClass = 'btn-secondary';
              if (s.status === 'Locked out') { btnText = 'Unlock'; btnClass = 'btn-primary'; }
              else if (s.status === 'Invited') { btnText = 'Resend invite'; }
              else if (s.role === 'Server') { btnText = 'Reset PIN'; }
              else if (s.role === 'Device') { btnText = 'Revoke'; btnClass = 'btn-danger'; }

              return `
              <tr style="border-bottom: 1px solid #F8FAFC; transition: background 100ms ease;">
                <td style="padding: 14px 12px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; border-radius: 9999px; background: ${s.avatarBg}; color: #FFFFFF; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      ${s.initials}
                    </div>
                    <span style="font-weight: 700; color: #0F172A;">${s.name}</span>
                  </div>
                </td>
                <td style="padding: 14px 12px;">
                  <span style="background: ${roleBg}; color: ${roleColor}; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">
                    ${s.role}
                  </span>
                </td>
                <td style="padding: 14px 12px; color: #64748B;">${s.branch}</td>
                <td style="padding: 14px 12px; color: #64748B;">${s.station || '—'}</td>
                <td style="padding: 14px 12px;">
                  <span style="background: ${statusBg}; color: ${statusColor}; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">
                    ${s.status}
                  </span>
                </td>
                <td style="padding: 14px 12px; text-align: right;">
                  <button type="button" class="btn ${btnClass} btn-sm" onclick="alert('${btnText} for ${s.name}')" style="border-radius: 9999px; padding: 5px 14px; font-size: 12px;">
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
              { perm: 'Kitchen screen', o: '✓', a: '✓', m: '✓', s: '—', c: '✓' },
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
  </style>

  <script>
    function filterStaff(role, btn) {
      document.querySelectorAll('.staff-tab, .staff-tab-red').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  </script>
  `;
}
