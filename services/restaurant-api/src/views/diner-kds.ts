import * as http from 'http';
import * as url from 'url';
import { sendHtml, sendJson } from '../http/middleware';
import type { TenantRouteContext } from '../http/types';
import {
  resolveAllowedOrigin,
  tryGetActiveTenant,
  resolveTenantDisplayName,
  renderTenantNotFoundPage,
} from '../../packages/domain';
import {
  renderShell,
  renderOperationsHome,
  renderFloorStudio,
  renderKdsWorkspace,
  renderDinerPwa,
  renderTablesList,
  renderTableQrStand,
  renderOnboardingWorkspace,
  renderOrdersWorkspace,
  renderMenuWorkspace,
  renderGuestsWorkspace,
  renderReportsWorkspace,
  renderLocationsWorkspace,
  renderFloorsWorkspace,
  renderDeveloperInspector,
  renderTemplateCompositionInspector,
  renderMarketplaceWorkspace,
  renderVisualStudio,
  renderWhiteLabelWorkspace,
  renderSupportWorkspace,
  renderStaffWorkspace,
  renderCraveAtlasPage,
  renderSwiftBitePage,
  renderPantryRushPage,
  renderOwnerInvitePage,
} from '../../packages/ui';
import {
  isProductionEnvironment,
  postgresStore,
  eventBus,
  provisioningService,
  customDomainService,
  ownerSelfService,
  razorpayAdapter,
  restaurantGrantEnforcer,
  runtimeController,
  getPinnedGrantKeys,
  activeSettlementLocks,
  activeDispatchLocks,
  totalRequests,
  statusCounts,
  methodCounts,
  totalDomainEvents,
} from '../shared/state';

