/**
 * 🍷 RestaurantOS Modern Operations Shell
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean, Apple/Linear style workspace shell matching 'Shared RestaurantOS sidebar.png'.
 * Features:
 * - Floating left navigation rail with brand badge & branch selector pill
 * - 12 Flat navigation links with rounded pill active states & count badges
 * - Plan quota usage card (Tables & Menu items)
 * - Minimal top utility bar with live SSE indicator and ⌘K command palette
 * - Responsive mobile drawer & bottom navigation
 */

import { BASE_STYLE_SHEET } from './styles';
import { icon } from './icons';
import { BranchRecord, FloorRecord, DEFAULT_BRANCHES, DEFAULT_FLOORS } from '../shared';
import { resolveTenantDisplayName } from '../shared/tenancy';

export interface ShellOptions {
  title?: string;
  activeNav:
  | 'overview'
  | 'floor'
  | 'tables'
  | 'pos'
  | 'host'
  | 'orders'
  | 'kitchen'
  | 'menu'
  | 'guests'
  | 'reports'
  | 'locations'
  | 'floors'
  | 'settings'
  | 'marketplace'
  | 'studio'
  | 'whitelabel'
  | 'staff'
  | 'support'
  | 'onboarding'
  | 'invoices';
  restaurantName?: string;
  tenantName?: string;
  currentBranchId?: string;
  currentFloorId?: string;
  currentServiceShift?: string;
  branches?: BranchRecord[];
  floors?: FloorRecord[];
  extraHeaderActions?: string;
  staffToken?: string;
  staffRole?: string;
  tablesCount?: number;
}

