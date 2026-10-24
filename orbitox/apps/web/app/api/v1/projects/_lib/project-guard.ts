import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';

/**
 * Validates that the request has appropriate project authorization.
 *
 * Enforces per-project runtime keys:
 * - Admin principal is always authorized.
 * - Initial registration (REGISTER) is allowed with the shared ORBITOX_RUNTIME_TOKEN.
 * - Once registered, all subsequent calls (heartbeat, commands, features, apis, etc.)
 *   must present the project's own scoped key (orb_proj_...).
 * - Reusing the shared token or presenting another project's key is rejected (401).
 */
export function authorizeProjectRequest(
  req: NextRequest,
  projectId: string,
  action?: string
): NextResponse | null {
  const principal = req.headers.get('x-orbitox-principal') || 'runtime';
  let credential = req.headers.get('x-orbitox-credential');
  if (!credential) {
    const auth = req.headers.get('authorization');
    if (auth) {
      const [scheme, val] = auth.split(' ');
      if (scheme?.toLowerCase() === 'bearer') credential = val ?? null;
    }
  }
  const sharedRuntimeToken = process.env.ORBITOX_RUNTIME_TOKEN?.trim();

  const access = externalProjectEngine.runtimeController.verifyProjectAccess({
    projectId,
    principal,
    credential,
    action: action || req.method,
    method: req.method,
    sharedRuntimeToken,
  });

  if (!access.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: access.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
          message: access.error || 'Authentication required.',
        },
      },
      { status: access.status }
    );
  }

  return null;
}
