import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '../../_lib/control-plane-brain';
import { PlatformCommand } from '@orbitox/core/control-plane';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlatformCommand;

    // Validate required fields
    if (!body.commandId || !body.operation || !body.resourceId || !body.idempotencyKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid command payload. Must include commandId, operation, resourceId, idempotencyKey.',
          },
        },
        { status: 400 }
      );
    }

    const result = await commandBus.executeCommand(body as any);

    const status = result.success ? 200 : result.error?.code === 'APPROVAL_REQUIRED' ? 423 : 400;

    return NextResponse.json(result, { status });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.name || 'COMMAND_EXECUTION_ERROR',
          message: err.message,
        },
      },
      { status }
    );
  }
}
