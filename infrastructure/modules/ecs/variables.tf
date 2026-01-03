variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (nonprod, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for ECS tasks"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
}

variable "container_image" {
  description = "Docker image for the container"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3001
}

variable "cpu" {
  description = "CPU units for the task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory for the task in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "max_count" {
  description = "Maximum number of tasks for autoscaling"
  type        = number
  default     = 2
}

variable "target_group_arn" {
  description = "ARN of the ALB target group"
  type        = string
}

variable "alb_listener_arn" {
  description = "ARN of the ALB listener (for dependency)"
  type        = string
}

variable "use_spot" {
  description = "Use Fargate Spot instances"
  type        = bool
  default     = false
}

variable "enable_autoscaling" {
  description = "Enable auto scaling"
  type        = bool
  default     = false
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 7
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for documents"
  type        = string
}

variable "s3_failover_bucket_name" {
  description = "Name of the S3 replica bucket for failover"
  type        = string
  default     = ""
}

variable "s3_failover_region" {
  description = "Region of the S3 replica bucket"
  type        = string
  default     = "us-west-2"
}

variable "frontend_url" {
  description = "URL of the frontend (for CORS)"
  type        = string
}

variable "db_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  type        = string
}

variable "app_secrets_arn" {
  description = "ARN of the Secrets Manager secret containing app secrets"
  type        = string
}
