# USMax NDA Management System - AWS Cognito User Pool Configuration
# Story 1.1: AWS Cognito MFA Integration
#
# TODO: Deploy this Terraform configuration when ready for AWS infrastructure
# Prerequisites:
#   1. AWS CLI configured with appropriate credentials
#   2. Terraform installed (version >= 1.0)
#   3. S3 backend configured for state storage (see backend.tf)
#
# Deployment:
#   cd infrastructure
#   terraform init
#   terraform plan
#   terraform apply

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region for Cognito User Pool"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "usmax-nda"
}

# Optional: IAM role ARN for SMS MFA (required for SMS fallback)
variable "cognito_sms_role_arn" {
  description = "IAM role ARN for Cognito to send SMS (required for SMS MFA fallback)"
  type        = string
  default     = ""
}

# Cognito User Pool
# Satisfies: FR32 (MFA enforcement), Story 1.1 AC1-5
resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-${var.environment}"

  # Password Policy (Story 1.1, Subtask 1.3)
  # Min 12 chars, require uppercase, lowercase, number, special character
  password_policy {
    minimum_length                   = 12
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # MFA Configuration (Story 1.1, Subtask 1.2)
  # MFA is MANDATORY per FR32 - CMMC Level 1 compliance
  mfa_configuration = "ON"

  software_token_mfa_configuration {
    enabled = true  # TOTP authenticator apps (preferred)
  }

  # SMS MFA fallback (AC1)
  # NOTE: Requires cognito_sms_role_arn to be set for production
  dynamic "sms_configuration" {
    for_each = var.cognito_sms_role_arn != "" ? [1] : []
    content {
      external_id    = "${var.app_name}-${var.environment}"
      sns_caller_arn = var.cognito_sms_role_arn
    }
  }

  # Account Recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # User Attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true
  }

  # Email Configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Username Configuration - use email as username
  username_configuration {
    case_sensitive = false
  }

  auto_verified_attributes = ["email"]

  # Device Tracking
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }

  # Advanced Security (recommended for government apps)
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  tags = {
    Application = var.app_name
    Environment = var.environment
    Story       = "1-1-aws-cognito-mfa-integration"
    ManagedBy   = "Terraform"
  }
}

# Cognito User Pool Client (Story 1.1, Subtask 1.4)
# Public client for SPA - no client secret
resource "aws_cognito_user_pool_client" "spa" {
  name         = "${var.app_name}-spa-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # No client secret for SPA (public client)
  generate_secret = false

  # Token Validity (Story 1.1, Subtask 1.5)
  # Access token: 4 hours (per FR111-113)
  # Refresh token: 30 days
  access_token_validity  = 4      # hours
  id_token_validity      = 4      # hours
  refresh_token_validity = 30     # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Auth Flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # OAuth Configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Callback URLs (update for production)
  callback_urls = [
    "http://localhost:5173/callback",
    "https://${var.app_name}.usmax.com/callback"
  ]
  logout_urls = [
    "http://localhost:5173/login",
    "https://${var.app_name}.usmax.com/login"
  ]

  # Security
  prevent_user_existence_errors = "ENABLED"

  # Read/Write Attributes
  read_attributes  = ["email", "email_verified"]
  write_attributes = ["email"]
}

# Outputs (Story 1.1, Subtask 1.6)
# These values go into environment variables
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID - set as COGNITO_USER_POOL_ID env var"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_app_client_id" {
  description = "Cognito App Client ID - set as COGNITO_APP_CLIENT_ID env var"
  value       = aws_cognito_user_pool_client.spa.id
}

output "cognito_region" {
  description = "AWS Region - set as COGNITO_REGION env var"
  value       = var.aws_region
}

output "cognito_issuer" {
  description = "Cognito Issuer URL for JWT validation"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "cognito_jwks_uri" {
  description = "JWKS URI for JWT signature verification"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}/.well-known/jwks.json"
}
