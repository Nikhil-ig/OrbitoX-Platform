-- Enable LTREE extension for hierarchical data
CREATE EXTENSION IF NOT EXISTS ltree;

-- Part 04: Contexts Table
CREATE TABLE IF NOT EXISTS contexts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(100) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  
  parent_id       UUID REFERENCES contexts(id),
  root_id         UUID NOT NULL REFERENCES contexts(id),
  path            LTREE,
  depth           INTEGER NOT NULL DEFAULT 0,
  
  owner_id        UUID,
  
  theme           JSONB DEFAULT '{}',
  locale          VARCHAR(20) DEFAULT 'en',
  timezone        VARCHAR(100) DEFAULT 'UTC',
  currency        VARCHAR(10) DEFAULT 'USD',
  settings        JSONB DEFAULT '{}',
  
  plugins         TEXT[] DEFAULT '{}',
  features        JSONB DEFAULT '{}',
  capabilities    TEXT[] DEFAULT '{}',
  
  subscription_id UUID,
  plan_id         UUID,
  billing_email   VARCHAR(255),
  
  data_scope      JSONB DEFAULT '{}',
  
  status          VARCHAR(50) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contexts_path ON contexts USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_contexts_parent_id ON contexts (parent_id);
CREATE INDEX IF NOT EXISTS idx_contexts_type ON contexts (type);
CREATE INDEX IF NOT EXISTS idx_contexts_slug ON contexts (slug);

-- Enable RLS
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;

-- Note: Policies will be added in the RBAC module phase
