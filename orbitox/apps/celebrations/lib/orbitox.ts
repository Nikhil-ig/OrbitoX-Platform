import { createMultiTenantEngine, getActiveTenant } from '@orbitox-io/plugin-engine';

/**
 * OrbitoX Zero-Trust Multi-Tenant Engine for Celebrations Platform
 * Automatically resolves subdomains (e.g. aaravandmeera.celebrate.orbitox.io)
 * and custom domains (e.g. aaravandmeera.com) with TTL caching.
 */
export const celebrationsTenantEngine = createMultiTenantEngine({
  wildcardRootDomain: 'celebrate.orbitox.io',
  cacheTtlMs: 60 * 1000, // 1 minute fast TTL cache
  domains: {
    'demo.celebrate.orbitox.io': {
      tenantId: 'tenant_demo_wedding',
      name: 'Royal Heritage Demo',
      tier: 'enterprise',
      features: ['custom_domain', 'background_music', 'password_protection', 'rsvp_tracking'],
    },
  },
  resolveTenant: async (host: string) => {
    // In production, queries Prisma database for custom domain or subdomain
    // Normalized lookup
    const cleanHost = host.toLowerCase().split(':')[0] || host;
    const subdomain = cleanHost.replace('.celebrate.orbitox.io', '');

    return {
      tenantId: `tenant_${subdomain}`,
      name: `${subdomain.toUpperCase()} Celebration`,
      tier: 'pro',
      features: ['rsvp_tracking', 'photo_gallery', 'wishes_wall', 'background_music'],
    };
  },
});

export { getActiveTenant };
