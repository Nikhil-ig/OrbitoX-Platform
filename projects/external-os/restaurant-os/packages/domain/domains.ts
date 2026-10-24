/**
 * 🌐 RestaurantOS Custom Domains & On-Demand TLS Verification Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative management of custom restaurant domains, DNS challenges,
 * cryptographic ownership verification via DNS TXT records, and Caddy
 * on-demand TLS authorization (/internal/tls/ask).
 *
 * Guarantees:
 * 1. Strict domain syntax validation (RFC 1035 / FQDN).
 * 2. Uniqueness & Anti-Theft: A domain cannot be claimed if registered to another tenant.
 * 3. Cryptographic Ownership Proof: DNS TXT query on `_restaurantos-verify.<domain>`.
 * 4. CNAME Traffic Target: `cname.restaurantos.orbitox.io` (or env configured).
 * 5. Caddy On-Demand TLS Protection: Rejects unknown, unverified, or suspended tenants.
 * 6. Instant Resolution Invalidation: Clears LRU cache upon domain state changes.
 */

import * as dns from 'dns';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { invalidateTenantResolutionCache } from './tenancy';

export interface DnsResolver {
  resolveTxt(hostname: string): Promise<string[][]>;
  resolveCname(hostname: string): Promise<string[]>;
}

const defaultDnsResolver: DnsResolver = {
  resolveTxt: (hostname: string) => dns.promises.resolveTxt(hostname),
  resolveCname: (hostname: string) => dns.promises.resolveCname(hostname),
};

export interface DomainChallenge {
  id: string;
  tenantId: string;
  domain: string;
  verificationToken: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  txtRecordName: string;
  txtRecordValue: string;
  cnameHost: string;
  cnameTarget: string;
  sslStatus: string;
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
}

export interface DomainVerificationResult {
  verified: boolean;
  domain: string;
  status: 'VERIFIED' | 'FAILED';
  verifiedAt?: Date;
  error?: string;
  recordsFound?: string[];
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

export function validateDomainSyntax(rawDomain: string): { valid: boolean; domain?: string; error?: string } {
  if (!rawDomain || typeof rawDomain !== 'string') {
    return { valid: false, error: 'Domain must be a non-empty string.' };
  }

  const cleaned = rawDomain.trim().toLowerCase();

  // Reject protocols
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return { valid: false, error: 'Domain must not contain protocols like http:// or https://.' };
  }

  // Reject ports, query strings, IP addresses, spaces, paths
  if (cleaned.includes(':') || cleaned.includes('/') || cleaned.includes('?')) {
    return { valid: false, error: 'Domain must not contain ports, protocols, or paths.' };
  }

  // Reject IP addresses (e.g. 127.0.0.1 or 192.168.1.1)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleaned)) {
    return { valid: false, error: 'IP addresses cannot be registered as custom domains.' };
  }

  // FQDN format: at least 2 labels, each 1-63 chars, alphanumeric with hyphens, valid TLD
  const fqdnRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (!fqdnRegex.test(cleaned)) {
    return { valid: false, error: 'Domain must be a valid fully-qualified domain name (e.g. dine.myrestaurant.com).' };
  }

  // Prohibit registering root platform domains as custom domains
  const reservedRootDomains = ['orbitox.live', 'orbitox.io', 'orbitox.com', 'localhost'];
  for (const root of reservedRootDomains) {
    if (cleaned === root) {
      return { valid: false, error: `Root platform domain "${cleaned}" cannot be claimed as a tenant custom domain.` };
    }
  }

  return { valid: true, domain: cleaned };
}

export class CustomDomainService {
  private prisma: PrismaClient;
  private cnameTarget: string;
  private resolver: DnsResolver;

  constructor(prisma?: PrismaClient, cnameTarget?: string, resolver?: DnsResolver) {
    this.prisma = prisma || getPrisma();
    this.cnameTarget =
      cnameTarget ||
      process.env.RESTAURANTOS_CNAME_TARGET ||
      'cname.restaurantos.orbitox.io';
    this.resolver = resolver || defaultDnsResolver;
  }

