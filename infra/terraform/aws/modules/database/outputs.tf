output "db_instance_id" {
  description = "The ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "The address of the RDS instance"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "The database port"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "The default database name"
  value       = aws_db_instance.main.db_name
}

output "master_user_secret_arn" {
  description = "The ARN of the master user secret managed by RDS in AWS Secrets Manager"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "restaurant_os_db_instance_id" {
  description = "The ID of the RestaurantOS RDS instance"
  value       = aws_db_instance.restaurant_os.id
}

output "restaurant_os_db_endpoint" {
  description = "The connection endpoint for the RestaurantOS RDS instance"
  value       = aws_db_instance.restaurant_os.endpoint
}

output "restaurant_os_db_name" {
  description = "The default database name for RestaurantOS"
  value       = aws_db_instance.restaurant_os.db_name
}

output "restaurant_os_master_user_secret_arn" {
  description = "The ARN of the RestaurantOS master user secret managed by RDS in AWS Secrets Manager"
  value       = aws_db_instance.restaurant_os.master_user_secret[0].secret_arn
}

output "db_security_group_id" {
  description = "The security group ID of the RDS database"
  value       = aws_security_group.rds.id
}

output "kms_key_arn" {
  description = "The ARN of the KMS key used for database encryption"
  value       = aws_kms_key.rds.arn
}
