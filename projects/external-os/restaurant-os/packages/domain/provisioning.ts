/**
 * 🪐 RestaurantOS — Multi-Tenant Provisioning Service & Owner Lifecycle Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative, isolated tenant provisioning with clean starter templates,
 * single-use cryptographic owner invites, and zero pilot data leakage.
 */

import * as crypto from 'crypto';
import * as http from 'http';
import { PrismaClient } from '@prisma/client';
import { getCleanStarterTemplate, StarterTemplate } from './templates';
import { generateSeats, SeatRecord } from './index';
import { hashStaffSecretSync, hashPin, issueStaffToken } from './security';
import { withTenantRlsTransaction } from './tenancy';

export const RESERVED_SLUGS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'platform',
  'static',
  'support',
  'billing',
  'login',
  'signup',
  'auth',
  'dine',
  'kds',
  'pos',
  'kitchen',
  'internal',
  'health',
  'healthz',
  'metrics',
  'status',
  'mail',
  'email',
  'ftp',
  'ssh',
  'root',
  'orbitox',
  'dev',
  'stage',
  'staging',
  'test',
  'prod',
  'production',
  'demo',
  'pilot',
]);

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function validateTenantSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug is required and must be a string' };
  }
  const cleanSlug = slug.trim();
  if (cleanSlug.length < 3 || cleanSlug.length > 40) {
    return { valid: false, error: 'Slug must be between 3 and 40 characters' };
  }
  if (!SLUG_REGEX.test(cleanSlug)) {
    return {
      valid: false,
      error: 'Slug must contain only lowercase alphanumeric characters and internal hyphens',
    };
  }
  if (RESERVED_SLUGS.has(cleanSlug)) {
    return { valid: false, error: `Slug "${cleanSlug}" is a reserved word and cannot be provisioned` };
  }
  return { valid: true };
}

/**
 * Validates platform service credentials for internal provisioning endpoints.
 * Enforces RESTAURANTOS_PLATFORM_TOKEN >= 32 chars, constant-time comparison, fail-closed in prod.
 */
export function verifyPlatformAuth(req: http.IncomingMessage): boolean {
  const envToken = process.env.RESTAURANTOS_PLATFORM_TOKEN;
  const isProd = process.env.NODE_ENV === 'production';

  if (!envToken || envToken.length < 32) {
    if (isProd) {
      console.error('🚨 [Security] RESTAURANTOS_PLATFORM_TOKEN missing or < 32 chars in production. Rejecting request.');
      return false;
    }
  }

  const expectedToken = envToken || 'dev_platform_secret_token_restaurantos_secure_32ch';

  const authHeader = req.headers['authorization'] || (req.headers['x-platform-token'] as string);
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }

  let token = authHeader.trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expectedToken);
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface ProvisionTenantInput {
  tenantId?: string;
  restaurantName: string;
  slug: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  templateId?: string;
  locale?: string;
  currency?: string;
  timezone?: string;
  gstin?: string;
  planId?: string;
  status?: string;
  entitlementRevision?: number;
  idempotencyKey?: string;
}

export interface ProvisionTenantResult {
  tenantId: string;
  slug: string;
  name: string;
  planId: string;
  status: string;
  subdomainUrl: string;
  inviteUrl: string;
  inviteToken: string;
  expiresAt: string;
  branchId: string;
  tableCount: number;
}

let sharedPrisma: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  if (!sharedPrisma) {
    const dbUrl = process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os';
    sharedPrisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return sharedPrisma;
}

export class TenantProvisioningService {
  private prisma: PrismaClient;
  private baseDomain: string;

  constructor(prisma?: PrismaClient, baseDomain?: string) {
    this.prisma = prisma || getPrisma();
    this.baseDomain = baseDomain || process.env.RESTAURANTOS_BASE_DOMAIN || 'orbitox.live';
  }

  /**
   * Atomically provisions a new restaurant tenant in ONE database transaction.
   * Guarantees zero pilot data leakage and zero default PINs.
   */
  async provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
    const slugValidation = validateTenantSlug(input.slug);
    if (!slugValidation.valid) {
      throw new Error(`Invalid slug: ${slugValidation.error}`);
    }

    const cleanSlug = input.slug.trim().toLowerCase();
    const tenantId = input.tenantId || `tenant_${cleanSlug}`;
    const template: StarterTemplate = getCleanStarterTemplate(input.templateId);
    const planId = input.planId || 'starter';
    const currency = input.currency || 'INR';
    const timezone = input.timezone || 'Asia/Kolkata';
    const locale = input.locale || 'en-IN';

