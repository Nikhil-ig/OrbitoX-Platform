data "aws_region" "current" {}

resource "aws_ecs_cluster" "main" {
  name = "orbitox-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-cluster"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# Security Group for ECS Tasks (Compute Layer)
# ─────────────────────────────────────────────────────────────

resource "aws_security_group" "ecs" {
  name        = "orbitox-${var.environment}-ecs-sg"
  description = "Controls traffic to and from ECS Fargate tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Inbound from ALB on web port 3005"
    from_port       = 3005
    to_port         = 3005
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  ingress {
    description = "Inter-service private communication between tasks"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  egress {
    description = "Allow all outbound (RDS, VPC endpoints, NAT Gateway)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecs-sg"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# CloudWatch Log Groups (365-day retention)
# ─────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/orbitox-${var.environment}-web"
  retention_in_days = 365

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-web-logs"
    Environment = var.environment
  })
}

resource "aws_cloudwatch_log_group" "worker_email" {
  name              = "/ecs/orbitox-${var.environment}-worker-email"
  retention_in_days = 365

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-worker-email-logs"
    Environment = var.environment
  })
}

resource "aws_cloudwatch_log_group" "worker_sweep" {
  name              = "/ecs/orbitox-${var.environment}-worker-sweep"
  retention_in_days = 365

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-worker-sweep-logs"
    Environment = var.environment
  })
}

resource "aws_cloudwatch_log_group" "restaurant_os" {
  name              = "/ecs/orbitox-${var.environment}-restaurant-os"
  retention_in_days = 365

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-restaurant-os-logs"
    Environment = var.environment
  })
}

resource "aws_cloudwatch_log_group" "db_migrate" {
  name              = "/ecs/orbitox-${var.environment}-db-migrate"
  retention_in_days = 365

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-db-migrate-logs"
    Environment = var.environment
  })
}

