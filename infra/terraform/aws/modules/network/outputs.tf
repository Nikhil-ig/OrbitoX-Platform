output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets (ALB only)"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets (ECS tasks & services)"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of IDs of database subnets (RDS PostgreSQL)"
  value       = aws_subnet.database[*].id
}

output "vpc_endpoint_security_group_id" {
  description = "Security group ID for VPC interface endpoints"
  value       = aws_security_group.vpc_endpoints.id
}
