output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = module.alb.alb_dns_name
}

output "app_url" {
  description = "URL of the application"
  value       = module.alb.app_url
}

output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = module.rds.db_instance_endpoint
}

output "db_credentials_secret_arn" {
  description = "ARN of the DB credentials secret"
  value       = module.rds.db_credentials_secret_arn
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.secrets.ecr_repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "ID of the Cognito App Client"
  value       = module.cognito.client_id
}

output "s3_bucket_name" {
  description = "Name of the S3 documents bucket"
  value       = module.s3.documents_bucket_name
}

output "s3_replica_bucket_name" {
  description = "Name of the replica S3 documents bucket"
  value       = module.s3_replica.documents_bucket_name
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions role"
  value       = module.iam.github_actions_role_arn
}
