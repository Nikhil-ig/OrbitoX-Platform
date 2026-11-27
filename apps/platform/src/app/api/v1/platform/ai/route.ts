import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { withOperatorAuth, type OperatorSessionContext } from '@/server/auth/operator-auth';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import {
  getMcpGatewayInventory,
  invokeMcpTool,
} from '@/server/ai/mcp-governance-service';
import { McpToolError, type McpActorContext } from '@/server/ai/mcp-tools';

const noStore = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

function buildOperatorActor(session: OperatorSessionContext): McpActorContext {
  return {
    kind: 'operator',
    actorId: session.operatorId,
    actorEmail: session.email,
    role: session.role,
    reauthenticatedAt: session.reauthenticatedAt,
    allowedTenants: '*',
    session,
  };
}

function buildApiKeyActor(ctx: ApiRequestContext): McpActorContext {
  const scopes = Array.isArray(ctx.capabilities) && ctx.capabilities.length > 0
    ? ctx.capabilities
    : ctx.scopes || [];
  const allowedTenants = ctx.tenantId ? [ctx.tenantId] : [];
  if (scopes.includes('*') || scopes.includes('admin')) {
    allowedTenants.push('*');
  }

  let stableActorId: string | undefined;
  if (ctx.authMethod === 'api_key') {
    if (!ctx.keyId) {
      throw new McpToolError(401, 'INVALID_KEY_IDENTITY', 'Authenticated API key is missing a stable key identifier.');
    }
    stableActorId = ctx.keyId;
  } else {
    stableActorId = ctx.keyId || ctx.sub || ctx.actorLabel || (ctx.operatorId ? `operator:${ctx.operatorId}` : undefined);
  }

  if (!stableActorId) {
    throw new McpToolError(401, 'ACTOR_IDENTITY_REQUIRED', 'Unable to derive a non-secret actor identifier.');
  }

  return {
    kind: 'api_key',
    actorId: stableActorId,
    actorEmail: null,
    ...(ctx.maskedKeyDisplay ? { maskedKeyDisplay: ctx.maskedKeyDisplay } : {}),
    capabilities: scopes,
    allowedTenants,
    projectTenantId: ctx.tenantId,
  };
}

async function handleGetMcpInventory(
  requestId: string,
  operatorContext?: { operatorId?: string; operatorRole?: string },
) {
  const inventory = await getMcpGatewayInventory(operatorContext);
  return NextResponse.json<ApiResponse>(
    {
      success: true,
      data: inventory,
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId,
      },
    },
    { headers: noStore },
  );
}

async function handlePostMcpExecution(
  req: NextRequest,
  actor: McpActorContext,
  requestId: string,
) {
  try {
    const body = await req.json().catch(() => ({}));
    const outcome = await invokeMcpTool(
      {
        toolName: body.toolName,
        parameters: body.parameters,
        promptContext: body.promptContext,
        agentCaller: body.agentCaller,
      },
      actor,
    );

    if (outcome.kind === 'approval_required') {
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: {
            requiresApproval: true,
            approval: outcome.approval,
          },
          meta: {
            latencyMs: 1,
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        { status: outcome.status, headers: noStore },
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          requiresApproval: false,
          execution: outcome.execution,
          output: outcome.output,
          guardrailAudit: outcome.guardrailAudit,
        },
        meta: {
          latencyMs: outcome.execution.latencyMs,
          timestamp: new Date().toISOString(),
          requestId,
        },
      },
      { status: outcome.status, headers: noStore },
    );
  } catch (err: any) {
    if (err instanceof McpToolError) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            ...(err.details ? { details: err.details } : {}),
          },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId },
        },
        { status: err.status, headers: noStore },
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: { code: 'MCP_EXECUTION_FAILED', message: err?.message || 'MCP request failed' },
        meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId },
      },
      { status: 500, headers: noStore },
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
    scopeMode: 'any',
  },
  async (_req: NextRequest, ctx: ApiRequestContext) => handleGetMcpInventory(ctx.requestId),
);

const getWithOperator = withOperatorAuth(async (_req: NextRequest, session) => {
  return handleGetMcpInventory(`op_${session.operatorId}`, {
    operatorId: session.operatorId,
    operatorRole: session.role,
  });
});

export async function GET(req: NextRequest): Promise<Response> {
  const hasApiCredential = Boolean(
    req.headers.get('x-api-key') || req.headers.get('authorization') || req.headers.get('x-admin-token'),
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
    routeClass: 'platform-admin',
    requiredScopes: ['platform.ai.execute', 'admin'],
    scopeMode: 'any',
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) =>
    handlePostMcpExecution(req, buildApiKeyActor(ctx), ctx.requestId),
);

const postWithOperator = withOperatorAuth(
  async (req: NextRequest, session) =>
    handlePostMcpExecution(req, buildOperatorActor(session), `op_${session.operatorId}`),
  { write: true },
);

export async function POST(req: NextRequest): Promise<Response> {
  const hasApiCredential = Boolean(
    req.headers.get('x-api-key') || req.headers.get('authorization') || req.headers.get('x-admin-token'),
  );
  if (hasApiCredential) {
    return postWithApiKey(req);
  }
  return postWithOperator(req);
}
