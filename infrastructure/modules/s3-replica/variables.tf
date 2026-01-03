variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (nonprod, prod)"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption (uses AES256 if not specified)"
  type        = string
  default     = null
}
