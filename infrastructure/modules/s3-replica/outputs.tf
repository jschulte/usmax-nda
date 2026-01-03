output "documents_bucket_id" {
  description = "ID of the replica documents bucket"
  value       = aws_s3_bucket.replica.id
}

output "documents_bucket_arn" {
  description = "ARN of the replica documents bucket"
  value       = aws_s3_bucket.replica.arn
}

output "documents_bucket_name" {
  description = "Name of the replica documents bucket"
  value       = aws_s3_bucket.replica.bucket
}
