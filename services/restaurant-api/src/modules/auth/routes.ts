import * as http from 'http';
import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  sendHtml,
  provisioningService,
  RequestContext,
  RequestIdentity,
} from '../../http/context';
import {
  resolveClientIp,
  checkStaffLockout,
  recordFailedStaffAttempt,
  recordSuccessfulStaffAttempt,
  verifyStaffSecret,
  hashStaffSecretSync,
  issueStaffToken,
  issueDeviceToken,
  verifyDeviceToken,
  eventBus,
  verifyPlatformAuth,
  REGISTERED_STATION_SECRETS,
} from '../../shared';
import { renderOwnerInvitePage } from '../../views';

export const authRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/accept-invite',
    handler: (req, res, context) => {
      const token = (context.parsedUrl.query.token as string) || '';
      sendHtml(res, renderOwnerInvitePage(token, context.tenantContext?.tenantName || 'RestaurantOS'));
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/accept-invite',
    handler: async (req, res, context) => {
      try {
        const body = await context.parseBody();
        const secret = (body.secret || body.password || body.pin || '').toString().trim();
        const acceptRes = await provisioningService.acceptOwnerInvite({
          token: body.token,
          pin: secret,
          secret,
          ownerName: body.name || body.ownerName,
        });
        sendJson(res, 200, acceptRes);
      } catch (err: any) {
        sendJson(res, 400, { error: 'INVITE_ACCEPTANCE_FAILED', message: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/login',
    handler: (req, res, context) => handleStaffAuthLogin(req, res, context),
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/verify-pin',
    handler: (req, res, context) => handleStaffAuthLogin(req, res, context),
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/station/login',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      const stationToken = body.stationToken || body.secret || (req.headers['x-station-token'] as string) || '';
      const registered = REGISTERED_STATION_SECRETS[stationToken];
      if (registered) {
        sendJson(res, 200, {
          success: true,
          station: registered.station,
          branchId: registered.branchId,
          isPrivileged: registered.isPrivileged,
        });
        return;
      }
      sendJson(res, 401, { error: 'INVALID_CREDENTIAL', message: 'Unregistered station token.' });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/device-enroll',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
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
        return;
      }
      const body = await context.parseBody();
      const targetBranch = body.branchId || identity.branchId || context.currentBranch?.id || '*';
      const deviceToken = issueDeviceToken({
        tenantId: context.tenantContext.tenantId,
        branchId: targetBranch,
        deviceId: body.deviceId,
      });
      sendJson(res, 200, {
        success: true,
        data: {
          deviceToken,
          tenantId: context.tenantContext.tenantId,
          branchId: targetBranch,
          deviceId: body.deviceId,
        },
      });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/staff-token',
    handler: (req, res, context) => handleStaffAuthLogin(req, res, context),
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/logout',
    handler: async (req, res, context) => {
      const isHttps = Boolean((req.socket as any)?.encrypted || req.headers['x-forwarded-proto'] === 'https');
      const secureFlag = isHttps ? '; Secure' : '';
      res.setHeader('Set-Cookie', `orb_staff_token=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0`);

      const tokenToRevoke = context.requestIdentity.rawToken;
      if (tokenToRevoke) {
        if (tokenToRevoke.startsWith('cap_')) {
          await context.repo.revokeCapabilityToken(tokenToRevoke);
          eventBus.disconnectClientsForToken(tokenToRevoke);
        } else {
          await context.repo.revokeStaffToken(tokenToRevoke);
          eventBus.disconnectClientsForToken(tokenToRevoke);
        }
        await context.repo.appendEvent(
          'STAFF_SESSION_TERMINATED',
          'auth-gateway',
          context.requestIdentity.branchId || '*',
          { staffId: context.requestIdentity.id, reason: 'LOGOUT' }
        );
      }
      sendJson(res, 200, { success: true, message: 'Logged out successfully' });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/revoke',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      const body = await context.parseBody();
      const targetToken = body.token || '';

      if (!targetToken) {
        sendJson(res, 400, { error: 'MISSING_TOKEN', code: 'MISSING_TOKEN', message: 'Token parameter is required.' });
        return;
      }

      const isSelfRevocation = identity.id === targetToken;
      if (!identity.isPrivileged && !isSelfRevocation) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Revoking other credentials requires manager privileges.',
        });
        return;
      }

      if (targetToken.startsWith('cap_')) {
        await context.repo.revokeCapabilityToken(targetToken);
        eventBus.disconnectClientsForToken(targetToken);
      } else {
        await context.repo.revokeStaffToken(targetToken);
        eventBus.disconnectClientsForToken(targetToken);
      }

      await context.repo.appendEvent(
        'SECURITY_TOKEN_REVOKED',
        'auth-gateway',
        identity.branchId || '*',
        { authorizedBy: identity.id, isSelfRevocation }
      );

      sendJson(res, 200, { success: true, message: 'Credential revoked successfully.' });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/auth/staff',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', message: 'Staff credentials required.' });
        return;
      }
      const members = await context.repo.getStaffMembers();
      const safe = members.map(({ pinHash, salt, ...m }) => m);
      sendJson(res, 200, { success: true, data: safe });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/staff',
    handler: (req, res, context) => handleStaffAuthLogin(req, res, context),
  },
  {
    method: 'POST',
    path: '/api/restaurant/auth/token',
    handler: (req, res, context) => handleStaffAuthLogin(req, res, context),
  },
  {
    method: 'GET',
    path: '/api/restaurant/auth/api-token',
    handler: (_req, res, context) => {
      const identity = context.requestIdentity;
      sendJson(res, 200, {
        type: identity.type,
        id: identity.id,
        role: identity.role,
        branchId: identity.branchId,
        isPrivileged: identity.isPrivileged,
      });
    },
  },
];

