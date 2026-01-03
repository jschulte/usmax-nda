# S3 Replica Module for USmax NDA Documents

# Replica bucket (destination for CRR)
resource "aws_s3_bucket" "replica" {
  bucket = "${var.project_name}-documents-${var.environment}-replica"

  tags = {
    Name = "${var.project_name}-documents-${var.environment}-replica"
  }
}

# Versioning (required for replication destination)
resource "aws_s3_bucket_versioning" "replica" {
  bucket = aws_s3_bucket.replica.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "replica" {
  bucket = aws_s3_bucket.replica.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "replica" {
  bucket = aws_s3_bucket.replica.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rules (match primary bucket)
resource "aws_s3_bucket_lifecycle_configuration" "replica" {
  bucket = aws_s3_bucket.replica.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 2190
      storage_class = "GLACIER"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
