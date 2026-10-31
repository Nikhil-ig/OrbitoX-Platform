export const crmTemplate = `import { OrbitoXConfig } from '@orbitox/runtime';
import { crm } from '@orbitox/crm';

const config: OrbitoXConfig = {
  app: {
    name: '{{APP_NAME}}',
    port: Number(process.env.PORT) || 3000
  },
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/{{DB_NAME}}'
  },
  tenancy: {
    resolver: async (req) => {
      const headerTenant = req.headers['x-tenant-id'];
      const host = req.headers.host || '';
      const tenantId = (typeof headerTenant === 'string' && headerTenant) 
        ? headerTenant 
        : (host.split('.')[0] || 'default');
      
      return {
        tenantId: tenantId,
        id: tenantId,
        name: tenantId.toUpperCase(),
        status: 'ACTIVE',
        tier: 'plan_pro',
        features: ['crm.leads', 'crm.pipelines', 'crm.scoring'],
        quotas: { 'crm.monthly_leads': 5000 }
      };
    }
  },
  auth: {
    provider: async (req) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) return null;
      const token = authHeader.replace(/^Bearer\\s+/, '');
      return {
        id: 'user_' + token.slice(0, 8),
        tenantId: (req.headers['x-tenant-id'] as string) || 'default',
        scopes: ['crm.leads', 'crm.pipelines']
      };
    }
  },
  platform: {
    enabled: Boolean(process.env.ORBITOX_CONTROL_PLANE_URL),
    controlPlaneUrl: process.env.ORBITOX_CONTROL_PLANE_URL || 'http://127.0.0.1:3005',
    projectId: process.env.ORBITOX_PROJECT_ID || 'proj_{{APP_NAME}}',
    apiKey: process.env.ORBITOX_API_KEY || 'key_{{APP_NAME}}_secret'
  },
  plugins: [
    crm()
  ]
};

export default config;
`;
