output "app_secrets_arn" {
  description = "ARN of the app secrets"
  value       = aws_secretsmanager_secret.app.arn
}

output "app_secrets_name" {
  description = "Name of the app secrets"
  value       = aws_secretsmanager_secret.app.name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.main.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.main.arn
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.main.name
}
