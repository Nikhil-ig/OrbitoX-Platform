output "kms_key_arn" {
  description = "The ARN of the KMS key for secrets"
  value       = aws_kms_key.secrets.arn
}

output "kms_key_id" {
  description = "The ID of the KMS key for secrets"
  value       = aws_kms_key.secrets.key_id
}

output "secret_arns" {
  description = "Map of secret names to their ARNs"
  value       = { for k, v in aws_secretsmanager_secret.item : k => v.arn }
}
