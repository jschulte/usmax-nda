variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (nonprod, prod)"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito App Client ID"
  type        = string
}

variable "ses_from_email" {
  description = "Email address for sending emails"
  type        = string
}

variable "sentry_dsn" {
  description = "Sentry DSN for error reporting (optional)"
  type        = string
  default     = ""
}
