/**
 * 🍷 RestaurantOS 2.0 Desktop & Mobile Operations Shell
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional Linear/Apple style workspace shell.
 * Features:
 * - True Global Hierarchical Context Switcher (Branch ▾, Floor ▾, Service ▾)
 * - Dynamic context propagation across all workspaces
 * - Interactive dropdowns with Add/Manage actions
 * - Collapsible 220px left rail, top context bar with breadcrumbs & service status
 * - Live SSE EventSource connection indicator with pulsating status
 * - Accessible Command Palette (⌘K) with keyboard arrow traversal
 * - Responsive mobile drawer & bottom navigation
 * - Verified external link to OrbitoX Control Plane
 */

import { BASE_STYLE_SHEET } from './styles';
import { icon } from './icons';
import { BranchRecord, FloorRecord, DEFAULT_BRANCHES, DEFAULT_FLOORS } from '../domain';

export interface ShellOptions {
  title?: string;
  activeNav:
    | 'overview'
    | 'floor'
    | 'tables'
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
    | 'onboarding';
  restaurantName?: string;
  currentBranchId?: string;
  currentFloorId?: string;
  currentServiceShift?: string;
  branches?: BranchRecord[];
  floors?: FloorRecord[];
  extraHeaderActions?: string;
  staffToken?: string;
  staffRole?: string;
}

