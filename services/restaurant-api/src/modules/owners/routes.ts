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
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Domain verification requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
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
    },
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
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required.' });
        return;
      }
      try {
        const { buffer } = await extractImageBuffer(req);
        const saved = await ownerSelfService.saveTenantImage(context.tenantContext.tenantId, buffer, 'logo');
        await context.repo.updateTenantBrand({ logoUrl: saved.url });
        sendJson(res, 200, { success: true, data: saved });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/uploads/hero',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required.' });
        return;
      }
      try {
        const { buffer } = await extractImageBuffer(req);
        const saved = await ownerSelfService.saveTenantImage(context.tenantContext.tenantId, buffer, 'hero');
        await context.repo.updateTenantBrand({ heroBannerUrl: saved.url });
        sendJson(res, 200, { success: true, data: saved });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
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
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required.' });
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
          message: 'Staff credentials required.',
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
        identity.type === 'DINER' ||
        identity.type === 'REVOKED_CAPABILITY' ||
        identity.type === 'INVALID_CREDENTIAL'
      ) {
        sendJson(res, 401, {
          error: 'AUTHENTICATION_REQUIRED',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Staff credentials required.',
        });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager credentials required.' });
        return;
      }
      const staffId = context.params.id;
      const targetMember = await context.repo.getStaffMember(staffId);
      if (!targetMember) {
        sendJson(res, 404, { error: 'STAFF_NOT_FOUND', message: `Staff member ${staffId} not found.` });
        return;
      }
      const body = await context.parseBody();
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
        identity.type === 'DINER' ||
        identity.type === 'REVOKED_CAPABILITY' ||
        identity.type === 'INVALID_CREDENTIAL'
      ) {
        sendJson(res, 401, {
          error: 'AUTHENTICATION_REQUIRED',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Staff credentials required.',
        });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager credentials required.' });
        return;
      }
      const staffId = context.params.id;
      const targetMember = await context.repo.getStaffMember(staffId);
      if (!targetMember) {
        sendJson(res, 404, { error: 'STAFF_NOT_FOUND', code: 'STAFF_NOT_FOUND', message: `Staff member ${staffId} not found.` });
        return;
      }
      await context.repo.revokeStaffMember(staffId);
      sendJson(res, 200, { success: true, message: `Staff member ${staffId} revoked.` });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/staff/reset-lockout',
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
          message: 'Staff credentials required.',
        });
        return;
      }
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
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Installing templates requires Manager or Admin privileges.' });
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
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Publishing template changes requires Manager or Admin privileges.' });
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
