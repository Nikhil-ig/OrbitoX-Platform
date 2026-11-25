import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { auditService } from '@/app/api/v1/_lib/platform-governance';

// In-memory registry of MCP tools & recent execution audit
const MCP_SERVERS = [
  {
    serverId: 'mcp-server-core',
    name: 'OrbitoX Core Kernel Server',
    version: 'v3.0.4',
    status: 'ONLINE',
    transport: 'stdio / IPC',
    tools: [
      {
        toolName: 'tenants.search / get',
        description: 'Search tenants, view domains, plan tier, and suspension state across the fleet.',
        requiredCapability: 'platform.tenants.read',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'READ_FREELY',
        invocationsCount: 2840,
        averageLatencyMs: 3,
      },
      {
        toolName: 'kernel_inspect_environment',
        description: 'Inspect runtime topology, memory pool, and cluster health for given tenant environment.',
        requiredCapability: 'platform.environment.inspect',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'READ_FREELY',
        invocationsCount: 1420,
        averageLatencyMs: 4,
      },
      {
        toolName: 'kernel_crypto_verify',
        description: 'Verify Ed25519 signature of an installed package manifest or license token.',
        requiredCapability: 'platform.crypto.verify',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'READ_FREELY',
        invocationsCount: 3890,
        averageLatencyMs: 2,
      },
      {
        toolName: 'provisioning.retry',
        description: 'Retry failed or cancelled tenant provisioning saga steps idempotently.',
        requiredCapability: 'platform.provisioning.write',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'ASK_FIRST',
        invocationsCount: 164,
        averageLatencyMs: 18,
      },
      {
        toolName: 'tenants.suspend',
        description: 'Suspend an active tenant workspace immediately with mandatory reason and step-up MFA.',
        requiredCapability: 'platform.tenants.suspend',
        safetyStatus: 'STEP_UP',
        approvalPolicy: 'STEP_UP_MFA',
        invocationsCount: 24,
        averageLatencyMs: 22,
      },
    ],
  },
  {
    serverId: 'mcp-server-billing',
    name: 'OrbitoX Billing & Subscriptions MCP Server',
    version: 'v1.8.0',
    status: 'ONLINE',
    transport: 'Internal RPC',
    tools: [
      {
        toolName: 'billing.list_subscriptions',
        description: 'List active, grace-period, and delinquent subscriptions across organizations.',
        requiredCapability: 'platform.billing.read',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'READ_FREELY',
        invocationsCount: 912,
        averageLatencyMs: 5,
      },
      {
        toolName: 'billing.send_payment_reminder',
        description: 'Queue an operator-approved payment reminder email to organization billing contacts.',
        requiredCapability: 'platform.billing.remind',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'ASK_FIRST',
        invocationsCount: 148,
        averageLatencyMs: 11,
      },
    ],
  },
  {
    serverId: 'mcp-server-hms',
    name: '@orbitox/hms Clinical Triage MCP Server',
    version: 'v2.4.0',
    status: 'ONLINE',
    transport: 'HTTP SSE / Stream',
    tools: [
      {
        toolName: 'hms_triage_score',
        description: 'Inspect clinical triage status and bed capacity within tenant boundaries.',
        requiredCapability: 'hms.triage.execute',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'READ_FREELY',
        invocationsCount: 820,
        averageLatencyMs: 12,
      },
      {
        toolName: 'hms_read_beds',
        description: 'Read anonymized ward & ICU bed availability.',
        requiredCapability: 'hms.beds.view',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'READ_FREELY',
        invocationsCount: 2150,
        averageLatencyMs: 6,
      },
    ],
  },
  {
    serverId: 'mcp-server-db',
    name: 'OrbitoX Safe Read-Only Database Inspector',
    version: 'v2.1.0',
    status: 'ONLINE',
    transport: 'stdio / Local Socket',
    tools: [
      {
        toolName: 'db_read_schema',
        description: 'Read sanitized database table definitions and schema metadata for active tenant.',
        requiredCapability: 'platform.db.read',
        safetyStatus: 'GUARDED',
        approvalPolicy: 'READ_FREELY',
        invocationsCount: 654,
        averageLatencyMs: 8,
      },
      {
        toolName: 'data_rights.erase',
        description: 'Irreversible personal data purge. Disabled for autonomous AI invocation.',
        requiredCapability: 'platform.data_rights.purge',
        safetyStatus: 'BLOCKED',
        approvalPolicy: 'NEVER_AI',
        invocationsCount: 0,
        averageLatencyMs: 0,
      },
    ],
  },
];

