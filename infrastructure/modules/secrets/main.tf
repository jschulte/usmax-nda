# Secrets Module for USmax NDA
# Stores application secrets in AWS Secrets Manager

resource "aws_secretsmanager_secret" "app" {
  name_prefix = "${var.project_name}-${var.environment}-app-secrets-"
  description = "Application secrets for ${var.project_name} ${var.environment}"

  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-app-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    COGNITO_USER_POOL_ID  = var.cognito_user_pool_id
    COGNITO_APP_CLIENT_ID = var.cognito_client_id
    SES_FROM_EMAIL        = var.ses_from_email
    SENTRY_DSN            = var.sentry_dsn
  })
}

# ECR Repository
resource "aws_ecr_repository" "main" {
  name                 = "${var.project_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-ecr"
  }
}

# ECR Lifecycle Policy - keep last 10 images
resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
