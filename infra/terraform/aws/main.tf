terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ─────────────────────────────────────────────────────────────
  # Remote S3 Backend with State Locking (H3 Fix)
  # ─────────────────────────────────────────────────────────────
  backend "s3" {
    bucket         = "orbitox-staging-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "orbitox-staging-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.tags, {
      Environment = var.environment
    })
  }
}

# ─────────────────────────────────────────────────────────────
# 1. Network Module: VPC, Subnets across 2 AZs, Endpoints, NAT
# ─────────────────────────────────────────────────────────────

module "network" {
  source      = "./modules/network"
  environment = var.environment
  tags        = var.tags
}

# ─────────────────────────────────────────────────────────────
# 2. Secrets Module: AWS Secrets Manager (One secret per value)
# ─────────────────────────────────────────────────────────────

module "secrets" {
  source      = "./modules/secrets"
  environment = var.environment
  tags        = var.tags
}

# ─────────────────────────────────────────────────────────────
# 3. Edge Module: Public ALB, ACM Wildcard, TLS 1.2+, WAFv2
# ─────────────────────────────────────────────────────────────

module "edge" {
  source               = "./modules/edge"
  environment          = var.environment
  vpc_id               = module.network.vpc_id
  public_subnet_ids    = module.network.public_subnet_ids
  domain_name          = var.domain_name
  wildcard_domain_name = var.wildcard_domain_name
  health_check_path    = "/health"
  target_port          = 3005
  tags                 = var.tags
}

# ─────────────────────────────────────────────────────────────
# 4. Compute Module: ECS Fargate Services, IAM Least Privilege
# ─────────────────────────────────────────────────────────────

module "compute" {
  source                     = "./modules/compute"
  environment                = var.environment
  vpc_id                     = module.network.vpc_id
  private_subnet_ids         = module.network.private_subnet_ids
  alb_security_group_id      = module.edge.alb_security_group_id
  target_group_arn           = module.edge.target_group_arn
  secrets_map                = module.secrets.secret_arns
  secrets_kms_key_arn        = module.secrets.kms_key_arn
  web_image_digest           = var.web_image_digest
  restaurant_os_image_digest = var.restaurant_os_image_digest
  public_base_url            = "https://${var.domain_name}"
  tags                       = var.tags
}

# ─────────────────────────────────────────────────────────────
# 5. Database Module: RDS PostgreSQL 16 Multi-AZ (manage_master_user_password)
# ─────────────────────────────────────────────────────────────

module "database" {
  source                      = "./modules/database"
  environment                 = var.environment
  vpc_id                      = module.network.vpc_id
  database_subnet_ids         = module.network.database_subnet_ids
  ecs_security_group_id       = module.compute.ecs_security_group_id
  database_name               = "orbitox_${var.environment}"
  restaurant_os_database_name = "restaurant_os_${var.environment}"
  master_username             = var.db_master_username
  backup_retention_period     = var.environment == "staging" ? 7 : 35
  tags                        = var.tags
}

# ─────────────────────────────────────────────────────────────
# 6. CI/CD OIDC Module: GitHub Actions Deploy Role & ECR (Scoped M1/H2)
# ─────────────────────────────────────────────────────────────

module "cicd_oidc" {
  source                       = "./modules/cicd_oidc"
  environment                  = var.environment
  cluster_arn                  = module.compute.cluster_arn
  web_service_arn              = module.compute.web_service_arn
  task_and_execution_role_arns = concat(module.compute.execution_role_arns, [module.compute.task_role_arn])
  tags                         = var.tags
}