resource "aws_cloudwatch_log_group" "db_inventory" {
  name              = "/ecs/orbitox-${var.environment}-db-inventory"
  retention_in_days = 365

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-db-inventory-logs"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# Standard Task Role (App Runtime Actions)
# ─────────────────────────────────────────────────────────────

resource "aws_iam_role" "task_role" {
  name = "orbitox-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecs-task-role"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# Helper: Macro for creating dedicated execution roles per service (H1)
# ─────────────────────────────────────────────────────────────

# 1. Web Execution Role (Only runtime database and public web secrets)
resource "aws_iam_role" "web_execution_role" {
  name = "orbitox-${var.environment}-ecs-web-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecs-web-execution-role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "web_execution_standard" {
  role       = aws_iam_role.web_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "web_secrets_access" {
  name        = "orbitox-${var.environment}-ecs-web-secrets-policy"
  description = "Allows web ECS task to decrypt and read ONLY runtime secrets (NO schema owner access)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [
          var.secrets_map["APP_DATABASE_URL"],
          var.secrets_map["PLATFORM_ADMIN_AUDIT_DATABASE_URL"],
          var.secrets_map["HMS_AUDIT_DATABASE_URL"],
          var.secrets_map["SESSION_SECRET"],
          var.secrets_map["ORBITOX_ADMIN_TOKEN"],
          var.secrets_map["ORBITOX_RUNTIME_TOKEN"],
          var.secrets_map["ORBITOX_CONTROL_SECRET"],
          var.secrets_map["ORBITOX_GUEST_SECRET"],
          var.secrets_map["ORBITOX_SERVER_PEPPER"],
          var.secrets_map["ORBITOX_MFA_ENCRYPTION_KEY"],
          var.secrets_map["ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY"],
          var.secrets_map["ORBITOX_PHI_KEYS"],
          var.secrets_map["ORBITOX_PHI_INDEX_KEY"],
          var.secrets_map["ORBITOX_GRANT_SIGNING_KEYS"],
          var.secrets_map["ORBITOX_EMAIL_WEBHOOK_SECRET"],
          var.secrets_map["RESEND_API_KEY"],
          var.secrets_map["RAZORPAY_KEY_ID"],
          var.secrets_map["RAZORPAY_KEY_SECRET"],
          var.secrets_map["RAZORPAY_WEBHOOK_SECRET"],
          var.secrets_map["ORBITOX_BRIDGE_KEYS"],
          var.secrets_map["ORBITOX_BRIDGE_ACTIVE_KID"]
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.secrets_kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "web_secrets_attach" {
  role       = aws_iam_role.web_execution_role.name
  policy_arn = aws_iam_policy.web_secrets_access.arn
}

# 2. Worker Email Execution Role (Only outbox relay and Resend secrets)
resource "aws_iam_role" "email_execution_role" {
  name = "orbitox-${var.environment}-ecs-email-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecs-email-execution-role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "email_execution_standard" {
  role       = aws_iam_role.email_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "email_secrets_access" {
  name        = "orbitox-${var.environment}-ecs-email-secrets-policy"
  description = "Allows worker-email to decrypt and read ONLY outbox relay and Resend secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [
          var.secrets_map["OUTBOX_RELAY_DATABASE_URL"],
          var.secrets_map["RESEND_API_KEY"],
          var.secrets_map["ORBITOX_EMAIL_WEBHOOK_SECRET"],
          var.secrets_map["ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY"]
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.secrets_kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "email_secrets_attach" {
  role       = aws_iam_role.email_execution_role.name
  policy_arn = aws_iam_policy.email_secrets_access.arn
}

# 3. Worker Sweep Execution Role (Only maintenance and runtime database secrets)
resource "aws_iam_role" "sweep_execution_role" {
  name = "orbitox-${var.environment}-ecs-sweep-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecs-sweep-execution-role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "sweep_execution_standard" {
  role       = aws_iam_role.sweep_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "sweep_secrets_access" {
  name        = "orbitox-${var.environment}-ecs-sweep-secrets-policy"
  description = "Allows worker-sweep to decrypt and read runtime and maintenance database secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [
          var.secrets_map["APP_DATABASE_URL"],
          var.secrets_map["MAINTENANCE_DATABASE_URL"]
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.secrets_kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sweep_secrets_attach" {
  role       = aws_iam_role.sweep_execution_role.name
  policy_arn = aws_iam_policy.sweep_secrets_access.arn
}

# 4. Migrate Task Execution Role (Only migrator database secret)
resource "aws_iam_role" "migrate_execution_role" {
  name = "orbitox-${var.environment}-ecs-migrate-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecs-migrate-execution-role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "migrate_execution_standard" {
  role       = aws_iam_role.migrate_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "migrate_secrets_access" {
  name        = "orbitox-${var.environment}-ecs-migrate-secrets-policy"
  description = "Allows one-off migration task to access ONLY the migrator database secret"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [
          var.secrets_map["MIGRATOR_DATABASE_URL"],
          var.secrets_map["APP_DATABASE_URL"],
          var.secrets_map["MAINTENANCE_DATABASE_URL"],
          var.secrets_map["OUTBOX_RELAY_DATABASE_URL"],
          var.secrets_map["PLATFORM_ADMIN_AUDIT_DATABASE_URL"],
          var.secrets_map["HMS_AUDIT_DATABASE_URL"]
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.secrets_kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "migrate_secrets_attach" {
  role       = aws_iam_role.migrate_execution_role.name
  policy_arn = aws_iam_policy.migrate_secrets_access.arn
}

# 5. Inventory Task Execution Role (Role URLs needed for Step 1 inventory)
resource "aws_iam_role" "inventory_execution_role" {
  name = "orbitox-${var.environment}-ecs-inventory-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecs-inventory-execution-role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "inventory_execution_standard" {
  role       = aws_iam_role.inventory_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "inventory_secrets_access" {
  name        = "orbitox-${var.environment}-ecs-inventory-secrets-policy"
  description = "Allows Step 1 inventory task to access role database URLs to verify RLS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [
          var.secrets_map["MIGRATOR_DATABASE_URL"],
          var.secrets_map["APP_DATABASE_URL"],
          var.secrets_map["MAINTENANCE_DATABASE_URL"],
          var.secrets_map["OUTBOX_RELAY_DATABASE_URL"],
          var.secrets_map["PLATFORM_ADMIN_AUDIT_DATABASE_URL"],
          var.secrets_map["HMS_AUDIT_DATABASE_URL"]
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.secrets_kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "inventory_secrets_attach" {
  role       = aws_iam_role.inventory_execution_role.name
  policy_arn = aws_iam_policy.inventory_secrets_access.arn
}

# 6. RestaurantOS Execution Role (Isolated DB & bridge secret)
resource "aws_iam_role" "restaurant_os_execution_role" {
  name = "orbitox-${var.environment}-ecs-ros-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecs-ros-execution-role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "restaurant_os_execution_standard" {
  role       = aws_iam_role.restaurant_os_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "restaurant_os_secrets_access" {
  name        = "orbitox-${var.environment}-ecs-ros-secrets-policy"
  description = "Allows RestaurantOS ECS task to access ONLY its own isolated database secret"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [
          var.secrets_map["RESTAURANT_OS_DATABASE_URL"],
          var.secrets_map["ORBITOX_BRIDGE_KEYS"],
          var.secrets_map["ORBITOX_BRIDGE_ACTIVE_KID"],
          var.secrets_map["ORBITOX_GRANT_PUBLIC_KEYS"]
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.secrets_kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "restaurant_os_secrets_attach" {
  role       = aws_iam_role.restaurant_os_execution_role.name
  policy_arn = aws_iam_policy.restaurant_os_secrets_access.arn
}

# ─────────────────────────────────────────────────────────────
# Task Definitions (Images pulled by DIGEST, never plain tag)
# ─────────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "web" {
  family                   = "orbitox-${var.environment}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.web_cpu
  memory                   = var.web_memory
  execution_role_arn       = aws_iam_role.web_execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = var.web_image_digest
      essential = true
      portMappings = [
        {
          containerPort = 3005
          hostPort      = 3005
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3005" },
        { name = "HOSTNAME", value = "0.0.0.0" },
        { name = "ORBITOX_PUBLIC_BASE_URL", value = var.public_base_url },
        { name = "ORBITOX_PLATFORM_REPOSITORY", value = "prisma" },
        { name = "ORBITOX_ADMIN_TOKEN_SCOPES", value = "GET:/api/*,POST:/api/*,PUT:/api/*,PATCH:/api/*,DELETE:/api/*" },
        { name = "ORBITOX_BREACHED_PASSWORD_API", value = "off" },
        { name = "ORBITOX_EMAIL_PROVIDER", value = "resend" },
        { name = "ORBITOX_EMAIL_FROM", value = var.email_from },
        { name = "ORBITOX_PHI_ACTIVE_KID", value = "v1" }
      ]
      secrets = [
        { name = "APP_DATABASE_URL", valueFrom = var.secrets_map["APP_DATABASE_URL"] },
        { name = "PLATFORM_ADMIN_AUDIT_DATABASE_URL", valueFrom = var.secrets_map["PLATFORM_ADMIN_AUDIT_DATABASE_URL"] },
        { name = "HMS_AUDIT_DATABASE_URL", valueFrom = var.secrets_map["HMS_AUDIT_DATABASE_URL"] },
        { name = "SESSION_SECRET", valueFrom = var.secrets_map["SESSION_SECRET"] },
        { name = "ORBITOX_ADMIN_TOKEN", valueFrom = var.secrets_map["ORBITOX_ADMIN_TOKEN"] },
        { name = "ORBITOX_RUNTIME_TOKEN", valueFrom = var.secrets_map["ORBITOX_RUNTIME_TOKEN"] },
        { name = "ORBITOX_CONTROL_SECRET", valueFrom = var.secrets_map["ORBITOX_CONTROL_SECRET"] },
        { name = "ORBITOX_GUEST_SECRET", valueFrom = var.secrets_map["ORBITOX_GUEST_SECRET"] },
        { name = "ORBITOX_SERVER_PEPPER", valueFrom = var.secrets_map["ORBITOX_SERVER_PEPPER"] },
        { name = "ORBITOX_MFA_ENCRYPTION_KEY", valueFrom = var.secrets_map["ORBITOX_MFA_ENCRYPTION_KEY"] },
        { name = "ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY", valueFrom = var.secrets_map["ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY"] },
        { name = "ORBITOX_PHI_KEYS", valueFrom = var.secrets_map["ORBITOX_PHI_KEYS"] },
        { name = "ORBITOX_PHI_INDEX_KEY", valueFrom = var.secrets_map["ORBITOX_PHI_INDEX_KEY"] },
        { name = "ORBITOX_GRANT_SIGNING_KEYS", valueFrom = var.secrets_map["ORBITOX_GRANT_SIGNING_KEYS"] },
        { name = "ORBITOX_EMAIL_WEBHOOK_SECRET", valueFrom = var.secrets_map["ORBITOX_EMAIL_WEBHOOK_SECRET"] },
        { name = "RESEND_API_KEY", valueFrom = var.secrets_map["RESEND_API_KEY"] },
        { name = "RAZORPAY_KEY_ID", valueFrom = var.secrets_map["RAZORPAY_KEY_ID"] },
        { name = "RAZORPAY_KEY_SECRET", valueFrom = var.secrets_map["RAZORPAY_KEY_SECRET"] },
        { name = "RAZORPAY_WEBHOOK_SECRET", valueFrom = var.secrets_map["RAZORPAY_WEBHOOK_SECRET"] },
        { name = "ORBITOX_BRIDGE_KEYS", valueFrom = var.secrets_map["ORBITOX_BRIDGE_KEYS"] },
        { name = "ORBITOX_BRIDGE_ACTIVE_KID", valueFrom = var.secrets_map["ORBITOX_BRIDGE_ACTIVE_KID"] }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.web.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "web"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -fsS http://localhost:3005/api/health || exit 1"]
        interval    = 15
        timeout     = 5
        retries     = 3
        startPeriod = 20
      }
    }
  ])

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-web-task"
    Environment = var.environment
  })
}

resource "aws_ecs_task_definition" "worker_email" {
  family                   = "orbitox-${var.environment}-worker-email"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.email_execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "worker-email"
      image     = var.web_image_digest
      essential = true
      command   = ["node", "scripts/account-email-worker.js"]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "ORBITOX_PLATFORM_REPOSITORY", value = "prisma" },
        { name = "ORBITOX_EMAIL_PROVIDER", value = "resend" },
        { name = "ORBITOX_EMAIL_FROM", value = var.email_from }
      ]
      secrets = [
        { name = "OUTBOX_RELAY_DATABASE_URL", valueFrom = var.secrets_map["OUTBOX_RELAY_DATABASE_URL"] },
        { name = "RESEND_API_KEY", valueFrom = var.secrets_map["RESEND_API_KEY"] },
        { name = "ORBITOX_EMAIL_WEBHOOK_SECRET", valueFrom = var.secrets_map["ORBITOX_EMAIL_WEBHOOK_SECRET"] },
        { name = "ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY", valueFrom = var.secrets_map["ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY"] }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.worker_email.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "worker-email"
        }
      }
    }
  ])

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-worker-email-task"
    Environment = var.environment
  })
}

resource "aws_ecs_task_definition" "worker_sweep" {
  family                   = "orbitox-${var.environment}-worker-sweep"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.sweep_execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "worker-sweep"
      image     = var.web_image_digest
      essential = true
      command   = ["node", "scripts/billing-grace-sweep.js"]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "ORBITOX_PLATFORM_REPOSITORY", value = "prisma" }
      ]
      secrets = [
        { name = "APP_DATABASE_URL", valueFrom = var.secrets_map["APP_DATABASE_URL"] },
        { name = "MAINTENANCE_DATABASE_URL", valueFrom = var.secrets_map["MAINTENANCE_DATABASE_URL"] }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.worker_sweep.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "worker-sweep"
        }
      }
    }
  ])

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-worker-sweep-task"
    Environment = var.environment
  })
}

