output "cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "The ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs.id
}

output "web_service_name" {
  description = "The name of the web ECS service"
  value       = aws_ecs_service.web.name
}

output "web_service_arn" {
  description = "The ARN of the web ECS service"
  value       = aws_ecs_service.web.id
}

output "migrate_task_definition_family" {
  description = "Family of the one-off DB migration task definition"
  value       = aws_ecs_task_definition.migrate.family
}

output "inventory_task_definition_family" {
  description = "Family of the one-off Step 1 inventory task definition"
  value       = aws_ecs_task_definition.inventory.family
}

output "task_role_arn" {
  description = "The ARN of the ECS task role"
  value       = aws_iam_role.task_role.arn
}

output "execution_role_arns" {
  description = "List of all ECS execution role ARNs"
  value = [
    aws_iam_role.web_execution_role.arn,
    aws_iam_role.email_execution_role.arn,
    aws_iam_role.sweep_execution_role.arn,
    aws_iam_role.migrate_execution_role.arn,
    aws_iam_role.inventory_execution_role.arn,
    aws_iam_role.restaurant_os_execution_role.arn
  ]
}
