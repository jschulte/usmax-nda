variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "usmax-nda"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "replica_region" {
  description = "Replica AWS region for S3 failover"
  type        = string
  default     = "us-west-2"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of existing ACM certificate"
  type        = string
}

variable "frontend_url" {
  description = "URL of the frontend (for CORS)"
  type        = string
}

variable "ses_from_email" {
  description = "Email address for sending emails"
  type        = string
  default     = "nda@usmax.com"
}

variable "sentry_dsn" {
  description = "Sentry DSN for error reporting"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
}
