CREATE TABLE IF NOT EXISTS audit.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  action VARCHAR(200) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,

  -- Who did it
  user_id UUID,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  impersonated_by UUID,

  -- Where
  context_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,

  -- Before & After
  old_value JSONB,
  new_value JSONB,
  changed_fields TEXT[],

  -- Why
  reason TEXT,

  -- When
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Integrity
  previous_hash VARCHAR(64),
  row_hash VARCHAR(64)
) PARTITION BY RANGE (occurred_at);

-- Create initial partition
CREATE TABLE IF NOT EXISTS audit.events_y2026m08 PARTITION OF audit.events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- We are superuser here so we can create roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END
$$;

REVOKE UPDATE ON audit.events FROM app_user;
REVOKE DELETE ON audit.events FROM app_user;
