import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import {
  MenuItem,
  KitchenTask,
  TableFloorRecord,
  RestaurantOrder,
  BranchRecord,
  FloorRecord,
  ServiceRequest,
  RestaurantContext,
  issueStaffToken,
  verifyStaffToken,
  revokeStaffToken,
  authenticateStaffByPin,
  getPublicStaffList,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  resetStaffLockout,
  hashStaffSecretSync,
  verifyStaffSecret,
  resolveClientIp,
  checkStaffLockout,
  recordFailedStaffAttempt,
  recordSuccessfulStaffAttempt,
  issueDeviceToken,
  verifyDeviceToken,
  validateAndSanitizeCustomCss,
  tryGetActiveTenant,
  resolveTenantDisplayName,
  invalidateTenantResolutionCache,
  OnboardingStepKey,
  verifyPlatformAuth,
  validateTenantSlug,
  generateSeats,
} from '../../../packages/domain';
import {
  buildGSTInvoice,
  computeFiscalYear,
  SAC_RESTAURANT_SERVICES,
  renderPrintableInvoiceHtml,
} from '../../../packages/domain/invoicing';
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
} from '../../shared/state';
import {
  parseBody,
  parseBuffer,
  extractImageBuffer,
  sendJson,
  sendHtml,
  checkTestKillPoint,
  isActiveRestaurantCataloguePlan,
} from '../../http/middleware';
import {
  assertPlatformBridgeCaller,
  exportRestaurantTenantData,
  eraseRestaurantTenantData,
  exportRestaurantPrincipalData,
  correctRestaurantPrincipalData,
  eraseRestaurantPrincipalData,
} from '../../data-rights';
import { SEED_PLANS } from '@orbitox-io/plugin-engine';
import type { PreTenantRouteContext, TenantRouteContext } from '../../http/types';

