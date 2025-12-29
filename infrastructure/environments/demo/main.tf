# Demo Environment - Barebones POC
# Single EC2 instance running everything: Node.js app + PostgreSQL + Caddy (HTTPS)
# Cost: ~$9/month (t3.micro)
#
# NOT FOR PRODUCTION USE - No HA, no backups, no security hardening

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Using local state for demo simplicity
  # For nonprod/prod, use S3 backend after running backend-bootstrap
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "usmax-nda"
      Environment = "demo"
      ManagedBy   = "terraform"
    }
  }
}

# Get latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# VPC - Use default VPC for simplicity
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group
resource "aws_security_group" "demo" {
  name_prefix = "usmax-nda-demo-"
  description = "Security group for USmax NDA demo instance"
  vpc_id      = data.aws_vpc.default.id

  # SSH (restrict to your IP in production)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidr
  }

  # HTTP (for Let's Encrypt validation)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "usmax-nda-demo-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# EC2 Instance
resource "aws_instance" "demo" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.demo.id]
  associate_public_ip_address = true
  key_name                    = var.key_pair_name
  iam_instance_profile        = aws_iam_instance_profile.demo.name

  root_block_device {
    volume_size           = 30  # AL2023 AMI requires >= 30GB
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    domain_name    = var.domain_name != null ? var.domain_name : ""
    admin_email    = var.admin_email
    db_password    = var.db_password
    app_repo       = var.app_repo
    cognito_region = var.aws_region
  }))

  tags = {
    Name = "usmax-nda-demo"
  }

  lifecycle {
    ignore_changes = [ami, user_data, iam_instance_profile]
  }

  depends_on = [aws_iam_instance_profile.demo]
}

# Elastic IP (so IP doesn't change on restart)
resource "aws_eip" "demo" {
  instance = aws_instance.demo.id
  domain   = "vpc"

  tags = {
    Name = "usmax-nda-demo-eip"
  }
}

# Route53 Record (optional)
resource "aws_route53_record" "demo" {
  count = var.route53_zone_id != null ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.demo.public_ip]
}

# CloudFront Distribution for HTTPS
resource "aws_cloudfront_distribution" "demo" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "USmax NDA Demo - HTTPS frontend"
  price_class         = "PriceClass_100"  # US, Canada, Europe only (cheapest)
  wait_for_deployment = false

  origin {
    # CloudFront requires domain name, not IP address
    # Use the public DNS of the Elastic IP
    domain_name = aws_eip.demo.public_dns
    origin_id   = "ec2-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"  # EC2 serves HTTP, CloudFront terminates HTTPS
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ec2-origin"

    forwarded_values {
      query_string = true
      headers      = ["*"]  # Forward all headers for auth cookies

      cookies {
        forward = "all"  # Forward all cookies for authentication
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0  # Don't cache by default (dynamic app)
    max_ttl                = 0
  }

  # Cache static assets longer
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ec2-origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400      # 1 day
    default_ttl            = 604800     # 1 week
    max_ttl                = 31536000   # 1 year
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true  # Use *.cloudfront.net certificate
  }

  tags = {
    Name = "usmax-nda-demo-cdn"
  }
}

# S3 Bucket for document storage
resource "aws_s3_bucket" "documents" {
  bucket = "usmax-nda-demo-documents-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "usmax-nda-demo-documents"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM Role for EC2 instance
resource "aws_iam_role" "demo" {
  name = "usmax-nda-demo-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "usmax-nda-demo-role"
  }
}

# IAM Policy for S3 access
resource "aws_iam_role_policy" "s3_access" {
  name = "usmax-nda-demo-s3-access"
  role = aws_iam_role.demo.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.documents.arn,
          "${aws_s3_bucket.documents.arn}/*"
        ]
      }
    ]
  })
}

# Attach SSM Managed Policy for Systems Manager access
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.demo.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "demo" {
  name = "usmax-nda-demo-instance-profile"
  role = aws_iam_role.demo.name
}
