variable "environment" {
  type        = string
  description = "Deployment environment name (e.g. staging, prod)"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for the ALB"
}

variable "domain_name" {
  type        = string
  description = "Primary domain name for the environment (e.g. staging.orbitox.io)"
  default     = "staging.orbitox.io"
}

variable "wildcard_domain_name" {
  type        = string
  description = "Wildcard domain name for multi-tenant subdomains"
  default     = "*.staging.orbitox.io"
}

variable "health_check_path" {
  type        = string
  description = "Health check endpoint on the target service"
  default     = "/health"
}

variable "target_port" {
  type        = number
  description = "Port on which the target container listens"
  default     = 3005
}

variable "rate_limit_requests" {
  type        = number
  description = "Maximum requests per 5-minute window per IP in WAF rate-limiting rule"
  default     = 2000
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all edge resources"
  default     = {}
}
