# ─────────────────────────────────────────────────────────────
# Dedicated KMS CMK for RDS At-Rest Encryption & Performance Insights
# ─────────────────────────────────────────────────────────────

resource "aws_kms_key" "rds" {
  description             = "KMS CMK for OrbitoX ${var.environment} RDS PostgreSQL 16"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-rds-kms"
    Environment = var.environment
  })
}

resource "aws_kms_alias" "rds" {
  name          = "alias/orbitox-${var.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# ─────────────────────────────────────────────────────────────
# DB Subnet Group (Private Database Subnets Only)
# ─────────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "rds" {
  name        = "orbitox-${var.environment}-db-subnet-group"
  subnet_ids  = var.database_subnet_ids
  description = "Database subnet group for OrbitoX RDS PostgreSQL"

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-db-subnet-group"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# Security Group (Restricted to ECS Compute Tasks Only)
# ─────────────────────────────────────────────────────────────

resource "aws_security_group" "rds" {
  name        = "orbitox-${var.environment}-rds-sg"
  description = "Controls ingress access to RDS PostgreSQL from ECS compute tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from authorized ECS compute tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-rds-sg"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# DB Parameter Group: Enforces SSL (rds.force_ssl=1)
# ─────────────────────────────────────────────────────────────

resource "aws_db_parameter_group" "pg16" {
  name        = "orbitox-${var.environment}-pg16-params"
  family      = "postgres16"
  description = "Parameter group for OrbitoX PostgreSQL 16 with mandatory SSL"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-pg16-params"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# RDS PostgreSQL 16 Multi-AZ Instance (Control Plane)
# ─────────────────────────────────────────────────────────────

resource "aws_db_instance" "main" {
  identifier                  = "orbitox-${var.environment}-pg16"
  engine                      = "postgres"
  engine_version              = "16.4"
  instance_class              = var.instance_class
  multi_az                    = true
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                  = aws_kms_key.rds.arn

  db_name                     = var.database_name
  username                    = var.master_username
  manage_master_user_password = true
  port                        = 5432
  publicly_accessible         = false

  db_subnet_group_name        = aws_db_subnet_group.rds.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  parameter_group_name        = aws_db_parameter_group.pg16.name

  backup_retention_period     = var.backup_retention_period
  backup_window               = "18:00-19:00"
  maintenance_window          = "Sun:19:30-Sun:20:30"
  auto_minor_version_upgrade  = true
  deletion_protection         = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = aws_kms_key.rds.arn

  copy_tags_to_snapshot       = true
  skip_final_snapshot         = false
  final_snapshot_identifier   = "orbitox-${var.environment}-final-snapshot"

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-pg16"
    Environment = var.environment
    Service     = "control-plane"
  })
}

# ─────────────────────────────────────────────────────────────
# RDS PostgreSQL 16 Multi-AZ Instance (RestaurantOS - Isolated Storage)
# ─────────────────────────────────────────────────────────────

resource "aws_db_instance" "restaurant_os" {
  identifier                  = "orbitox-${var.environment}-restaurant-os-pg16"
  engine                      = "postgres"
  engine_version              = "16.4"
  instance_class              = var.instance_class
  multi_az                    = true
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                  = aws_kms_key.rds.arn

  db_name                     = var.restaurant_os_database_name
  username                    = "restaurant_os_admin"
  manage_master_user_password = true
  port                        = 5432
  publicly_accessible         = false

  db_subnet_group_name        = aws_db_subnet_group.rds.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  parameter_group_name        = aws_db_parameter_group.pg16.name

  backup_retention_period     = var.backup_retention_period
  backup_window               = "19:00-20:00"
  maintenance_window          = "Sun:20:30-Sun:21:30"
  auto_minor_version_upgrade  = true
  deletion_protection         = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = aws_kms_key.rds.arn

  copy_tags_to_snapshot       = true
  skip_final_snapshot         = false
  final_snapshot_identifier   = "orbitox-${var.environment}-restaurant-os-final-snapshot"

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-restaurant-os-pg16"
    Environment = var.environment
    Service     = "restaurant-os"
  })
}
