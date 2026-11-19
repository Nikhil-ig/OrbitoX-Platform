/**
 * 🤖 OrbitoX RestaurantOS - Tool-First AI & Model Context Protocol (MCP) Gateway
 * ─────────────────────────────────────────────────────────────
 * INVARIANT: AI models NEVER receive direct database credentials or raw SQL permissions.
 * All mutations and analytics must flow through typed, schema-validated domain tools.
 * Scopes (`tenantId`, `locationId`) are injected strictly from the server execution context,
 * NEVER trusted from LLM-generated parameters to prevent prompt-injection scope escaping.
 */

export interface ServerExecutionContext {
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly actorUserId: string;
  readonly actorRole: 'OWNER' | 'MANAGER' | 'STAFF' | 'GUEST';
}

export interface McpToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parametersSchema: Record<string, any>;
  readonly requiredRole: 'OWNER' | 'MANAGER' | 'STAFF' | 'GUEST';
  readonly execute: (params: any, context: ServerExecutionContext) => Promise<any>;
}

export class RestaurantMcpGateway {
  private readonly tools = new Map<string, McpToolDefinition>();

  constructor() {
    this.registerCoreTools();
  }

  /**
   * Dispatches an AI tool execution with strict server-side context injection and role gating.
   */
  async executeTool(
    toolName: string,
    rawParams: Record<string, any>,
    context: ServerExecutionContext
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, error: `Tool "${toolName}" is not registered in the Restaurant MCP gateway.` };
    }

    // Role-based tool access control (BFLA mitigation)
    const roleHierarchy = { GUEST: 1, STAFF: 2, MANAGER: 3, OWNER: 4 };
    if (roleHierarchy[context.actorRole] < roleHierarchy[tool.requiredRole]) {
      return {
        success: false,
        error: `Unauthorized: Tool "${toolName}" requires role ${tool.requiredRole}, but caller has ${context.actorRole}.`,
      };
    }

    // Sanitize parameters: Strip any client-injected tenant or location overrides (BOLA mitigation)
    const sanitizedParams = { ...rawParams };
    delete sanitizedParams.tenantId;
    delete sanitizedParams.locationId;
    delete sanitizedParams.companyId;

    try {
      const result = await tool.execute(sanitizedParams, context);
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Tool execution failed' };
    }
  }

  private registerCoreTools() {
    // 1. Tool: get_sales_summary (Owner / Manager Copilot)
    this.tools.set('restaurant.get_sales_summary', {
      name: 'restaurant.get_sales_summary',
      description: 'Fetches sales, order count, and revenue metrics scoped to the current restaurant location.',
      parametersSchema: {
        type: 'object',
        properties: {
          timeframe: { type: 'string', enum: ['TODAY', 'YESTERDAY', 'THIS_WEEK'] },
        },
      },
      requiredRole: 'MANAGER',
      execute: async (params, context) => {
        // Real implementation queries domain service with server-injected context
        return {
          locationId: context.locationId,
          timeframe: params.timeframe || 'TODAY',
          grossRevenueMinor: '8420000', // ₹84,200.00
          currency: 'INR',
          orderCount: 64,
          topSellingDishes: ['Paneer Tikka', 'Dal Makhani', 'Butter Naan'],
          averageCheckSizeMinor: '131500', // ₹1,315.00
        };
      },
    });

    // 2. Tool: get_kitchen_load (Manager / Expeditor Copilot)
    this.tools.set('restaurant.get_kitchen_load', {
      name: 'restaurant.get_kitchen_load',
      description: 'Returns active station task backlogs and average prep SLA duration.',
      parametersSchema: { type: 'object', properties: {} },
      requiredRole: 'STAFF',
      execute: async (_params, context) => {
        return {
          locationId: context.locationId,
          activeBacklogTotal: 12,
          stationLoads: {
            TANDOOR: { queued: 4, inProgress: 2, avgPrepMinutes: 12.4 },
            CURRY_LINE: { queued: 5, inProgress: 1, avgPrepMinutes: 14.1 },
            BAR: { queued: 1, inProgress: 1, avgPrepMinutes: 3.2 },
          },
          slaStatus: 'ON_TRACK',
        };
      },
    });

    // 3. Tool: recommend_dishes (Guest Assistant Copilot)
    this.tools.set('restaurant.recommend_dishes', {
      name: 'restaurant.recommend_dishes',
      description: 'Recommends popular and complementary dishes based on diner preferences.',
      parametersSchema: {
        type: 'object',
        properties: {
          dietaryPreference: { type: 'string', enum: ['VEG', 'NON_VEG', 'ANY'] },
          spicePreference: { type: 'string', enum: ['MILD', 'MEDIUM', 'SPICY'] },
        },
      },
      requiredRole: 'GUEST',
      execute: async (params, _context) => {
        const isVeg = params.dietaryPreference === 'VEG';
        return {
          recommendations: isVeg
            ? [
                { name: 'Paneer Tikka Charcoal Grilled', reason: 'Most popular vegetarian starter (rated 4.9★)' },
                { name: 'Dal Makhani 24-hr Simmered', reason: 'Signature slow-cooked black lentils' },
                { name: 'Crisp Garlic Naan', reason: 'Perfect pairing with Dal Makhani' },
              ]
            : [
                { name: 'Amritsari Fish Tikka', reason: 'Crispy river sole chunks' },
                { name: 'Murgh Makhani (Old Delhi Style)', reason: 'Classic butter chicken with velvet sauce' },
              ],
        };
      },
    });

    // 4. Tool: toggle_item_availability (Staff Out-of-Stock / 86 Action)
    this.tools.set('restaurant.toggle_item_availability', {
      name: 'restaurant.toggle_item_availability',
      description: 'Marks a menu item in or out of stock with an audit reason.',
      parametersSchema: {
        type: 'object',
        required: ['itemId', 'isAvailable'],
        properties: {
          itemId: { type: 'string' },
          isAvailable: { type: 'boolean' },
          reason: { type: 'string' },
        },
      },
      requiredRole: 'STAFF',
      execute: async (params, context) => {
        return {
          locationId: context.locationId,
          itemId: params.itemId,
          isAvailable: params.isAvailable,
          updatedBy: context.actorUserId,
          reason: params.reason || 'Manual kitchen 86 toggle',
          updatedAt: new Date().toISOString(),
        };
      },
    });
  }
}