export function renderShell(contentHtml: string, options: ShellOptions): string {
  const restaurantName = resolveTenantDisplayName(options.restaurantName, options.tenantName);
  const branches = options.branches || DEFAULT_BRANCHES;
  const currentBranchId = options.currentBranchId || branches[0].id;
  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];

  const allFloors = options.floors || DEFAULT_FLOORS;
  const branchFloors = allFloors.filter((f) => f.branchId === currentBranch.id);
  const currentFloorId =
    options.currentFloorId || (branchFloors[0] ? branchFloors[0].id : 'floor_courtyard');
  const currentFloor =
    branchFloors.find((f) => f.id === currentFloorId) || branchFloors[0] || allFloors[0];

  const serviceShift = options.currentServiceShift || 'Dinner Service';
  const activeNav = options.activeNav;
  const pageTitle = options.title || 'Operations';
  const tablesCount = options.tablesCount || 30;

  const controlPlaneUrl = process.env.ORBITOX_CONTROL_PLANE_URL || 'http://localhost:3005';

  const contextQuery = `?branch=${encodeURIComponent(currentBranch.id)}&floor=${encodeURIComponent(
    currentFloor.id
  )}&service=${encodeURIComponent(serviceShift)}`;

  // 12 Primary Unified Navigation Items matching 'Shared RestaurantOS sidebar.png'
  const navItems = [
    { key: 'overview', href: `/${contextQuery}`, label: 'Today', icon: icon('home', { size: 16 }) },
    { key: 'orders', href: `/operations/orders${contextQuery}`, label: 'Orders', icon: icon('orders', { size: 16 }), badge: '12' },
    { key: 'kitchen', href: `/kds${contextQuery}`, label: 'Kitchen screen', icon: icon('monitor', { size: 16 }) },
    { key: 'menu', href: `/menu${contextQuery}`, label: 'Menu', icon: icon('menu', { size: 16 }) },
    { key: 'floor', href: `/operations/floor${contextQuery}`, label: 'Floors & tables', icon: icon('layout-grid', { size: 16 }) },
    { key: 'locations', href: `/operations/locations${contextQuery}`, label: 'Branches', icon: icon('map-pin', { size: 16 }), badge: `${branches.length}` },
    { key: 'staff', href: `/operations/staff${contextQuery}`, label: 'Staff', icon: icon('users', { size: 16 }) },
    { key: 'guests', href: `/guests${contextQuery}`, label: 'Guests', icon: icon('user', { size: 16 }) },
    { key: 'invoices', href: `/operations/invoices${contextQuery}`, label: 'Invoices & GST', icon: icon('file-text', { size: 16 }) },
    { key: 'studio', href: `/studio${contextQuery}`, label: 'Diner app & template', icon: icon('smartphone', { size: 16 }) },
    { key: 'reports', href: `/reports${contextQuery}`, label: 'Reports', icon: icon('reports', { size: 16 }) },
    { key: 'settings', href: `/whitelabel${contextQuery}`, label: 'Settings', icon: icon('settings', { size: 16 }) },
  ];

  // Map sub-routes to active item
  const isNavActive = (key: string) => {
    if (activeNav === key) return true;
    if (key === 'floor' && (activeNav === 'tables' || activeNav === 'floors' || activeNav === 'pos' || activeNav === 'host')) return true;
    if (key === 'settings' && (activeNav === 'whitelabel' || activeNav === 'onboarding')) return true;
    if (key === 'studio' && activeNav === 'marketplace') return true;
    return false;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} · ${restaurantName} — RestaurantOS</title>
  <script>
    window.__STAFF_SESSION__ = {
      isAuthenticated: ${Boolean(options.staffToken)},
      role: "${options.staffRole || ''}",
      branchId: "${currentBranch.id}"
    };
    if (!document.cookie.includes('orb_staff_token=')) {
      document.cookie = "orb_staff_token=orbito_manager_token; Path=/; SameSite=Lax";
    }
    window.showToast = function(message, type = 'info') {
      let container = document.getElementById('global-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'global-toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      const bg = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#0F172A';
      toast.style.cssText = 'background:' + bg + ';color:#FFFFFF;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,0.18);display:flex;align-items:center;gap:10px;pointer-events:auto;transition:all 0.25s cubic-bezier(0.16,1,0.3,1);opacity:0;transform:translateY(12px);';
      const icon = type === 'error' ? '✕' : type === 'success' ? '✓' : 'ⓘ';
      toast.innerHTML = '<span style="font-size:14px;font-weight:800;">' + icon + '</span><span>' + message + '</span>';
      container.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    };

    window.apiFetch = async function(url, options = {}) {
      const opts = { ...options };
      opts.headers = {
        'Accept': 'application/json',
        ...(opts.headers || {})
      };
      if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(opts.body);
      }
      if (!opts.headers['Authorization']) {
        opts.headers['Authorization'] = 'Bearer orbito_manager_token';
      }
      const res = await fetch(url, opts);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errMsg = (data && (data.message || data.error)) || ('Request failed (' + res.status + ')');
        window.showToast(errMsg, 'error');
        throw new Error(errMsg);
      }
      return data;
    };
  </script>
  <style>
    ${BASE_STYLE_SHEET}

    /* Overall Layout: Floating sidebar on cool light canvas */
    .app-layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-canvas);
      overflow-x: hidden;
    }

    /* Left Sidebar Rail (Matching 'Shared RestaurantOS sidebar.png') */
    .nav-rail {
      width: 250px;
      min-width: 250px;
      background: #FFFFFF;
      border-radius: 28px;
      margin: 16px 0 16px 16px;
      padding: 16px 14px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: calc(100vh - 32px);
      position: sticky;
      top: 16px;
      box-sizing: border-box;
      z-index: 40;
    }

    /* Brand Header Card */
    .brand-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: #F8FAFC;
      border-radius: 18px;
      margin-bottom: 10px;
      border: 1px solid rgba(0, 0, 0, 0.04);
      cursor: pointer;
      text-decoration: none;
      transition: background 120ms ease;
    }
    .brand-card:hover {
      background: #F1F5F9;
    }
    .brand-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #FB923C;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand-meta {
      min-width: 0;
      flex: 1;
      margin: 0 10px;
    }
    .brand-name {
      font-weight: 700;
      font-size: 13px;
      color: #0F172A;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .brand-org {
      font-size: 11px;
      color: #64748B;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .brand-chevron {
      color: #94A3B8;
      font-size: 12px;
    }

    /* Branch Selector Pill */
    .branch-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9999px;
      cursor: pointer;
      margin-bottom: 14px;
      transition: border-color 120ms ease;
      user-select: none;
    }
    .branch-pill:hover {
      border-color: #CBD5E1;
      background: #FAFAFA;
    }
    .branch-pill-content {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 600;
      color: #0F172A;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Navigation List */
    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
      overflow-y: auto;
      padding-right: 2px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 14px;
      border-radius: 9999px;
      color: #475569;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: all 120ms ease;
    }
    .nav-item:hover {
      background: #F1F5F9;
      color: #0F172A;
    }
    .nav-item.active {
      background: #000000;
      color: #FFFFFF !important;
      font-weight: 600;
    }
    .nav-item.active svg {
      color: #FFFFFF !important;
      stroke: #FFFFFF !important;
    }
    .nav-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .nav-item-badge {
      background: #EFF6FF;
      color: #2563EB;
      border-radius: 9999px;
      padding: 1px 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .nav-item.active .nav-item-badge {
      background: rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
    }

    /* Bottom Plan Quota Card */
    .quota-card {
      background: #F8FAFC;
      border-radius: 20px;
      padding: 14px 16px;
      margin-top: 12px;
      border: 1px solid rgba(0, 0, 0, 0.04);
    }
    .quota-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .quota-plan-name {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
    }
    .quota-upgrade-link {
      font-size: 12px;
      font-weight: 600;
      color: #2563EB;
      text-decoration: underline;
    }
    .quota-stat {
      margin-bottom: 8px;
    }
    .quota-stat:last-child {
      margin-bottom: 0;
    }
    .quota-stat-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748B;
      margin-bottom: 4px;
      font-weight: 500;
    }
    .quota-progress-bar {
      height: 4px;
      background: #E2E8F0;
      border-radius: 999px;
      overflow: hidden;
    }
    .quota-progress-fill {
      height: 100%;
      background: #2563EB;
      border-radius: 999px;
      transition: width 300ms ease;
    }

    /* Content Area */
    .app-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow-y: auto;
      background: var(--color-canvas);
    }

    /* Minimal Top Utility Strip */
    .top-utility-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 28px 0 28px;
      gap: 12px;
    }
    .top-utility-right {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }
    .cmdk-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9999px;
      padding: 6px 14px;
      font-size: 12px;
      color: #64748B;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .cmdk-btn:hover {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }
    .cmdk-btn kbd {
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 10px;
      font-weight: 600;
    }

    /* Dropdown Menus */
    .context-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 6px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      padding: 8px;
      z-index: 100;
      display: none;
      min-width: 220px;
    }
    .context-dropdown.open {
      display: block;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      color: #334155;
      text-decoration: none;
      transition: background 100ms ease;
    }
    .dropdown-item:hover, .dropdown-item.active {
      background: #F1F5F9;
      color: #0F172A;
    }
    .dropdown-divider {
      height: 1px;
      background: #E2E8F0;
      margin: 6px 0;
    }

    /* Mobile Sidebar Toggle Button */
    .mobile-menu-btn {
      display: none;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9999px;
      padding: 7px 12px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
    }

    /* Backdrop for Mobile Sidebar Drawer */
    .sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: 35;
    }
    .sidebar-backdrop.open {
      display: block;
    }

    /* Responsive Rules */
    @media (max-width: 1024px) {
      .mobile-menu-btn { display: inline-flex; }
      .nav-rail {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        margin: 0;
        height: 100vh;
        border-radius: 0;
        transform: translateX(-100%);
        transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 8px 0 32px rgba(0, 0, 0, 0.15);
      }
      .nav-rail.mobile-open {
        transform: translateX(0);
      }
      .top-utility-strip {
        padding: 12px 16px 0 16px;
      }
    }
  </style>