export function renderShell(contentHtml: string, options: ShellOptions): string {
  const restaurantName = options.restaurantName || 'OrbitoX Bistro';
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

  const controlPlaneUrl = process.env.ORBITOX_CONTROL_PLANE_URL || 'http://localhost:3005';

  const contextQuery = `?branch=${encodeURIComponent(currentBranch.id)}&floor=${encodeURIComponent(
    currentFloor.id
  )}&service=${encodeURIComponent(serviceShift)}`;

  // Breadcrumb Section Mapping
  const sectionMap: Record<string, string> = {
    overview: 'Operations',
    floor: 'Operations',
    tables: 'Operations',
    orders: 'Operations',
    kitchen: 'Operations',
    menu: 'Catalog & Guests',
    guests: 'Catalog & Guests',
    reports: 'Catalog & Guests',
    studio: 'Brand & Studio',
    marketplace: 'Brand & Studio',
    whitelabel: 'Brand & Studio',
    staff: 'Management & Support',
    locations: 'Management & Support',
    floors: 'Management & Support',
    support: 'Management & Support',
    settings: 'Management & Support',
    onboarding: 'Management & Support',
  };
  const currentSection = sectionMap[activeNav] || 'Operations';

  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        { key: 'overview', href: `/${contextQuery}`, label: 'Overview', icon: icon('overview', { size: 15 }) },
        { key: 'floor', href: `/operations/floor${contextQuery}`, label: 'Floor Canvas', icon: icon('floor', { size: 15 }) },
        { key: 'tables', href: `/operations/tables${contextQuery}`, label: 'Tables', icon: icon('tables', { size: 15 }) },
        { key: 'orders', href: `/operations/orders${contextQuery}`, label: 'Orders', icon: icon('orders', { size: 15 }) },
        { key: 'kitchen', href: `/kds${contextQuery}`, label: 'Kitchen KDS', icon: icon('kitchen', { size: 15 }) },
      ],
    },
    {
      title: 'CATALOG & GUESTS',
      items: [
        { key: 'menu', href: `/menu${contextQuery}`, label: 'Menu Catalog', icon: icon('menu', { size: 15 }) },
        { key: 'guests', href: `/guests${contextQuery}`, label: 'Active Guests', icon: icon('guests', { size: 15 }) },
        { key: 'reports', href: `/reports${contextQuery}`, label: 'Analytics', icon: icon('reports', { size: 15 }) },
      ],
    },
    {
      title: 'BRAND & STUDIO',
      items: [
        { key: 'studio', href: `/studio${contextQuery}`, label: 'Brand Studio', icon: icon('studio', { size: 15 }) },
        { key: 'marketplace', href: `/marketplace${contextQuery}`, label: 'Templates', icon: icon('marketplace', { size: 15 }) },
        { key: 'whitelabel', href: `/white-label${contextQuery}`, label: 'White-Label & Domains', icon: icon('whitelabel', { size: 15 }) },
      ],
    },
    {
      title: 'MANAGEMENT & SUPPORT',
      items: [
        { key: 'onboarding', href: `/operations/onboarding${contextQuery}`, label: 'Onboarding Checklist', icon: icon('sparkles', { size: 15 }) },
        { key: 'staff', href: `/staff${contextQuery}`, label: 'Staff & Security', icon: icon('staff', { size: 15 }) },
        { key: 'locations', href: `/operations/locations${contextQuery}`, label: 'Branches', icon: icon('locations', { size: 15 }) },
        { key: 'floors', href: `/operations/floors${contextQuery}`, label: 'Floor Plans', icon: icon('floors', { size: 15 }) },
        { key: 'support', href: `/support${contextQuery}`, label: 'Support Desk', icon: icon('support', { size: 15 }) },
      ],
    },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title ? `${options.title} · ` : ''}${restaurantName} — RestaurantOS</title>
  <script>
    window.__STAFF_SESSION__ = {
      isAuthenticated: ${Boolean(options.staffRole)},
      role: "${options.staffRole || ''}",
      branchId: "${currentBranch.id}"
    };
  </script>
  <style>
    ${BASE_STYLE_SHEET}

    /* Shell Layout */
    .app-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--color-ink);
    }

    /* Left Sidebar Rail (220px fixed desktop) */
    .nav-rail {
      width: 220px;
      min-width: 220px;
      background: var(--color-charcoal);
      border-right: 1px solid var(--border-default);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), width 160ms ease;
      z-index: 40;
    }
    .nav-brand {
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .brand-mark {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--color-copper);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 14px;
      flex-shrink: 0;
    }
    .brand-title {
      font-weight: 700;
      font-size: 14px;
      letter-spacing: -0.01em;
      color: var(--color-linen);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .brand-sub {
      font-size: 11px;
      color: var(--color-stone);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-list {
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      overflow-y: auto;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 12px;
      border-radius: 6px;
      color: var(--color-stone);
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: all 120ms ease;
      position: relative;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--color-linen);
    }
    .nav-item.active {
      background: var(--color-copper-subtle);
      color: var(--color-copper);
      font-weight: 600;
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      border-radius: 0 2px 2px 0;
      background: var(--color-copper);
    }
    .nav-icon {
      font-size: 14px;
      width: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0.85;
      flex-shrink: 0;
    }

    .nav-footer {
      padding: 12px 14px;
      border-top: 1px solid var(--border-subtle);
      font-size: 11px;
      color: var(--color-muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-footer a {
      color: var(--color-stone);
      text-decoration: none;
    }
    .nav-footer a:hover {
      color: var(--color-linen);
    }

    /* Content Area */
    .app-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
      background: var(--color-ink);
    }

    /* Top Bar */
    .top-bar {
      height: 52px;
      background: var(--color-charcoal);
      border-bottom: 1px solid var(--border-default);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      gap: 12px;
      z-index: 20;
    }

    /* Mobile Sidebar Toggle Button */
    .sidebar-toggle {
      display: none;
      background: transparent;
      border: 1px solid var(--border-default);
      border-radius: 6px;
      color: var(--color-linen);
      padding: 6px 8px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
    }
    .sidebar-toggle:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    /* Backdrop for Mobile Sidebar Drawer */
    .sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 35;
    }
    .sidebar-backdrop.open {
      display: block;
    }

    /* Global Context Selectors */
    .context-left {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      flex-wrap: nowrap;
      min-width: 0;
    }
    .context-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0E1216;
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-linen);
      cursor: pointer;
      transition: all 120ms ease;
      position: relative;
      user-select: none;
      white-space: nowrap;
    }
    .context-btn:hover {
      border-color: var(--color-copper);
      background: #151A20;
    }
    .context-btn .caret {
      font-size: 9px;
      opacity: 0.6;
      margin-left: 2px;
    }
    .context-btn .pill-code {
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--color-stone);
      background: rgba(255, 255, 255, 0.06);
      padding: 1px 4px;
      border-radius: 3px;
    }

    /* Dropdown Menus */
    .context-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      background: #14181F;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8);
      min-width: 240px;
      padding: 6px;
      z-index: 100;
      display: none;
      flex-direction: column;
      gap: 2px;
    }
    .context-dropdown.open {
      display: flex;
      animation: dropFade 120ms ease;
    }
    @keyframes dropFade {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .dropdown-header {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-stone);
      padding: 6px 8px;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 6px;
      color: var(--color-linen);
      font-size: 12px;
      cursor: pointer;
      text-decoration: none;
      transition: background 100ms ease;
    }
    .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .dropdown-item.active {
      background: var(--color-copper-subtle);
      color: var(--color-copper);
      font-weight: 600;
    }
    .dropdown-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 4px 0;
    }
    .dropdown-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 6px;
      color: var(--color-stone);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }
    .dropdown-action:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--color-linen);
    }

    .service-meta {
      font-size: 12px;
      color: var(--color-stone);
    }

    .context-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .cmdk-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      border-radius: 6px;
      background: var(--color-ink);
      border: 1px solid var(--border-default);
      color: var(--color-stone);
      font-size: 12px;
      cursor: pointer;
      user-select: none;
      transition: border-color 120ms ease;
    }
    .cmdk-trigger:hover {
      border-color: var(--color-copper);
      color: var(--color-linen);
    }
    .cmdk-trigger kbd {
      background: rgba(255, 255, 255, 0.08);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--color-linen);
    }

    /* Main Scrollable Workspace */
    .main-workspace {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Mobile Bottom Navigation (Visible <= 768px) */
    .mobile-nav-bar {
      display: none;
      height: 58px;
      background: var(--color-charcoal);
      border-top: 1px solid var(--border-default);
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 50;
      justify-content: space-around;
      align-items: center;
    }
    .mobile-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      color: var(--color-stone);
      text-decoration: none;
      font-size: 10px;
      font-weight: 600;
      padding: 6px;
    }
    .mobile-nav-item.active {
      color: var(--color-copper);
    }

    /* Responsive Rules */
    @media (max-width: 1024px) {
      .breadcrumb-trail { display: none; }
    }
    @media (max-width: 768px) {
      .sidebar-toggle { display: inline-flex; }
      .nav-rail {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.85);
      }
      .nav-rail.mobile-open {
        transform: translateX(0);
      }
      .mobile-nav-bar { display: flex; }
      .top-bar { padding: 0 10px; }
      .main-workspace { padding-bottom: 60px; }
      .context-btn .pill-code { display: none; }
      .cmdk-trigger kbd { display: none; }
    }
  </style>
