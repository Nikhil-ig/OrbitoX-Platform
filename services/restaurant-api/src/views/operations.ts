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

export async function handleOperationsViews(ctx: TenantRouteContext): Promise<boolean> {
  const { req, res, pathname, method, parsedUrl, tenantContext, repo, posService, branches, floors, context, currentBranch, currentFloor, serviceShift, requestIdentity, activeStaffToken, activeStaffRole } = ctx;
    if (pathname === '/accept-invite' && method === 'GET') {
      const token = (parsedUrl.query.token as string) || '';
      sendHtml(res, renderOwnerInvitePage(token, tenantContext.tenantName));
      return true;
    }
    // RUNTIME PRODUCT USER INTERFACES (PORT 4010)
    // ==========================================

    // --- APPROVED ROUTE REDIRECTS (MILESTONE 1) ---
    if (pathname === '/crave-atlas' || pathname === '/crave-atlas/') {
      const search = parsedUrl.search || '';
      res.writeHead(302, { Location: `/apps/crave-atlas${search}` });
      res.end();
      return true;
    }
    if (pathname === '/swift-bite' || pathname === '/swift-bite/') {
      const search = parsedUrl.search || '';
      res.writeHead(302, { Location: `/apps/swift-bite${search}` });
      res.end();
      return true;
    }
    if (pathname === '/pantry-rush' || pathname === '/pantry-rush/') {
      const search = parsedUrl.search || '';
      res.writeHead(302, { Location: `/apps/pantry-rush${search}` });
      res.end();
      return true;
    }
    if (pathname === '/locations' || pathname === '/locations/') {
      const search = parsedUrl.search || '';
      res.writeHead(302, { Location: `/operations/locations${search}` });
      res.end();
      return true;
    }

    // --- 1. OPERATIONS HOME (/) ---
    if (pathname === '/' || pathname === '/overview') {
      const branchTables = await repo.getTables(currentBranch.id);
      const branchTasks = await repo.getKitchenTasks(undefined, currentBranch.id);
      const branchRequests = await repo.getServiceRequests(currentBranch.id);
      const branchOrders = await repo.getOrders(undefined, undefined, currentBranch.id);
      const branchEvents = await repo.getEvents(0, currentBranch.id);
      const tenantBrand = await repo.getTenantBrand();

      const html = renderShell(
        renderOperationsHome(
          branchTables,
          branchTasks,
          branchRequests,
          currentBranch.name,
          serviceShift,
          branchOrders,
          branchEvents
        ),
        {
          title: 'Operations Command',
          activeNav: 'overview',
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

    // --- 2. SPATIAL FLOOR STUDIO (/operations or /operations/floor) ---
    if (pathname === '/operations' || pathname === '/operations/floor') {
      const selectedTableId = parsedUrl.query.table ? parseInt(parsedUrl.query.table as string, 10) : undefined;
      const allTables = await repo.getTables(currentBranch.id);
      const allOrders = await repo.getOrders(undefined, undefined, currentBranch.id);
      const tenantBrand = await repo.getTenantBrand();

      const html = renderShell(
        renderFloorStudio(allTables, selectedTableId, currentFloor.id, currentBranch.id, floors, allOrders),
        {
          title: 'Spatial Floor Studio',
          activeNav: 'floor',
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

    // --- 3. TABLES WORKSPACE (/operations/tables) ---
    if (pathname === '/operations/tables') {
      const section = (parsedUrl.query.section as string) || 'ALL';
      const tables = await repo.getTables(currentBranch.id);
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(renderTablesList(tables, currentBranch.id, section), {
        title: 'Tables Fleet',
        activeNav: 'tables',
        restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
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

    // --- 3b. TABLE PRINTABLE QR STAND (/operations/tables/:id/qr-stand) ---
    if (
      pathname.startsWith('/operations/tables/') &&
      pathname.endsWith('/qr-stand') &&
      method === 'GET'
    ) {
      const tableId = pathname.replace('/operations/tables/', '').replace('/qr-stand', '');
      const table = (await repo.getTable(tableId)) || (await repo.getTableByNumber(tableId));
      if (!table) {
        sendJson(res, 404, {
          error: 'TABLE_NOT_FOUND',
          message: `Table "${tableId}" does not exist in this restaurant.`,
        });
        return true;
      }
      const tenantBrand = await repo.getTenantBrand();
      const branchName = currentBranch?.name || 'Main Dining';
      const html = renderTableQrStand(table, tenantBrand, branchName, tenantContext?.tenantName);
      sendHtml(res, html);
      return true;
    }

    // --- 4. ORDERS WORKSPACE (/operations/orders & /orders) ---
    if (pathname === '/operations/orders' || pathname === '/orders') {
      const branchOrders = await repo.getOrders(undefined, undefined, currentBranch.id);
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(renderOrdersWorkspace(branchOrders, branches, currentBranch.id), {
        title: 'Service Orders',
        activeNav: 'orders',
        restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
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

    // --- 5. HIGH-DENSITY KITCHEN DISPLAY SYSTEM (/kds) ---
    if (pathname === '/kds') {
      const activeStation = ((parsedUrl.query.station || parsedUrl.query.stationId || 'ALL') as string).toUpperCase();

      // Only pass validated staff identity if requester is authenticated and has kitchen access
      const isKitchenAuthorized =
        Boolean(activeStaffToken) &&
        (requestIdentity.type === 'STATION' ||
          requestIdentity.role === 'CHEF' ||
          requestIdentity.role === 'EXPO' ||
          requestIdentity.role === 'OPERATIONS' ||
          requestIdentity.role === 'MANAGER' ||
          requestIdentity.role === 'ADMIN');

      const kdsRole = isKitchenAuthorized ? (requestIdentity.role || 'CHEF') : undefined;

      const branchTasks = await repo.getKitchenTasks(undefined, currentBranch.id);
      const lastSeq = await repo.getLastEventSequence();
      const tenantBrand = await repo.getTenantBrand();
      const html = renderKdsWorkspace(
        branchTasks,
        activeStation,
        currentBranch.name,
        serviceShift,
        undefined,
        lastSeq,
        currentBranch.id,
        kdsRole,
        isKitchenAuthorized,
        tenantBrand?.restaurantName
      );
      sendHtml(res, html);
      return true;
    }

    // --- 6. MENU CATALOG WORKSPACE (/menu) ---
    if (pathname === '/menu') {
      const branchOverrides = await repo.getBranchMenuOverrides();
      const categories = await repo.getCategories(true);
      const menuItems = await repo.getMenuItems(true);
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(renderMenuWorkspace(menuItems, branches, currentBranch.id, branchOverrides, categories), {
        title: 'Menu Catalog',
        activeNav: 'menu',
        restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
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

    // --- 7. GUESTS WORKSPACE (/guests) ---
    if (pathname === '/guests') {
      const branchTables = await repo.getTables(currentBranch.id);
      const guests = await repo.getGuests();
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(renderGuestsWorkspace(branchTables, currentBranch.id, guests), {
        title: 'Active Guests',
        activeNav: 'guests',
        restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
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

    // --- 8. LOCATIONS WORKSPACE (/operations/locations) ---
    if (pathname === '/operations/locations') {
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(renderLocationsWorkspace(branches, currentBranch.id), {
        title: 'Locations & Branches',
        activeNav: 'locations',
        restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
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

    // --- 9. FLOORS WORKSPACE (/operations/floors) ---
    if (pathname === '/operations/floors') {
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(renderFloorsWorkspace(floors, currentBranch), {
        title: 'Floor Plans & Layouts',
        activeNav: 'floors',
        restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
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

    // --- 10. SERVICE REPORTS WORKSPACE (/reports) ---
    if (pathname === '/reports') {
      const orders = await repo.getOrders(undefined, undefined, currentBranch.id);
      const tasks = await repo.getKitchenTasks(undefined, currentBranch.id);
      const tables = await repo.getTables(currentBranch.id);
      const tenantBrand = await repo.getTenantBrand();
      const html = renderShell(renderReportsWorkspace(orders, tasks, tables), {
        title: 'Service Analytics',
        activeNav: 'reports',
        restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
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

    // --- 10b. STAFF & SECURITY WORKSPACE (/staff, /operations/staff) ---
    if (pathname === '/staff' || pathname === '/operations/staff') {
      const tenantBrand = await repo.getTenantBrand();
      const staffMembers = await repo.getStaffMembers();
      const html = renderShell(renderStaffWorkspace(branches, currentBranch.id, staffMembers), {
        title: 'Staff Directory & RBAC Security',
        activeNav: 'staff',
        restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext?.tenantName),
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

    // --- 11. DINER MOBILE PWA (/dine/:locator) ---
  return false;
}
