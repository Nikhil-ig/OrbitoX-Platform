import { OrbitoXDatabaseAdapter } from './database/types';

export interface OrbitoXConfig {
  app: {
    name: string;
    port?: number;
  };
  database?: {
    adapter?: OrbitoXDatabaseAdapter;
    url?: string;
    provider?: 'sqlite' | 'postgresql' | 'mongodb' | 'mysql' | string;
  };
  auth?: {
    adminEmail?: string;
    adminPassword?: string;
  };
  entities: OrbitoXEntity[];
}

export interface OrbitoXEntity {
  id: string;
  name: string;
  fields: OrbitoXField[];
  permissions?: string[];
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