</head>
<body>
  <!-- Mobile Sidebar Backdrop Overlay -->
  <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="closeMobileSidebar()"></div>

  <div class="app-layout">
    <!-- Left Navigation Rail (220px fixed on desktop) -->
    <aside class="nav-rail" id="nav-rail">
      <div>
        <div class="nav-brand">
          <div class="brand-mark">R</div>
          <div style="min-width: 0;">
            <div class="brand-title">${restaurantName}</div>
            <div class="brand-sub">${currentBranch.name}</div>
          </div>
        </div>

        <nav class="nav-list">
          ${navSections
            .map(
              (sec) => `
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-stone); padding: 10px 10px 4px 10px; opacity: 0.7;">
              ${sec.title}
            </div>
            ${sec.items
              .map(
                (item) => `
              <a href="${item.href}" class="nav-item ${activeNav === item.key ? 'active' : ''}">
                <span class="nav-icon">${item.icon}</span>
                <span>${item.label}</span>
              </a>`
              )
              .join('')}`
            )
            .join('')}
        </nav>
      </div>

      <div class="nav-footer">
        <span>RestaurantOS 3.1</span>
        <div style="display: flex; gap: 8px;">
          <a href="/developer/templates${contextQuery}" title="Template Composition Inspector" style="color: var(--color-copper); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">${icon('code', { size: 12 })} Inspector</a>
          <a href="/developer/diagnostics" title="System Diagnostics">Diagnostics ↗</a>
        </div>
      </div>
    </aside>

    <!-- Main Application Shell -->
    <div class="app-content">
      <!-- Top Context Bar -->
      <header class="top-bar">
        <div class="context-left">
          <!-- Mobile Sidebar Toggle -->
          <button type="button" class="sidebar-toggle" onclick="toggleMobileSidebar()" aria-label="Toggle Navigation Drawer">
            ${icon('menu', { size: 16 })}
          </button>

          <!-- Breadcrumb Trail -->
          <nav class="breadcrumb-trail" aria-label="Breadcrumb">
            <a href="/${contextQuery}" class="breadcrumb-item">RestaurantOS</a>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-item">${currentSection}</span>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-item active">${pageTitle}</span>
          </nav>

          <span class="breadcrumb-sep" style="display: inline-block; margin: 0 4px;">•</span>

          <!-- 1. Real Branch Switcher Dropdown -->
          <div style="position: relative;">
            <div class="context-btn" onclick="toggleDropdown('branch-menu')">
              <span style="display: inline-flex; align-items: center; gap: 6px;">${icon('map-pin', { size: 13, color: 'var(--color-copper)' })} ${currentBranch.name}</span>
              <span class="pill-code">${currentBranch.code}</span>
              <span class="caret" style="display: inline-flex; align-items: center;">${icon('chevron-down', { size: 10 })}</span>
            </div>
            <div id="branch-menu" class="context-dropdown">
              <div class="dropdown-header">Select Location (${branches.length})</div>
              ${branches
                .map((b) => {
                  const bFloors = allFloors.filter((f) => f.branchId === b.id);
                  const defaultFId = bFloors[0] ? bFloors[0].id : '';
                  const targetUrl = windowTargetQuery({ branch: b.id, floor: defaultFId, service: serviceShift });
                  return `
                <a href="${targetUrl}" class="dropdown-item ${b.id === currentBranch.id ? 'active' : ''}">
                  <div>
                    <strong>${b.name}</strong>
                    <div style="font-size: 10px; color: var(--color-stone);">${b.city} · ${b.code}</div>
                  </div>
                  <span style="font-size: 10px; color: ${b.status === 'OPERATIONAL' ? 'var(--color-sage)' : 'var(--color-stone)'};">
                    ${b.status === 'OPERATIONAL' ? '● Live' : '○ Setup'}
                  </span>
                </a>`;
                })
                .join('')}
              <div class="dropdown-divider"></div>
              <a href="/operations/locations?action=new${contextQuery}" class="dropdown-action">
                <span style="display:inline-flex;align-items:center;">${icon('plus', { size: 12 })}</span> <span>Add New Branch...</span>
              </a>
              <a href="/operations/locations${contextQuery}" class="dropdown-action">
                <span style="display:inline-flex;align-items:center;">${icon('settings', { size: 12 })}</span> <span>Manage Branches</span>
              </a>
            </div>
          </div>

          <!-- 2. Real Floor / Service Area Switcher Dropdown -->
          <div style="position: relative;">
            <div class="context-btn" onclick="toggleDropdown('floor-menu')">
              <span style="display: inline-flex; align-items: center; gap: 6px;">${icon('floor', { size: 13, color: 'var(--color-copper)' })} ${currentFloor.name}</span>
              <span class="caret" style="display: inline-flex; align-items: center;">${icon('chevron-down', { size: 10 })}</span>
            </div>
            <div id="floor-menu" class="context-dropdown">
              <div class="dropdown-header">${currentBranch.name} Floors (${branchFloors.length})</div>
              ${branchFloors
                .map((f) => {
                  const targetUrl = windowTargetQuery({ branch: currentBranch.id, floor: f.id, service: serviceShift });
                  return `
                <a href="${targetUrl}" class="dropdown-item ${f.id === currentFloor.id ? 'active' : ''}">
                  <div>
                    <strong>${f.name}</strong>
                    <div style="font-size: 10px; color: var(--color-stone);">${f.type} · ${f.activeLayout}</div>
                  </div>
                  <span style="font-size: 11px; font-weight: 700; color: var(--color-linen);">${f.capacity}p</span>
                </a>`;
                })
                .join('')}
              <div class="dropdown-divider"></div>
              <a href="/operations/floors?action=new${contextQuery}" class="dropdown-action">
                <span style="display:inline-flex;align-items:center;">${icon('plus', { size: 12 })}</span> <span>Add Service Area...</span>
              </a>
              <a href="/operations/floors${contextQuery}" class="dropdown-action">
                <span style="display:inline-flex;align-items:center;">${icon('settings', { size: 12 })}</span> <span>Manage Floor Plans</span>
              </a>
            </div>
          </div>

          <!-- 3. Real Service Shift Dropdown -->
          <div style="position: relative;">
            <div class="context-btn" onclick="toggleDropdown('service-menu')">
              <span style="display: inline-flex; align-items: center; gap: 6px;">${icon('clock', { size: 13, color: 'var(--color-copper)' })} ${serviceShift}</span>
              <span class="caret" style="display: inline-flex; align-items: center;">${icon('chevron-down', { size: 10 })}</span>
            </div>
            <div id="service-menu" class="context-dropdown">
              <div class="dropdown-header">Service Shifts</div>
              ${['Dinner Service', 'Lunch Service', 'Late Night', 'Private Event']
                .map((shift) => {
                  const targetUrl = windowTargetQuery({ branch: currentBranch.id, floor: currentFloor.id, service: shift });
                  return `
                <a href="${targetUrl}" class="dropdown-item ${shift === serviceShift ? 'active' : ''}">
                  <span>${shift}</span>
                  ${shift === serviceShift ? `<span style="color:var(--color-copper);display:inline-flex;align-items:center;">${icon('check', { size: 12 })}</span>` : ''}
                </a>`;
                })
                .join('')}
            </div>
          </div>
        </div>

        <div class="context-right">
          <!-- Live SSE Status Indicator -->
          <div class="sse-badge" id="sse-status" title="Real-Time Event Stream">
            <span class="sse-dot" id="sse-dot"></span>
            <span id="sse-label">Live</span>
          </div>

          <span class="service-meta text-mono" id="live-clock">--:--:--</span>

          ${options.extraHeaderActions || ''}

          <!-- Command Palette Trigger -->
          <div class="cmdk-trigger" onclick="openCommandPalette()" role="button" aria-label="Open Command Palette (Cmd+K)">
            <span>Search...</span>
            <kbd>⌘K</kbd>
          </div>

          <!-- External OrbitoX Control Plane Link -->
          <a href="${controlPlaneUrl}/admin/projects/project_restaurant_os" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" title="Open OrbitoX Control Plane (External)" style="font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
            <span>Open OrbitoX Control Plane ↗</span>
          </a>
        </div>
      </header>

      <!-- Main Workspace -->
      <main class="main-workspace">
        ${contentHtml}
      </main>
    </div>
  </div>

  <!-- Mobile Bottom Navigation Rail -->
  <nav class="mobile-nav-bar">
    <a href="/${contextQuery}" class="mobile-nav-item ${activeNav === 'overview' ? 'active' : ''}">
      <span>${icon('overview', { size: 18 })}</span>
      <span>Home</span>
    </a>
    <a href="/operations/floor${contextQuery}" class="mobile-nav-item ${activeNav === 'floor' ? 'active' : ''}">
      <span>${icon('floor', { size: 18 })}</span>
      <span>Floor</span>
    </a>
    <a href="/operations/tables${contextQuery}" class="mobile-nav-item ${activeNav === 'tables' ? 'active' : ''}">
      <span>${icon('tables', { size: 18 })}</span>
      <span>Tables</span>
    </a>
    <a href="/operations/orders${contextQuery}" class="mobile-nav-item ${activeNav === 'orders' ? 'active' : ''}">
      <span>${icon('orders', { size: 18 })}</span>
      <span>Orders</span>
    </a>
    <a href="/kds${contextQuery}" class="mobile-nav-item ${activeNav === 'kitchen' ? 'active' : ''}">
      <span>${icon('kitchen', { size: 18 })}</span>
      <span>KDS</span>
    </a>
  </nav>

  <!-- Global Command Palette (⌘K) -->
  <div class="cmdk-backdrop" id="cmdk-modal" onclick="if(event.target === this) closeCommandPalette()">
    <div class="cmdk-box">
      <input type="text" class="cmdk-input" id="cmdk-search" placeholder="Type a command or jump to workspace..." oninput="handleCmdkInput(this.value)" autofocus>
      <div class="cmdk-results" id="cmdk-list">
        <a href="/${contextQuery}" class="cmdk-item selected"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('overview', { size: 14 })} Operations Command Home</span><kbd>↵</kbd></a>
        <a href="/operations/floor${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('floor', { size: 14 })} Spatial Floor Canvas & Tables</span><kbd>↵</kbd></a>
        <a href="/operations/tables${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('tables', { size: 14 })} Tables Fleet Directory</span><kbd>↵</kbd></a>
        <a href="/operations/orders${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('orders', { size: 14 })} Service Order Ledger</span><kbd>↵</kbd></a>
        <a href="/kds${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('kitchen', { size: 14 })} Kitchen Display System (KDS)</span><kbd>↵</kbd></a>
        <a href="/menu${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('menu', { size: 14 })} Menu Catalog & Recipes</span><kbd>↵</kbd></a>
        <a href="/guests${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('guests', { size: 14 })} Active Seated Guests & CRM</span><kbd>↵</kbd></a>
        <a href="/reports${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('reports', { size: 14 })} Service Analytics & Financials</span><kbd>↵</kbd></a>
        <a href="/studio${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('studio', { size: 14 })} Visual Brand Studio & Editor</span><kbd>↵</kbd></a>
        <a href="/marketplace${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('marketplace', { size: 14 })} Browse Storefront Templates</span><kbd>↵</kbd></a>
        <a href="/white-label${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('whitelabel', { size: 14 })} White-Label Branding & Domains</span><kbd>↵</kbd></a>
        <a href="/staff${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('staff', { size: 14 })} Staff Directory & RBAC Security</span><kbd>↵</kbd></a>
        <a href="/operations/locations${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('locations', { size: 14 })} Manage Restaurant Branches</span><kbd>↵</kbd></a>
        <a href="/operations/floors${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('floors', { size: 14 })} Manage Floor Plans & Presets</span><kbd>↵</kbd></a>
        <a href="/support${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('support', { size: 14 })} Support Desk & Incident Cases</span><kbd>↵</kbd></a>
        <a href="/developer/templates${contextQuery}" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('code', { size: 14 })} Template Composition Inspector</span><kbd>↵</kbd></a>
        <a href="/dine/7Kp9xQ8m2L" target="_blank" class="cmdk-item"><span style="display:inline-flex;align-items:center;gap:8px;">${icon('smartphone', { size: 14 })} Open Diner Mobile PWA (T-14)</span><kbd>↗</kbd></a>
      </div>
    </div>
  </div>

  <script>
    // Live Service Clock
    function updateClock() {
      const el = document.getElementById('live-clock');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Mobile Sidebar Drawer Toggle
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

    // Context Dropdowns
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
      if (!e.target.closest('.context-btn') && !e.target.closest('.context-dropdown')) {
        document.querySelectorAll('.context-dropdown').forEach(d => d.classList.remove('open'));
      }
    });

    // Command Palette Logic (⌘K) with Keyboard Navigation
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
      let firstVisibleIdx = -1;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const text = item.textContent.toLowerCase();
        const matches = text.includes(q) || (q.endsWith('s') && text.includes(q.slice(0, -1)));
        item.style.display = matches ? 'flex' : 'none';
        if (matches && firstVisibleIdx === -1) {
          firstVisibleIdx = 0;
        }
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

// Server-side helper to generate link preserving pathname
function windowTargetQuery(params: { branch: string; floor: string; service: string }): string {
  return `?branch=${encodeURIComponent(params.branch)}&floor=${encodeURIComponent(
    params.floor
  )}&service=${encodeURIComponent(params.service)}`;
}