const GUARDRAIL_CONFIG = {
  piiRedaction: {
    enabled: true,
    patterns: ['Email', 'Credit Card (Luhn)', 'Phone Number (E.164)', 'National ID'],
    totalRedactions: 384,
  },
  promptInjectionShield: {
    enabled: true,
    mode: 'Zero-Tolerance Heuristic + Embedding Filter',
    injectionsBlocked: 19,
  },
  secretLeakageFilter: {
    enabled: true,
    mode: 'CSPRNG Secret & Private Key Redactor',
    secretsFiltered: 43,
  },
  tokenBudgets: {
    activeBudget: '5,000,000 tokens / day',
    currentConsumed: '1,248,310 tokens',
    tenantRateLimit: '60 tool calls / min',
  },
};

const EXECUTION_LOGS = [
  {
    id: 'mcp_exec_901',
    callerAgent: 'Mesh-Autonomous-Auditor (v2.4)',
    toolName: 'kernel_crypto_verify',
    tenantScope: 'proj-omnideliver',
    status: 'AUTHORIZED_EXECUTED',
    latencyMs: 3,
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    redactionsApplied: 0,
  },
  {
    id: 'mcp_exec_902',
    callerAgent: 'Clinical-Copilot-Claude-3.5',
    toolName: 'hms_read_beds',
    tenantScope: 'proj-mednet-health',
    status: 'AUTHORIZED_EXECUTED',
    latencyMs: 7,
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    redactionsApplied: 2,
  },
  {
    id: 'mcp_exec_903',
    callerAgent: 'External-Agent-GPT-4o',
    toolName: 'db_read_schema',
    tenantScope: 'unscoped_external',
    status: 'BLOCKED_CAPABILITY_MISSING',
    latencyMs: 1,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    redactionsApplied: 0,
  },
  {
    id: 'mcp_exec_904',
    callerAgent: 'Triage-Copilot-27B',
    toolName: 'hms_triage_score',
    tenantScope: 'proj-mednet-health',
    status: 'AUTHORIZED_EXECUTED',
    latencyMs: 14,
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    redactionsApplied: 1,
  },
];