export async function handleDinerViews(ctx: TenantRouteContext): Promise<boolean> {
  const { req, res, pathname, method, parsedUrl, tenantContext, repo, posService, branches, floors, context, currentBranch, currentFloor, serviceShift, requestIdentity, activeStaffToken, activeStaffRole } = ctx;
    if (pathname.startsWith('/dine/')) {
      const locator = pathname.split('/')[2];
      if (!locator) {
        sendJson(res, 404, { error: 'NOT_FOUND', message: 'Table locator required' });
        return true;
      }
      const currentTable = await repo.getTableByLocator(locator);
      if (!currentTable) {
        sendHtml(res, renderTenantNotFoundPage(`Table locator "${locator}"`), 404);
        return true;
      }
      const allOrders = await repo.getOrders();
      const tableOrders = currentTable.activeSessionId
        ? allOrders.filter((o) => o.tableNumber === currentTable.number && o.sessionId === currentTable.activeSessionId)
        : [];
      const allTasks = await repo.getKitchenTasks();
      const tableTasks = currentTable.activeSessionId
        ? allTasks.filter((t) => t.tableNumber === currentTable.number && tableOrders.some((o) => o.orderId === t.orderId))
        : [];
      const tableBranch = await repo.getBranch(currentTable.branchId);
      const branchName = tableBranch ? tableBranch.name : currentBranch.name;
      const tenantBrand = await repo.getTenantBrand();
      const queryTmplId = (parsedUrl.query.templateId || parsedUrl.query.template) as string | undefined;
      const activeTemplate = (queryTmplId ? await repo.getTemplateById(queryTmplId) : undefined) || (tenantBrand?.activeTemplateId ? await repo.getTemplateById(tenantBrand.activeTemplateId) : undefined);
      const effectiveBrand = queryTmplId && activeTemplate ? { ...tenantBrand, activeTemplateId: activeTemplate.id } : tenantBrand;
      const menuItems = await repo.getMenuItems();
      const html = renderDinerPwa(currentTable, menuItems, branchName, tableOrders, tableTasks, effectiveBrand, activeTemplate);
      sendHtml(res, html);
      return true;
    }

    // --- 12. TEMPLATE MARKETPLACE (/marketplace) ---
    if (pathname === '/marketplace') {
      const templates = await repo.getTemplates();
      const tenantBrand = await repo.getTenantBrand();
      const menuItems = await repo.getMenuItems();
      const html = renderMarketplaceWorkspace(
        templates,
        tenantBrand,
        menuItems,
        currentBranch.id,
        branches
      );
      sendHtml(res, html);
      return true;
    }

    // --- 12a. CRAVEATLAS SINGLE-BRAND RESTAURANT WEBSITE (/apps/crave-atlas) ---
    if (pathname === '/apps/crave-atlas') {
      const branchParam = parsedUrl.query.branch as string | undefined;
      const targetBranch = branchParam ? ((await repo.getBranch(branchParam)) || currentBranch) : currentBranch;
      const resolvedMenu = await repo.getResolvedMenuForBranch(targetBranch.id);
      const tenantBrand = await repo.getTenantBrand();
      const html = renderCraveAtlasPage(branches, targetBranch, resolvedMenu, tenantBrand);
      sendHtml(res, html);
      return true;
    }

    // --- 12b. SWIFTBITE SPEED-FIRST FOOD ORDERING (/apps/swift-bite) ---
    if (pathname === '/apps/swift-bite') {
      const branchParam = parsedUrl.query.branch as string | undefined;
      const targetBranch = branchParam ? ((await repo.getBranch(branchParam)) || currentBranch) : currentBranch;
      const resolvedMenu = await repo.getResolvedMenuForBranch(targetBranch.id);
      const tenantBrand = await repo.getTenantBrand();
      const tableNumber = (parsedUrl.query.table || '1') as string;
      const orders = await repo.getOrders();
      const html = renderSwiftBitePage(branches, targetBranch, resolvedMenu, tenantBrand, tableNumber, orders);
      sendHtml(res, html);
      return true;
    }

    // --- 12c. PANTRYRUSH QUICK-COMMERCE GROCERY (/apps/pantry-rush) ---
    if (pathname === '/apps/pantry-rush') {
      const branchParam = parsedUrl.query.branch as string | undefined;
      const targetBranch = branchParam ? ((await repo.getBranch(branchParam)) || currentBranch) : currentBranch;
      const skus = await repo.getGrocerySkus();
      const tenantBrand = await repo.getTenantBrand();
      const pincode = (parsedUrl.query.pincode || '141001') as string;
      const html = renderPantryRushPage(skus, tenantBrand, branches, targetBranch, pincode);
      sendHtml(res, html);
      return true;
    }

    // --- 13. VISUAL BRAND STUDIO & EDITOR (/studio) ---
    if (pathname === '/studio') {
      const activeBrand = await repo.getTenantBrand();
      const activeTemplate = (activeBrand?.activeTemplateId ? await repo.getTemplateById(activeBrand.activeTemplateId) : undefined) || (await repo.getTemplates())[0];
      const draft = await repo.getTemplateDraft();
      const menuItems = await repo.getMenuItems();
      const html = renderVisualStudio(
        activeTemplate,
        draft,
        activeBrand,
        menuItems,
        currentBranch.id
      );
      sendHtml(res, html);
      return true;
    }

    // --- 14. WHITE-LABEL & DOMAINS (/white-label & /whitelabel) ---
    if (pathname === '/white-label' || pathname === '/whitelabel') {
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(
        renderWhiteLabelWorkspace(tenantBrand, branches, currentBranch.id),
        {
          title: 'White-Label & Domains',
          activeNav: 'whitelabel',
          restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
          currentBranchId: currentBranch.id,
          currentFloorId: currentFloor.id,
          currentServiceShift: serviceShift,
          branches,
          floors,
          staffRole: activeStaffRole,
        }
      );
      sendHtml(res, html);
      return true;
    }

    // --- 15. STAFF DIRECTORY & SECURITY (/staff) ---
    if (pathname === '/staff') {
      const tenantBrand = await repo.getTenantBrand();
      const staffMembers = await repo.getStaffMembers();
      const html = renderShell(
        renderStaffWorkspace(branches, currentBranch.id, staffMembers),
        {
          title: 'Staff Directory & RBAC Security',
          activeNav: 'staff',
          restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
          currentBranchId: currentBranch.id,
          currentFloorId: currentFloor.id,
          currentServiceShift: serviceShift,
          branches,
          floors,
          staffRole: activeStaffRole,
        }
      );
      sendHtml(res, html);
      return true;
    }

    // --- 16. CUSTOMER SUPPORT DESK (/support) ---
    if (pathname === '/support') {
      const tickets = await repo.getSupportTickets();
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(
        renderSupportWorkspace(tickets, branches, currentBranch.id),
        {
          title: 'Customer Support Desk',
          activeNav: 'support',
          restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
          currentBranchId: currentBranch.id,
          currentFloorId: currentFloor.id,
          currentServiceShift: serviceShift,
          branches,
          floors,
          staffRole: activeStaffRole,
        }
      );
      sendHtml(res, html);
      return true;
    }

    // --- 16b. OWNER ONBOARDING WORKSPACE (/operations/onboarding & /onboarding) ---
    if (pathname === '/operations/onboarding' || pathname === '/onboarding') {
      const onboardingState = await ownerSelfService.getOnboardingState(tenantContext.tenantId);
      const tenantBrand = await repo.getTenantBrand();
      const tenantDisplayName = resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName);
      const html = renderShell(
        renderOnboardingWorkspace(onboardingState, tenantBrand, currentBranch?.name, tenantDisplayName),
        {
          title: 'Owner Onboarding',
          activeNav: 'onboarding',
          restaurantName: tenantDisplayName,
          currentBranchId: currentBranch.id,
          currentFloorId: currentFloor.id,
          currentServiceShift: serviceShift,
          branches,
          floors,
          staffRole: activeStaffRole,
        }
      );
      sendHtml(res, html);
      return true;
    }

    // --- 11b. TEMPLATE COMPOSITION INSPECTOR (/developer/templates) ---
    if (pathname === '/developer/templates') {
      const tenantBrand = await repo.getTenantBrand();
      const selected = (parsedUrl.query.selected as string) || tenantBrand.activeTemplateId || 'tmpl_haute_gastronomy';
      const compare = (parsedUrl.query.compare as string) || 'tmpl_artisan_coffee';
      const templates = await repo.getTemplates();
      const menuItems = await repo.getMenuItems();
      const html = renderShell(
        renderTemplateCompositionInspector(templates, selected, compare, menuItems),
        {
          title: 'Template Composition Inspector',
          activeNav: 'marketplace',
          restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
          currentBranchId: currentBranch.id,
          currentFloorId: currentFloor.id,
          currentServiceShift: serviceShift,
          branches,
          floors,
          staffRole: activeStaffRole,
        }
      );
      sendHtml(res, html);
      return true;
    }

    // --- 12. DEVELOPER RUNTIME INSPECTOR (/developer/inspector) ---
    if (pathname === '/developer/inspector') {
      const rawData = await repo.getRawData();
      const tenantBrand = await repo.getTenantBrand();
      const tenantDisplayName = resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName);
      const html = renderShell(renderDeveloperInspector(context, rawData, tenantDisplayName), {
        title: 'Runtime Inspector',
        activeNav: 'overview',
        restaurantName: tenantDisplayName,
        currentBranchId: currentBranch.id,
        currentFloorId: currentFloor.id,
        currentServiceShift: serviceShift,
        branches,
        floors,
        staffRole: activeStaffRole,
      });
      sendHtml(res, html);
      return true;
    }

    // --- 13. DEVELOPER & DIAGNOSTICS (/developer/diagnostics) ---
    if (pathname === '/developer/diagnostics') {
      const config = runtimeController.getActiveConfig();
      const revisions = await repo.getRevisions();
      const events = await repo.getEvents();
      const storageEngine = process.env.STORAGE_DRIVER === 'postgres'
        ? 'PostgreSQL 16 with Row-Level Security (RLS) (Non-superuser role: restaurantos_app)'
        : 'Atomic File-Backed JSON (data/restaurant-runtime-store.json)';
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Developer Diagnostics · RestaurantOS (Port 4010)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0A0D10; color: #FFFFFF; font-family: monospace; padding: 32px; }
    h1 { font-size: 20px; font-weight: 900; margin-bottom: 20px; color: #10B981; }
    .panel { background: #13171F; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; margin-bottom: 20px; line-height: 1.6; font-size: 13px; }
    .key { color: #818CF8; font-weight: 800; }
    .val { color: #F8FAFC; }
    pre { background: #070912; padding: 16px; border-radius: 8px; overflow-x: auto; color: #A3AED0; margin-top: 12px; }
    a { color: #C86B3C; text-decoration: none; font-weight: 800; }
  </style>
</head>
<body>
  <h1>🛰️ RestaurantOS Developer Diagnostics</h1>
  <div style="margin-bottom: 20px; display: flex; gap: 12px;">
    <a href="/">← Operations Home</a>
    <a href="/developer/inspector">Live Runtime Inspector 🛰️</a>
    <a href="http://localhost:3005/admin/projects/project_restaurant_os" target="_blank">Open in OrbitoX Control Plane ↗</a>
  </div>

  <div class="panel">
    <div><span class="key">RUNTIME_PORT:</span> <span class="val">4010</span></div>
    <div><span class="key">PROCESS_PID:</span> <span class="val">${process.pid}</span></div>
    <div><span class="key">STORAGE_ENGINE:</span> <span class="val">${storageEngine}</span></div>
    <div><span class="key">STORAGE_REVISION:</span> <span class="val">${revisions}</span></div>
    <div><span class="key">OUTBOX_EVENTS:</span> <span class="val">${events.length}</span></div>
    <div><span class="key">SSE_CLIENTS_CONNECTED:</span> <span class="val">${eventBus.getConnectedClientsCount()}</span></div>
    <div><span class="key">PROCESS_UPTIME:</span> <span class="val">${Math.floor(process.uptime())}s</span></div>
    <div><span class="key">MEMORY_HEAP_MB:</span> <span class="val">${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB</span></div>
    <div><span class="key">CONTROL_PLANE_URL:</span> <span class="val">${runtimeController.manifest.platformController.controlPlaneUrl}</span></div>
    <div><span class="key">CONTROL_SESSION_ID:</span> <span class="val">${runtimeController.client.getSessionId() || 'ACTIVE'}</span></div>
    <div><span class="key">DESIRED_REVISION:</span> <span class="val">${runtimeController.getDesiredRevision()}</span></div>
    <div><span class="key">APPLIED_REVISION:</span> <span class="val">${runtimeController.getAppliedRevision()}</span></div>
    <div><span class="key">LAST_SYNC:</span> <span class="val">${runtimeController.getLastSyncTime()}</span></div>
  </div>

  <div class="panel">
    <div style="font-size: 14px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px;">Active Signed Desired-State Configuration</div>
    <pre>${JSON.stringify(config, null, 2)}</pre>
  </div>
</body>
</html>`;
      sendHtml(res, html);
      return true;
    }
  return false;
}
