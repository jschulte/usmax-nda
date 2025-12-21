variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (nonprod, prod)"
  type        = string
}

variable "secrets_arns" {
  description = "List of Secrets Manager secret ARNs the ECS task can read"
  type        = list(string)
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket for documents"
  type        = string
}

variable "ses_from_email" {
  description = "Email address used for sending emails via SES"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  type        = string
}

variable "enable_ecs_exec" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = false
}

variable "create_github_oidc" {
  description = "Create GitHub OIDC provider and role for CI/CD"
  type        = bool
  default     = true
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = ""
}

variable "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  type        = string
  default     = ""
}
