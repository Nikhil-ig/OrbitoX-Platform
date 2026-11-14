variable "environment" {
  type        = string
  description = "Deployment environment name (e.g. staging, prod)"
}

variable "github_repository" {
  type        = string
  description = "GitHub repository (owner/repo) allowed to assume deploy roles via OIDC"
  default     = "Nikhil-ig/OrbitoX-Platform"
}

variable "cluster_arn" {
  type        = string
  description = "ARN of the ECS Cluster"
}

variable "web_service_arn" {
  type        = string
  description = "ARN of the Web ECS Service"
}

variable "task_and_execution_role_arns" {
  type        = list(string)
  description = "List of task and execution role ARNs permitted for iam:PassRole"
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all CI/CD resources"
  default     = {}
}