    // 1. Check idempotency if key provided
    if (input.idempotencyKey) {
      const existingIdem = await this.prisma.idempotencyRecord.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: input.idempotencyKey,
          },
        },
      });
      if (existingIdem && existingIdem.result) {
        return existingIdem.result as unknown as ProvisionTenantResult;
      }
    }

    // 2. Check slug / tenant collision - idempotent return if already provisioned
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantId }, { slug: cleanSlug }],
      },
    });
    if (existingTenant) {
      const branch = await this.prisma.branch.findFirst({ where: { tenantId: existingTenant.id } });
      const tableCount = await this.prisma.tableFloor.count({ where: { tenantId: existingTenant.id } });
      return {
        tenantId: existingTenant.id,
        slug: existingTenant.slug,
        name: existingTenant.name,
        planId: existingTenant.planId,
        status: existingTenant.status,
        subdomainUrl: `https://${existingTenant.slug}.${this.baseDomain}`,
        inviteUrl: '',
        inviteToken: '',
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        branchId: branch?.id || `branch_${cleanSlug}_main`,
        tableCount,
      };
    }

    // 3. Cryptographic single-use invite token
    const rawInviteToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawInviteToken).digest('hex');
    const inviteExpiresAt = new Date(Date.now() + 72 * 3600 * 1000); // 72 hours

    const branchId = `branch_${cleanSlug}_main`;
    const floorId = `floor_${cleanSlug}_main`;
    const ownerStaffId = `staff_${cleanSlug}_owner`;
    const branchCode = `${cleanSlug.replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase()}-01`;

    // 4. Execute atomic transaction within tenant RLS scope
    const result = await withTenantRlsTransaction(this.prisma, tenantId, async (tx: any) => {
      // 4a. Tenant entity
      const restaurantName = (input.restaurantName || (input as any).name || cleanSlug).trim();
      const tenant = await tx.tenant.create({
        data: {
          id: tenantId,
          name: restaurantName,
          slug: cleanSlug,
          status: input.status || 'active',
          planId,
          orbitoxProjectId: input.tenantId || `restaurant-os-${cleanSlug}`,
          currency,
          timezone,
          gstin: input.gstin ? input.gstin.trim() : null,
          entitlementRevision: input.entitlementRevision || 1,
          lastLifecycleKey: input.idempotencyKey || null,
          onboardingState: {
            checklist: {
              setBranding: false,
              reviewMenu: false,
              setupFloor: false,
              printQr: false,
              inviteStaff: false,
              connectPayments: false,
              setGstin: false,
              publishStorefront: false,
            },
            completedCount: 0,
            totalCount: 8,
          },
        },
      });

      // 4b. Primary Branch
      await tx.branch.create({
        data: {
          id: branchId,
          tenantId,
          name: `${restaurantName} Main`,
          code: branchCode,
          address: 'Main Dining Hall',
          city: 'Metropolis',
          timezone,
          currency,
          status: 'OPERATIONAL',
          serviceAreasCount: 1,
          activeTablesCount: template.defaultTableCount,
          email: input.ownerEmail || null,
          phone: input.ownerPhone || null,
          openingHours: {
            openTime: '11:00 AM',
            closeTime: '11:00 PM',
            daysOpen: 'Mon - Sun',
            isOpenNow: true,
          },
        },
      });

      // 4c. Default Floor
      const tableIdsArray: number[] = [];
      for (let i = 1; i <= template.defaultTableCount; i++) {
        tableIdsArray.push(i);
      }

      await tx.floor.create({
        data: {
          id: floorId,
          tenantId,
          branchId,
          name: 'Main Dining Room',
          type: 'Dining',
          capacity: template.defaultTableCount * 4,
          activeLayout: 'Standard',
          status: 'ACTIVE',
          tableIds: tableIdsArray,
          serviceLayouts: [
            {
              id: `lay_${cleanSlug}_std`,
              name: 'Standard Dining',
              description: 'Primary customer service floor configuration',
              tableCount: template.defaultTableCount,
            },
          ],
        },
      });

      // 4d. Tables with random 256-bit QR tokens, stored as hashes only
      for (let i = 1; i <= template.defaultTableCount; i++) {
        const tableNum = `T-${i < 10 ? '0' + i : i}`;
        // Random 256-bit token for QR codes; only SHA-256 hash is stored
        const rawTableToken = crypto.randomBytes(32).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(`orbitox-table-token:v1:${rawTableToken}`).digest('hex');
        const col = (i - 1) % 4;
        const row = Math.floor((i - 1) / 4);

        await tx.tableFloor.create({
          data: {
            id: `tbl_${cleanSlug}_${i}`,
            tenantId,
            numericId: i,
            number: tableNum,
            capacity: 4,
            status: 'AVAILABLE',
            x: 60 + col * 140,
            y: 60 + row * 120,
            width: 90,
            height: 90,
            rotation: 0,
            shape: 'rectangle',
            section: 'Main Dining Room',
            floorId,
            branchId,
            locator: tokenHash,
            seats: generateSeats(4, i) as any,
          },
        });
      }

      // 4e. Menu Categories & Items from Clean Template
      const categoryMap = new Map<string, string>();
      for (let idx = 0; idx < template.categories.length; idx++) {
        const catName = template.categories[idx];
        const catId = `cat_${cleanSlug}_${idx + 1}`;
        categoryMap.set(catName, catId);

        await tx.menuCategory.create({
          data: {
            id: catId,
            tenantId,
            name: catName,
            description: `${catName} selections`,
            displayOrder: idx + 1,
            isArchived: false,
          },
        });
      }

      for (let itemIdx = 0; itemIdx < template.items.length; itemIdx++) {
        const item = template.items[itemIdx];
        const itemId = `item_${cleanSlug}_${itemIdx + 1}`;
        const catId = categoryMap.get(item.categoryName) || `cat_${cleanSlug}_1`;

        await tx.menuItem.create({
          data: {
            id: itemId,
            tenantId,
            name: item.name,
            description: item.description,
            basePriceMinor: item.basePriceMinor,
            formattedPrice: `₹${(item.basePriceMinor / 100).toFixed(2)}`,
            category: item.categoryName,
            categoryId: catId,
            station: item.station,
            prepDurationMinutes: item.prepDurationMinutes,
            allergens: [],
            dietaryFlags: item.isVegetarian ? ['VEG'] : ['NON_VEG'],
            isArchived: false,
          },
        });
      }

      // 4f. Tenant Brand Configuration
      const brandConfigData = {
        restaurantName,
        tagline: `${template.category} Experience`,
        logoUrl: `https://assets.orbitox.io/starter/logos/${template.slug}.svg`,
        faviconUrl: '/favicon.ico',
        primaryColor: template.accentColor,
        secondaryColor: '#D99A45',
        accentColor: template.accentColor,
        surfaceColor: '#121519',
        textColor: '#F3EEE5',
        fontFamilyHeading: template.fontHeading,
        fontFamilyBody: template.fontBody,
        activeTemplateId: template.id,
        subdomain: `${cleanSlug}.${this.baseDomain}`,
        customDomain: null,
        domainStatus: 'NOT_CONFIGURED',
        sslStatus: 'NOT_PROVISIONED',
        customCss: '',
        locale,
        currency,
        currencySymbol: currency === 'INR' ? '₹' : '$',
        timezone,
        branchOverrides: {},
      };

      await tx.tenantBrandConfig.create({
        data: {
          tenantId,
          config: brandConfigData as any,
        },
      });

      // 4g. Owner Staff Member (Pending invite, ZERO default PINs)
      const staffSalt = crypto.randomBytes(16).toString('hex');
      await tx.staffMember.create({
        data: {
          id: ownerStaffId,
          tenantId,
          name: (input.ownerName || `${restaurantName} Owner`).trim(),
          role: 'OWNER',
          branchId,
          station: 'ALL',
          salt: staffSalt,
          pinHash: 'INVITE_PENDING',
          status: 'PENDING_INVITE',
          permissions: ['*'],
        },
      });

      // 4h. Single-use Owner Invite record
      await tx.ownerInvite.create({
        data: {
          tenantId,
          staffMemberId: ownerStaffId,
          tokenHash,
          expiresAt: inviteExpiresAt,
        },
      });

      const subdomainUrl = `http://${cleanSlug}.${this.baseDomain}`;
      const inviteUrl = `http://${cleanSlug}.${this.baseDomain}/accept-invite?token=${rawInviteToken}`;

      const resObj: ProvisionTenantResult = {
        tenantId,
        slug: cleanSlug,
        name: restaurantName,
        planId,
        status: 'trial',
        subdomainUrl,
        inviteUrl,
        inviteToken: rawInviteToken,
        expiresAt: inviteExpiresAt.toISOString(),
        branchId,
        tableCount: template.defaultTableCount,
      };

      // 4i. Store idempotency response if key provided
      if (input.idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            tenantId,
            key: input.idempotencyKey,
            result: resObj as any,
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          },
        });
      }

      return resObj;
    });

    return result;
  }

  /**
   * Accepts an owner invite, establishes owner credentials, and activates the tenant account.
   */
  async acceptOwnerInvite(input: {
    token: string;
    pin?: string;
    password?: string;
    secret?: string;
    ownerName?: string;
  }): Promise<{
    success: boolean;
    tenantId: string;
    staffId: string;
    staffName: string;
    role: string;
    token: string;
  }> {
    if (!input.token || typeof input.token !== 'string') {
      throw new Error('Invite token is required');
    }
    const secret = (input.secret || input.password || input.pin || '').toString().trim();
    if (!secret) {
      throw new Error('Secret, password or PIN is required to activate owner account');
    }
    if (secret.length < 8 && !/^\d{4,6}$/.test(secret)) {
      throw new Error('Owner credentials require a password of at least 8 characters or a 4-6 digit numeric PIN');
    }
    // Block common insecure PINs
    const insecurePins = new Set(['0000', '1111', '1234', '8899', '1122', '9999']);
    if (insecurePins.has(secret)) {
      throw new Error('Selected PIN is too common. Please choose a more secure secret.');
    }

    const tokenHash = crypto.createHash('sha256').update(input.token.trim()).digest('hex');

    const invite = await this.prisma.ownerInvite.findUnique({
      where: { tokenHash },
      include: { tenant: true },
    });

    if (!invite) {
      throw new Error('Invalid or expired owner invite token');
    }
    if (invite.usedAt) {
      throw new Error('Invite token has already been used');
    }
    if (invite.expiresAt < new Date()) {
      throw new Error('Invite token has expired');
    }

    const staffMember = await this.prisma.staffMember.findUnique({
      where: { id: invite.staffMemberId },
    });
    if (!staffMember) {
      throw new Error('Associated owner staff account not found');
    }

    // Set real owner secret with slow scrypt hash and mark staff member ACTIVE
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newPinHash = hashStaffSecretSync(secret, newSalt);
    const updatedName = input.ownerName ? input.ownerName.trim() : staffMember.name;

    await this.prisma.$transaction([
      this.prisma.staffMember.update({
        where: { id: staffMember.id },
        data: {
          salt: newSalt,
          pinHash: newPinHash,
          status: 'ACTIVE',
          name: updatedName,
        },
      }),
      this.prisma.ownerInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.tenant.update({
        where: { id: invite.tenantId },
        data: { status: 'active' },
      }),
    ]);

    // Issue authoritative owner staff JWT token
    const jwtToken = issueStaffToken({
      sub: staffMember.id,
      name: updatedName,
      role: 'OWNER',
      tenantId: invite.tenantId,
      branchId: staffMember.branchId,
      permissions: ['*'],
    });

    return {
      success: true,
      tenantId: invite.tenantId,
      staffId: staffMember.id,
      staffName: updatedName,
      role: 'OWNER',
      token: jwtToken,
    };
  }

  /**
   * Paged tenant listing with search and status filters.
   */
  async listTenants(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branches: { select: { id: true } },
          tables: { select: { id: true } },
          staffMembers: { select: { id: true, role: true, status: true } },
          invites: { select: { id: true, usedAt: true, expiresAt: true } },
          domains: { select: { domain: true, verificationStatus: true } },
        },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      status: r.status,
      planId: r.planId,
      orbitoxProjectId: r.orbitoxProjectId,
      currency: r.currency,
      timezone: r.timezone,
      gstin: r.gstin,
      branchCount: r.branches.length,
      tableCount: r.tables.length,
      staffCount: r.staffMembers.length,
      hasActiveInvite: r.invites.some((inv) => !inv.usedAt && inv.expiresAt > new Date()),
      domains: r.domains,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get comprehensive details for a specific tenant.
   */
  async getTenantDetails(tenantId: string): Promise<any | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: true,
        floors: true,
        brandConfig: true,
        invites: { orderBy: { createdAt: 'desc' }, take: 5 },
        domains: true,
        staffMembers: { select: { id: true, name: true, role: true, status: true, branchId: true } },
      },
    });
    return tenant;
  }

  /**
   * Update tenant metadata.
   */
  async updateTenant(
    tenantId: string,
    updates: {
      name?: string;
      gstin?: string;
      planId?: string;
      timezone?: string;
      currency?: string;
    }
  ): Promise<any> {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: updates,
    });
  }

  /**
   * Suspends a tenant: blocks writes, displays branded unavailable screen.
   */
  async suspendTenant(tenantId: string, reason?: string): Promise<any> {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'suspended' },
    });
  }

  /**
   * Resumes a suspended tenant.
   */
  async resumeTenant(tenantId: string): Promise<any> {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'active' },
    });
  }

  /**
   * Cancels a tenant and schedules deletion after a 30-day retention window.
   */
  async cancelTenant(tenantId: string, retentionDays = 30): Promise<any> {
    const retentionUntil = new Date(Date.now() + retentionDays * 24 * 3600 * 1000);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'cancelled',
        retentionUntil,
      },
    });
  }

  /**
   * Complete data export for offboarding/compliance.
   */
  async exportTenantData(tenantId: string): Promise<Record<string, any>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: true,
        floors: true,
        tables: true,
        categories: true,
        menuItems: true,
        staffMembers: {
          select: {
            id: true,
            name: true,
            role: true,
            branchId: true,
            status: true,
            createdAt: true,
          },
        },
        orders: true,
        invoices: true,
        brandConfig: true,
        domains: true,
      },
    });
    if (!tenant) {
      throw new Error(`Tenant "${tenantId}" not found for export.`);
    }

    return {
      exportVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      tenant,
    };
  }
}
