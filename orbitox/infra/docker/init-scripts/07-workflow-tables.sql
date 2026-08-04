CREATE TABLE workflow.definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES platform.contexts(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- 'active', 'inactive', 'draft'
  version INTEGER DEFAULT 1,
  trigger JSONB NOT NULL,
  steps JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workflow.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow.definitions(id),
  context_id UUID NOT NULL REFERENCES platform.contexts(id),
  trigger_event_id UUID,
  entity_id UUID,
  entity_type VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'paused'
  current_step_id VARCHAR(100),
  variables JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  next_resume_at TIMESTAMPTZ,
  error_message TEXT,
  step_logs JSONB DEFAULT '[]'
);
