# USMax NDA Infrastructure

This directory contains Terraform configurations for deploying the USMax NDA application to AWS.

## Architecture Overview

See [docs/aws-infrastructure-architecture.md](../docs/aws-infrastructure-architecture.md) for the full architecture documentation.

## Directory Structure

```
infrastructure/
├── backend-bootstrap/       # One-time setup for Terraform state
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── modules/                 # Reusable Terraform modules
│   ├── vpc/                 # VPC, subnets, security groups, NAT
│   ├── rds/                 # RDS PostgreSQL
│   ├── s3/                  # S3 bucket for documents
│   ├── ecs/                 # ECS Fargate cluster and service
│   ├── alb/                 # Application Load Balancer
│   ├── cognito/             # Cognito User Pool
│   ├── iam/                 # IAM roles and policies
│   └── secrets/             # Secrets Manager and ECR
└── environments/            # Environment-specific configurations
    ├── demo/                # Barebones POC (~$9/mo)
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   ├── user-data.sh
    │   └── terraform.tfvars.example
    ├── nonprod/             # Development/UAT environment (~$41/mo)
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   └── terraform.tfvars.example
    └── prod/                # Production environment (~$164/mo)
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        └── terraform.tfvars.example
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5.0
3. **pnpm** for running database migrations

## Quick Start

### 1. Bootstrap Terraform Backend (One-Time)

```bash
cd infrastructure/backend-bootstrap
terraform init
terraform apply
```

This creates:
- S3 bucket for Terraform state
- DynamoDB table for state locking

### 2. Deploy NonProd Environment

```bash
cd infrastructure/environments/nonprod

# Copy and edit the example tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize and apply
terraform init
terraform plan
terraform apply
```

### 3. Deploy Production Environment

```bash
cd infrastructure/environments/prod

# Copy and edit the example tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize and apply
terraform init
terraform plan
terraform apply
```

### Quick Demo Deployment (~$9/mo)

For a quick POC/demo, use the barebones single-instance setup:

```bash
cd infrastructure/environments/demo

# Copy and edit the example tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars - you MUST set:
#   - key_pair_name (your EC2 key pair)
#   - db_password (a strong password)
#   - ssh_allowed_cidr (your IP address)

# Initialize and apply
terraform init
terraform plan
terraform apply
```

After deployment:
- SSH: `terraform output ssh_command`
- Check status: `terraform output status_command`
- View logs: `terraform output logs_command`
- Redeploy: `terraform output deploy_command`

**Demo environment includes:**
- Single t3.micro EC2 instance
- PostgreSQL running on the same instance
- Caddy for automatic HTTPS (Let's Encrypt or self-signed)
- Mock authentication (no Cognito required)

**What it lacks (not for production):**
- No high availability
- No automated backups
- No separate database
- No container orchestration

## Environment Differences

| Aspect | Demo | NonProd | Production |
|--------|------|---------|------------|
| Architecture | Single EC2 | ECS Fargate + RDS | ECS Fargate + RDS |
| Database | PostgreSQL on EC2 | RDS db.t3.micro | RDS db.t3.small, Multi-AZ |
| NAT | N/A (public subnet) | NAT Instance | NAT Gateway |
| Load Balancer | Caddy on EC2 | ALB | ALB |
| HTTPS | Let's Encrypt | ACM | ACM |
| Auth | Mock only | Cognito | Cognito |
| Autoscaling | N/A | Disabled | Enabled |
| Logs | journald | CloudWatch 7 days | CloudWatch 90 days |
| HA/Redundancy | None | Single-AZ | Multi-AZ |

## Cost Estimates (Base Infrastructure)

| Environment | Monthly Cost | Use Case |
|-------------|--------------|----------|
| Demo | ~$9 | Quick POC, demos |
| NonProd | ~$41 | Development, UAT |
| Production | ~$164 | Live system |

## Required GitHub Secrets

For CI/CD to work, configure these secrets in GitHub:

| Secret | Description | Environment |
|--------|-------------|-------------|
| `AWS_ROLE_ARN_NONPROD` | IAM role ARN for nonprod deployments | nonprod |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for prod deployments | prod |
| `DB_SECRET_ARN_NONPROD` | Secrets Manager ARN for DB credentials | nonprod |
| `DB_SECRET_ARN_PROD` | Secrets Manager ARN for DB credentials | prod |
| `APP_URL_NONPROD` | Application URL for health checks | nonprod |
| `APP_URL_PROD` | Application URL for health checks | prod |

## Post-Deployment Steps

### 1. Run Database Migrations

After deploying infrastructure, run migrations:

```bash
# Get DATABASE_URL from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id usmax-nda-nonprod-db-credentials \
  --query 'SecretString' \
  --output text | jq -r .database_url

# Run migrations
DATABASE_URL="..." pnpm db:migrate
```

### 2. Create Initial Admin User

```bash
# Using AWS CLI to create a Cognito user
aws cognito-idp admin-create-user \
  --user-pool-id <user-pool-id> \
  --username admin@usmax.com \
  --user-attributes Name=email,Value=admin@usmax.com Name=email_verified,Value=true \
  --temporary-password 'TempPassword123!'
```

### 3. Verify SES Email Identity

For production, verify your sending domain in SES:

```bash
aws ses verify-email-identity --email-address nda@usmax.com
```

## Terraform Commands Reference

```bash
# Initialize
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy (be careful!)
terraform destroy

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Show current state
terraform show

# List resources
terraform state list
```

## Troubleshooting

### "Error acquiring state lock"

If Terraform state is locked:

```bash
terraform force-unlock <LOCK_ID>
```

### "NAT Instance not starting"

Check the NAT Instance security group and ensure it allows outbound traffic.

### "ECS tasks failing health checks"

1. Check CloudWatch logs: `/ecs/usmax-nda-{env}`
2. Verify security groups allow ALB to reach ECS on port 3001
3. Check the `/api/health` endpoint is working

### "RDS connection refused"

1. Verify security groups allow ECS to reach RDS on port 5432
2. Check the DATABASE_URL in Secrets Manager
3. Ensure RDS is in the correct subnet group

## Security Notes

1. **Never commit `terraform.tfvars`** - contains sensitive values
2. **Use IAM roles** instead of access keys where possible
3. **Enable MFA** for AWS console access
4. **Review IAM policies** - follow least-privilege principle
5. **Encrypt everything** - RDS, S3, EBS volumes
