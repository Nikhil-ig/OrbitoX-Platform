export interface OrbitoXConfig {
  app: {
    name: string;
    port?: number;
  };
  database?: {
    url?: string;
    provider?: 'sqlite' | 'postgresql';
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
}

export interface OrbitoXField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'enum';
  required?: boolean;
  default?: any;
  options?: string[];
}