resource "aws_ecs_task_definition" "restaurant_os" {
  family                   = "orbitox-${var.environment}-restaurant-os"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.restaurant_os_execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "restaurant-os"
      image     = var.restaurant_os_image_digest
      essential = true
      portMappings = [
        {
          containerPort = 4010
          hostPort      = 4010
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "4010" },
        { name = "HOSTNAME", value = "0.0.0.0" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.secrets_map["RESTAURANT_OS_DATABASE_URL"] },
        { name = "ORBITOX_BRIDGE_KEYS", valueFrom = var.secrets_map["ORBITOX_BRIDGE_KEYS"] },
        { name = "ORBITOX_BRIDGE_ACTIVE_KID", valueFrom = var.secrets_map["ORBITOX_BRIDGE_ACTIVE_KID"] },
        { name = "ORBITOX_GRANT_PUBLIC_KEYS", valueFrom = var.secrets_map["ORBITOX_GRANT_PUBLIC_KEYS"] }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.restaurant_os.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "restaurant-os"
        }
      }
    }
  ])

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-restaurant-os-task"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# One-Off Task Definition: DB Migration & Role Enablement (B2 Fix)
# ─────────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "migrate" {
  family                   = "orbitox-${var.environment}-db-migrate"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.migrate_execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "db-migrate"
      image     = var.web_image_digest
      essential = true
      command   = ["node", "scripts/run-staging-migration.js"]
      environment = [
        { name = "NODE_ENV", value = "production" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.secrets_map["MIGRATOR_DATABASE_URL"] },
        { name = "MIGRATOR_DATABASE_URL", valueFrom = var.secrets_map["MIGRATOR_DATABASE_URL"] },
        { name = "APP_DATABASE_URL", valueFrom = var.secrets_map["APP_DATABASE_URL"] },
        { name = "MAINTENANCE_DATABASE_URL", valueFrom = var.secrets_map["MAINTENANCE_DATABASE_URL"] },
        { name = "OUTBOX_RELAY_DATABASE_URL", valueFrom = var.secrets_map["OUTBOX_RELAY_DATABASE_URL"] },
        { name = "PLATFORM_ADMIN_AUDIT_DATABASE_URL", valueFrom = var.secrets_map["PLATFORM_ADMIN_AUDIT_DATABASE_URL"] },
        { name = "HMS_AUDIT_DATABASE_URL", valueFrom = var.secrets_map["HMS_AUDIT_DATABASE_URL"] }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.db_migrate.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "db-migrate"
        }
      }
    }
  ])

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-db-migrate-task"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# One-Off Task Definition: Step 1 RLS/Role Inventory Verification (B2 Fix)
# ─────────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "inventory" {
  family                   = "orbitox-${var.environment}-db-inventory"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.inventory_execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "db-inventory"
      image     = var.web_image_digest
      essential = true
      command   = ["node", "scripts/run-staging-inventory.js"]
      environment = [
        { name = "NODE_ENV", value = "production" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.secrets_map["MIGRATOR_DATABASE_URL"] },
        { name = "TEST_DATABASE_URL", valueFrom = var.secrets_map["MIGRATOR_DATABASE_URL"] },
        { name = "APP_DATABASE_URL", valueFrom = var.secrets_map["APP_DATABASE_URL"] },
        { name = "MAINTENANCE_DATABASE_URL", valueFrom = var.secrets_map["MAINTENANCE_DATABASE_URL"] },
        { name = "OUTBOX_RELAY_DATABASE_URL", valueFrom = var.secrets_map["OUTBOX_RELAY_DATABASE_URL"] },
        { name = "PLATFORM_ADMIN_AUDIT_DATABASE_URL", valueFrom = var.secrets_map["PLATFORM_ADMIN_AUDIT_DATABASE_URL"] },
        { name = "HMS_AUDIT_DATABASE_URL", valueFrom = var.secrets_map["HMS_AUDIT_DATABASE_URL"] }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.db_inventory.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "db-inventory"
        }
      }
    }
  ])

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-db-inventory-task"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# ECS Services
# ─────────────────────────────────────────────────────────────

