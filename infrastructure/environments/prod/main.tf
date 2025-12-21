# Production Environment Configuration
# High availability with Multi-AZ RDS, NAT Gateway, autoscaling

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket         = "usmax-nda-terraform-state"
    key            = "usmax-nda/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "usmax-nda-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  project_name = var.project_name
  environment  = var.environment
}

# VPC
module "vpc" {
  source = "../../modules/vpc"

  project_name             = local.project_name
  environment              = local.environment
  vpc_cidr                 = var.vpc_cidr
  use_nat_gateway          = true # NAT Gateway for HA
  enable_flow_logs         = true
  flow_logs_retention_days = 30
}

# RDS PostgreSQL
module "rds" {
  source = "../../modules/rds"

  project_name            = local.project_name
  environment             = local.environment
  subnet_ids              = module.vpc.private_db_subnet_ids
  security_group_id       = module.vpc.rds_security_group_id
  instance_class          = "db.t3.small"
  allocated_storage       = 50
  max_allocated_storage   = 200
  multi_az                = true # Multi-AZ for HA
  backup_retention_period = 30
}

# S3 Documents Bucket
module "s3" {
  source = "../../modules/s3"

  project_name          = local.project_name
  environment           = local.environment
  allowed_origins       = [var.frontend_url]
  enable_access_logging = true
}

# Cognito User Pool
module "cognito" {
  source = "../../modules/cognito"

  project_name = local.project_name
  environment  = local.environment
  aws_region   = var.aws_region
}

# Secrets and ECR
module "secrets" {
  source = "../../modules/secrets"

  project_name         = local.project_name
  environment          = local.environment
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.client_id
  ses_from_email       = var.ses_from_email
  sentry_dsn           = var.sentry_dsn
}

# IAM Roles
module "iam" {
  source = "../../modules/iam"

  project_name          = local.project_name
  environment           = local.environment
  secrets_arns          = [module.rds.db_credentials_secret_arn, module.secrets.app_secrets_arn]
  s3_bucket_arn         = module.s3.documents_bucket_arn
  ses_from_email        = var.ses_from_email
  cognito_user_pool_arn = module.cognito.user_pool_arn
  enable_ecs_exec       = false # Disabled for security in prod
  create_github_oidc    = true
  github_repo           = var.github_repo
  ecr_repository_arn    = module.secrets.ecr_repository_arn
}

# ALB
module "alb" {
  source = "../../modules/alb"

  project_name      = local.project_name
  environment       = local.environment
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.public_subnet_ids
  security_group_id = module.vpc.alb_security_group_id
  certificate_arn   = var.certificate_arn
  domain_name       = var.domain_name
  route53_zone_id   = var.route53_zone_id
}

# ECS Fargate
module "ecs" {
  source = "../../modules/ecs"

  project_name              = local.project_name
  environment               = local.environment
  aws_region                = var.aws_region
  subnet_ids                = module.vpc.private_app_subnet_ids
  security_group_id         = module.vpc.ecs_security_group_id
  execution_role_arn        = module.iam.ecs_execution_role_arn
  task_role_arn             = module.iam.ecs_task_role_arn
  container_image           = "${module.secrets.ecr_repository_url}:latest"
  cpu                       = 512
  memory                    = 1024
  desired_count             = 2
  max_count                 = 6
  target_group_arn          = module.alb.target_group_arn
  alb_listener_arn          = module.alb.https_listener_arn
  use_spot                  = false # On-demand for reliability
  enable_autoscaling        = true
  enable_execute_command    = false
  log_retention_days        = 90
  s3_bucket_name            = module.s3.documents_bucket_name
  frontend_url              = var.frontend_url
  db_credentials_secret_arn = module.rds.db_credentials_secret_arn
  app_secrets_arn           = module.secrets.app_secrets_arn
}

# WAF (optional but recommended for production)
# module "waf" {
#   source = "../../modules/waf"
#   ...
# }
