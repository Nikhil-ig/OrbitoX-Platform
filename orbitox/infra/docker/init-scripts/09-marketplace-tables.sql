-- Part 17: Plugin Marketplace Schema

CREATE TABLE IF NOT EXISTS platform.marketplace_listings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id             VARCHAR(100) NOT NULL UNIQUE,
  package_name          VARCHAR(255) NOT NULL UNIQUE,  -- e.g. '@orbitox/crm'
  display_name          VARCHAR(255) NOT NULL,
  tagline               VARCHAR(255),
  description           TEXT,
  icon                  TEXT,
  category              VARCHAR(50) NOT NULL,          -- 'sales', 'logistics', 'hr', 'finance'
  author                JSONB NOT NULL,                -- { name, verified, website }

  latest_version        VARCHAR(20) NOT NULL,
  pricing_type          VARCHAR(20) DEFAULT 'free',    -- 'free', 'monthly', 'one_time'
  price_cents           INTEGER DEFAULT 0,
  
  rating                NUMERIC(3, 2) DEFAULT 5.0,
  install_count         INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform.marketplace_versions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id             VARCHAR(100) NOT NULL REFERENCES platform.marketplace_listings(plugin_id) ON DELETE CASCADE,
  version               VARCHAR(20) NOT NULL,
  download_url          TEXT NOT NULL,
  checksum              VARCHAR(64) NOT NULL,
  min_platform_version  VARCHAR(20) DEFAULT '1.0.0',
  published_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (plugin_id, version)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_category ON platform.marketplace_listings(category);
