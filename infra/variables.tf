variable "aws_region" {
  type        = string
  description = "AWS deployment region (India data residency for DPDP compliance)"
  default     = "ap-south-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment name (staging or prod)"
  default     = "staging"
}

variable "domain_name" {
  type        = string
  description = "Primary domain name for the environment"
  default     = "staging.orbitox.io"
}

variable "wildcard_domain_name" {
  type        = string
  description = "Wildcard domain name for multi-tenant tenant isolation"
  default     = "*.staging.orbitox.io"
}

variable "db_master_username" {
  type        = string
  description = "Master administrative username for RDS PostgreSQL 16"
  default     = "orbitox_admin"
}

variable "db_master_password" {
  type        = string
  description = "Master administrative password for RDS PostgreSQL 16"
  sensitive   = true
}

variable "web_image_digest" {
  type        = string
  description = "Immutable digest for the web image (repo@sha256:...)"
  default     = "public.ecr.aws/dummy/orbitox-web@sha256:0000000000000000000000000000000000000000000000000000000000000000"
}

variable "restaurant_os_image_digest" {
  type        = string
  description = "Immutable digest for the RestaurantOS image"
  default     = "public.ecr.aws/dummy/restaurant-os@sha256:0000000000000000000000000000000000000000000000000000000000000000"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all infrastructure resources"
  default = {
    Project     = "OrbitoX"
    ManagedBy   = "Terraform"
    Compliance  = "DPDP-India-2023"
  }
}
