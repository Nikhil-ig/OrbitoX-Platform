import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
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
        toolName: 'kernel_inspect_environment',
        description: 'Inspect runtime topology, memory pool, and cluster health for given tenant environment.',
        requiredCapability: 'platform.environment.inspect',
        safetyStatus: 'GUARDED',
        invocationsCount: 1420,
        averageLatencyMs: 4,
      },
      {
        toolName: 'kernel_crypto_verify',
        description: 'Verify Ed25519 signature of an installed package manifest or license token.',
        requiredCapability: 'platform.crypto.verify',
        safetyStatus: 'GUARDED',
        invocationsCount: 3890,
        averageLatencyMs: 2,
      },
    ],
  },
  {
    serverId: 'mcp-server-crm',
    name: '@orbitox-io/crm Sales Agent Server',
    version: 'v1.0.1',
    status: 'ONLINE',
    transport: 'HTTP SSE / Stream',
    tools: [
      {
        toolName: 'crm_create_lead',
        description: 'Create and ingest a prospective customer lead into the CRM state machine.',
        requiredCapability: 'crm.leads.write',
        safetyStatus: 'GUARDED',
        invocationsCount: 820,
        averageLatencyMs: 12,
      },
      {
        toolName: 'crm_score_lead',
        description: 'Run deterministic 0-100 lead score calculation and stage transition evaluator.',
        requiredCapability: 'crm.leads.read',
        safetyStatus: 'GUARDED',
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
        invocationsCount: 654,
        averageLatencyMs: 8,
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
    callerAgent: 'Sales-Copilot-Claude-3.5',
    toolName: 'crm_score_lead',
    tenantScope: 'proj-omnideliver',
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
    callerAgent: 'Support-Bot-Gemma-27B',
    toolName: 'crm_create_lead',
    tenantScope: 'proj-omnideliver',
    status: 'AUTHORIZED_EXECUTED',
    latencyMs: 14,
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    redactionsApplied: 1,
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform AI & MCP Governance Gateway',
    allowPublic: true,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
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
        requestId: ctx.requestId,
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform AI & MCP Governance Gateway',
    requiredScopes: ['platform.ai.simulate', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { toolName, parameters, agentCaller, simulateFailure } = body;

      if (!toolName) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'INVALID_INPUT', message: 'toolName is required' },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 400 }
        );
      }

      // Check if tool exists
      const allTools = MCP_SERVERS.flatMap((s) => s.tools);
      const tool = allTools.find((t) => t.toolName === toolName);

      if (!tool) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'TOOL_NOT_FOUND', message: `MCP tool ${toolName} not found in registered servers` },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 404 }
        );
      }

      const isBlocked = simulateFailure === true;
      const latencyMs = Math.floor(Math.random() * 8) + 4;

      // Filter and sanitize output (simulate PII and secret redaction)
      const simulatedOutput = isBlocked
        ? { error: 'GUARDRAIL_INTERCEPTION: Missing capability token [platform.ai.act]' }
        : {
            result: `Successfully invoked ${toolName}`,
            status: 'SUCCESS',
            tenantScope: ctx.tenantId || 'proj-omnideliver',
            sanitizedInput: parameters || {},
            data: {
              timestamp: new Date().toISOString(),
              recordsProcessed: 1,
              redactionPassStatus: 'PII_AND_SECRETS_STRIPPED',
            },
          };

      const newLog = {
        id: `mcp_exec_${Date.now()}`,
        callerAgent: agentCaller || 'Platform-SuperAdmin-Playground',
        toolName,
        tenantScope: ctx.tenantId || 'proj-omnideliver',
        status: isBlocked ? 'BLOCKED_GUARDRAIL_TRIGGER' : 'AUTHORIZED_EXECUTED',
        latencyMs,
        timestamp: new Date().toISOString(),
        redactionsApplied: isBlocked ? 0 : 1,
      };

      EXECUTION_LOGS.unshift(newLog);
      if (EXECUTION_LOGS.length > 20) EXECUTION_LOGS.pop();

      // Log to Merkle audit chain
      await auditService.log({
        action: isBlocked ? 'MCP_TOOL_BLOCKED_BY_GUARDRAIL' : 'MCP_TOOL_EXECUTED',
        entityType: 'MCP_TOOL',
        entityId: toolName,
        userId: ctx.apiKey || 'platform_superadmin',
        contextId: ctx.tenantId || 'global',
        reason: `MCP tool simulation via governance playground`,
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
          requestId: ctx.requestId,
        },
      });
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'MCP_SIMULATION_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
