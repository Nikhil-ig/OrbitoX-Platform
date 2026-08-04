CREATE TABLE rbac.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID NOT NULL REFERENCES platform.contexts(id),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '[]',
  inherits_from UUID[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (context_id, name)
);

CREATE TABLE rbac.role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES rbac.roles(id) ON DELETE CASCADE,
  context_id UUID NOT NULL REFERENCES platform.contexts(id),
  granted_by UUID REFERENCES platform.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role_id, context_id)
);

CREATE TABLE rbac.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID REFERENCES platform.contexts(id),
  plugin_id VARCHAR(100),
  type VARCHAR(20) NOT NULL, -- 'rbac', 'abac', 'pbac', 'approval'
  name VARCHAR(255) NOT NULL,
  resource VARCHAR(200),
  action VARCHAR(100),
  definition JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rbac.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES rbac.policies(id),
  context_id UUID NOT NULL REFERENCES platform.contexts(id),
  requested_by UUID NOT NULL REFERENCES platform.users(id),
  resource VARCHAR(200) NOT NULL,
  action VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  current_step INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
