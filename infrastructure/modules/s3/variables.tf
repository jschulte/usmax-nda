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

variable "allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "vpc_endpoint_id" {
  description = "VPC endpoint ID to restrict bucket access (optional)"
  type        = string
  default     = null
}

variable "enable_access_logging" {
  description = "Enable S3 access logging"
  type        = bool
  default     = false
}
