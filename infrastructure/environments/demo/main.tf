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
  description = "Security group for USMax NDA demo instance"
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
    ignore_changes = [ami, user_data]
  }
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
