variable "environment" {
  type        = string
  description = "Deployment environment name (e.g. staging, prod)"
}

variable "task_execution_role_arn" {
  type        = string
  description = "ARN of the ECS task execution role authorized to read secrets"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all secrets resources"
  default     = {}
}
