import * as crypto from 'crypto';
import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  customDomainService,
  ownerSelfService,
  extractImageBuffer,
  runtimeController,
} from '../../http/context';
import {
  OnboardingStepKey,
  resetStaffLockout,
  hashStaffSecretSync,
  validateAndSanitizeCustomCss,
} from '../../shared';

export async function handleVerifyDomain(req: any, res: any, context: any): Promise<void> {
  const identity = context.requestIdentity;
  if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
    sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
    return;
  }
  if (identity.type === 'ANONYMOUS') {
    sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Domain verification requires authenticated manager credentials.' });
    return;
  }
  if (!identity.isPrivileged) {
    sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Domain verification requires Manager or Admin privileges.' });
    return;
  }
  const body = await context.parseBody().catch(() => ({}));
  const brand = await context.repo.getTenantBrand();
  const domain = body.domain || brand?.customDomain;
  if (!domain || !domain.includes('.')) {
    sendJson(res, 400, { success: false, error: 'INVALID_DOMAIN', message: 'Domain must be a fully qualified domain name.' });
    return;
  }
  try {
    const verifyRes = await customDomainService.verifyCustomDomain(context.tenantContext.tenantId, domain);
    if (verifyRes.verified) {
      await context.repo.updateTenantBrand({
        customDomain: domain,
        domainStatus: 'VERIFIED',
        sslStatus: 'ACTIVE',
      });
      sendJson(res, 200, {
        success: true,
        data: verifyRes,
        message: `Domain ${domain} successfully verified with SSL provisioned.`,
      });
    } else {
      sendJson(res, 400, {
        success: false,
        data: verifyRes,
        error: verifyRes.error || 'DNS TXT verification failed.',
      });
    }
  } catch (err: any) {
    sendJson(res, 400, { success: false, error: err.message });
  }
}

