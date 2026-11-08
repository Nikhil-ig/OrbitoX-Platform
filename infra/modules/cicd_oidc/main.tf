data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ─────────────────────────────────────────────────────────────
# ECR Repositories with Enhanced Vulnerability Scanning & Immutability
# ─────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "web" {
  name                 = "orbitox/${var.environment}/web"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecr-web"
    Environment = var.environment
  })
}

resource "aws_ecr_repository" "restaurant_os" {
  name                 = "orbitox/${var.environment}/restaurant-os"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-ecr-restaurant-os"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# GitHub Actions OpenID Connect (OIDC) Identity Provider
# ─────────────────────────────────────────────────────────────

# GitHub Actions OIDC thumbprints (official standard DigiCert CA root)
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c5824a67774c0b077e8019f326ec27ddd653441"]

  tags = merge(var.tags, {
    Name        = "github-actions-oidc"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────
# GitHub Actions Deployment Role (Zero Long-Lived Credentials)
# ─────────────────────────────────────────────────────────────

resource "aws_iam_role" "github_actions_deploy" {
  name = "orbitox-${var.environment}-github-actions-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "orbitox-${var.environment}-github-actions-deploy-role"
    Environment = var.environment
  })
}

resource "aws_iam_policy" "deploy_permissions" {
  name        = "orbitox-${var.environment}-deploy-policy"
  description = "Permissions for GitHub Actions to push images and update ECS services"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRPushPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = [
          aws_ecr_repository.web.arn,
          aws_ecr_repository.restaurant_os.arn
        ]
      },
      {
        Sid    = "ECSDeploy"
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:UpdateService",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RunTask"
        ]
        Resource = "*"
      },
      {
        Sid    = "IAMPassRole"
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/orbitox-${var.environment}-*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "deploy_attach" {
  role       = aws_iam_role.github_actions_deploy.name
  policy_arn = aws_iam_policy.deploy_permissions.arn
}