async function handleGetMcpInventory(requestId: string) {
  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      servers: MCP_SERVERS,
      guardrails: GUARDRAIL_CONFIG,
      recentExecutions: EXECUTION_LOGS,
      totalToolsRegistered: MCP_SERVERS.reduce((acc, s) => acc + s.tools.length, 0),
      activeGatewaysCount: MCP_SERVERS.length,
    },
    meta: {
      latencyMs: 1,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

async function handleExecuteMcpTool(
  req: NextRequest,
  actorLabel: string,
  tenantScope: string,
  requestId: string
) {
  try {
    const body = await req.json();
    const { toolName, parameters, agentCaller, simulateFailure } = body;

    if (!toolName) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'toolName is required' },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId },
        },
        { status: 400 }
      );
    }

    const allTools = MCP_SERVERS.flatMap((s) => s.tools);
    const tool = allTools.find((t) => t.toolName === toolName);

    if (!tool) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'TOOL_NOT_FOUND', message: `MCP tool ${toolName} not found in registered servers` },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId },
        },
        { status: 404 }
      );
    }

    if (tool.approvalPolicy === 'NEVER_AI') {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'TOOL_POLICY_BLOCKED',
            message: `${toolName} is marked Never through AI and cannot be invoked by the assistant.`,
          },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId },
        },
        { status: 403 }
      );
    }

    const isBlocked = simulateFailure === true;
    const latencyMs = crypto.randomInt(4, 12);

    const simulatedOutput = isBlocked
      ? { error: 'GUARDRAIL_INTERCEPTION: Missing capability token [platform.ai.act]' }
      : {
          result: `Successfully invoked ${toolName}`,
          status: 'SUCCESS',
          tenantScope,
          sanitizedInput: parameters || {},
          data: {
            timestamp: new Date().toISOString(),
            recordsProcessed: 1,
            redactionPassStatus: 'PII_AND_SECRETS_STRIPPED',
          },
        };

    const newLog = {
      id: `mcp_exec_${Date.now()}`,
      callerAgent: agentCaller || 'AskOrbitoX-Console-Session',
      toolName,
      tenantScope,
      status: isBlocked ? 'BLOCKED_GUARDRAIL_TRIGGER' : 'AUTHORIZED_EXECUTED',
      latencyMs,
      timestamp: new Date().toISOString(),
      redactionsApplied: isBlocked ? 0 : 1,
    };

    EXECUTION_LOGS.unshift(newLog);
    if (EXECUTION_LOGS.length > 20) EXECUTION_LOGS.pop();

    await auditService.log({
      action: isBlocked ? 'MCP_TOOL_BLOCKED_BY_GUARDRAIL' : 'MCP_TOOL_EXECUTED',
      entityType: 'MCP_TOOL',
      entityId: toolName,
      userId: actorLabel,
      contextId: tenantScope || 'global',
      reason: `MCP tool invocation via Ask OrbitoX`,
      newValue: { toolName, status: newLog.status, latencyMs },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        execution: newLog,
        output: simulatedOutput,
        guardrailAudit: {
          piiShield: 'CLEAN',
          promptInjection: 'CLEAN',
          secretLeakage: '0 Secrets Escaped',
        },
      },
      meta: {
        latencyMs,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (err: any) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: { code: 'MCP_SIMULATION_FAILED', message: err.message },
        meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId },
      },
      { status: 500 }
    );
  }
}

const getWithApiKey = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform AI & MCP Governance Gateway',
    routeClass: 'platform-admin',
    allowPublic: false,
    requiredScopes: ['platform.ai', 'admin'],
  },
  async (_req: NextRequest, ctx: ApiRequestContext) => handleGetMcpInventory(ctx.requestId)
);

const getWithOperator = withOperatorAuth(async (_req: NextRequest, session) => {
  return handleGetMcpInventory(`op_${session.operatorId}`);
});

export async function GET(req: NextRequest): Promise<Response> {
  const hasApiCredential = Boolean(
    req.headers.get('x-api-key') || req.headers.get('authorization') || req.headers.get('x-admin-token')
  );
  if (hasApiCredential) {
    return getWithApiKey(req);
  }
  return getWithOperator(req);
}

const postWithApiKey = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform AI & MCP Governance Gateway',
    requiredScopes: ['platform.ai.simulate', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) =>
    handleExecuteMcpTool(req, ctx.apiKey || ctx.operatorId || 'platform_superadmin', ctx.tenantId || 'global', ctx.requestId)
);

const postWithOperator = withOperatorAuth(
  async (req: NextRequest, session) =>
    handleExecuteMcpTool(req, session.email, 'global', `op_${session.operatorId}`),
  { write: true }
);

export async function POST(req: NextRequest): Promise<Response> {
  const hasApiCredential = Boolean(
    req.headers.get('x-api-key') || req.headers.get('authorization') || req.headers.get('x-admin-token')
  );
  if (hasApiCredential) {
    return postWithApiKey(req);
  }
  return postWithOperator(req);
}