export async function handleAuthRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    // --- AUTHENTICATION & CREDENTIAL MANAGEMENT (TENANT-SCOPED) ---
    if (
      (pathname === '/api/restaurant/auth/staff-token' ||
        pathname === '/api/restaurant/auth/token' ||
        pathname === '/api/restaurant/auth/api-token' ||
        pathname === '/api/restaurant/auth/login' ||
        pathname === '/api/restaurant/auth/staff') &&
      method === 'POST'
    ) {
      const body = await parseBody(req);
      const clientIp = resolveClientIp(req);
      const tenantId = tenantContext.tenantId;

      // Staff identifier extraction: staffId, email, phone, or identifier
      const identifier = (
        body.identifier ||
        body.staffId ||
        body.username ||
        body.email ||
        body.phone ||
        ''
      ).toString().trim();

      // Secret extraction: secret, password, or pin
      const secret = (
        body.secret !== undefined
          ? body.secret
          : body.password !== undefined
            ? body.password
            : body.pin !== undefined
              ? body.pin
              : ''
      ).toString().trim();

      // Item 1 requirement: "Do not search all staff by PIN alone."
      if (!identifier) {
        sendJson(res, 400, {
          error: 'IDENTIFIER_REQUIRED',
          code: 'IDENTIFIER_REQUIRED',
          message: 'Staff identifier (staffId, email, or phone) is required. Global PIN search is disabled.',
        });
        return true;
      }

      if (!secret) {
        sendJson(res, 400, {
          error: 'SECRET_REQUIRED',
          code: 'SECRET_REQUIRED',
          message: 'Staff secret or password is required.',
        });
        return true;
      }

      // 1. Check lockout before searching
      const lockout = checkStaffLockout(tenantId, identifier, clientIp);
      if (lockout.isLocked) {
        await repo.appendEvent('STAFF_AUTH_LOCKED', 'auth-gateway', currentBranch?.id || '*', {
          clientIp,
          identifier,
        });
        sendJson(res, 429, {
          error: 'TOO_MANY_FAILED_ATTEMPTS',
          code: 'TOO_MANY_FAILED_ATTEMPTS',
          message: lockout.error || 'Too many failed login attempts. Account temporarily locked.',
        });
        return true;
      }

      // 2. Look up staff strictly within tenant repository
      const member = await repo.getStaffMemberByIdentifier(identifier);
      if (!member) {
        const fail = recordFailedStaffAttempt(tenantId, identifier, clientIp);
        await repo.appendEvent('STAFF_AUTH_FAILED', 'auth-gateway', currentBranch?.id || '*', {
          clientIp,
          identifier,
          reason: 'STAFF_NOT_FOUND',
        });
        if (fail.isLocked) {
          sendJson(res, 429, {
            error: 'TOO_MANY_FAILED_ATTEMPTS',
            code: 'TOO_MANY_FAILED_ATTEMPTS',
            message: fail.error,
          });
          return true;
        }
        sendJson(res, 401, {
          error: 'INVALID_CREDENTIALS',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid staff identifier or secret.',
        });
        return true;
      }

      // 3. Status check
      if (member.status !== 'ACTIVE') {
        sendJson(res, 401, {
          error: 'ACCOUNT_REVOKED',
          code: 'ACCOUNT_REVOKED',
          message: 'Staff account has been revoked or suspended.',
        });
        return true;
      }

      // 4. Role & Secret strength enforcement
      const isHighPrivilege = member.role === 'OWNER' || member.role === 'ADMIN' || member.role === 'MANAGER';
      if (isHighPrivilege) {
        // Owner/Manager require a stronger secret (>= 8 chars password or PIN + second factor)
        if (secret.length < 8) {
          const secondFactor =
            body.secondFactor ||
            body.mfaCode ||
            body.totp ||
            body.deviceToken ||
            (req.headers['x-second-factor'] as string) ||
            (req.headers['x-device-token'] as string);
          if (!secondFactor) {
            sendJson(res, 400, {
              error: 'STRONG_SECRET_REQUIRED',
              code: 'STRONG_SECRET_REQUIRED',
              message:
                'Owner and Manager roles require a password of at least 8 characters or a PIN paired with a verified second factor.',
            });
            return true;
          }
        }
      } else {
        // Floor / kitchen roles (SERVER, OPERATIONS, POS, CHEF)
        // "floor/kitchen roles may keep short PINs only when the device is enrolled to the tenant and branch (device token), not from the open internet."
        if (secret.length < 8) {
          const deviceToken = body.deviceToken || (req.headers['x-device-token'] as string);
          if (!deviceToken) {
            sendJson(res, 403, {
              error: 'DEVICE_ENROLLMENT_REQUIRED',
              code: 'DEVICE_ENROLLMENT_REQUIRED',
              message:
                'Short PIN login for floor and kitchen roles requires an enrolled device token.',
            });
            return true;
          }
          const verifyDev = verifyDeviceToken(deviceToken, tenantId, member.branchId);
          if (!verifyDev.valid) {
            sendJson(res, 403, {
              error: 'INVALID_DEVICE_TOKEN',
              code: 'INVALID_DEVICE_TOKEN',
              message: `Invalid device token for tenant/branch: ${verifyDev.error}`,
            });
            return true;
          }
        }
      }

      // 5. Cryptographic secret verification (scrypt slow hash with timing-safe comparison)
      const verification = verifyStaffSecret(secret, member.pinHash, member.salt);
      if (!verification.valid) {
        const fail = recordFailedStaffAttempt(tenantId, member.id, clientIp);
        await repo.appendEvent('STAFF_AUTH_FAILED', 'auth-gateway', member.branchId, {
          clientIp,
          staffId: member.id,
          reason: 'SECRET_MISMATCH',
        });
        if (fail.isLocked) {
          sendJson(res, 429, {
            error: 'TOO_MANY_FAILED_ATTEMPTS',
            code: 'TOO_MANY_FAILED_ATTEMPTS',
            message: fail.error,
          });
          return true;
        }
        sendJson(res, 401, {
          error: 'INVALID_CREDENTIALS',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid staff authentication secret.',
        });
        return true;
      }

      // 6. Reset failed counter on success
      recordSuccessfulStaffAttempt(tenantId, member.id, clientIp);

      // 7. Transparent migration path: re-hash on login if using legacy hash
      if (verification.needsRehash) {
        const updatedHash = hashStaffSecretSync(secret, member.salt);
        await repo.updateStaffMemberSecret(member.id, updatedHash, member.salt);
      }

      // 8. Issue strictly tenant-bound staff token
      const token = issueStaffToken({
        sub: member.id,
        name: member.name,
        role: member.role,
        tenantId: tenantContext.tenantId, // STRICTLY BOUND
        branchId: member.branchId,
        station: member.station,
        permissions: member.permissions as string[] | undefined,
        expiresInSeconds: 3600, // Short expiry (1 hour)
      });

      await repo.appendEvent('STAFF_TOKEN_ISSUED', 'auth-gateway', member.branchId, {
        staffId: member.id,
        role: member.role,
        tenantId: tenantContext.tenantId,
      });

      const isExplicitApiFlow =
        pathname === '/api/restaurant/auth/token' ||
        pathname === '/api/restaurant/auth/staff-token' ||
        pathname === '/api/restaurant/auth/api-token' ||
        body.flow === 'token' ||
        body.flow === 'bearer' ||
        parsedUrl.query.flow === 'token' ||
        parsedUrl.query.flow === 'bearer';

      if (!isExplicitApiFlow) {
        const isHttps = Boolean((req.socket as any)?.encrypted || req.headers['x-forwarded-proto'] === 'https');
        const secureFlag = isHttps ? '; Secure' : '';
        res.setHeader(
          'Set-Cookie',
          `orb_staff_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=3600`
        );

        sendJson(res, 200, {
          success: true,
          data: {
            staffId: member.id,
            name: member.name,
            role: member.role,
            station: member.station,
            branchId: member.branchId,
            tenantId: tenantContext.tenantId,
            expiresInSeconds: 3600,
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          },
        });
        return true;
      } else {
        sendJson(res, 200, {
          success: true,
          data: {
            token,
            tokenType: 'Bearer',
            staffId: member.id,
            name: member.name,
            role: member.role,
            station: member.station,
            branchId: member.branchId,
            tenantId: tenantContext.tenantId,
            expiresInSeconds: 3600,
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          },
        });
        return true;
      }
    }

    // --- DEVICE ENROLLMENT ENDPOINT ---
    if (pathname === '/api/restaurant/auth/device-enroll' && method === 'POST') {
      const identity = requestIdentity;
      if (
        identity.type !== 'ADMIN' &&
        identity.role !== 'MANAGER' &&
        identity.role !== 'OWNER' &&
        !verifyPlatformAuth(req)
      ) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          message: 'Manager or Owner credentials required to enroll physical devices.',
        });
        return true;
      }
      const body = await parseBody(req);
      const targetBranch = body.branchId || identity.branchId || currentBranch?.id || '*';
      const deviceToken = issueDeviceToken({
        tenantId: tenantContext.tenantId,
        branchId: targetBranch,
        deviceId: body.deviceId,
      });
      sendJson(res, 200, {
        success: true,
        data: {
          deviceToken,
          tenantId: tenantContext.tenantId,
          branchId: targetBranch,
          deviceId: body.deviceId,
        },
      });
      return true;
    }

    // --- LOGOUT ENDPOINT ---
    if (pathname === '/api/restaurant/auth/logout' && method === 'POST') {
      const isHttps = Boolean((req.socket as any)?.encrypted || req.headers['x-forwarded-proto'] === 'https');
      const secureFlag = isHttps ? '; Secure' : '';
      res.setHeader('Set-Cookie', `orb_staff_token=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0`);

      const tokenToRevoke = requestIdentity.rawToken;
      if (tokenToRevoke) {
        if (tokenToRevoke.startsWith('cap_')) {
          await repo.revokeCapabilityToken(tokenToRevoke);
          eventBus.disconnectClientsForToken(tokenToRevoke);
        } else {
          await repo.revokeStaffToken(tokenToRevoke);
          eventBus.disconnectClientsForToken(tokenToRevoke);
        }
        await repo.appendEvent(
          'STAFF_SESSION_TERMINATED',
          'auth-gateway',
          requestIdentity.branchId || '*',
          { staffId: requestIdentity.id, reason: 'LOGOUT' }
        );
      }
      sendJson(res, 200, { success: true, message: 'Logged out successfully' });
      return true;
    }

    if (pathname === '/api/restaurant/auth/revoke' && method === 'POST') {
      const identity = requestIdentity;
      const body = await parseBody(req);
      const targetToken = body.token || '';

      if (!targetToken) {
        sendJson(res, 400, { error: 'MISSING_TOKEN', code: 'MISSING_TOKEN', message: 'Token parameter is required.' });
        return true;
      }

      // Must be privileged (MANAGER/ADMIN) OR revoking one's own token
      const isSelfRevocation = identity.id === targetToken;
      if (!identity.isPrivileged && !isSelfRevocation) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Revoking other credentials requires manager privileges.',
        });
        return true;
      }

      if (targetToken.startsWith('cap_')) {
        await repo.revokeCapabilityToken(targetToken);
        eventBus.disconnectClientsForToken(targetToken);
      } else {
        await repo.revokeStaffToken(targetToken);
        eventBus.disconnectClientsForToken(targetToken);
      }

      await repo.appendEvent(
        'SECURITY_TOKEN_REVOKED',
        'auth-gateway',
        identity.branchId || '*',
        { authorizedBy: identity.id, isSelfRevocation }
      );

      sendJson(res, 200, { success: true, message: 'Credential revoked successfully.' });
      return true;
    }

    // --- STAFF MANAGEMENT API ---
    // List staff directory (PIN hashes & salts stripped)
    if (pathname === '/api/restaurant/staff' && method === 'GET') {
      const identity = requestIdentity;
      if (
        identity.type === 'ANONYMOUS' ||
        identity.type === 'DINER' ||
        identity.type === 'REVOKED_CAPABILITY' ||
        identity.type === 'INVALID_CREDENTIAL'
      ) {
        sendJson(res, 401, {
          error: 'AUTHENTICATION_REQUIRED',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Staff or manager credentials required to view staff directory.',
        });
        return true;
      }

      const queryBranch = (parsedUrl.query.branchId as string) || (identity.branchId !== '*' ? identity.branchId : undefined);
      const members = await repo.getStaffMembers();
      const staffList = members
        .filter((m) => !queryBranch || queryBranch === '*' || m.branchId === '*' || m.branchId === queryBranch)
        .map(({ salt, pinHash, ...safe }) => safe);
      sendJson(res, 200, { success: true, data: staffList });
      return true;
    }

    // Create staff member
    if (pathname === '/api/restaurant/staff' && method === 'POST') {
      const identity = requestIdentity;
      if (
        identity.type === 'ANONYMOUS' ||
        identity.type === 'INVALID_CREDENTIAL' ||
        identity.type === 'REVOKED_CAPABILITY'
      ) {
        sendJson(res, 401, {
          error: 'AUTHENTICATION_REQUIRED',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required.',
        });
        return true;
      }

      if (identity.role !== 'MANAGER' && identity.role !== 'ADMIN' && identity.role !== 'OWNER' && identity.type !== 'ADMIN') {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Manager or administrator credentials required to provision staff members.',
        });
        return true;
      }

      const body = await parseBody(req);
      const targetBranchId = body.branchId || identity.branchId || 'branch_ldh';

      // Cross-branch check: Non-admin manager cannot assign staff to other branches
      if (identity.branchId && identity.branchId !== '*' && targetBranchId !== identity.branchId) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Manager for branch ${identity.branchId} cannot provision staff for branch ${targetBranchId}.`,
        });
        return true;
      }

      // Privilege escalation check: only ADMIN/OWNER can assign ADMIN role
      if (body.role === 'ADMIN' && identity.role !== 'ADMIN' && identity.role !== 'OWNER') {
        sendJson(res, 403, {
          error: 'PRIVILEGE_ESCALATION',
          code: 'PRIVILEGE_ESCALATION',
          message: 'Only platform administrators or owners can provision the ADMIN role.',
        });
        return true;
      }

      if (!body.name || (!body.pin && !body.secret) || !body.role) {
        sendJson(res, 400, {
          error: 'VALIDATION_ERROR',
          code: 'VALIDATION_ERROR',
          message: 'Name, role, and PIN/secret are required.',
        });
        return true;
      }

      try {
        const id = `stf_${body.role.toLowerCase()}_${targetBranchId.replace('branch_', '')}_${Date.now().toString(36)}`;
        const salt = `salt_${targetBranchId}_${crypto.randomBytes(8).toString('hex')}`;
        const pinHash = hashStaffSecretSync(body.secret || body.pin, salt);
        const member = {
          id,
          name: body.name.trim(),
          role: body.role,
          branchId: targetBranchId,
          station: body.station,
          salt,
          pinHash,
          status: 'ACTIVE' as const,
          permissions: body.permissions,
        };
        await repo.saveStaffMember(member);

        await runtimeController.emitAudit('STAFF_MEMBER_CREATED', identity.id, {
          staffId: member.id,
          role: member.role,
          branchId: member.branchId,
          station: member.station,
        });

        const { salt: _s, pinHash: _p, ...safe } = member;
        sendJson(res, 201, { success: true, data: safe });
        return true;
      } catch (err: any) {
        sendJson(res, 400, { error: 'VALIDATION_ERROR', message: err.message });
        return true;
      }
    }

    // Update staff member
    if (
      pathname.startsWith('/api/restaurant/staff/') &&
      !pathname.endsWith('/revoke') &&
      (method === 'PATCH' || method === 'PUT')
    ) {
      const identity = requestIdentity;
      if (
        identity.type === 'ANONYMOUS' ||
        identity.type === 'INVALID_CREDENTIAL' ||
        identity.type === 'REVOKED_CAPABILITY'
      ) {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED' });
        return true;
      }

      if (identity.role !== 'MANAGER' && identity.role !== 'ADMIN' && identity.role !== 'OWNER' && identity.type !== 'ADMIN') {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Manager credentials required.' });
        return true;
      }

      const staffId = pathname.split('/')[4];
      const targetMember = await repo.getStaffMember(staffId);
      if (!targetMember) {
        sendJson(res, 404, { error: 'STAFF_NOT_FOUND', code: 'STAFF_NOT_FOUND', message: `Staff member ${staffId} not found.` });
        return true;
      }

      // Branch scoping
      if (identity.branchId && identity.branchId !== '*' && targetMember.branchId !== '*' && targetMember.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Manager for branch ${identity.branchId} cannot modify staff in branch ${targetMember.branchId}.`,
        });
        return true;
      }

      const body = await parseBody(req);
      // Privilege escalation guard
      if (body.role === 'ADMIN' && identity.role !== 'ADMIN' && identity.role !== 'OWNER') {
        sendJson(res, 403, {
          error: 'PRIVILEGE_ESCALATION',
          code: 'PRIVILEGE_ESCALATION',
          message: 'Only platform administrators or owners can grant the ADMIN role.',
        });
        return true;
      }

      if (body.name !== undefined) targetMember.name = body.name.trim();
      if (body.role !== undefined) targetMember.role = body.role;
      if (body.branchId !== undefined) targetMember.branchId = body.branchId;
      if (body.station !== undefined) targetMember.station = body.station;
      if (body.status !== undefined) targetMember.status = body.status;
      if (body.permissions !== undefined) targetMember.permissions = body.permissions;
      if (body.pin || body.secret) {
        targetMember.salt = `salt_${targetMember.branchId}_${crypto.randomBytes(8).toString('hex')}`;
        targetMember.pinHash = hashStaffSecretSync(body.secret || body.pin, targetMember.salt);
      }

      await repo.saveStaffMember(targetMember);
      await runtimeController.emitAudit('STAFF_MEMBER_UPDATED', identity.id, {
        staffId,
        updates: { role: body.role, station: body.station, branchId: body.branchId, status: body.status },
      });

      const { salt: _s, pinHash: _p, ...safe } = targetMember;
      sendJson(res, 200, { success: true, data: safe });
      return true;
    }

    // Revoke staff member tokens by staff ID
    if (pathname.startsWith('/api/restaurant/staff/') && pathname.endsWith('/revoke') && method === 'POST') {
      const identity = requestIdentity;
      if (
        identity.type === 'ANONYMOUS' ||
        identity.type === 'INVALID_CREDENTIAL' ||
        identity.type === 'REVOKED_CAPABILITY'
      ) {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED' });
        return true;
      }

      const staffId = pathname.split('/')[4];
      const targetMember = await repo.getStaffMember(staffId);
      if (!targetMember) {
        sendJson(res, 404, { error: 'STAFF_NOT_FOUND', code: 'STAFF_NOT_FOUND', message: `Staff member ${staffId} not found.` });
        return true;
      }

      const isSelf = identity.id === staffId;
      if (!identity.isPrivileged && !isSelf) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Manager privileges required to revoke staff credentials.',
        });
        return true;
      }

      // Branch scoping
      if (identity.branchId && identity.branchId !== '*' && targetMember.branchId !== '*' && targetMember.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Manager for branch ${identity.branchId} cannot revoke staff in branch ${targetMember.branchId}.`,
        });
        return true;
      }

      await repo.revokeStaffMember(staffId);
      await runtimeController.emitAudit('STAFF_MEMBER_REVOKED', identity.id, { staffId });

      sendJson(res, 200, {
        success: true,
        message: `All current and future tokens for staff member ${staffId} have been durably revoked.`,
      });
      return true;
    }

    // Reset PIN lockout tracker
    if (pathname === '/api/restaurant/staff/reset-lockout' && method === 'POST') {
      const identity = requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager privileges required to reset lockouts.' });
        return true;
      }
      const body = await parseBody(req);
      resetStaffLockout(body.key);
      sendJson(res, 200, { success: true, message: 'Lockout tracker reset successfully.' });
      return true;
    }
  return false;
}