  /**
   * Adds or registers a custom domain challenge for a restaurant tenant.
   * Throws 409 collision error if domain is claimed by another tenant.
   */
  async addCustomDomain(tenantId: string, rawDomain: string): Promise<DomainChallenge> {
    const syntax = validateDomainSyntax(rawDomain);
    if (!syntax.valid || !syntax.domain) {
      throw new Error(`INVALID_DOMAIN_FORMAT: ${syntax.error}`);
    }
    const domain = syntax.domain;

    // Check if domain is already registered
    const existing = await this.prisma.tenantDomain.findUnique({
      where: { domain },
      include: { tenant: true },
    });

    if (existing) {
      if (existing.tenantId !== tenantId) {
        throw new Error(`DOMAIN_ALREADY_CLAIMED: Domain "${domain}" is already registered by another restaurant tenant.`);
      }

      // If registered to same tenant and already verified, return existing record
      return {
        id: existing.id,
        tenantId: existing.tenantId,
        domain: existing.domain,
        verificationToken: existing.verificationToken,
        verificationStatus: existing.verificationStatus as any,
        txtRecordName: `_restaurantos-verify.${existing.domain}`,
        txtRecordValue: existing.verificationToken,
        cnameHost: existing.domain,
        cnameTarget: existing.cnameTarget || this.cnameTarget,
        sslStatus: existing.sslStatus,
        verifiedAt: existing.verifiedAt,
        lastCheckedAt: existing.lastCheckedAt,
        createdAt: existing.createdAt,
      };
    }

    // Generate cryptographic verification challenge token
    const verificationToken = `orb_verify_${crypto.randomBytes(16).toString('hex')}`;

    const created = await this.prisma.tenantDomain.create({
      data: {
        tenantId,
        domain,
        verificationToken,
        verificationStatus: 'PENDING',
        sslStatus: 'NOT_PROVISIONED',
        cnameTarget: this.cnameTarget,
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      domain: created.domain,
      verificationToken: created.verificationToken,
      verificationStatus: 'PENDING',
      txtRecordName: `_restaurantos-verify.${created.domain}`,
      txtRecordValue: created.verificationToken,
      cnameHost: created.domain,
      cnameTarget: this.cnameTarget,
      sslStatus: created.sslStatus,
      verifiedAt: null,
      lastCheckedAt: null,
      createdAt: created.createdAt,
    };
  }

  /**
   * Performs cryptographic DNS verification for a domain.
   * Queries DNS TXT record for `_restaurantos-verify.<domain>`.
   */
  async verifyCustomDomain(
    tenantId: string,
    rawDomain: string,
    customResolver?: DnsResolver
  ): Promise<DomainVerificationResult> {
    const syntax = validateDomainSyntax(rawDomain);
    if (!syntax.valid || !syntax.domain) {
      throw new Error(`INVALID_DOMAIN_FORMAT: ${syntax.error}`);
    }
    const domain = syntax.domain;
    const resolver = customResolver || this.resolver;

    const record = await this.prisma.tenantDomain.findFirst({
      where: { tenantId, domain },
      include: { tenant: true },
    });

    if (!record) {
      throw new Error(`DOMAIN_NOT_FOUND: Domain "${domain}" has not been added to tenant "${tenantId}".`);
    }

    const txtHost = `_restaurantos-verify.${domain}`;
    let txtRecords: string[][] = [];
    const flattenedTxt: string[] = [];

    try {
      txtRecords = await resolver.resolveTxt(txtHost);
      for (const entry of txtRecords) {
        flattenedTxt.push(entry.join(''));
      }
    } catch (err: any) {
      const isNotFound = err.code === 'ENOTFOUND' || err.code === 'ENODATA';
      const errMsg = isNotFound
        ? `DNS TXT record "${txtHost}" not found. Please ensure TXT record is configured in your DNS registrar.`
        : `DNS resolution error: ${err.message}`;

      await this.prisma.tenantDomain.update({
        where: { id: record.id },
        data: {
          verificationStatus: 'FAILED',
          lastCheckedAt: new Date(),
        },
      });

      return {
        verified: false,
        domain,
        status: 'FAILED',
        error: errMsg,
        recordsFound: [],
      };
    }

    // Check if expected verification token matches any TXT record
    const matchesToken = flattenedTxt.some(
      (txt) => txt.trim() === record.verificationToken || txt.includes(record.verificationToken)
    );

    if (matchesToken) {
      const now = new Date();
      await this.prisma.tenantDomain.update({
        where: { id: record.id },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedAt: now,
          sslStatus: 'ACTIVE',
          lastCheckedAt: now,
        },
      });

      // Update tenant brand config customDomain if configured
      try {
        const brandConfig = await this.prisma.tenantBrandConfig.findUnique({
          where: { tenantId },
        });
        if (brandConfig) {
          const cfg = (brandConfig.config as any) || {};
          cfg.customDomain = domain;
          cfg.domainStatus = 'VERIFIED';
          cfg.sslStatus = 'ACTIVE';
          await this.prisma.tenantBrandConfig.update({
            where: { tenantId },
            data: { config: cfg },
          });
        }
      } catch (e) {
        // Non-fatal
      }

      // Immediately invalidate cache so new requests to this host resolve instantly
      invalidateTenantResolutionCache(domain);

      return {
        verified: true,
        domain,
        status: 'VERIFIED',
        verifiedAt: now,
        recordsFound: flattenedTxt,
      };
    } else {
      await this.prisma.tenantDomain.update({
        where: { id: record.id },
        data: {
          verificationStatus: 'FAILED',
          lastCheckedAt: new Date(),
        },
      });

      return {
        verified: false,
        domain,
        status: 'FAILED',
        error: `DNS TXT record found at "${txtHost}", but did not contain the expected token "${record.verificationToken}". Found: [${flattenedTxt.join(', ')}]`,
        recordsFound: flattenedTxt,
      };
    }
  }

  /**
   * Removes a custom domain and invalidates the resolution cache.
   */
  async removeCustomDomain(tenantId: string, rawDomain: string): Promise<{ success: boolean }> {
    const syntax = validateDomainSyntax(rawDomain);
    const domain = syntax.valid && syntax.domain ? syntax.domain : rawDomain.trim().toLowerCase();

    await this.prisma.tenantDomain.deleteMany({
      where: { tenantId, domain },
    });

    invalidateTenantResolutionCache(domain);
    return { success: true };
  }

  /**
   * Lists all custom domains registered for a tenant.
   */
  async listCustomDomains(tenantId: string): Promise<DomainChallenge[]> {
    const records = await this.prisma.tenantDomain.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      domain: r.domain,
      verificationToken: r.verificationToken,
      verificationStatus: r.verificationStatus as any,
      txtRecordName: `_restaurantos-verify.${r.domain}`,
      txtRecordValue: r.verificationToken,
      cnameHost: r.domain,
      cnameTarget: r.cnameTarget || this.cnameTarget,
      sslStatus: r.sslStatus,
      verifiedAt: r.verifiedAt,
      lastCheckedAt: r.lastCheckedAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Caddy on-demand TLS Ask gatekeeper:
   * Returns true ONLY if domain is registered in TenantDomain with status 'VERIFIED'
   * and the parent tenant is not suspended or cancelled.
   */
  async isDomainAllowedForTls(rawDomain: string): Promise<boolean> {
    if (!rawDomain || typeof rawDomain !== 'string') return false;
    const clean = rawDomain.trim().toLowerCase();

    try {
      const record = await this.prisma.tenantDomain.findFirst({
        where: {
          domain: clean,
          verificationStatus: 'VERIFIED',
        },
        include: {
          tenant: true,
        },
      });

      if (!record || !record.tenant) return false;

      // Reject if tenant is suspended, cancelled, or inactive
      if (record.tenant.status === 'suspended' || record.tenant.status === 'cancelled') {
        return false;
      }

      return true;
    } catch (err: any) {
      console.warn(`[CustomDomainService] TLS Ask check failed for ${clean}:`, err.message);
      return false;
    }
  }
}
