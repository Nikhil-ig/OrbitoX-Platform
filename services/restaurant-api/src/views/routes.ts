import { RouteDefinition } from '../http/routes';
import {
  sendHtml,
  sendJson,
  ownerSelfService,
  runtimeController,
  renderTenantNotFoundPage,
} from '../http/context';
import {
  renderShell,
  ShellOptions,
  renderOperationsHome,
  renderFloorStudio,
  renderKdsWorkspace,
  renderDinerPwa,
  renderTablesList,
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
} from './index';
import { resolveTenantDisplayName } from '../shared';

export const viewsRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/',
    handler: (req, res, context) => renderHome(req, res, context, 'overview'),
  },
  {
    method: 'GET',
    path: '/overview',
    handler: (req, res, context) => renderHome(req, res, context, 'overview'),
  },
  {
    method: 'GET',
    path: '/operations',
    handler: (req, res, context) => renderFloor(req, res, context),
  },
  {
    method: 'GET',
    path: '/operations/floor',
    handler: (req, res, context) => renderFloor(req, res, context),
  },
  {
    method: 'GET',
    path: '/operations/tables',
    handler: async (req, res, context) => {
      const section = (context.parsedUrl.query.section as string) || 'ALL';
      const tables = await context.repo.getTables(context.currentBranch?.id);
      const tenantBrand = await context.repo.getTenantBrand();
      const branches = await context.repo.getBranches();
      const floors = await context.repo.getFloors();
      const html = renderShell(renderTablesList(tables, context.currentBranch?.id || 'branch_ldh', section), {
        title: 'Tables Fleet Management',
        activeNav: 'tables',
        restaurantName: resolveTenantDisplayName(tenantBrand, context.tenantContext?.tenantName),
        currentBranchId: context.currentBranch?.id || 'branch_ldh',
        currentFloorId: context.currentFloor?.id || 'floor_ground',
        currentServiceShift: context.serviceShift,
        branches,
        floors,
        staffRole: context.activeStaffRole,
      });
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/operations/orders',
    handler: (req, res, context) => renderOrders(req, res, context),
  },
  {
    method: 'GET',
    path: '/orders',
    handler: (req, res, context) => renderOrders(req, res, context),
  },
  {
    method: 'GET',
    path: '/kds',
    handler: async (req, res, context) => {
      const activeStation = ((context.parsedUrl.query.station || context.parsedUrl.query.stationId || 'ALL') as string).toUpperCase();
      const isKitchenAuthorized =
        Boolean(context.activeStaffToken) &&
        (context.requestIdentity.type === 'STATION' ||
          context.requestIdentity.role === 'CHEF' ||
          context.requestIdentity.role === 'EXPO' ||
          context.requestIdentity.role === 'OPERATIONS' ||
          context.requestIdentity.role === 'MANAGER' ||
          context.requestIdentity.role === 'ADMIN');
      const kdsRole = isKitchenAuthorized ? (context.requestIdentity.role || 'CHEF') : undefined;

      const branchTasks = await context.repo.getKitchenTasks(undefined, context.currentBranch?.id);
      const lastSeq = await context.repo.getLastEventSequence();
      const tenantBrand = await context.repo.getTenantBrand();
      const html = renderKdsWorkspace(
        branchTasks,
        activeStation,
        context.currentBranch?.name || 'Main',
        context.serviceShift,
        undefined,
        lastSeq,
        context.currentBranch?.id,
        kdsRole,
        isKitchenAuthorized,
        tenantBrand?.restaurantName
      );
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/menu',
    handler: async (_req, res, context) => {
      const branchOverrides = await context.repo.getBranchMenuOverrides();
      const categories = await context.repo.getCategories(true);
      const menuItems = await context.repo.getMenuItems(true);
      const tenantBrand = await context.repo.getTenantBrand();
      const branches = await context.repo.getBranches();
      const floors = await context.repo.getFloors();
      const html = renderShell(renderMenuWorkspace(menuItems, branches, context.currentBranch?.id || 'branch_ldh', branchOverrides, categories), {
        title: 'Menu Catalog',
        activeNav: 'menu',
        restaurantName: resolveTenantDisplayName(tenantBrand, context.tenantContext?.tenantName),
        currentBranchId: context.currentBranch?.id || 'branch_ldh',
        currentFloorId: context.currentFloor?.id || 'floor_ground',
        currentServiceShift: context.serviceShift,
        branches,
        floors,
        staffRole: context.activeStaffRole,
      });
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/guests',
    handler: async (_req, res, context) => {
      const branchTables = await context.repo.getTables(context.currentBranch?.id);
      const guests = await context.repo.getGuests();
      const tenantBrand = await context.repo.getTenantBrand();
      const branches = await context.repo.getBranches();
      const floors = await context.repo.getFloors();
      const html = renderShell(renderGuestsWorkspace(branchTables, context.currentBranch?.id || 'branch_ldh', guests), {
        title: 'Active Guests',
        activeNav: 'guests',
        restaurantName: resolveTenantDisplayName(tenantBrand, context.tenantContext?.tenantName),
        currentBranchId: context.currentBranch?.id || 'branch_ldh',
        currentFloorId: context.currentFloor?.id || 'floor_ground',
        currentServiceShift: context.serviceShift,
        branches,
        floors,
        staffRole: context.activeStaffRole,
      });
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/operations/locations',
    handler: (req, res, context) => renderLocations(req, res, context),
  },
  {
    method: 'GET',
    path: '/operations/floors',
    handler: async (_req, res, context) => {
      const floors = await context.repo.getFloors();
      const branches = await context.repo.getBranches();
      const currentBranch = context.currentBranch || branches[0];
      const opts = await getShellOptions(context, 'Floor Plans & Layouts', 'floors');
      const html = renderShell(renderFloorsWorkspace(floors, currentBranch), opts);
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/reports',
    handler: async (_req, res, context) => {
      const orders = await context.repo.getOrders(undefined, undefined, context.currentBranch?.id);
      const tasks = await context.repo.getKitchenTasks(undefined, context.currentBranch?.id);
      const tables = await context.repo.getTables(context.currentBranch?.id);
      const opts = await getShellOptions(context, 'Operational Reports', 'reports');
      const html = renderShell(renderReportsWorkspace(orders, tasks, tables), opts);
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/staff',
    handler: (req, res, context) => renderStaff(req, res, context),
  },
  {
    method: 'GET',
    path: '/operations/staff',
    handler: (req, res, context) => renderStaff(req, res, context),
  },
  {
    method: 'GET',
    path: '/dine/*',
    handler: async (_req, res, context) => {
      const locator = context.params.wild?.replace(/^\//, '') || '';
      if (!locator) {
        sendJson(res, 404, { error: 'NOT_FOUND', message: 'Table locator required' });
        return;
      }
      const currentTable = await context.repo.getTableByLocator(locator);
      if (!currentTable) {
        sendHtml(res, renderTenantNotFoundPage(`Table locator "${locator}"`), 404);
        return;
      }
      const allOrders = await context.repo.getOrders();
      const tableOrders = currentTable.activeSessionId
        ? allOrders.filter((o) => o.tableNumber === currentTable.number && o.sessionId === currentTable.activeSessionId)
        : [];
      const allTasks = await context.repo.getKitchenTasks();
      const tableTasks = currentTable.activeSessionId
        ? allTasks.filter((t) => t.tableNumber === currentTable.number && tableOrders.some((o) => o.orderId === t.orderId))
        : [];
      const tableBranch = await context.repo.getBranch(currentTable.branchId);
      const branchName = tableBranch ? tableBranch.name : context.currentBranch?.name || 'Main';
      const tenantBrand = await context.repo.getTenantBrand();
      const queryTmplId = (context.parsedUrl.query.templateId || context.parsedUrl.query.template) as string | undefined;
      const activeTemplate = (queryTmplId ? await context.repo.getTemplateById(queryTmplId) : undefined) || (tenantBrand?.activeTemplateId ? await context.repo.getTemplateById(tenantBrand.activeTemplateId) : undefined);
      const effectiveBrand = queryTmplId && activeTemplate ? { ...tenantBrand, activeTemplateId: activeTemplate.id } : tenantBrand;
      const menuItems = await context.repo.getMenuItems();
      const html = renderDinerPwa(currentTable, menuItems, branchName, tableOrders, tableTasks, effectiveBrand, activeTemplate);
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/marketplace',
    handler: async (_req, res, context) => {
      const templates = await context.repo.getTemplates();
      const tenantBrand = await context.repo.getTenantBrand();
      const menuItems = await context.repo.getMenuItems();
      const branches = await context.repo.getBranches();
      const html = renderMarketplaceWorkspace(templates, tenantBrand, menuItems, context.currentBranch?.id || 'branch_ldh', branches);
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/apps/*',
    handler: async (_req, res, context) => {
      const subpath = context.params.wild || '';
      if (subpath === 'crave-atlas' || subpath === '/crave-atlas') {
        await renderCraveAtlas(res, context);
      } else if (subpath === 'swift-bite' || subpath === '/swift-bite') {
        await renderSwiftBite(res, context);
      } else if (subpath === 'pantry-rush' || subpath === '/pantry-rush') {
        await renderPantryRush(res, context);
      } else {
        sendHtml(res, '<h1>App Not Found</h1>', 404);
      }
    },
  },
  {
    method: 'GET',
    path: '/studio',
    handler: async (_req, res, context) => {
      const activeBrand = await context.repo.getTenantBrand();
      const activeTemplate = (activeBrand?.activeTemplateId ? await context.repo.getTemplateById(activeBrand.activeTemplateId) : undefined) || (await context.repo.getTemplates())[0];
      const draft = await context.repo.getTemplateDraft();
      const menuItems = await context.repo.getMenuItems();
      const html = renderVisualStudio(activeTemplate, draft, activeBrand, menuItems, context.currentBranch?.id || 'branch_ldh');
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/white-label',
    handler: (req, res, context) => renderWhiteLabel(res, context),
  },
  {
    method: 'GET',
    path: '/whitelabel',
    handler: (req, res, context) => renderWhiteLabel(res, context),
  },
  {
    method: 'GET',
    path: '/support',
    handler: async (_req, res, context) => {
      const tickets = await context.repo.getSupportTickets();
      const tenantBrand = await context.repo.getTenantBrand();
      const branches = await context.repo.getBranches();
      const floors = await context.repo.getFloors();
      const html = renderShell(renderSupportWorkspace(tickets, branches, context.currentBranch?.id || 'branch_ldh'), {
        title: 'Customer Support Desk',
        activeNav: 'support',
        restaurantName: resolveTenantDisplayName(tenantBrand, context.tenantContext?.tenantName),
        currentBranchId: context.currentBranch?.id || 'branch_ldh',
        currentFloorId: context.currentFloor?.id || 'floor_ground',
        currentServiceShift: context.serviceShift,
        branches,
        floors,
        staffRole: context.activeStaffRole,
      });
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/operations/onboarding',
    handler: (req, res, context) => renderOnboarding(res, context),
  },
  {
    method: 'GET',
    path: '/onboarding',
    handler: (req, res, context) => renderOnboarding(res, context),
  },
  {
    method: 'GET',
    path: '/developer/*',
    handler: async (_req, res, context) => {
      const sub = context.params.wild || '';
      const tenantBrand = await context.repo.getTenantBrand();
      const branches = await context.repo.getBranches();
      const floors = await context.repo.getFloors();
      const tenantDisplayName = resolveTenantDisplayName(tenantBrand, context.tenantContext?.tenantName);

      if (sub === 'templates' || sub === '/templates') {
        const templates = await context.repo.getTemplates();
        const menuItems = await context.repo.getMenuItems();
        const html = renderShell(renderTemplateCompositionInspector(templates, 'tmpl_haute_gastronomy', 'tmpl_artisan_coffee', menuItems), {
          title: 'Template Inspector',
          activeNav: 'marketplace',
          restaurantName: tenantDisplayName,
          currentBranchId: context.currentBranch?.id || 'branch_ldh',
          currentFloorId: context.currentFloor?.id || 'floor_ground',
          currentServiceShift: context.serviceShift,
          branches,
          floors,
          staffRole: context.activeStaffRole,
        });
        sendHtml(res, html);
        return;
      }

      const rawData = await context.repo.getRawData();
      const html = renderShell(renderDeveloperInspector(context as any, rawData, tenantDisplayName), {
        title: 'Runtime Inspector',
        activeNav: 'overview',
        restaurantName: tenantDisplayName,
        currentBranchId: context.currentBranch?.id || 'branch_ldh',
        currentFloorId: context.currentFloor?.id || 'floor_ground',
        currentServiceShift: context.serviceShift,
        branches,
        floors,
        staffRole: context.activeStaffRole,
      });
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/crave-atlas*',
    handler: (_req, res, context) => {
      res.writeHead(302, { Location: `/apps/crave-atlas${context.parsedUrl.search || ''}` });
      res.end();
    },
  },
  {
    method: 'GET',
    path: '/swift-bite*',
    handler: (_req, res, context) => {
      res.writeHead(302, { Location: `/apps/swift-bite${context.parsedUrl.search || ''}` });
      res.end();
    },
  },
  {
    method: 'GET',
    path: '/pantry-rush*',
    handler: (_req, res, context) => {
      res.writeHead(302, { Location: `/apps/pantry-rush${context.parsedUrl.search || ''}` });
      res.end();
    },
  },
  {
    method: 'GET',
    path: '/locations*',
    handler: (_req, res, context) => {
      res.writeHead(302, { Location: `/operations/locations${context.parsedUrl.search || ''}` });
      res.end();
    },
  },
];

async function getShellOptions(context: any, title: string, activeNav: any): Promise<ShellOptions> {
  const tenantBrand = await context.repo.getTenantBrand();
  const branches = await context.repo.getBranches();
  const floors = await context.repo.getFloors();
  return {
    title,
    activeNav,
    restaurantName: resolveTenantDisplayName(tenantBrand, context.tenantContext?.tenantName),
    currentBranchId: context.currentBranch?.id || 'branch_ldh',
    currentFloorId: context.currentFloor?.id || 'floor_ground',
    currentServiceShift: context.serviceShift,
    branches,
    floors,
    staffRole: context.activeStaffRole,
  } as ShellOptions;
}

async function renderHome(req: any, res: any, context: any, activeNav: string): Promise<void> {
  const branchTables = await context.repo.getTables(context.currentBranch?.id);
  const branchTasks = await context.repo.getKitchenTasks(undefined, context.currentBranch?.id);
  const branchRequests = await context.repo.getServiceRequests(context.currentBranch?.id);
  const branchOrders = await context.repo.getOrders(undefined, undefined, context.currentBranch?.id);
  const branchEvents = await context.repo.getEvents(0, context.currentBranch?.id);

  const opts = await getShellOptions(context, 'Operations Command', activeNav);
  const html = renderShell(
    renderOperationsHome(
      branchTables,
      branchTasks,
      branchRequests,
      context.currentBranch?.name || 'Main',
      context.serviceShift,
      branchOrders,
      branchEvents
    ),
    opts
  );
  sendHtml(res, html);
}

async function renderFloor(req: any, res: any, context: any): Promise<void> {
  const selectedTableId = context.parsedUrl.query.table ? parseInt(context.parsedUrl.query.table as string, 10) : undefined;
  const allTables = await context.repo.getTables(context.currentBranch?.id);
  const allOrders = await context.repo.getOrders(undefined, undefined, context.currentBranch?.id);
  const floors = await context.repo.getFloors();

  const opts = await getShellOptions(context, 'Spatial Floor Studio', 'floor');
  const html = renderShell(
    renderFloorStudio(allTables, selectedTableId, context.currentFloor?.id || 'floor_ground', context.currentBranch?.id || 'branch_ldh', floors, allOrders),
    opts
  );
  sendHtml(res, html);
}

async function renderOrders(req: any, res: any, context: any): Promise<void> {
  const orders = await context.repo.getOrders(undefined, undefined, context.currentBranch?.id);
  const branches = await context.repo.getBranches();
  const opts = await getShellOptions(context, 'Service Orders', 'orders');
  const html = renderShell(renderOrdersWorkspace(orders, branches, context.currentBranch?.id || 'branch_ldh'), opts);
  sendHtml(res, html);
}

async function renderLocations(req: any, res: any, context: any): Promise<void> {
  const branches = await context.repo.getBranches();
  const opts = await getShellOptions(context, 'Locations & Branches', 'locations');
  const html = renderShell(renderLocationsWorkspace(branches, context.currentBranch?.id || 'branch_ldh'), opts);
  sendHtml(res, html);
}

async function renderStaff(req: any, res: any, context: any): Promise<void> {
  const members = await context.repo.getStaffMembers();
  const branches = await context.repo.getBranches();
  const opts = await getShellOptions(context, 'Staff & Security', 'staff');
  const html = renderShell(renderStaffWorkspace(members, branches, context.currentBranch?.id || 'branch_ldh'), opts);
  sendHtml(res, html);
}

async function renderWhiteLabel(res: any, context: any): Promise<void> {
  const tenantBrand = await context.repo.getTenantBrand();
  const branches = await context.repo.getBranches();
  const opts = await getShellOptions(context, 'White-Label & Domains', 'whitelabel');
  const html = renderShell(renderWhiteLabelWorkspace(tenantBrand, branches, context.currentBranch?.id || 'branch_ldh'), opts);
  sendHtml(res, html);
}

async function renderOnboarding(res: any, context: any): Promise<void> {
  const onboardingState = await ownerSelfService.getOnboardingState(context.tenantContext?.tenantId);
  const tenantBrand = await context.repo.getTenantBrand();
  const tenantDisplayName = resolveTenantDisplayName(tenantBrand, context.tenantContext?.tenantName);
  const opts = await getShellOptions(context, 'Owner Onboarding', 'onboarding');
  const html = renderShell(renderOnboardingWorkspace(onboardingState, tenantBrand, context.currentBranch?.name, tenantDisplayName), opts);
  sendHtml(res, html);
}

async function renderCraveAtlas(res: any, context: any): Promise<void> {
  const branches = await context.repo.getBranches();
  const targetBranch = context.currentBranch || branches[0];
  const resolvedMenu = await context.repo.getResolvedMenuForBranch(targetBranch.id);
  const tenantBrand = await context.repo.getTenantBrand();
  const html = renderCraveAtlasPage(branches, targetBranch, resolvedMenu, tenantBrand);
  sendHtml(res, html);
}

async function renderSwiftBite(res: any, context: any): Promise<void> {
  const branches = await context.repo.getBranches();
  const targetBranch = context.currentBranch || branches[0];
  const resolvedMenu = await context.repo.getResolvedMenuForBranch(targetBranch.id);
  const tenantBrand = await context.repo.getTenantBrand();
  const tableNumber = (context.parsedUrl.query.table || '1') as string;
  const orders = await context.repo.getOrders();
  const html = renderSwiftBitePage(branches, targetBranch, resolvedMenu, tenantBrand, tableNumber, orders);
  sendHtml(res, html);
}

async function renderPantryRush(res: any, context: any): Promise<void> {
  const branches = await context.repo.getBranches();
  const targetBranch = context.currentBranch || branches[0];
  const skus = await context.repo.getGrocerySkus();
  const tenantBrand = await context.repo.getTenantBrand();
  const pincode = (context.parsedUrl.query.pincode || '141001') as string;
  const html = renderPantryRushPage(skus, tenantBrand, branches, targetBranch, pincode);
  sendHtml(res, html);
}
