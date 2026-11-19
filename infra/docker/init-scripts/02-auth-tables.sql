CREATE TABLE platform.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES platform.contexts(id),
  tenant_id UUID REFERENCES platform.contexts(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (context_id, email)
);

CREATE TABLE platform.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
  refresh_token_jti VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform.mfa_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL, -- 'totp', 'backup_code'
  secret_hash VARCHAR(255) NOT NULL, -- Encrypted secret or hashed backup code
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE platform.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES platform.contexts(id),
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  scopes JSONB DEFAULT '[]',
  rate_limit INTEGER DEFAULT 1000,
  allowed_ips JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES platform.users(id),
  status VARCHAR(20) DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
