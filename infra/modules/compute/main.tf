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
# CloudWatch Log Groups
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

# ─────────────────────────────────────────────────────────────
# IAM Roles & Policies for ECS Execution & Tasks
# ─────────────────────────────────────────────────────────────

resource "aws_iam_role" "execution_role" {
  name = "orbitox-${var.environment}-ecs-execution-role"

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
    Name        = "orbitox-${var.environment}-ecs-execution-role"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "execution_standard" {
  role       = aws_iam_role.execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "secrets_access" {
  name        = "orbitox-${var.environment}-ecs-secrets-policy"
  description = "Allows ECS tasks to pull required application secrets from Secrets Manager and decrypt via KMS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = values(var.secrets_map)
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.secrets_kms_key_arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "execution_secrets" {
  role       = aws_iam_role.execution_role.name
  policy_arn = aws_iam_policy.secrets_access.arn
}

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
# Task Definitions (Images pulled by DIGEST, never plain tag)
# ─────────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "web" {
  family                   = "orbitox-${var.environment}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.web_cpu
  memory                   = var.web_memory
  execution_role_arn       = aws_iam_role.execution_role.arn
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
        { name = "ORBITOX_PLATFORM_REPOSITORY", value = "prisma" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.secrets_map["DATABASE_URL"] },
        { name = "APP_DATABASE_URL", valueFrom = var.secrets_map["APP_DATABASE_URL"] },
        { name = "MAINTENANCE_DATABASE_URL", valueFrom = var.secrets_map["MAINTENANCE_DATABASE_URL"] },
        { name = "OUTBOX_RELAY_DATABASE_URL", valueFrom = var.secrets_map["OUTBOX_RELAY_DATABASE_URL"] },
        { name = "PLATFORM_ADMIN_AUDIT_DATABASE_URL", valueFrom = var.secrets_map["PLATFORM_ADMIN_AUDIT_DATABASE_URL"] },
        { name = "HMS_AUDIT_DATABASE_URL", valueFrom = var.secrets_map["HMS_AUDIT_DATABASE_URL"] },
        { name = "ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY", valueFrom = var.secrets_map["ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY"] },
        { name = "ORBITOX_PHI_ENCRYPTION_KEYS", valueFrom = var.secrets_map["ORBITOX_PHI_ENCRYPTION_KEYS"] },
        { name = "ORBITOX_MFA_ENCRYPTION_KEY", valueFrom = var.secrets_map["ORBITOX_MFA_ENCRYPTION_KEY"] },
        { name = "ORBITOX_API_KEY_PEPPER_RING", valueFrom = var.secrets_map["ORBITOX_API_KEY_PEPPER_RING"] },
        { name = "ORBITOX_BRIDGE_SECRET", valueFrom = var.secrets_map["ORBITOX_BRIDGE_SECRET"] },
        { name = "ORBITOX_GRANT_SIGNING_KEYS", valueFrom = var.secrets_map["ORBITOX_GRANT_SIGNING_KEYS"] },
        { name = "RAZORPAY_KEY_ID", valueFrom = var.secrets_map["RAZORPAY_KEY_ID"] },
        { name = "RAZORPAY_KEY_SECRET", valueFrom = var.secrets_map["RAZORPAY_KEY_SECRET"] },
        { name = "RAZORPAY_WEBHOOK_SECRET", valueFrom = var.secrets_map["RAZORPAY_WEBHOOK_SECRET"] },
        { name = "RESEND_API_KEY", valueFrom = var.secrets_map["RESEND_API_KEY"] },
        { name = "RESEND_WEBHOOK_SIGNING_SECRET", valueFrom = var.secrets_map["RESEND_WEBHOOK_SIGNING_SECRET"] },
        { name = "SVIX_WEBHOOK_SECRET", valueFrom = var.secrets_map["SVIX_WEBHOOK_SECRET"] },
        { name = "ORBITOX_ADMIN_TOKEN", valueFrom = var.secrets_map["ORBITOX_ADMIN_TOKEN"] }
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
  execution_role_arn       = aws_iam_role.execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "worker-email"
      image     = var.web_image_digest
      essential = true
      command   = ["node", "scripts/start-outbox-worker.js"]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "ORBITOX_PLATFORM_REPOSITORY", value = "prisma" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.secrets_map["DATABASE_URL"] },
        { name = "OUTBOX_RELAY_DATABASE_URL", valueFrom = var.secrets_map["OUTBOX_RELAY_DATABASE_URL"] },
        { name = "RESEND_API_KEY", valueFrom = var.secrets_map["RESEND_API_KEY"] },
        { name = "RESEND_WEBHOOK_SIGNING_SECRET", valueFrom = var.secrets_map["RESEND_WEBHOOK_SIGNING_SECRET"] }
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
  execution_role_arn       = aws_iam_role.execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "worker-sweep"
      image     = var.web_image_digest
      essential = true
      command   = ["node", "-e", "import('./lib/billing-grace-sweep.js').then(m => m.sweepBillingGrace())"]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "ORBITOX_PLATFORM_REPOSITORY", value = "prisma" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.secrets_map["DATABASE_URL"] },
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
  execution_role_arn       = aws_iam_role.execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = "restaurant-os"
      image     = var.restaurant_os_image_digest
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "ORBITOX_CONTROL_PLANE_URL", value = var.public_base_url }
      ]
      secrets = [
        { name = "ORBITOX_BRIDGE_SECRET", valueFrom = var.secrets_map["ORBITOX_BRIDGE_SECRET"] },
        { name = "RAZORPAY_KEY_ID", valueFrom = var.secrets_map["RAZORPAY_KEY_ID"] },
        { name = "RAZORPAY_KEY_SECRET", valueFrom = var.secrets_map["RAZORPAY_KEY_SECRET"] }
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
        Resource = [aws_iam_role.execution_role.arn, aws_iam_role.task_role.arn]
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
