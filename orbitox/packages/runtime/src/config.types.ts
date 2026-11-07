import { OrbitoXDatabaseAdapter } from './database/types';
import { OrbitoXPlugin } from '@orbitox-io/plugin-engine';

export interface OrbitoXUser {
  id: string;
  email?: string;
  roles?: string[];
  scopes?: string[];
  tenantId?: string;
  [key: string]: any;
}

export interface OrbitoXTenant {
  tenantId: string;
  name?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | string;
  features?: string[];
  tier?: string;
  quotas?: Record<string, number>;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface PlatformConfig {
  enabled?: boolean;
  controlPlaneUrl?: string;
  projectId?: string;
  slug?: string;
  apiKey?: string;
  syncIntervalSeconds?: number;
  sdk?: any;
}

export interface OrbitoXConfig {
  app: {
    name: string;
    port?: number;
    environment?: 'development' | 'staging' | 'production' | string;
  };
  database?: {
    adapter?: OrbitoXDatabaseAdapter;
    url?: string;
    provider?: 'sqlite' | 'postgresql' | 'mongodb' | 'mysql' | string;
    repositories?: Record<string, any>;
  };
  storage?: {
    repositories?: Record<string, any>;
  };
  auth?: {
    provider?: (req: any) => Promise<OrbitoXUser | null | undefined> | OrbitoXUser | null | undefined;
    adminEmail?: string;
    adminPassword?: string;
  };
  tenancy?: {
    resolver: (req: any) => Promise<OrbitoXTenant | null | undefined> | OrbitoXTenant | null | undefined;
    bypassPaths?: string[];
  };
  plugins?: Array<OrbitoXPlugin<any, any, any>>;
  platform?: PlatformConfig;
  entities?: OrbitoXEntity[];
}

export interface OrbitoXEntity {
  id: string;
  name: string;
  fields: OrbitoXField[];
  permissions?: string[];
  entitlement?: {
    feature?: string;
    quotaKey?: string;
  };
  hooks?: OrbitoXEntityHooks;
}

export interface OrbitoXField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'enum' | 'json' | 'array';
  required?: boolean;
  default?: any;
  options?: string[];
}

export interface OrbitoXEntityHooks {
  beforeCreate?: (payload: any, context: any) => Promise<any> | any;
  afterCreate?: (record: any, context: any) => Promise<void> | void;
  beforeRead?: (query: any, context: any) => Promise<any> | any;
  beforeUpdate?: (id: string, payload: any, context: any) => Promise<any> | any;
  afterUpdate?: (record: any, context: any) => Promise<void> | void;
  beforeDelete?: (id: string, context: any) => Promise<void> | void;
  afterDelete?: (id: string, context: any) => Promise<void> | void;
}