export const ownersRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/domains',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Viewing custom domains requires Manager or Admin privileges.' });
        return;
      }
      try {
        const list = await customDomainService.listCustomDomains(context.tenantContext.tenantId);
        sendJson(res, 200, { success: true, data: list });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/domains',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Adding custom domains requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      try {
        const challenge = await customDomainService.addCustomDomain(context.tenantContext.tenantId, body.domain);
        sendJson(res, 201, { success: true, data: challenge });
      } catch (err: any) {
        const isCollision = err.message.includes('DOMAIN_ALREADY_CLAIMED');
        sendJson(res, isCollision ? 409 : 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/domains/verify',
    handler: handleVerifyDomain,
  },
  {
    method: 'DELETE',
    path: '/api/restaurant/domains/:id',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Removing custom domains requires Manager or Admin privileges.' });
        return;
      }
      const targetDomain = decodeURIComponent(context.params.id).trim();
      try {
        const deleteRes = await customDomainService.removeCustomDomain(context.tenantContext.tenantId, targetDomain);
        sendJson(res, 200, deleteRes);
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/onboarding',
    handler: async (_req, res, context) => {
      try {
        const state = await ownerSelfService.getOnboardingState(context.tenantContext.tenantId);
        sendJson(res, 200, { success: true, onboarding: state });
      } catch (err: any) {
        sendJson(res, 500, { success: false, error: 'ONBOARDING_FETCH_FAILED', message: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/onboarding/step',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER') {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Staff credentials required to update onboarding checklist.' });
        return;
      }
      const body = await context.parseBody();
      if (!body.step) {
        sendJson(res, 400, { success: false, error: 'MISSING_STEP', message: 'Field "step" is required.' });
        return;
      }
      try {
        const state = await ownerSelfService.updateOnboardingStep(
          context.tenantContext.tenantId,
          body.step as OnboardingStepKey,
          body.completed !== false
        );
        sendJson(res, 200, { success: true, onboarding: state });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/uploads/logo',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER' || !identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required to upload branding assets.' });
        return;
      }
      try {
        const { buffer } = await extractImageBuffer(req);
        const saved = await ownerSelfService.saveTenantImage(context.tenantContext.tenantId, buffer, 'logo');
        await context.repo.updateTenantBrand({ logoUrl: saved.url });
        sendJson(res, 200, { success: true, data: saved });
      } catch (err: any) {
        const isSecurity = err.message?.includes('SECURITY_VIOLATION');
        const isFormat = err.message?.includes('UNSUPPORTED_IMAGE_FORMAT');
        const isLarge = err.message?.includes('IMAGE_TOO_LARGE');
        const statusCode = (isSecurity || isFormat || isLarge) ? 400 : 500;
        sendJson(res, statusCode, {
          success: false,
          error: isSecurity ? 'SECURITY_VIOLATION' : (isFormat ? 'UNSUPPORTED_IMAGE_FORMAT' : (isLarge ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED')),
          code: isSecurity ? 'SECURITY_VIOLATION' : (isFormat ? 'UNSUPPORTED_IMAGE_FORMAT' : (isLarge ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED')),
          message: err.message,
        });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/uploads/hero',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER' || !identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required to upload branding assets.' });
        return;
      }
      try {
        const { buffer } = await extractImageBuffer(req);
        const saved = await ownerSelfService.saveTenantImage(context.tenantContext.tenantId, buffer, 'hero');
        await context.repo.updateTenantBrand({ heroBannerUrl: saved.url });
        sendJson(res, 200, { success: true, data: saved });
      } catch (err: any) {
        const isSecurity = err.message?.includes('SECURITY_VIOLATION');
        const isFormat = err.message?.includes('UNSUPPORTED_IMAGE_FORMAT');
        const isLarge = err.message?.includes('IMAGE_TOO_LARGE');
        const statusCode = (isSecurity || isFormat || isLarge) ? 400 : 500;
        sendJson(res, statusCode, {
          success: false,
          error: isSecurity ? 'SECURITY_VIOLATION' : (isFormat ? 'UNSUPPORTED_IMAGE_FORMAT' : (isLarge ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED')),
          code: isSecurity ? 'SECURITY_VIOLATION' : (isFormat ? 'UNSUPPORTED_IMAGE_FORMAT' : (isLarge ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED')),
          message: err.message,
        });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/settings/whitelabel',
    handler: async (_req, res, context) => {
      const brand = await context.repo.getTenantBrand();
      sendJson(res, 200, { success: true, data: brand });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/settings/whitelabel',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branding updates require authenticated manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branding updates require Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      if (body.customCss && typeof body.customCss === 'string') {
        const cssCheck = validateAndSanitizeCustomCss(body.customCss, '.brand-custom-theme');
        if (!cssCheck.valid) {
          sendJson(res, 400, {
            success: false,
            error: 'INVALID_CUSTOM_CSS',
            message: cssCheck.error || 'Custom CSS contains prohibited rules or constructs.',
          });
          return;
        }
        body.customCss = cssCheck.sanitizedCss;
      }
      try {
        const updated = await context.repo.updateTenantBrand(body);
        sendJson(res, 200, { success: true, data: updated });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/staff',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
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
        return;
      }

      const queryBranch = (context.parsedUrl.query.branchId as string) || (identity.branchId !== '*' ? identity.branchId : undefined);
      const members = await context.repo.getStaffMembers();
      const staffList = members
        .filter((m) => !queryBranch || queryBranch === '*' || m.branchId === '*' || m.branchId === queryBranch)
        .map(({ salt, pinHash, ...safe }) => safe);
      sendJson(res, 200, { success: true, data: staffList });
    },
  },
  {
    method: 'PATCH',
    path: '/api/restaurant/staff/:id',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (
        identity.type === 'ANONYMOUS' ||
        identity.type === 'INVALID_CREDENTIAL' ||
        identity.type === 'REVOKED_CAPABILITY'
      ) {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED' });
        return;
      }

      if (identity.role !== 'MANAGER' && identity.role !== 'ADMIN' && identity.role !== 'OWNER' && identity.type !== 'ADMIN') {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Manager credentials required.' });
        return;
      }

      const staffId = context.params.id || context.pathname.split('/')[4];
      const targetMember = await context.repo.getStaffMember(staffId);
      if (!targetMember) {
        sendJson(res, 404, { error: 'STAFF_NOT_FOUND', code: 'STAFF_NOT_FOUND', message: `Staff member ${staffId} not found.` });
        return;
      }

      // Branch scoping
      if (identity.branchId && identity.branchId !== '*' && targetMember.branchId !== '*' && targetMember.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Manager for branch ${identity.branchId} cannot modify staff in branch ${targetMember.branchId}.`,
        });
        return;
      }

      const body = await context.parseBody();
      // Privilege escalation guard
      if (body.role === 'ADMIN' && identity.role !== 'ADMIN' && identity.role !== 'OWNER') {
        sendJson(res, 403, {
          error: 'PRIVILEGE_ESCALATION',
          code: 'PRIVILEGE_ESCALATION',
          message: 'Only platform administrators or owners can grant the ADMIN role.',
        });
        return;
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

      await context.repo.saveStaffMember(targetMember);
      await runtimeController.emitAudit('STAFF_MEMBER_UPDATED', identity.id, {
        staffId,
        updates: { role: body.role, station: body.station, branchId: body.branchId, status: body.status },
      });

      const { salt: _s, pinHash: _p, ...safe } = targetMember;
      sendJson(res, 200, { success: true, data: safe });
    },
  },
  {
    method: 'DELETE',
    path: '/api/restaurant/staff/:id',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (
        identity.type === 'ANONYMOUS' ||
        identity.type === 'INVALID_CREDENTIAL' ||
        identity.type === 'REVOKED_CAPABILITY'
      ) {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED' });
        return;
      }

      const staffId = context.params.id || context.pathname.split('/')[4];
      const targetMember = await context.repo.getStaffMember(staffId);
      if (!targetMember) {
        sendJson(res, 404, { error: 'STAFF_NOT_FOUND', code: 'STAFF_NOT_FOUND', message: `Staff member ${staffId} not found.` });
        return;
      }

      const isSelf = identity.id === staffId;
      if (!identity.isPrivileged && !isSelf) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Manager privileges required to revoke staff credentials.',
        });
        return;
      }

      // Branch scoping
      if (identity.branchId && identity.branchId !== '*' && targetMember.branchId !== '*' && targetMember.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Manager for branch ${identity.branchId} cannot revoke staff in branch ${targetMember.branchId}.`,
        });
        return;
      }

      await context.repo.revokeStaffMember(staffId);
      await runtimeController.emitAudit('STAFF_MEMBER_REVOKED', identity.id, { staffId });

      sendJson(res, 200, {
        success: true,
        message: `All current and future tokens for staff member ${staffId} have been durably revoked.`,
      });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/staff/reset-lockout',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager privileges required to reset lockouts.' });
        return;
      }
      const body = await context.parseBody();
      resetStaffLockout(body.key);
      sendJson(res, 200, { success: true, message: 'Lockout tracker reset successfully.' });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/templates',
    handler: async (_req, res, context) => {
      const templates = await context.repo.getTemplates();
      sendJson(res, 200, { success: true, data: templates });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/templates/install',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Template installation requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Installing templates requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      const templateId = body.templateId || 'haute-gastronomy';
      try {
        const result = await context.repo.installTemplate(templateId);
        sendJson(res, 200, { success: true, ...result });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/studio/draft',
    handler: async (_req, res, context) => {
      const draft = await context.repo.getTemplateDraft();
      sendJson(res, 200, { success: true, data: draft });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/studio/publish',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Publishing templates requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Publishing template changes requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      try {
        const pub = await context.repo.publishTemplateDraft(body.changeNotes);
        sendJson(res, 200, { success: true, data: pub });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
];

export async function handleCreateStaff(req: any, res: any, context: any): Promise<void> {
  const identity = context.requestIdentity;
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
    return;
  }

  if (identity.role !== 'MANAGER' && identity.role !== 'ADMIN' && identity.role !== 'OWNER' && identity.type !== 'ADMIN') {
    sendJson(res, 403, {
      error: 'FORBIDDEN',
      code: 'FORBIDDEN',
      message: 'Manager or administrator credentials required to provision staff members.',
    });
    return;
  }

  const body = await context.parseBody();
  const targetBranchId = body.branchId || identity.branchId || 'branch_ldh';

  // Cross-branch check: Non-admin manager cannot assign staff to other branches
  if (identity.branchId && identity.branchId !== '*' && targetBranchId !== identity.branchId) {
    sendJson(res, 403, {
      error: 'BRANCH_MISMATCH',
      code: 'BRANCH_MISMATCH',
      message: `Manager for branch ${identity.branchId} cannot provision staff for branch ${targetBranchId}.`,
    });
    return;
  }

  // Privilege escalation check: only ADMIN/OWNER can assign ADMIN role
  if (body.role === 'ADMIN' && identity.role !== 'ADMIN' && identity.role !== 'OWNER') {
    sendJson(res, 403, {
      error: 'PRIVILEGE_ESCALATION',
      code: 'PRIVILEGE_ESCALATION',
      message: 'Only platform administrators or owners can provision the ADMIN role.',
    });
    return;
  }

  if (!body.name || (!body.pin && !body.secret) || !body.role) {
    sendJson(res, 400, {
      error: 'VALIDATION_ERROR',
      code: 'VALIDATION_ERROR',
      message: 'Name, role, and PIN/secret are required.',
    });
    return;
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
    await context.repo.saveStaffMember(member);

    await runtimeController.emitAudit('STAFF_MEMBER_CREATED', identity.id, {
      staffId: member.id,
      role: member.role,
      branchId: member.branchId,
      station: member.station,
    });

    const { salt: _s, pinHash: _p, ...safe } = member;
    sendJson(res, 201, { success: true, data: safe });
    return;
  } catch (err: any) {
    sendJson(res, 400, { error: 'VALIDATION_ERROR', message: err.message });
    return;
  }
}

