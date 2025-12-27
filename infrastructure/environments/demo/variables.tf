variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro" # ~$8.50/mo, or t3.small (~$17/mo) for more headroom
}

variable "key_pair_name" {
  description = "Name of existing EC2 key pair for SSH access"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "CIDR blocks allowed to SSH (recommend restricting to your IP)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # TODO: Restrict this to your IP
}

variable "domain_name" {
  description = "Domain name for the application (e.g., demo.yourdomain.com)"
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (optional, for automatic DNS)"
  type        = string
  default     = null
}

variable "admin_email" {
  description = "Admin email for Let's Encrypt notifications"
  type        = string
  default     = "admin@example.com"
}

variable "db_password" {
  description = "Password for PostgreSQL database"
  type        = string
  sensitive   = true
}

variable "app_repo" {
  description = "Git repository URL for the application"
  type        = string
  default     = "https://github.com/your-org/usmax-nda.git"
}

variable "create_github_oidc_provider" {
  description = "Whether to create the GitHub OIDC provider (only needed once per AWS account)"
  type        = bool
  default     = true
}
