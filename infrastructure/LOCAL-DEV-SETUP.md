# Local Development S3 Setup

This document describes the S3 bucket setup for local development and demo purposes.

## Bucket Created

**Bucket Name:** `usmax-nda-documents`
**Region:** `us-east-1`
**Created:** 2025-12-29
**Purpose:** Local development and demo

## Configuration

- ✅ **Versioning:** Enabled (preserve document history)
- ✅ **Encryption:** AES256 (server-side encryption)
- ✅ **Public Access:** Blocked (security best practice)
- ✅ **Region:** us-east-1 (matches application config)

## Setup Commands

```bash
# Create bucket
aws s3 mb s3://usmax-nda-documents --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket usmax-nda-documents \
  --region us-east-1 \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket usmax-nda-documents \
  --region us-east-1 \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket usmax-nda-documents \
  --region us-east-1 \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## Environment Variables

The application uses these environment variables for S3 access:

```bash
AWS_REGION=us-east-1
S3_BUCKET_NAME=usmax-nda-documents  # Optional - defaults to this value
```

## AWS Credentials

For local development, ensure AWS credentials are configured:

```bash
# Option 1: AWS CLI configured
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1

# Option 3: EC2 instance role (production/demo server)
# IAM role with S3 permissions attached to EC2 instance
```

## IAM Permissions Required

The application requires these S3 permissions:

- `s3:GetObject` - Download documents
- `s3:PutObject` - Upload/generate documents
- `s3:DeleteObject` - Delete documents
- `s3:ListBucket` - List bucket contents

## Verification

```bash
# List bucket contents
aws s3 ls s3://usmax-nda-documents --region us-east-1

# Check versioning status
aws s3api get-bucket-versioning --bucket usmax-nda-documents --region us-east-1

# Check encryption status
aws s3api get-bucket-encryption --bucket usmax-nda-documents --region us-east-1
```

## Cost Considerations

- **S3 Storage:** ~$0.023/GB/month (Standard)
- **Requests:** First 1M PUT/POST requests free per month
- **Data Transfer:** First 100GB out free per month
- **Estimated:** ~$1-5/month for development/demo

## Cleanup

To delete the bucket (WARNING: deletes all documents):

```bash
# Empty bucket first
aws s3 rm s3://usmax-nda-documents --recursive --region us-east-1

# Delete bucket
aws s3 rb s3://usmax-nda-documents --region us-east-1
```

## Production Deployment

For production deployment, use the Terraform configurations in:
- `infrastructure/environments/nonprod/` - Non-production environment
- `infrastructure/environments/prod/` - Production environment
- `infrastructure/modules/s3/` - S3 module with full compliance features

Production buckets use:
- KMS encryption (instead of AES256)
- VPC endpoint restrictions
- Access logging
- Compliance-grade lifecycle policies (6-year Glacier transition)
- Proper IAM role permissions

## Troubleshooting

**Error: "NoSuchBucket"**
- Verify bucket exists: `aws s3 ls s3://usmax-nda-documents`
- Check AWS credentials are configured
- Verify region is us-east-1

**Error: "Access Denied"**
- Check IAM permissions include s3:PutObject, s3:GetObject
- Verify AWS credentials are valid
- Check bucket policy doesn't restrict access

**Error: "Bucket name already exists"**
- S3 bucket names are globally unique
- Use environment variable S3_BUCKET_NAME to specify different name
- Or choose a unique name and update .env