async function handleStaffAuthLogin(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  const body = await context.parseBody();
  const clientIp = resolveClientIp(req);
  const tenantId = context.tenantContext.tenantId;

  const identifier = (
    body.identifier ||
    body.staffId ||
    body.username ||
    body.email ||
    body.phone ||
    ''
  ).toString().trim();

  const secret = (
    body.secret !== undefined
      ? body.secret
      : body.password !== undefined
        ? body.password
        : body.pin !== undefined
          ? body.pin
          : ''
  ).toString().trim();

  if (!identifier) {
    sendJson(res, 400, {
      error: 'IDENTIFIER_REQUIRED',
      code: 'IDENTIFIER_REQUIRED',
      message: 'Staff identifier (staffId, email, or phone) is required. Global PIN search is disabled.',
    });
    return;
  }

  if (!secret) {
    sendJson(res, 400, {
      error: 'SECRET_REQUIRED',
      code: 'SECRET_REQUIRED',
      message: 'Staff secret or password is required.',
    });
    return;
  }

  const lockout = checkStaffLockout(tenantId, identifier, clientIp);
  if (lockout.isLocked) {
    await context.repo.appendEvent('STAFF_AUTH_LOCKED', 'auth-gateway', context.currentBranch?.id || '*', {
      clientIp,
      identifier,
    });
    sendJson(res, 429, {
      error: 'TOO_MANY_FAILED_ATTEMPTS',
      code: 'TOO_MANY_FAILED_ATTEMPTS',
      message: lockout.error || 'Too many failed login attempts. Account temporarily locked.',
    });
    return;
  }

  const member = await context.repo.getStaffMemberByIdentifier(identifier);
  if (!member) {
    const fail = recordFailedStaffAttempt(tenantId, identifier, clientIp);
    await context.repo.appendEvent('STAFF_AUTH_FAILED', 'auth-gateway', context.currentBranch?.id || '*', {
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
      return;
    }
    sendJson(res, 401, {
      error: 'INVALID_CREDENTIALS',
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid staff identifier or secret.',
    });
    return;
  }

  if (member.status !== 'ACTIVE') {
    sendJson(res, 401, {
      error: 'ACCOUNT_REVOKED',
      code: 'ACCOUNT_REVOKED',
      message: 'Staff account has been revoked or suspended.',
    });
    return;
  }

  const isHighPrivilege = member.role === 'OWNER' || member.role === 'ADMIN' || member.role === 'MANAGER';
  if (isHighPrivilege) {
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
        return;
      }
    }
  } else {
    if (secret.length < 8) {
      const deviceToken = body.deviceToken || (req.headers['x-device-token'] as string);
      if (!deviceToken) {
        sendJson(res, 403, {
          error: 'DEVICE_ENROLLMENT_REQUIRED',
          code: 'DEVICE_ENROLLMENT_REQUIRED',
          message:
            'Short PIN login for floor and kitchen roles requires an enrolled device token.',
        });
        return;
      }
      const verifyDev = verifyDeviceToken(deviceToken, tenantId, member.branchId);
      if (!verifyDev.valid) {
        sendJson(res, 403, {
          error: 'INVALID_DEVICE_TOKEN',
          code: 'INVALID_DEVICE_TOKEN',
          message: `Invalid device token for tenant/branch: ${verifyDev.error}`,
        });
        return;
      }
    }
  }

  const verification = verifyStaffSecret(secret, member.pinHash, member.salt);
  if (!verification.valid) {
    const fail = recordFailedStaffAttempt(tenantId, member.id, clientIp);
    await context.repo.appendEvent('STAFF_AUTH_FAILED', 'auth-gateway', member.branchId, {
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
      return;
    }
    sendJson(res, 401, {
      error: 'INVALID_CREDENTIALS',
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid staff authentication secret.',
    });
    return;
  }

  recordSuccessfulStaffAttempt(tenantId, member.id, clientIp);

  if (verification.needsRehash) {
    const updatedHash = hashStaffSecretSync(secret, member.salt);
    await context.repo.updateStaffMemberSecret(member.id, updatedHash, member.salt);
  }

  const token = issueStaffToken({
    sub: member.id,
    name: member.name,
    role: member.role,
    tenantId: context.tenantContext.tenantId,
    branchId: member.branchId,
    station: member.station,
    permissions: member.permissions as string[] | undefined,
    expiresInSeconds: 3600,
  });

  await context.repo.appendEvent('STAFF_TOKEN_ISSUED', 'auth-gateway', member.branchId, {
    staffId: member.id,
    role: member.role,
    tenantId: context.tenantContext.tenantId,
  });

  const isExplicitApiFlow =
    context.pathname === '/api/restaurant/auth/token' ||
    context.pathname === '/api/restaurant/auth/staff-token' ||
    context.pathname === '/api/restaurant/auth/api-token' ||
    body.flow === 'token' ||
    body.flow === 'bearer' ||
    context.parsedUrl.query.flow === 'token' ||
    context.parsedUrl.query.flow === 'bearer';

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
        tenantId: context.tenantContext.tenantId,
        expiresInSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
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
        tenantId: context.tenantContext.tenantId,
        expiresInSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
  }
}
