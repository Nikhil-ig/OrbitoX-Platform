import * as crypto from 'crypto';

export const PROJECT_KEY_PREFIX = 'orb_proj_';

export interface ProjectAccessParams {
  projectId: string;
  principal: string;
  credential?: string | null;
  action?: string | null;
  method?: string | null;
  sharedRuntimeToken?: string | null;
  projectKeyHash?: string | null;
}

export interface ProjectAccessResult {
  authorized: boolean;
  status: 200 | 401 | 403;
  error?: string;
  isInitialRegistration?: boolean;
}

/**
 * Generate a cryptographically secure, project-scoped runtime key.
 * Format: orb_proj_<48 hex chars>
 */
export function generateProjectKey(): string {
  return `${PROJECT_KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Hash a runtime key with SHA-256 before persisting.
 * Plaintext keys are never stored on disk.
 */
export function hashProjectKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Constant-time string equality check to avoid timing side-channels.
 */
export function safeTimingEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify a presented key against the stored SHA-256 hash.
 */
export function verifyProjectKey(presentedKey: string, storedHash: string): boolean {
  if (!presentedKey || typeof presentedKey !== 'string') return false;
  if (!storedHash || typeof storedHash !== 'string') return false;
  const presentedHash = hashProjectKey(presentedKey);
  return safeTimingEqual(presentedHash, storedHash);
}

/**
 * Evaluate authorization for project runtime requests:
 * 1. Admin principal has unrestricted access.
 * 2. Unregistered projects (no stored key hash):
 *    - REGISTER action: requires the valid shared ORBITOX_RUNTIME_TOKEN.
 *    - All other actions: rejected (project must register first).
 * 3. Registered projects (stored key hash exists):
 *    - Shared ORBITOX_RUNTIME_TOKEN is rejected for all operations (including re-registration).
 *    - Presented credential must match the project's own key hash.
 *    - Keys for other projects or invalid keys are rejected (401).
 */
export function evaluateProjectAccess(params: ProjectAccessParams): ProjectAccessResult {
  const { principal, credential, action, sharedRuntimeToken, projectKeyHash } = params;

  if (principal === 'admin') {
    return { authorized: true, status: 200 };
  }

  if (principal !== 'runtime') {
    return { authorized: false, status: 401, error: 'Authentication required.' };
  }

  const isRegister = action === 'REGISTER';

  // Case 1: Unregistered project (no key hash stored yet)
  if (!projectKeyHash) {
    if (isRegister) {
      if (credential && sharedRuntimeToken && safeTimingEqual(credential, sharedRuntimeToken)) {
        return { authorized: true, status: 200, isInitialRegistration: true };
      }
      return {
        authorized: false,
        status: 401,
        error: 'Initial registration requires valid shared runtime token.',
      };
    }
    return {
      authorized: false,
      status: 401,
      error: 'Project is not registered with a project runtime key. Call REGISTER first.',
    };
  }

  // Case 2: Registered project (key hash already stored)
  if (isRegister) {
    // Re-registration can only be authenticated with the project's own key
    if (credential && verifyProjectKey(credential, projectKeyHash)) {
      return { authorized: true, status: 200 };
    }
    if (credential && sharedRuntimeToken && safeTimingEqual(credential, sharedRuntimeToken)) {
      return {
        authorized: false,
        status: 401,
        error: 'Project is already registered. Shared runtime token cannot be reused; present the project-scoped key.',
      };
    }
    return {
      authorized: false,
      status: 401,
      error: 'Invalid project runtime key.',
    };
  }

  // All non-register actions on registered projects:
  if (credential && sharedRuntimeToken && safeTimingEqual(credential, sharedRuntimeToken)) {
    return {
      authorized: false,
      status: 401,
      error: 'Shared runtime token cannot be used for operations on a registered project. Present the project-scoped key.',
    };
  }

  if (credential && verifyProjectKey(credential, projectKeyHash)) {
    return { authorized: true, status: 200 };
  }

  return {
    authorized: false,
    status: 401,
    error: 'Invalid project runtime key.',
  };
}
