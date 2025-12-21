output "alb_id" {
  description = "ID of the ALB"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB"
  value       = aws_lb.main.zone_id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.main.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = var.certificate_arn != null ? var.certificate_arn : (var.domain_name != null ? aws_acm_certificate.main[0].arn : null)
}

output "app_url" {
  description = "URL of the application"
  value       = var.domain_name != null ? "https://${var.domain_name}" : "https://${aws_lb.main.dns_name}"
}
