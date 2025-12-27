# GitHub Actions CI/CD Setup

This document explains how to enable automated deployments from GitHub Actions to the demo EC2 server.

## Overview

The deployment workflow uses **AWS Session Manager (SSM)** instead of SSH, which provides:
- ✅ No SSH keys to manage
- ✅ No open SSH ports required
- ✅ Secure IAM role-based authentication
- ✅ Audit trail in CloudTrail

## One-Time Setup

### 1. Apply Terraform Infrastructure

```bash
cd infrastructure/environments/demo
terraform apply
```

This creates:
- IAM OIDC provider for GitHub Actions (if needed)
- IAM role with deployment permissions
- Outputs the role ARN needed for GitHub

### 2. Add GitHub Secret

After Terraform apply, copy the role ARN:

```bash
terraform output github_actions_role_arn
```

Then add it as a GitHub repository secret:

```bash
# Option 1: Using GitHub CLI
gh secret set AWS_ROLE_ARN --body "arn:aws:iam::123456789012:role/usmax-nda-demo-github-actions"

# Option 2: Via GitHub UI
# Go to: Settings → Secrets and variables → Actions → New repository secret
# Name: AWS_ROLE_ARN
# Value: <paste the role ARN>
```

### 3. Test the Workflow

Push to main branch or manually trigger:

```bash
# Push commits triggers automatic deployment
git push origin main

# Or manually trigger
gh workflow run deploy-demo.yml
```

## How It Works

1. **Push to `main` branch** triggers the workflow
2. **GitHub Actions** authenticates to AWS using OIDC (no keys!)
3. **Finds EC2 instance** by IP address
4. **Deploys via SSM**:
   - Initializes git repo (if needed)
   - Pulls latest code from GitHub
   - Installs dependencies (`pnpm install`)
   - Generates Prisma client
   - Builds application (`pnpm build`)
   - Restarts service
   - Verifies health check
5. **Reports status** in GitHub Actions UI

## Workflow File

`.github/workflows/deploy-demo.yml`

Key features:
- Uses `aws-actions/configure-aws-credentials` with OIDC
- Auto-discovers EC2 instance ID
- Deploys via `aws ssm send-command`
- Comprehensive error handling and logging

## Troubleshooting

### Workflow fails with "Unable to assume role"

**Problem:** GitHub can't assume the IAM role.

**Solution:** Check that:
1. `AWS_ROLE_ARN` secret is set correctly
2. Trust policy in IAM role allows `repo:jschulte/usmax-nda:ref:refs/heads/main`
3. OIDC provider thumbprint is correct

### Deployment succeeds but health check fails

**Problem:** Application isn't starting properly.

**Solution:**
1. Check service logs: `sudo journalctl -u usmax-nda -n 100`
2. Verify environment variables in `/home/usmax/app/.env`
3. Check if port 3001 is in use: `netstat -tlnp | grep 3001`

### Instance not found

**Problem:** Workflow can't find EC2 instance by IP.

**Solution:** Verify the IP address in `.github/workflows/deploy-demo.yml` matches:
```bash
terraform output public_ip
```

## Security Notes

- **No secrets in code:** Role ARN is public info, not sensitive
- **Least privilege:** IAM role can only deploy to this specific instance
- **Audit trail:** All deployments logged in AWS CloudTrail
- **Branch protection:** Role only works from `main` branch
- **No credentials:** Uses temporary credentials via OIDC

## Monitoring

View deployment status:
- **GitHub Actions:** https://github.com/jschulte/usmax-nda/actions
- **SSM Commands:** AWS Console → Systems Manager → Run Command
- **Application Logs:** `ssh ec2-user@18.235.47.142` then `sudo journalctl -u usmax-nda -f`

## Manual Deployment

If GitHub Actions is unavailable, you can deploy manually:

```bash
./deploy.sh
```

This uses the same SSM commands but runs from your local machine.
