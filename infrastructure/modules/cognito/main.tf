# Cognito Module for USmax NDA
# Based on existing infrastructure/cognito.tf

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # MFA configuration - REQUIRED for all users
  mfa_configuration = "ON"

  software_token_mfa_configuration {
    enabled = true
  }

  # Password policy - Strong requirements for government compliance
  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Advanced security
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # Schema attributes
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 5
      max_length = 254
    }
  }

  # User verification
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your USmax NDA verification code"
    email_message        = "Your verification code is {####}"
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = true

    invite_message_template {
      email_subject = "Your USmax NDA account has been created"
      email_message = "Your username is {username} and temporary password is {####}. Please log in and change your password."
      sms_message   = "Your username is {username} and temporary password is {####}"
    }
  }

  # Device tracking
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }

  # Prevent user existence errors
  lambda_config {}

  tags = {
    Name = "${var.project_name}-${var.environment}-user-pool"
  }
}

# App Client for SPA (no client secret)
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # SPA client - no secret
  generate_secret = false

  # Token validity
  access_token_validity  = 4  # hours
  id_token_validity      = 4  # hours
  refresh_token_validity = 30 # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # OAuth (if needed in future)
  supported_identity_providers = ["COGNITO"]

  # Read/write attributes
  read_attributes  = ["email", "email_verified", "name"]
  write_attributes = ["email", "name"]
}

# Store Cognito configuration in Secrets Manager
resource "aws_secretsmanager_secret" "cognito" {
  name_prefix = "${var.project_name}-${var.environment}-cognito-"
  description = "Cognito configuration for ${var.project_name} ${var.environment}"

  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-cognito-config"
  }
}

resource "aws_secretsmanager_secret_version" "cognito" {
  secret_id = aws_secretsmanager_secret.cognito.id
  secret_string = jsonencode({
    COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
    COGNITO_APP_CLIENT_ID  = aws_cognito_user_pool_client.main.id
    COGNITO_REGION         = var.aws_region
  })
}
