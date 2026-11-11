output "alb_id" {
  description = "The ID of the ALB"
  value       = aws_lb.alb.id
}

output "alb_arn" {
  description = "The ARN of the ALB"
  value       = aws_lb.alb.arn
}

output "alb_dns_name" {
  description = "The DNS name of the ALB"
  value       = aws_lb.alb.dns_name
}

output "alb_zone_id" {
  description = "The canonical hosted zone ID of the load balancer (to be used in a Route 53 Alias record)"
  value       = aws_lb.alb.zone_id
}

output "alb_security_group_id" {
  description = "Security group ID for the ALB"
  value       = aws_security_group.alb.id
}

output "target_group_arn" {
  description = "ARN of the target group for web container traffic"
  value       = aws_lb_target_group.web.arn
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.cert.arn
}

output "acm_certificate_domain_validation_options" {
  description = "Domain validation options for DNS record creation"
  value       = aws_acm_certificate.cert.domain_validation_options
}

output "waf_web_acl_arn" {
  description = "ARN of the WAFv2 WebACL"
  value       = aws_wafv2_web_acl.main.arn
}
