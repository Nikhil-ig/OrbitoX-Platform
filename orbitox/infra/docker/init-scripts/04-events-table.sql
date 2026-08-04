CREATE TABLE platform.events (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(10) NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,

  context_id UUID NOT NULL,
  tenant_id UUID,
  organisation_id UUID,

  correlation_id UUID,
  causation_id UUID,
  request_id UUID,

  source VARCHAR(100) NOT NULL,
  user_id UUID,

  payload JSONB NOT NULL,

  occurred_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (occurred_at);

-- Create initial partition
CREATE TABLE platform.events_y2026m08 PARTITION OF platform.events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE INDEX idx_events_name_ctx ON platform.events (name, context_id, occurred_at);
CREATE INDEX idx_events_correlation ON platform.events (correlation_id);
CREATE INDEX idx_events_occurred ON platform.events (occurred_at);
