export enum PlatformContextType {
  PLATFORM = 'platform',
  ORGANISATION = 'organisation',
  TENANT = 'tenant',
  BRANCH = 'branch',
}

export interface ThemeConfig {
  primaryColor?: string;
  logo?: string;
  [key: string]: any;
}

export interface Context {
  id: string;
  type: string; // PlatformContextType or custom plugin string
  slug: string;
  displayName: string;

  parentId: string | null;
  rootId: string;
  path: string; // 'rootId.orgId.tenantId'
  depth: number;

  ownerId: string | null;

  theme: ThemeConfig;
  locale: string;
  timezone: string;
  currency: string;
  settings: Record<string, any>;

  plugins: string[];
  features: Record<string, boolean>;
  capabilities: string[];

  subscriptionId: string | null;
  planId: string | null;
  billingEmail: string | null;

  dataScope: Record<string, any>;

  status: 'active' | 'suspended' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type CreateContextPayload = Pick<Context, 'type' | 'slug' | 'displayName' | 'parentId' | 'ownerId'> & Partial<Context>;
