# Nonprod Environment Configuration

project_name = "usmax-nda"
environment  = "nonprod"
aws_region   = "us-east-1"

# Frontend URL for CORS
frontend_url = "https://nda-dev.yourdomain.com"

# SES email (must be verified in SES)
ses_from_email = "nda@usmax.com"

# GitHub repository for OIDC (for CI/CD)
github_repo = "jschulte/usmax-nda"
