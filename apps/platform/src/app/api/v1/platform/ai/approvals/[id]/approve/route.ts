import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { ApiResponse } from '@/app/api/v1/_lib/api-types';
import { approveAndExecuteMcpProposal } from '@/server/ai/mcp-governance-service';
import { McpToolError, type McpActorContext } from '@/server/ai/mcp-tools';

const noStore = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (req: NextRequest, session, context) => {
    const requestId = `op_${session.operatorId}`;
    try {
      const { id } = await context.params;
      const body = await req.json().catch(() => ({}));

      const actor: McpActorContext = {
        kind: 'operator',
        actorId: session.operatorId,
        actorEmail: session.email,
        role: session.role,
        reauthenticatedAt: session.reauthenticatedAt,
        allowedTenants: '*',
        session,
      };

      const result = await approveAndExecuteMcpProposal(
        {
          approvalId: id,
          editedMessage: body.editedMessage,
          reason: body.reason,
          emergencySelfApproval: body.emergencySelfApproval,
        },
        actor,
      );

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: result,
          meta: {
            latencyMs: result.execution.latencyMs,
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        { status: 200, headers: noStore },
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
          error: { code: 'MCP_APPROVAL_FAILED', message: err?.message || 'Approval execution failed' },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId },
        },
        { status: 500, headers: noStore },
      );
    }
  },
  { write: true },
);
