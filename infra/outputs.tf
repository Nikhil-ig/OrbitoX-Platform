output "vpc_id" {
  description = "VPC ID"
  value       = module.network.vpc_id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL 16 connection endpoint"
  value       = module.database.db_endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL 16 hostname"
  value       = module.database.db_address
}

output "alb_dns_name" {
  description = "Public ALB DNS name"
  value       = module.edge.alb_dns_name
}

output "health_url" {
  description = "Staging health verification endpoint"
  value       = "https://${var.domain_name}/health"
}

output "ecr_web_repo" {
  description = "ECR repository URL for web container"
  value       = module.cicd_oidc.ecr_web_repository_url
}

output "ecr_restaurant_os_repo" {
  description = "ECR repository URL for RestaurantOS container"
  value       = module.cicd_oidc.ecr_restaurant_os_repository_url
}

output "github_actions_deploy_role_arn" {
  description = "OIDC IAM role for GitHub Actions automated deployments"
  value       = module.cicd_oidc.github_actions_role_arn
}

output "secrets_kms_key_arn" {
  description = "KMS CMK ARN for Secrets Manager decryption"
  value       = module.secrets.kms_key_arn
}

output "waf_web_acl_arn" {
  description = "WAFv2 WebACL ARN guarding the ALB"
  value       = module.edge.waf_web_acl_arn
}
