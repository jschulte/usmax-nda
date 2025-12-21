output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.demo.id
}

output "public_ip" {
  description = "Public IP address (Elastic IP)"
  value       = aws_eip.demo.public_ip
}

output "public_dns" {
  description = "Public DNS name"
  value       = aws_eip.demo.public_dns
}

output "app_url" {
  description = "URL to access the application"
  value       = var.domain_name != null ? "https://${var.domain_name}" : "https://${aws_eip.demo.public_ip}"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_eip.demo.public_ip}"
}

output "deploy_command" {
  description = "Command to redeploy the application"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_eip.demo.public_ip} 'sudo -u usmax /home/usmax/deploy.sh'"
}

output "status_command" {
  description = "Command to check application status"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_eip.demo.public_ip} 'sudo -u usmax /home/usmax/status.sh'"
}

output "logs_command" {
  description = "Command to tail application logs"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_eip.demo.public_ip} 'sudo journalctl -u usmax-nda -f'"
}

output "estimated_monthly_cost" {
  description = "Estimated monthly cost"
  value       = var.instance_type == "t3.micro" ? "~$9/month" : "~$17/month (t3.small)"
}

output "cloudfront_url" {
  description = "CloudFront HTTPS URL for demo access"
  value       = "https://${aws_cloudfront_distribution.demo.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.demo.id
}

output "s3_bucket_name" {
  description = "S3 bucket for document storage"
  value       = aws_s3_bucket.documents.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.documents.arn
}

output "iam_instance_profile" {
  description = "IAM instance profile name"
  value       = aws_iam_instance_profile.demo.name
}
