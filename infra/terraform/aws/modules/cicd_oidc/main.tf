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
# GitHub Actions Deployment Role (Zero Long-Lived Credentials - H2 Fix)
# Bounded strictly to repo + environment (repo:Nikhil-ig/OrbitoX-Platform:environment:staging)
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
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:${var.environment}"
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

# ─────────────────────────────────────────────────────────────
# Deploy Policy Scoped Strictly to Cluster, Services & Roles (M1 Fix)
# ─────────────────────────────────────────────────────────────

resource "aws_iam_policy" "deploy_permissions" {
  name        = "orbitox-${var.environment}-deploy-policy"
  description = "Scoped permissions for GitHub Actions staging deploy pipeline"

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
        Sid    = "ECSClusterAndServiceDeploy"
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:UpdateService"
        ]
        Resource = [
          var.web_service_arn
        ]
      },
      {
        Sid    = "ECSTaskOperations"
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RunTask"
        ]
        Resource = [
          var.cluster_arn,
          "arn:aws:ecs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:task-definition/orbitox-${var.environment}-*:*",
          "arn:aws:ecs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:task/orbitox-${var.environment}-cluster/*"
        ]
      },
      {
        Sid    = "IAMPassRoleToECS"
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = var.task_and_execution_role_arns
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
      {
        Sid    = "CloudWatchLogsTaskInspection"
        Effect = "Allow"
        Action = [
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/ecs/orbitox-${var.environment}-*:*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "deploy_attach" {
  role       = aws_iam_role.github_actions_deploy.name
  policy_arn = aws_iam_policy.deploy_permissions.arn
}