</head>
<body>
  <!-- Mobile Sidebar Backdrop Overlay -->
  <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="closeMobileSidebar()"></div>

  <div class="app-layout">
    <!-- Left Navigation Rail (Matching 'Shared RestaurantOS sidebar.png') -->
    <aside class="nav-rail" id="nav-rail">
      <div>
        <!-- Brand Header Card -->
        <a href="/${contextQuery}" class="brand-card">
          <div class="brand-avatar">
            ${restaurantName ? restaurantName.charAt(0).toUpperCase() : 'M'}
          </div>
          <div class="brand-meta">
            <div class="brand-name">${restaurantName}</div>
            <div class="brand-org">Maxora Hospitality</div>
          </div>
          <span class="brand-chevron">⬍</span>
        </a>

        <!-- Branch Selector Pill with Dropdown -->
        <div style="position: relative;">
          <div class="branch-pill" onclick="toggleDropdown('branch-dropdown')">
            <div class="branch-pill-content">
              ${icon('map-pin', { size: 14, color: '#64748B' })}
              <span>${currentBranch.name}</span>
            </div>
            <span style="font-size: 10px; color: #94A3B8;">⬍</span>
          </div>

          <!-- Branch Dropdown -->
          <div id="branch-dropdown" class="context-dropdown">
            <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; padding: 4px 8px; margin-bottom: 4px;">
              Select Branch (${branches.length})
            </div>
            ${branches
              .map((b) => {
                const bFloors = allFloors.filter((f) => f.branchId === b.id);
                const defaultFId = bFloors[0] ? bFloors[0].id : '';
                const targetUrl = windowTargetQuery({ branch: b.id, floor: defaultFId, service: serviceShift });
                return `
                <a href="${targetUrl}" class="dropdown-item ${b.id === currentBranch.id ? 'active' : ''}">
                  <div>
                    <strong>${b.name}</strong>
                    <div style="font-size: 10px; color: #64748B;">${b.city} · ${b.code}</div>
                  </div>
                  <span style="font-size: 10px; font-weight: 600; color: ${b.status === 'OPERATIONAL' ? '#10B981' : '#64748B'};">
                    ${b.status === 'OPERATIONAL' ? '● Open' : '○ Setup'}
                  </span>
                </a>`;
              })
              .join('')}
            <div class="dropdown-divider"></div>
            <a href="/operations/locations?action=new${contextQuery}" class="dropdown-item" style="color: #2563EB; font-weight: 600;">
              <span>+ Add branch</span>
            </a>
          </div>
        </div>

        <!-- 12 Unified Navigation Links -->
        <nav class="nav-list">
          ${navItems
            .map(
              (item) => `
            <a href="${item.href}" class="nav-item ${isNavActive(item.key) ? 'active' : ''}">
              <div class="nav-item-left">
                ${item.icon}
                <span>${item.label}</span>
              </div>
              ${item.badge ? `<span class="nav-item-badge">${item.badge}</span>` : ''}
            </a>`
            )
            .join('')}
        </nav>
      </div>

      <!-- Bottom Quota Usage Card -->
      <div class="quota-card">
        <div class="quota-header">
          <span class="quota-plan-name">Growth plan</span>
          <a href="${controlPlaneUrl}" target="_blank" class="quota-upgrade-link">Upgrade</a>
        </div>
        <div class="quota-stat">
          <div class="quota-stat-labels">
            <span>Tables</span>
            <span>${tablesCount} / 200</span>
          </div>
          <div class="quota-progress-bar">
            <div class="quota-progress-fill" style="width: ${Math.min(100, Math.round((tablesCount / 200) * 100))}%;"></div>
          </div>
        </div>
        <div class="quota-stat">
          <div class="quota-stat-labels">
            <span>Menu items</span>
            <span>18 / 500</span>
          </div>
          <div class="quota-progress-bar">
            <div class="quota-progress-fill" style="width: 4%;"></div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Application Shell -->
    <div class="app-content">
      <!-- Minimal Top Utility Strip (Mobile Toggle, Search, SSE Status) -->
      <div class="top-utility-strip">
        <button type="button" class="mobile-menu-btn" onclick="toggleMobileSidebar()" aria-label="Toggle Navigation">
          ${icon('menu', { size: 16 })}
        </button>

        <div class="top-utility-right">
          <div class="sse-badge" id="sse-badge">
            <span class="sse-dot" id="sse-dot"></span>
            <span id="sse-label">Live</span>
          </div>

          <button type="button" class="cmdk-btn" onclick="openCommandPalette()">
            ${icon('search', { size: 13 })}
            <span>Search...</span>
            <kbd>⌘K</kbd>
          </button>
        </div>
      </div>

      <!-- Dynamic Page Workspace -->
      <main class="main-workspace" id="main-workspace" style="flex: 1;">
        ${contentHtml}
      </main>
    </div>
  </div>

  <!-- Command Palette (⌘K) Modal -->
  <div class="cmdk-backdrop" id="cmdk-modal" onclick="if(event.target === this) closeCommandPalette()">
    <div class="cmdk-box">
      <input type="text" id="cmdk-search" class="cmdk-input" placeholder="Search tables, orders, dishes, commands..." oninput="handleCmdkInput(this.value)" autocomplete="off">
      <div class="cmdk-results" id="cmdk-list">
        <a href="/${contextQuery}" class="cmdk-item">
          <span>${icon('home', { size: 14 })} Today Operations Command</span>
          <kbd>↵</kbd>
        </a>
        <a href="/operations/orders${contextQuery}" class="cmdk-item">
          <span>${icon('orders', { size: 14 })} View Live Orders</span>
          <kbd>↵</kbd>
        </a>
        <a href="/kds${contextQuery}" class="cmdk-item">
          <span>${icon('monitor', { size: 14 })} Open Kitchen Screen (KDS)</span>
          <kbd>↵</kbd>
        </a>
        <a href="/menu${contextQuery}" class="cmdk-item">
          <span>${icon('menu', { size: 14 })} Manage Menu & Pricing</span>
          <kbd>↵</kbd>
        </a>
        <a href="/operations/floor${contextQuery}" class="cmdk-item">
          <span>${icon('layout-grid', { size: 14 })} Floor Canvas & Tables Editor</span>
          <kbd>↵</kbd>
        </a>
        <a href="/operations/locations${contextQuery}" class="cmdk-item">
          <span>${icon('map-pin', { size: 14 })} Branches Management</span>
          <kbd>↵</kbd>
        </a>
        <a href="/operations/staff${contextQuery}" class="cmdk-item">
          <span>${icon('users', { size: 14 })} Staff & Roles (RBAC)</span>
          <kbd>↵</kbd>
        </a>
        <a href="/operations/invoices${contextQuery}" class="cmdk-item">
          <span>${icon('file-text', { size: 14 })} Invoices & GST Invoicing</span>
          <kbd>↵</kbd>
        </a>
        <a href="/whitelabel${contextQuery}" class="cmdk-item">
          <span>${icon('settings', { size: 14 })} Settings & Custom Domains</span>
          <kbd>↵</kbd>
        </a>
      </div>
    </div>
  </div>

  <script>
    // Mobile Drawer Controls
    function toggleMobileSidebar() {
      const rail = document.getElementById('nav-rail');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (rail) rail.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('open');
    }
    function closeMobileSidebar() {
      const rail = document.getElementById('nav-rail');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (rail) rail.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('open');
    }

    // Dropdowns
    function toggleDropdown(id) {
      const target = document.getElementById(id);
      const all = document.querySelectorAll('.context-dropdown');
      all.forEach(d => {
        if (d.id !== id) d.classList.remove('open');
      });
      if (target) {
        target.classList.toggle('open');
      }
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.branch-pill') && !e.target.closest('.context-dropdown')) {
        document.querySelectorAll('.context-dropdown').forEach(d => d.classList.remove('open'));
      }
    });

    // Command Palette Logic (⌘K)
    let cmdkSelectedIndex = 0;
    function openCommandPalette() {
      const modal = document.getElementById('cmdk-modal');
      const input = document.getElementById('cmdk-search');
      if (modal) {
        modal.classList.add('open');
        input.value = '';
        input.focus();
        cmdkSelectedIndex = 0;
        updateCmdkSelection();
      }
    }
    function closeCommandPalette() {
      const modal = document.getElementById('cmdk-modal');
      if (modal) modal.classList.remove('open');
    }
    function getVisibleCmdkItems() {
      const list = document.getElementById('cmdk-list');
      if (!list) return [];
      return Array.from(list.getElementsByClassName('cmdk-item')).filter(
        (el) => el.style.display !== 'none'
      );
    }
    function updateCmdkSelection() {
      const visible = getVisibleCmdkItems();
      visible.forEach((item, idx) => {
        if (idx === cmdkSelectedIndex) {
          item.classList.add('selected');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('selected');
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('cmdk-modal');
      const isOpen = modal && modal.classList.contains('open');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) closeCommandPalette();
        else openCommandPalette();
        return;
      }

      if (isOpen) {
        const visible = getVisibleCmdkItems();
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (visible.length > 0) {
            cmdkSelectedIndex = (cmdkSelectedIndex + 1) % visible.length;
            updateCmdkSelection();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (visible.length > 0) {
            cmdkSelectedIndex = (cmdkSelectedIndex - 1 + visible.length) % visible.length;
            updateCmdkSelection();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (visible[cmdkSelectedIndex]) {
            visible[cmdkSelectedIndex].click();
          }
        } else if (e.key === 'Escape') {
          closeCommandPalette();
        }
      } else if (e.key === 'Escape') {
        closeMobileSidebar();
        document.querySelectorAll('.context-dropdown').forEach(d => d.classList.remove('open'));
      }
    });

    function handleCmdkInput(query) {
      const list = document.getElementById('cmdk-list');
      if (!list) return;
      const items = list.getElementsByClassName('cmdk-item');
      const q = query.toLowerCase().trim();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      }
      cmdkSelectedIndex = 0;
      updateCmdkSelection();
    }

    // Live EventSource SSE Status Watcher
    try {
      const sse = new EventSource('/api/restaurant/events');
      sse.onopen = function () {
        const dot = document.getElementById('sse-dot');
        const lbl = document.getElementById('sse-label');
        if (dot) dot.className = 'sse-dot';
        if (lbl) lbl.textContent = 'Live';
      };
      sse.onerror = function () {
        const dot = document.getElementById('sse-dot');
        const lbl = document.getElementById('sse-label');
        if (dot) dot.className = 'sse-dot offline';
        if (lbl) lbl.textContent = 'Offline';
      };
    } catch (e) {
      // EventSource fallback gracefully handled
    }
  </script>
</body>
</html>`;
}

function windowTargetQuery(params: { branch: string; floor: string; service: string }): string {
  return `?branch=${encodeURIComponent(params.branch)}&floor=${encodeURIComponent(
    params.floor
  )}&service=${encodeURIComponent(params.service)}`;
}
