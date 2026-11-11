-- Part 07: Plugin Registry & Migrations Schema

CREATE TABLE IF NOT EXISTS platform.plugin_registry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id             VARCHAR(100) NOT NULL,
  context_id            UUID NOT NULL REFERENCES platform.contexts(id) ON DELETE CASCADE,

  version               VARCHAR(20) NOT NULL,
  status                VARCHAR(50) DEFAULT 'active',  -- 'active' | 'disabled' | 'error' | 'installing'

  manifest              JSONB NOT NULL,
  installed_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  last_migration        VARCHAR(100),

  settings              JSONB DEFAULT '{}',            -- context-specific plugin settings
  error_message         TEXT,

  UNIQUE (plugin_id, context_id)
);

CREATE TABLE IF NOT EXISTS platform.plugin_migrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id             VARCHAR(100) NOT NULL,
  migration_name        VARCHAR(255) NOT NULL,
  applied_at            TIMESTAMPTZ DEFAULT NOW(),
  checksum              VARCHAR(64),                   -- SHA256 of migration SQL

  UNIQUE (plugin_id, migration_name)
);

CREATE INDEX IF NOT EXISTS idx_plugin_registry_context ON platform.plugin_registry(context_id);
CREATE INDEX IF NOT EXISTS idx_plugin_registry_status ON platform.plugin_registry(status);
