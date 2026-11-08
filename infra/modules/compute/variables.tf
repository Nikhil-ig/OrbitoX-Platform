variable "environment" {
  type        = string
  description = "Deployment environment name (e.g. staging, prod)"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for ECS tasks"
}

variable "alb_security_group_id" {
  type        = string
  description = "Security group ID of the Application Load Balancer"
}

variable "target_group_arn" {
  type        = string
  description = "ARN of the ALB target group for web service"
}

variable "secrets_map" {
  type        = map(string)
  description = "Map of secret names to their ARNs"
}

variable "secrets_kms_key_arn" {
  type        = string
  description = "ARN of KMS key used to encrypt Secrets Manager secrets"
}

variable "web_image_digest" {
  type        = string
  description = "Immutable digest for the web/control-plane image (e.g. repo@sha256:...)"
  default     = "public.ecr.aws/dummy/orbitox-web@sha256:0000000000000000000000000000000000000000000000000000000000000000"
}

variable "restaurant_os_image_digest" {
  type        = string
  description = "Immutable digest for the RestaurantOS image"
  default     = "public.ecr.aws/dummy/restaurant-os@sha256:0000000000000000000000000000000000000000000000000000000000000000"
}

variable "web_desired_count" {
  type        = number
  description = "Desired number of web service task instances"
  default     = 2
}

variable "web_cpu" {
  type        = number
  description = "Fargate CPU units for web task (1024 = 1 vCPU)"
  default     = 1024
}

variable "web_memory" {
  type        = number
  description = "Fargate memory for web task in MB"
  default     = 2048
}

variable "public_base_url" {
  type        = string
  description = "Public base URL for the application"
  default     = "https://staging.orbitox.io"
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all compute resources"
  default     = {}
}
