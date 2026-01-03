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

variable "replica_bucket_arn" {
  description = "ARN of the replica S3 bucket (optional)"
  type        = string
  default     = null
}

variable "replica_bucket_region" {
  description = "Region of the replica bucket"
  type        = string
  default     = "us-west-2"
}
