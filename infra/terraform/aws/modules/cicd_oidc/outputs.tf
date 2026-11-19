output "github_actions_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions via OIDC"
  value       = aws_iam_role.github_actions_deploy.arn
}

output "ecr_web_repository_url" {
  description = "URL of the ECR repository for the web service"
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_restaurant_os_repository_url" {
  description = "URL of the ECR repository for the RestaurantOS service"
  value       = aws_ecr_repository.restaurant_os.repository_url
}
