variable "environment" {
  type        = string
  description = "Deployment environment name (e.g. staging, prod)"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "database_subnet_ids" {
  type        = list(string)
  description = "List of database subnet IDs"
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security group ID of ECS tasks authorized to connect to RDS"
}

variable "instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t4g.medium"
}

variable "allocated_storage" {
  type        = number
  description = "Initial allocated storage in GB"
  default     = 50
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum allocated storage for autoscaling in GB"
  default     = 200
}

variable "backup_retention_period" {
  type        = number
  description = "Days of automated backups / PITR retention (7 for staging, 35 for prod)"
  default     = 7
}

variable "database_name" {
  type        = string
  description = "Name of the default PostgreSQL database"
  default     = "orbitox_staging"
}

variable "restaurant_os_database_name" {
  type        = string
  description = "Name of the RestaurantOS PostgreSQL database (isolated storage)"
  default     = "restaurant_os_staging"
}

variable "master_username" {
  type        = string
  description = "Master administrative username for RDS instance"
  default     = "orbitox_admin"
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all database resources"
  default     = {}
}