resource "aws_ecs_service" "web" {
  name                               = "orbitox-${var.environment}-web-service"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.web.arn
  desired_count                      = var.web_desired_count
  launch_type                        = "FARGATE"
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "web"
    container_port   = 3005
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-web-service"
    Environment = var.environment
  })
}

resource "aws_ecs_service" "worker_email" {
  name            = "orbitox-${var.environment}-worker-email-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker_email.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-worker-email-service"
    Environment = var.environment
  })
}

resource "aws_ecs_service" "restaurant_os" {
  name            = "orbitox-${var.environment}-restaurant-os-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.restaurant_os.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-restaurant-os-service"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# Scheduled Maintenance: Daily Billing Grace Sweep (02:00 UTC)
# ─────────────────────────────────────────────────────────────

resource "aws_cloudwatch_event_rule" "sweep_schedule" {
  name                = "orbitox-${var.environment}-daily-sweep-rule"
  description         = "Triggers daily billing grace sweep maintenance task"
  schedule_expression = "cron(0 2 * * ? *)"

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-daily-sweep-rule"
    Environment = var.environment
  })
}

resource "aws_iam_role" "events_ecs_role" {
  name = "orbitox-${var.environment}-events-ecs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "events.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy" "events_run_task" {
  name = "orbitox-${var.environment}-events-run-task-policy"
  role = aws_iam_role.events_ecs_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecs:RunTask"]
        Resource = [aws_ecs_task_definition.worker_sweep.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = [aws_iam_role.sweep_execution_role.arn, aws_iam_role.task_role.arn]
      }
    ]
  })
}

resource "aws_cloudwatch_event_target" "sweep_target" {
  rule      = aws_cloudwatch_event_rule.sweep_schedule.name
  target_id = "orbitox-${var.environment}-billing-sweep"
  arn       = aws_ecs_cluster.main.arn
  role_arn  = aws_iam_role.events_ecs_role.arn

  ecs_target {
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.worker_sweep.arn
    launch_type         = "FARGATE"
    platform_version    = "LATEST"

    network_configuration {
      subnets          = var.private_subnet_ids
      security_groups  = [aws_security_group.ecs.id]
      assign_public_ip = false
    }
  }
}
