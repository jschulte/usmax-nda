output "documents_bucket_id" {
  description = "ID of the documents bucket"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "ARN of the documents bucket"
  value       = aws_s3_bucket.documents.arn
}

output "documents_bucket_name" {
  description = "Name of the documents bucket"
  value       = aws_s3_bucket.documents.bucket
}

output "documents_bucket_domain_name" {
  description = "Domain name of the documents bucket"
  value       = aws_s3_bucket.documents.bucket_domain_name
}

output "access_logs_bucket_id" {
  description = "ID of the access logs bucket"
  value       = var.enable_access_logging ? aws_s3_bucket.access_logs[0].id : null
}
