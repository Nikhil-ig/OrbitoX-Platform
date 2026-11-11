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

export async function handleOwnersRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    // 26. Template Marketplace Discovery & Installation
    if (pathname === '/api/restaurant/templates' && method === 'GET') {
      sendJson(res, 200, { success: true, data: await repo.getTemplates() });
      return true;
    }

    if (
      (pathname === '/api/restaurant/templates/install' ||
        (pathname.startsWith('/api/restaurant/templates/') && pathname.endsWith('/install'))) &&
      method === 'POST'
    ) {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Template installation requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Installing templates requires Manager or Admin privileges.' });
        return true;
      }
      const body = pathname === '/api/restaurant/templates/install' ? await parseBody(req) : {};
      const templateId = body.templateId || pathname.replace('/api/restaurant/templates/', '').replace('/install', '');
      try {
        const result = await repo.installTemplate(templateId);
        sendJson(res, 200, { success: true, ...result });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    // 27. Visual Brand Studio Draft, Publish & Revisions
    if (pathname === '/api/restaurant/studio/draft' && method === 'GET') {
      sendJson(res, 200, { success: true, data: await repo.getTemplateDraft() });
      return true;
    }

    if (pathname === '/api/restaurant/studio/draft' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Visual Studio draft editing requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Editing template drafts requires Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      try {
        const draft = await repo.saveTemplateDraft({
          draftSections: body.sections || body.draftSections,
          draftTokens: body.customTokens || body.draftTokens,
        });
        sendJson(res, 200, { success: true, data: draft });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname === '/api/restaurant/studio/publish' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Publishing templates requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Publishing template changes requires Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      try {
        const pub = await repo.publishTemplateDraft(body.changeNotes);
        sendJson(res, 200, { success: true, data: pub });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/restaurant/studio/revisions/') && pathname.endsWith('/restore') && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Restoring revisions requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Restoring template revisions requires Manager or Admin privileges.' });
        return true;
      }
      const revisionId = pathname.replace('/api/restaurant/studio/revisions/', '').replace('/restore', '');
      try {
        const restored = await repo.restoreTemplateRevision(revisionId);
        sendJson(res, 200, { success: true, data: restored });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    // 28. Tenant Branding & Custom Domain Verification
    if ((pathname === '/api/restaurant/branding' || pathname === '/api/restaurant/settings/whitelabel') && method === 'GET') {
      const reqBranchId = (parsedUrl.query.branchId as string) || (parsedUrl.query.branch as string);
      sendJson(res, 200, { success: true, data: await repo.getTenantBrand(reqBranchId) });
      return true;
    }

    // 28b. Branch-Scoped White-Label Overrides
    if (pathname === '/api/restaurant/branding/branch-overrides' && method === 'GET') {
      const targetBranchId = (parsedUrl.query.branchId as string) || (parsedUrl.query.branch as string);
      if (!targetBranchId) {
        sendJson(res, 400, { success: false, error: 'BRANCH_REQUIRED', message: 'branchId query parameter is required.' });
        return true;
      }
      const branch = await repo.getBranch(targetBranchId);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
        return true;
      }
      const baseBrand = await repo.getTenantBrand();
      const branchOverride = await repo.getBranchBrandOverride(targetBranchId);
      const effectiveBrand = await repo.getTenantBrand(targetBranchId);
      sendJson(res, 200, {
        success: true,
        branchId: targetBranchId,
        base: baseBrand,
        override: branchOverride,
        effective: effectiveBrand,
        isOverridden: !!branchOverride,
      });
      return true;
    }

    if (pathname === '/api/restaurant/branding/branch-overrides' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch override updates require authenticated manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branch override updates require Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      const targetBranchId = body.branchId;
      if (!targetBranchId) {
        sendJson(res, 400, { success: false, error: 'BRANCH_REQUIRED', message: 'Target branchId is required.' });
        return true;
      }
      // Scope check: branch-scoped credentials cannot modify another branch's overrides!
      if (identity.branchId && identity.branchId !== '*' && identity.branchId !== targetBranchId) {
        sendJson(res, 403, {
          success: false,
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Staff credential for branch ${identity.branchId} cannot configure overrides for branch ${targetBranchId}.`,
        });
        return true;
      }
      const branch = await repo.getBranch(targetBranchId);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
        return true;
      }
      // Validate supported override fields
      const allowedOverrides: any = {};
      if (body.restaurantName !== undefined) {
        const name = String(body.restaurantName).trim();
        if (name.length > 0 && (name.length < 2 || name.length > 100)) {
          sendJson(res, 400, { success: false, error: 'INVALID_NAME', message: 'Branch restaurant name must be between 2 and 100 characters.' });
          return true;
        }
        if (name.length > 0) allowedOverrides.restaurantName = name;
      }
      if (body.tagline !== undefined) {
        allowedOverrides.tagline = String(body.tagline).trim();
      }
      if (body.primaryColor !== undefined) {
        const col = String(body.primaryColor).trim();
        if (col.length > 0 && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(col)) {
          sendJson(res, 400, { success: false, error: 'INVALID_COLOR', message: 'Primary color must be a valid hex color code (e.g. #C86B3C).' });
          return true;
        }
        if (col.length > 0) allowedOverrides.primaryColor = col;
      }
      if (body.subdomain !== undefined) {
        const sub = String(body.subdomain).trim();
        if (sub.length > 0 && !/^[a-zA-Z0-9.-]+$/.test(sub)) {
          sendJson(res, 400, { success: false, error: 'INVALID_SUBDOMAIN', message: 'Subdomain contains invalid characters.' });
          return true;
        }
        if (sub.length > 0) allowedOverrides.subdomain = sub;
      }
      if (body.phone !== undefined) {
        allowedOverrides.phone = String(body.phone).trim();
      }
      if (body.customDomain !== undefined) {
        allowedOverrides.customDomain = String(body.customDomain).trim();
      }

      const effective = await repo.updateBranchBrandOverride(targetBranchId, allowedOverrides, identity.id || 'Manager');
      sendJson(res, 200, {
        success: true,
        branchId: targetBranchId,
        override: await repo.getBranchBrandOverride(targetBranchId),
        effective,
        message: `Branch-specific overrides for ${branch.name} saved durably.`,
      });
      return true;
    }

    if (pathname.startsWith('/api/restaurant/branding/branch-overrides/') && method === 'DELETE') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Resetting branch overrides requires authenticated manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Resetting branch overrides requires Manager or Admin privileges.' });
        return true;
      }
      const targetBranchId = pathname.replace('/api/restaurant/branding/branch-overrides/', '');
      if (identity.branchId && identity.branchId !== '*' && identity.branchId !== targetBranchId) {
        sendJson(res, 403, {
          success: false,
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Staff credential for branch ${identity.branchId} cannot reset overrides for branch ${targetBranchId}.`,
        });
        return true;
      }
      const branch = await repo.getBranch(targetBranchId);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
        return true;
      }
      const effective = await repo.updateBranchBrandOverride(targetBranchId, null, identity.id || 'Manager');
      sendJson(res, 200, {
        success: true,
        branchId: targetBranchId,
        override: null,
        effective,
        message: `Branch ${branch.name} overrides reset. Inheriting platform brand defaults.`,
      });
      return true;
    }

    if ((pathname === '/api/restaurant/branding' || pathname === '/api/restaurant/settings/whitelabel') && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branding updates require authenticated manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branding updates require Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      // Sanitize and validate custom CSS if provided via allowlist parser
      if (body.customCss && typeof body.customCss === 'string') {
        const cssCheck = validateAndSanitizeCustomCss(body.customCss, '.brand-custom-theme');
        if (!cssCheck.valid) {
          sendJson(res, 400, {
            success: false,
            error: 'INVALID_CUSTOM_CSS',
            message: cssCheck.error || 'Custom CSS contains prohibited rules or constructs.',
            rejectedRule: cssCheck.rejectedRule,
          });
          return true;
        }
        body.customCss = cssCheck.sanitizedCss;
      }
      try {
        const updated = await repo.updateTenantBrand(body);
        sendJson(res, 200, { success: true, data: updated });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    // 28b. Custom Domains Management & DNS Verification
    if (pathname === '/api/restaurant/domains' && method === 'GET') {
      const identity = requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Viewing custom domains requires Manager or Admin privileges.' });
        return true;
      }
      try {
        const list = await customDomainService.listCustomDomains(tenantContext.tenantId);
        sendJson(res, 200, { success: true, data: list });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname === '/api/restaurant/domains' && method === 'POST') {
      const identity = requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Adding custom domains requires Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      try {
        const challenge = await customDomainService.addCustomDomain(tenantContext.tenantId, body.domain);
        sendJson(res, 201, { success: true, data: challenge });
      } catch (err: any) {
        const isCollision = err.message.includes('DOMAIN_ALREADY_CLAIMED');
        sendJson(res, isCollision ? 409 : 400, { success: false, error: err.message });
      }
      return true;
    }

    if (
      (pathname === '/api/restaurant/domains/verify' ||
        pathname === '/api/restaurant/branding/verify-domain' ||
        pathname === '/api/restaurant/settings/domains/verify') &&
      method === 'POST'
    ) {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Domain verification requires authenticated manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Domain verification requires Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      const brand = await repo.getTenantBrand();
      const domain = body.domain || brand.customDomain;
      if (!domain || !domain.includes('.')) {
        sendJson(res, 400, { success: false, error: 'INVALID_DOMAIN', message: 'Domain must be a fully qualified domain name.' });
        return true;
      }
      try {
        const verifyRes = await customDomainService.verifyCustomDomain(tenantContext.tenantId, domain);
        if (verifyRes.verified) {
          await repo.updateTenantBrand({
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
      return true;
    }

    if (pathname.startsWith('/api/restaurant/domains/') && method === 'DELETE') {
      const identity = requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Removing custom domains requires Manager or Admin privileges.' });
        return true;
      }
      const targetDomain = decodeURIComponent(pathname.replace('/api/restaurant/domains/', '')).trim();
      try {
        const deleteRes = await customDomainService.removeCustomDomain(tenantContext.tenantId, targetDomain);
        sendJson(res, 200, deleteRes);
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    // 28c. Owner Self-Service Onboarding, Secure Image Uploads & Encrypted Gateway Credentials
    if (pathname === '/api/restaurant/onboarding' && method === 'GET') {
      try {
        const state = await ownerSelfService.getOnboardingState(tenantContext.tenantId);
        sendJson(res, 200, { success: true, onboarding: state });
      } catch (err: any) {
        sendJson(res, 500, { success: false, error: 'ONBOARDING_FETCH_FAILED', message: err.message });
      }
      return true;
    }

    if (pathname === '/api/restaurant/onboarding/step' && method === 'POST') {
      if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER') {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Staff credentials required to update onboarding checklist.' });
        return true;
      }
      const body = await parseBody(req);
      if (!body.step) {
        sendJson(res, 400, { success: false, error: 'MISSING_STEP', message: 'Field "step" is required.' });
        return true;
      }
      try {
        const state = await ownerSelfService.updateOnboardingStep(
          tenantContext.tenantId,
          body.step as OnboardingStepKey,
          body.completed !== false
        );
        sendJson(res, 200, { success: true, onboarding: state });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (
      (pathname === '/api/restaurant/uploads/logo' ||
        pathname === '/api/restaurant/uploads/hero' ||
        pathname === '/api/restaurant/branding/upload-image') &&
      method === 'POST'
    ) {
      if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER' || !requestIdentity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required to upload branding assets.' });
        return true;
      }
      try {
        const parsed = await parseBody(req).catch(() => ({}));
        const kind = pathname.endsWith('/hero') || parsed.kind === 'hero' ? 'hero' : 'logo';
        const { buffer } = await extractImageBuffer(req);
        const saved = await ownerSelfService.saveTenantImage(tenantContext.tenantId, buffer, kind);
        if (kind === 'logo') {
          await repo.updateTenantBrand({ logoUrl: saved.url });
        } else {
          await repo.updateTenantBrand({ heroBannerUrl: saved.url });
        }
        sendJson(res, 200, { success: true, data: saved });
      } catch (err: any) {
        const isSecurity = err.message.includes('SECURITY_VIOLATION');
        const isFormat = err.message.includes('UNSUPPORTED_IMAGE_FORMAT');
        const isLarge = err.message.includes('IMAGE_TOO_LARGE');
        const statusCode = (isSecurity || isFormat || isLarge) ? 400 : 500;
        sendJson(res, statusCode, {
          success: false,
          error: isSecurity ? 'SECURITY_VIOLATION' : (isFormat ? 'UNSUPPORTED_IMAGE_FORMAT' : (isLarge ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED')),
          message: err.message,
        });
      }
      return true;
    }

    if (pathname === '/api/restaurant/payments/config' && method === 'GET') {
      if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER') {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Staff credentials required to view payment configuration.' });
        return true;
      }
      const unmasked = parsedUrl.query.unmasked === 'true' && requestIdentity.isPrivileged;
      try {
        const paymentConfig = await ownerSelfService.getPaymentConfig(tenantContext.tenantId, unmasked);
        sendJson(res, 200, { success: true, paymentConfig });
      } catch (err: any) {
        sendJson(res, 500, { success: false, error: 'PAYMENT_CONFIG_FAILED', message: err.message });
      }
      return true;
    }

    if (pathname === '/api/restaurant/payments/config' && method === 'POST') {
      if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER' || !requestIdentity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required to configure payment gateway.' });
        return true;
      }
      const body = await parseBody(req);
      try {
        const result = await ownerSelfService.savePaymentConfig(tenantContext.tenantId, {
          keyId: body.keyId,
          keySecret: body.keySecret,
          webhookSecret: body.webhookSecret,
          gstin: body.gstin,
          legalEntityName: body.legalEntityName,
        });
        sendJson(res, 200, result);
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: 'PAYMENT_CONFIG_FAILED', message: err.message });
      }
      return true;
    }

    // 29. Customer Support Desk & Cases
    if (pathname === '/api/restaurant/support/tickets' && method === 'GET') {
      if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (requestIdentity.type !== 'STAFF' && requestIdentity.type !== 'ADMIN') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Staff or manager authentication required to view support tickets.' });
        return true;
      }
      sendJson(res, 200, { success: true, data: await repo.getSupportTickets() });
      return true;
    }

    if (pathname === '/api/restaurant/support/tickets' && method === 'POST') {
      if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (requestIdentity.type !== 'STAFF' && requestIdentity.type !== 'ADMIN') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Staff or manager authentication required to create support tickets.' });
        return true;
      }
      const body = await parseBody(req);
      const initialMessage = body.initialMessage || body.description || body.message || body.subject;
      if (!body.subject || !initialMessage) {
        sendJson(res, 400, { success: false, error: 'Missing subject or initialMessage' });
        return true;
      }
      try {
        const ticket = await repo.createSupportTicket({
          branchId: body.branchId || currentBranch.id,
          branchName: body.branchName || currentBranch.name,
          staffId: body.staffId || 'staff_mgr_ldh',
          staffName: body.staffName || body.senderName || 'Restaurant Operator',
          category: body.category || 'URGENT_INCIDENT',
          severity: body.severity || 'MEDIUM',
          subject: body.subject,
          description: body.description || initialMessage || body.subject,
          initialMessage,
        });
        sendJson(res, 201, { success: true, data: ticket });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/restaurant/support/tickets/') && pathname.endsWith('/message') && method === 'POST') {
      const ticketId = pathname.replace('/api/restaurant/support/tickets/', '').replace('/message', '');
      const body = await parseBody(req);
      if (!body.body && !body.text) {
        sendJson(res, 400, { success: false, error: 'Missing body for support message' });
        return true;
      }
      try {
        const success = await repo.addSupportTicketMessage(ticketId, {
          text: body.body || body.text,
          sender: body.senderRole === 'ORBITOX_SUPPORT' ? 'ORBITOX_SUPPORT' : 'RESTAURANT_STAFF',
          authorName: body.senderName || body.authorName || 'Staff Member',
          attachments: body.attachmentUrl ? [body.attachmentUrl] : undefined,
        });
        const ticket = await repo.getSupportTicketById(ticketId);
        sendJson(res, 200, { success, data: ticket });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/restaurant/support/tickets/') && pathname.endsWith('/status') && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Updating support ticket status requires authenticated staff credentials.' });
        return true;
      }
      const ticketId = pathname.replace('/api/restaurant/support/tickets/', '').replace('/status', '');
      const body = await parseBody(req);
      try {
        const ok = await repo.updateSupportTicketStatus(ticketId, body.status);
        const ticket = await repo.getSupportTicketById(ticketId);
        sendJson(res, 200, { success: ok, data: ticket });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    // 30. Menu Catalog Management (Create, Edit, Delete)
    if (pathname === '/api/restaurant/menu/items' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog mutation requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog mutation requires Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      try {
        const newItem = await repo.createMenuItem(body);
        sendJson(res, 201, { success: true, data: newItem });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'PATCH') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog modification requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog modification requires Manager or Admin privileges.' });
        return true;
      }
      const itemId = pathname.replace('/api/restaurant/menu/items/', '');
      const body = await parseBody(req);
      try {
        const updated = await repo.updateMenuItem(itemId, body);
        sendJson(res, 200, { success: true, data: updated });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'DELETE') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog deletion requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog deletion requires Manager or Admin privileges.' });
        return true;
      }
      const itemId = pathname.replace('/api/restaurant/menu/items/', '');
      try {
        await repo.deleteMenuItem(itemId);
        sendJson(res, 200, { success: true, message: `Item ${itemId} deleted` });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    // 30b. Menu Items Query
    if (pathname === '/api/restaurant/menu/items' && method === 'GET') {
      const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const includeArchived = urlObj.searchParams.get('includeArchived') === 'true';
      const cat = urlObj.searchParams.get('category');
      let items = await repo.getMenuItems(includeArchived);
      if (cat && cat !== 'ALL') {
        items = items.filter((i) => i.category.toLowerCase() === cat.toLowerCase() || i.categoryId === cat);
      }
      sendJson(res, 200, { success: true, count: items.length, data: items });
      return true;
    }

    if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'GET') {
      const itemId = pathname.replace('/api/restaurant/menu/items/', '');
      const item = await repo.getMenuItem(itemId);
      if (!item) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Item ${itemId} not found` });
        return true;
      }
      sendJson(res, 200, { success: true, data: item });
      return true;
    }

    // 30c. Category Taxonomy Management
    if (pathname === '/api/restaurant/menu/categories' && method === 'GET') {
      const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const includeArchived = urlObj.searchParams.get('includeArchived') === 'true';
      const categories = await repo.getCategories(includeArchived);
      const allItems = await repo.getMenuItems(true);
      const enriched = categories.map((c) => ({
        ...c,
        itemCount: allItems.filter((i) => !i.isArchived && (i.category === c.name || i.categoryId === c.id)).length,
      }));
      sendJson(res, 200, { success: true, count: enriched.length, data: enriched });
      return true;
    }

    if (pathname === '/api/restaurant/menu/categories' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category creation requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category creation requires Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      try {
        const newCat = await repo.createCategory(body);
        sendJson(res, 201, { success: true, data: newCat });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname === '/api/restaurant/menu/categories/reorder' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category reordering requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category reordering requires Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      if (!Array.isArray(body.orderedIds)) {
        sendJson(res, 400, { success: false, error: 'INVALID_ORDERED_IDS', message: 'orderedIds array required' });
        return true;
      }
      try {
        const reordered = await repo.reorderCategories(body.orderedIds);
        sendJson(res, 200, { success: true, data: reordered });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/restaurant/menu/categories/') && method === 'PATCH') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category modification requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category modification requires Manager or Admin privileges.' });
        return true;
      }
      const catId = pathname.replace('/api/restaurant/menu/categories/', '');
      const body = await parseBody(req);
      try {
        const updated = await repo.updateCategory(catId, body);
        if (!updated) {
          sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Category ${catId} not found` });
          return true;
        }
        sendJson(res, 200, { success: true, data: updated });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/restaurant/menu/categories/') && method === 'DELETE') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category deletion requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category deletion requires Manager or Admin privileges.' });
        return true;
      }
      const catId = pathname.replace('/api/restaurant/menu/categories/', '');
      const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const reassignTo = urlObj.searchParams.get('reassignTo') || undefined;
      try {
        const result = await repo.archiveCategory(catId, reassignTo);
        if (!result.success) {
          sendJson(res, 422, { success: false, error: 'CATEGORY_ARCHIVE_FAILED', message: result.error });
          return true;
        }
        sendJson(res, 200, { success: true, message: `Category ${catId} archived`, reassignedCount: result.reassignedCount });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    // 30b. Branch Menu Resolution & Overrides
    if (pathname.startsWith('/api/restaurant/branches/') && pathname.endsWith('/menu') && method === 'GET') {
      const bId = pathname.replace('/api/restaurant/branches/', '').replace('/menu', '');
      const branch = await repo.getBranch(bId);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${bId} not found.` });
        return true;
      }
      const resolvedMenu = await repo.getResolvedMenuForBranch(bId);
      sendJson(res, 200, { success: true, branchId: bId, branchName: branch.name, count: resolvedMenu.length, data: resolvedMenu });
      return true;
    }

    if (pathname.startsWith('/api/restaurant/branches/') && method === 'GET') {
      const bId = pathname.replace('/api/restaurant/branches/', '');
      const branch = await repo.getBranch(bId);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${bId} not found.` });
        return true;
      }
      sendJson(res, 200, { success: true, data: branch });
      return true;
    }

    if ((pathname === '/api/restaurant/menu/branch-overrides' || pathname === '/api/restaurant/menu/branch-override') && method === 'GET') {
      const bId = parsedUrl.query.branchId as string | undefined;
      sendJson(res, 200, { success: true, data: await repo.getBranchMenuOverrides(bId) });
      return true;
    }

    if ((pathname === '/api/restaurant/menu/branch-overrides' || pathname === '/api/restaurant/menu/branch-override') && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch menu override requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branch menu override requires Manager or Admin privileges.' });
        return true;
      }
      const body = await parseBody(req);
      if (!body.itemId || !body.branchId) {
        sendJson(res, 400, { success: false, error: 'MISSING_FIELDS', message: 'itemId and branchId are required.' });
        return true;
      }
      if (identity.branchId && identity.branchId !== '*' && identity.branchId !== body.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot modify overrides for branch ${body.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return true;
      }
      const saved = await repo.setBranchMenuOverride(body);
      sendJson(res, 200, { success: true, data: saved });
      return true;
    }

  return false;
}
