# ─────────────────────────────────────────────────────────────
# Dedicated KMS CMK for AWS Secrets Manager Decryption
# ─────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_kms_key" "secrets" {
  description             = "KMS CMK for OrbitoX ${var.environment} Secrets Manager"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowSecretsManagerUsage"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-secrets-kms"
    Environment = var.environment
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/orbitox-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# ─────────────────────────────────────────────────────────────
# Granular Secrets (One Secret Per Sensitive Value - Phase 6F H1 Fix)
# ─────────────────────────────────────────────────────────────

locals {
  secret_names = [
    "MIGRATOR_DATABASE_URL",
    "APP_DATABASE_URL",
    "MAINTENANCE_DATABASE_URL",
    "OUTBOX_RELAY_DATABASE_URL",
    "PLATFORM_ADMIN_AUDIT_DATABASE_URL",
    "HMS_AUDIT_DATABASE_URL",
    "RESTAURANT_OS_DATABASE_URL",
    "SESSION_SECRET",
    "ORBITOX_ADMIN_TOKEN",
    "ORBITOX_RUNTIME_TOKEN",
    "ORBITOX_CONTROL_SECRET",
    "ORBITOX_GUEST_SECRET",
    "ORBITOX_SERVER_PEPPER",
    "ORBITOX_MFA_ENCRYPTION_KEY",
    "ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY",
    "ORBITOX_PHI_KEYS",
    "ORBITOX_PHI_INDEX_KEY",
    "ORBITOX_GRANT_SIGNING_KEYS",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "RESEND_API_KEY",
    "ORBITOX_EMAIL_WEBHOOK_SECRET",
    "ORBITOX_BRIDGE_KEYS",
    "ORBITOX_BRIDGE_ACTIVE_KID",
    "ORBITOX_GRANT_PUBLIC_KEYS",
    "db/orbitox_migrator",
    "db/orbitox_runtime",
    "db/orbitox_maintenance",
    "db/orbitox_outbox_relay",
    "db/orbitox_platform_admin_audit",
    "db/hms_audit_reader",
    "db/restaurantos_app"
  ]
}

resource "aws_secretsmanager_secret" "item" {
  for_each                = toset(local.secret_names)
  name                    = "orbitox/${var.environment}/${each.value}"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-${each.value}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}
