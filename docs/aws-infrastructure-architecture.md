# USmax NDA Management System - AWS Infrastructure Architecture

**Version:** 1.0
**Date:** December 2024
**Author:** Infrastructure Planning
**Status:** Draft for Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Environment Strategy](#environment-strategy)
3. [High-Level Architecture](#high-level-architecture)
4. [Network Architecture](#network-architecture)
5. [Compute Architecture](#compute-architecture)
6. [Database Architecture](#database-architecture)
7. [Storage Architecture](#storage-architecture)
8. [Authentication & Authorization](#authentication--authorization)
9. [Email Services](#email-services)
10. [Monitoring & Observability](#monitoring--observability)
11. [Security Architecture](#security-architecture)
12. [CI/CD Pipeline](#cicd-pipeline)
13. [Cost Estimates](#cost-estimates)
14. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This document defines the AWS infrastructure architecture for the USmax NDA Management System, a government-grade application requiring CMMC Level 1 compliance. The architecture prioritizes:

- **Security First:** Defense-in-depth with encryption, MFA, and least-privilege access
- **Cost Optimization:** Right-sized resources with significant savings for non-production
- **High Availability:** Multi-AZ deployment for production workloads
- **Operational Excellence:** Infrastructure as Code (Terraform) with automated CI/CD

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Compute Platform | ECS Fargate | Serverless containers, no EC2 management overhead |
| Database | RDS PostgreSQL | Managed service, automated backups, encryption |
| Container Strategy | Single multi-stage Dockerfile | Unified build for frontend + backend |
| State Management | S3 + DynamoDB | Secure, locked Terraform state |
| Environments | 2 (nonprod, prod) | Simplified promotion path |

---

## Environment Strategy

```mermaid
flowchart LR
    subgraph "Developer Workstation"
        LOCAL[Local Development<br/>Mock Auth + Local PG]
    end

    subgraph "AWS - Your Account"
        NONPROD[NonProd Environment<br/>Development & UAT Testing]
    end

    subgraph "AWS - USmax Account"
        PROD[Production Environment<br/>Live System]
    end

    LOCAL -->|"git push"| GH[GitHub]
    GH -->|"CI/CD"| NONPROD
    GH -->|"Manual Approval"| PROD

    style LOCAL fill:#e1f5fe
    style NONPROD fill:#fff3e0
    style PROD fill:#e8f5e9
```

### Environment Comparison

| Aspect | NonProd | Production |
|--------|---------|------------|
| **AWS Account** | Your personal account | USmax account |
| **Purpose** | Development, testing, UAT demos | Live customer-facing system |
| **Availability** | Single-AZ (cost savings) | Multi-AZ (high availability) |
| **Database** | db.t3.micro, single instance | db.t3.small+, Multi-AZ |
| **Compute** | Fargate Spot (1 task) | Fargate On-Demand (2+ tasks) |
| **Backups** | 7-day retention | 30-day + cross-region copy |
| **Monitoring** | Basic CloudWatch | Enhanced + alarms + dashboards |
| **WAF** | Optional/disabled | Enabled with managed rules |
| **Cost Target** | ~$50-80/month | ~$200-400/month |

---

## High-Level Architecture

```mermaid
flowchart TB
    subgraph "Internet"
        USER[Users/Browsers]
        ADMIN[Administrators]
    end

    subgraph "Edge Layer"
        R53[Route 53<br/>DNS]
        WAF[AWS WAF<br/>Web Firewall]
        CF[CloudFront<br/>CDN - Optional]
    end

    subgraph "AWS VPC"
        subgraph "Public Subnets"
            ALB[Application Load Balancer<br/>HTTPS/443]
        end

        subgraph "Private Subnets - App Tier"
            ECS1[ECS Fargate Task 1<br/>Node.js App]
            ECS2[ECS Fargate Task 2<br/>Node.js App]
        end

        subgraph "Private Subnets - Data Tier"
            RDS[(RDS PostgreSQL<br/>Primary)]
            RDS_STANDBY[(RDS PostgreSQL<br/>Standby - Prod Only)]
        end
    end

    subgraph "AWS Managed Services"
        COGNITO[Cognito<br/>User Pool + MFA]
        S3[S3 Bucket<br/>Documents]
        SES[SES<br/>Email Sending]
        SECRETS[Secrets Manager<br/>Credentials]
        ECR[ECR<br/>Container Registry]
        CW[CloudWatch<br/>Logs + Metrics]
    end

    USER --> R53
    ADMIN --> R53
    R53 --> WAF
    WAF --> ALB
    ALB --> ECS1
    ALB --> ECS2
    ECS1 --> RDS
    ECS2 --> RDS
    ECS1 --> COGNITO
    ECS1 --> S3
    ECS1 --> SES
    ECS1 --> SECRETS
    ECS1 --> CW
    RDS -.->|"Sync - Prod Only"| RDS_STANDBY

    style ALB fill:#ff9800
    style RDS fill:#3f51b5
    style S3 fill:#4caf50
    style COGNITO fill:#9c27b0
```

---

## Network Architecture

### VPC Design

```mermaid
flowchart TB
    subgraph "VPC: 10.0.0.0/16"
        subgraph "Availability Zone A"
            PUB_A[Public Subnet A<br/>10.0.1.0/24<br/>ALB, NAT Gateway]
            PRIV_APP_A[Private Subnet A - App<br/>10.0.10.0/24<br/>ECS Tasks]
            PRIV_DB_A[Private Subnet A - DB<br/>10.0.20.0/24<br/>RDS Primary]
        end

        subgraph "Availability Zone B"
            PUB_B[Public Subnet B<br/>10.0.2.0/24<br/>ALB]
            PRIV_APP_B[Private Subnet B - App<br/>10.0.11.0/24<br/>ECS Tasks]
            PRIV_DB_B[Private Subnet B - DB<br/>10.0.21.0/24<br/>RDS Standby]
        end

        IGW[Internet Gateway]
        NAT[NAT Gateway<br/>or NAT Instance]
    end

    IGW --> PUB_A
    IGW --> PUB_B
    PUB_A --> NAT
    NAT --> PRIV_APP_A
    NAT --> PRIV_APP_B

    style PUB_A fill:#bbdefb
    style PUB_B fill:#bbdefb
    style PRIV_APP_A fill:#c8e6c9
    style PRIV_APP_B fill:#c8e6c9
    style PRIV_DB_A fill:#ffcdd2
    style PRIV_DB_B fill:#ffcdd2
```

### Subnet Specifications

| Subnet | CIDR | Type | Resources | AZ |
|--------|------|------|-----------|-----|
| public-a | 10.0.1.0/24 | Public | ALB, NAT Gateway | us-east-1a |
| public-b | 10.0.2.0/24 | Public | ALB | us-east-1b |
| private-app-a | 10.0.10.0/24 | Private | ECS Fargate tasks | us-east-1a |
| private-app-b | 10.0.11.0/24 | Private | ECS Fargate tasks | us-east-1b |
| private-db-a | 10.0.20.0/24 | Private | RDS Primary | us-east-1a |
| private-db-b | 10.0.21.0/24 | Private | RDS Standby | us-east-1b |

### Security Groups

```mermaid
flowchart LR
    INTERNET[Internet<br/>0.0.0.0/0] -->|"443/tcp"| SG_ALB

    subgraph "Security Groups"
        SG_ALB[sg-alb<br/>Ingress: 443 from 0.0.0.0/0]
        SG_ECS[sg-ecs<br/>Ingress: 3001 from sg-alb]
        SG_RDS[sg-rds<br/>Ingress: 5432 from sg-ecs]
    end

    SG_ALB -->|"3001/tcp"| SG_ECS
    SG_ECS -->|"5432/tcp"| SG_RDS

    style SG_ALB fill:#fff3e0
    style SG_ECS fill:#e8f5e9
    style SG_RDS fill:#e3f2fd
```

| Security Group | Inbound Rules | Outbound Rules |
|----------------|---------------|----------------|
| `sg-alb` | 443/tcp from 0.0.0.0/0 | All to VPC CIDR |
| `sg-ecs` | 3001/tcp from sg-alb | 443/tcp to 0.0.0.0/0 (AWS APIs), 5432/tcp to sg-rds |
| `sg-rds` | 5432/tcp from sg-ecs | None (stateful response) |

### NAT Strategy

| Environment | NAT Solution | Monthly Cost |
|-------------|--------------|--------------|
| NonProd | NAT Instance (t3.nano) | ~$3-5 |
| Production | NAT Gateway | ~$32-45 |

---

## Compute Architecture

### ECS Fargate Configuration

```mermaid
flowchart TB
    subgraph "ECS Cluster"
        SERVICE[ECS Service<br/>usmax-nda-service]

        subgraph "Task Definition"
            CONTAINER[Container: usmax-nda<br/>Port: 3001<br/>CPU: 256-512<br/>Memory: 512-1024 MB]
        end

        SERVICE --> TASK1[Fargate Task 1]
        SERVICE --> TASK2[Fargate Task 2<br/>Prod Only]

        TASK1 --> CONTAINER
        TASK2 --> CONTAINER
    end

    ECR[ECR Repository<br/>usmax-nda] --> CONTAINER
    SECRETS[Secrets Manager] --> CONTAINER

    style SERVICE fill:#ff9800
    style CONTAINER fill:#4caf50
```

### Task Definition Specifications

| Setting | NonProd | Production |
|---------|---------|------------|
| **CPU** | 256 units (0.25 vCPU) | 512 units (0.5 vCPU) |
| **Memory** | 512 MB | 1024 MB |
| **Desired Count** | 1 | 2 (minimum) |
| **Max Count** | 2 | 6 |
| **Capacity Provider** | FARGATE_SPOT | FARGATE |
| **Health Check Path** | /api/health | /api/health |
| **Health Check Interval** | 30s | 15s |

### Container Specifications

```dockerfile
# Multi-stage Dockerfile (to be created)
FROM node:20-alpine AS builder
# Build frontend (Vite) and backend (TypeScript)

FROM node:20-alpine AS runtime
# Production runtime with compiled assets
EXPOSE 3001
CMD ["node", "dist/server/index.js"]
```

| Container Property | Value |
|--------------------|-------|
| Base Image | node:20-alpine |
| Exposed Port | 3001 |
| Working Directory | /app |
| Node Environment | production |
| User | node (non-root) |

### Auto Scaling Policy (Production Only)

| Metric | Target | Scale Out | Scale In |
|--------|--------|-----------|----------|
| CPU Utilization | 70% | +1 task | -1 task |
| Memory Utilization | 80% | +1 task | -1 task |
| Request Count per Target | 1000/min | +1 task | -1 task |
| Cooldown | - | 60 seconds | 300 seconds |

---

## Database Architecture

### RDS PostgreSQL Configuration

```mermaid
flowchart TB
    subgraph "RDS Subnet Group"
        subgraph "AZ-A"
            PRIMARY[(RDS Primary<br/>db.t3.micro/small<br/>PostgreSQL 15)]
        end

        subgraph "AZ-B"
            STANDBY[(RDS Standby<br/>Prod Only<br/>Synchronous Replication)]
        end
    end

    PRIMARY -->|"Sync Replication<br/>Prod Only"| STANDBY

    BACKUP[Automated Backups<br/>S3 - Encrypted]
    SNAPSHOT[Manual Snapshots<br/>Cross-Region Copy - Prod]

    PRIMARY --> BACKUP
    PRIMARY --> SNAPSHOT

    style PRIMARY fill:#3f51b5,color:#fff
    style STANDBY fill:#7986cb,color:#fff
```

### RDS Specifications

| Setting | NonProd | Production |
|---------|---------|------------|
| **Engine** | PostgreSQL 15.x | PostgreSQL 15.x |
| **Instance Class** | db.t3.micro | db.t3.small (upgradable) |
| **vCPU** | 2 | 2 |
| **Memory** | 1 GB | 2 GB |
| **Storage Type** | gp3 | gp3 |
| **Allocated Storage** | 20 GB | 50 GB |
| **Max Storage (Autoscale)** | 50 GB | 200 GB |
| **Multi-AZ** | No | Yes |
| **Backup Retention** | 7 days | 30 days |
| **Backup Window** | 03:00-04:00 UTC | 03:00-04:00 UTC |
| **Maintenance Window** | Sun 04:00-05:00 UTC | Sun 04:00-05:00 UTC |
| **Deletion Protection** | No | Yes |
| **Performance Insights** | Disabled | Enabled (7 days) |
| **Encryption** | Yes (aws/rds key) | Yes (CMK) |
| **IAM Authentication** | Enabled | Enabled |

### Database Security

| Control | Implementation |
|---------|----------------|
| Network Isolation | Private subnet, sg-rds only allows sg-ecs |
| Encryption at Rest | AES-256, AWS KMS |
| Encryption in Transit | TLS 1.2+ enforced (rds.force_ssl=1) |
| Authentication | IAM DB Auth (no password in app) |
| Credentials | Secrets Manager, auto-rotation 30 days |
| Audit Logging | pgAudit extension enabled |

### Connection Pooling

The application uses PrismaClient with the `@prisma/adapter-pg` adapter which manages connection pooling. Additional configuration:

| Parameter | Value |
|-----------|-------|
| Pool Size | 10 connections |
| Connection Timeout | 30 seconds |
| Idle Timeout | 10 minutes |
| SSL Mode | require |

---

## Storage Architecture

### S3 Bucket Configuration

```mermaid
flowchart TB
    subgraph "S3 Bucket: usmax-nda-documents-{env}"
        ROOT["/"]
        NDAS["/ndas/{nda_id}/"]
        TEMPLATES["/templates/"]
        AUDIT["/audit-exports/"]
    end

    ROOT --> NDAS
    ROOT --> TEMPLATES
    ROOT --> AUDIT

    NDAS --> DOC1["doc-uuid-filename.pdf"]
    NDAS --> DOC2["doc-uuid-filename.docx"]

    LIFECYCLE[Lifecycle Policy<br/>IA after 90 days<br/>Glacier after 365 days]
    VERSIONING[Versioning Enabled]
    ENCRYPTION[SSE-S3 Encryption]

    ROOT --> LIFECYCLE
    ROOT --> VERSIONING
    ROOT --> ENCRYPTION

    style ROOT fill:#4caf50,color:#fff
```

### S3 Bucket Specifications

| Setting | NonProd | Production |
|---------|---------|------------|
| **Bucket Name** | usmax-nda-documents-nonprod | usmax-nda-documents-prod |
| **Versioning** | Enabled | Enabled |
| **Encryption** | SSE-S3 | SSE-KMS (CMK) |
| **Block Public Access** | All blocked | All blocked |
| **Object Lock** | Disabled | Governance mode (optional) |
| **Access Logging** | Disabled | Enabled (to audit bucket) |
| **Cross-Region Replication** | Disabled | Enabled (DR) |

### Lifecycle Rules

| Rule | Transition/Expiration |
|------|----------------------|
| Move to IA | 90 days after creation |
| Move to Glacier | 365 days after creation |
| Delete old versions | 730 days (2 years) |
| Abort incomplete uploads | 7 days |

### S3 Access Pattern

```mermaid
sequenceDiagram
    participant User
    participant App as ECS App
    participant S3

    User->>App: Request document download
    App->>App: Verify user permissions
    App->>S3: Generate pre-signed URL (15 min expiry)
    S3-->>App: Pre-signed URL
    App-->>User: Redirect to pre-signed URL
    User->>S3: Download via pre-signed URL
    S3-->>User: Document bytes (encrypted in transit)
```

---

## Authentication & Authorization

### Cognito User Pool Configuration

```mermaid
flowchart TB
    subgraph "AWS Cognito"
        UP[User Pool<br/>usmax-nda-{env}]

        subgraph "Authentication Flow"
            INIT[InitiateAuth<br/>USER_PASSWORD_AUTH]
            MFA[MFA Challenge<br/>SOFTWARE_TOKEN_MFA]
            TOKENS[JWT Tokens<br/>Access + ID + Refresh]
        end

        CLIENT[App Client<br/>SPA - No Secret]
    end

    UP --> CLIENT
    CLIENT --> INIT
    INIT --> MFA
    MFA --> TOKENS

    style UP fill:#9c27b0,color:#fff
    style MFA fill:#e91e63,color:#fff
```

### Cognito Specifications

| Setting | Value |
|---------|-------|
| **User Pool Name** | usmax-nda-{env} |
| **MFA** | Required (SOFTWARE_TOKEN_MFA) |
| **Password Policy** | 12+ chars, upper, lower, number, symbol |
| **Account Recovery** | Email only |
| **Email Verification** | Required |
| **Username Attributes** | Email |
| **Advanced Security** | Enforced mode |
| **Token Validity - Access** | 4 hours |
| **Token Validity - Refresh** | 30 days |
| **Token Validity - ID** | 4 hours |
| **Prevent User Existence Errors** | Enabled |

### Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant App as Express App
    participant Cognito
    participant DB as PostgreSQL

    User->>App: Login (email + password)
    App->>Cognito: InitiateAuth
    Cognito-->>App: MFA Challenge
    App-->>User: Request TOTP code
    User->>App: Submit TOTP
    App->>Cognito: RespondToAuthChallenge
    Cognito-->>App: JWT Tokens
    App->>App: Set HttpOnly cookies
    App-->>User: Login success

    Note over User,DB: Subsequent requests

    User->>App: API request + cookies
    App->>App: Validate JWT (authenticateJWT)
    App->>DB: Load user context (attachUserContext)
    App->>App: Check permissions (checkPermissions)
    App->>App: Scope to agencies (scopeToAgencies)
    App->>DB: Execute scoped query
    DB-->>App: Results
    App-->>User: Response
```

---

## Email Services

### SES Configuration

```mermaid
flowchart LR
    subgraph "Application"
        APP[ECS App]
        QUEUE[pg-boss Queue<br/>send-nda-email]
    end

    subgraph "AWS SES"
        SES[SES API<br/>us-east-1]
        DOMAIN[Verified Domain<br/>usmax.com or subdomain]
    end

    subgraph "Delivery"
        INBOX[Recipient Inbox]
        BOUNCE[Bounce Handling]
        COMPLAINT[Complaint Handling]
    end

    APP --> QUEUE
    QUEUE --> SES
    SES --> DOMAIN
    DOMAIN --> INBOX

    SES --> BOUNCE
    SES --> COMPLAINT
    BOUNCE --> SNS[SNS Topic]
    COMPLAINT --> SNS

    style SES fill:#ff5722,color:#fff
    style QUEUE fill:#2196f3,color:#fff
```

### SES Specifications

| Setting | NonProd | Production |
|---------|---------|------------|
| **Sending Mode** | Sandbox (limited) | Production (requested) |
| **Verified Identity** | Email address | Domain (usmax.com) |
| **DKIM** | Enabled | Enabled |
| **SPF** | Configured | Configured |
| **DMARC** | p=none | p=quarantine |
| **Sending Quota** | 200/day (sandbox) | 50,000/day (to be requested) |
| **Configuration Set** | usmax-nda-nonprod | usmax-nda-prod |
| **Bounce Handling** | Log to CloudWatch | SNS → Lambda → Update DB |
| **Complaint Handling** | Log to CloudWatch | SNS → Lambda → Alert |

### Email Queue (pg-boss)

| Setting | Value |
|---------|-------|
| Queue Name | send-nda-email |
| Retry Attempts | 3 |
| Retry Delay | Exponential (10s, 30s, 90s) |
| Job Timeout | 60 seconds |
| Retention | 30 days (completed jobs) |

---

## Monitoring & Observability

### CloudWatch Architecture

```mermaid
flowchart TB
    subgraph "Log Sources"
        ECS_LOGS[ECS Container Logs<br/>/ecs/usmax-nda]
        ALB_LOGS[ALB Access Logs<br/>S3 bucket]
        RDS_LOGS[RDS Logs<br/>PostgreSQL, Slow Query]
        FLOW_LOGS[VPC Flow Logs]
    end

    subgraph "CloudWatch"
        LOG_GROUPS[Log Groups]
        METRICS[Custom Metrics]
        ALARMS[CloudWatch Alarms]
        DASHBOARD[Dashboard]
    end

    subgraph "Alerting"
        SNS[SNS Topic]
        EMAIL[Email Notification]
        PAGER[PagerDuty - Prod Only]
    end

    ECS_LOGS --> LOG_GROUPS
    ALB_LOGS --> LOG_GROUPS
    RDS_LOGS --> LOG_GROUPS
    FLOW_LOGS --> LOG_GROUPS

    LOG_GROUPS --> METRICS
    METRICS --> ALARMS
    ALARMS --> SNS
    SNS --> EMAIL
    SNS --> PAGER

    METRICS --> DASHBOARD

    style ALARMS fill:#f44336,color:#fff
    style DASHBOARD fill:#2196f3,color:#fff
```

### CloudWatch Alarms

| Alarm | Metric | Threshold | Action |
|-------|--------|-----------|--------|
| High CPU | ECS CPUUtilization | > 80% for 5 min | SNS notification |
| High Memory | ECS MemoryUtilization | > 85% for 5 min | SNS notification |
| 5xx Errors | ALB HTTPCode_Target_5XX | > 10 in 5 min | SNS notification |
| Database Connections | RDS DatabaseConnections | > 80% max | SNS notification |
| Database CPU | RDS CPUUtilization | > 80% for 10 min | SNS notification |
| Free Storage | RDS FreeStorageSpace | < 5 GB | SNS notification |
| Unhealthy Targets | ALB UnHealthyHostCount | > 0 for 5 min | SNS notification |
| Email Bounce Rate | Custom | > 5% | SNS notification |

### Log Retention

| Log Group | NonProd | Production |
|-----------|---------|------------|
| /ecs/usmax-nda | 7 days | 90 days |
| /aws/rds/usmax-nda | 7 days | 90 days |
| /vpc/flowlogs | 3 days | 30 days |
| /aws/alb/usmax-nda | 7 days | 90 days |

### Application Metrics (Custom)

| Metric | Description |
|--------|-------------|
| nda.created | Count of NDAs created |
| nda.email_sent | Count of emails sent |
| nda.document_generated | Count of documents generated |
| auth.login_success | Successful logins |
| auth.login_failure | Failed login attempts |
| auth.mfa_challenge | MFA challenges issued |

---

## Security Architecture

### Defense in Depth

```mermaid
flowchart TB
    subgraph "Layer 1: Edge Protection"
        WAF[AWS WAF<br/>OWASP Rules, Rate Limiting]
        SHIELD[AWS Shield Standard<br/>DDoS Protection]
    end

    subgraph "Layer 2: Network Security"
        VPC[VPC Isolation]
        SG[Security Groups]
        NACL[Network ACLs]
        TLS[TLS 1.2+ Everywhere]
    end

    subgraph "Layer 3: Identity & Access"
        COGNITO[Cognito MFA]
        IAM[IAM Roles<br/>Least Privilege]
        RBAC[Application RBAC]
    end

    subgraph "Layer 4: Data Protection"
        S3_ENC[S3 SSE-KMS]
        RDS_ENC[RDS Encryption]
        SECRETS[Secrets Manager]
        TRANSIT[TLS in Transit]
    end

    subgraph "Layer 5: Logging & Monitoring"
        CLOUDTRAIL[CloudTrail]
        CLOUDWATCH[CloudWatch Logs]
        AUDIT[Application Audit Log]
        GUARDDUTY[GuardDuty - Prod]
    end

    WAF --> VPC
    VPC --> COGNITO
    COGNITO --> S3_ENC
    S3_ENC --> CLOUDTRAIL

    style WAF fill:#f44336,color:#fff
    style COGNITO fill:#9c27b0,color:#fff
    style S3_ENC fill:#4caf50,color:#fff
    style CLOUDTRAIL fill:#ff9800,color:#fff
```

### Security Controls Mapping (CMMC Level 1)

| CMMC Practice | Implementation |
|---------------|----------------|
| AC.1.001 - Limit system access | Cognito MFA, RBAC, agency scoping |
| AC.1.002 - Limit transaction types | Permission-based access control |
| AC.1.003 - Verify and control connections | VPC, Security Groups, TLS |
| AC.1.004 - Control public information | No public S3, private subnets |
| IA.1.076 - Identify users | Cognito User Pool, email verification |
| IA.1.077 - Authenticate users | MFA required, password policy |
| MP.1.118 - Sanitize media | S3 lifecycle policies, secure delete |
| PE.1.131 - Limit physical access | AWS manages physical security |
| SC.1.175 - Monitor communications | VPC Flow Logs, CloudWatch |
| SC.1.176 - Control public-facing systems | ALB + WAF, private app tier |
| SI.1.210 - Identify/report flaws | Sentry, CloudWatch Alarms |
| SI.1.211 - Update malicious code | Container scanning (ECR) |
| SI.1.212 - Update protection | Automated patching, managed services |
| SI.1.213 - Periodic scans | AWS Inspector (optional) |

### IAM Role Structure

```mermaid
flowchart TB
    subgraph "Service Roles"
        ECS_EXEC[ecs-task-execution-role<br/>Pull images, write logs]
        ECS_TASK[ecs-task-role<br/>App runtime permissions]
        RDS_MONITOR[rds-monitoring-role<br/>Enhanced monitoring]
    end

    subgraph "ECS Task Role Permissions"
        S3_ACCESS[S3: GetObject, PutObject<br/>usmax-nda-documents-*]
        SES_ACCESS[SES: SendRawEmail<br/>Verified identities only]
        SECRETS_ACCESS[SecretsManager: GetSecretValue<br/>usmax-nda/*]
        CW_ACCESS[CloudWatch: PutMetricData<br/>Custom metrics]
    end

    ECS_TASK --> S3_ACCESS
    ECS_TASK --> SES_ACCESS
    ECS_TASK --> SECRETS_ACCESS
    ECS_TASK --> CW_ACCESS

    style ECS_TASK fill:#ff9800,color:#fff
```

### WAF Rules (Production)

| Rule | Description | Action |
|------|-------------|--------|
| AWSManagedRulesCommonRuleSet | Common vulnerabilities (XSS, SQLi) | Block |
| AWSManagedRulesKnownBadInputsRuleSet | Known malicious inputs | Block |
| Rate Limit | 2000 requests/5 min per IP | Block |
| Geo Restriction | US only (optional) | Allow US, block others |

---

## CI/CD Pipeline

### GitHub Actions Workflow

```mermaid
flowchart LR
    subgraph "Trigger"
        PUSH[Push to main]
        PR[Pull Request]
        TAG[Release Tag]
    end

    subgraph "Build Stage"
        LINT[Lint & Type Check]
        TEST[Run Tests]
        BUILD[Build Docker Image]
        SCAN[Security Scan<br/>Trivy]
    end

    subgraph "Deploy Stage"
        ECR_PUSH[Push to ECR]
        DEPLOY_NP[Deploy to NonProd]
        APPROVAL[Manual Approval]
        DEPLOY_PROD[Deploy to Production]
    end

    PUSH --> LINT
    PR --> LINT
    TAG --> LINT

    LINT --> TEST
    TEST --> BUILD
    BUILD --> SCAN
    SCAN --> ECR_PUSH

    ECR_PUSH --> DEPLOY_NP
    DEPLOY_NP --> APPROVAL
    APPROVAL --> DEPLOY_PROD

    style APPROVAL fill:#ff9800,color:#fff
    style DEPLOY_PROD fill:#4caf50,color:#fff
```

### Workflow Files

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| ci.yml | Push, PR | Lint, test, type check |
| build.yml | Push to main | Build and push Docker image |
| deploy-nonprod.yml | Push to main | Auto-deploy to nonprod |
| deploy-prod.yml | Release tag | Deploy to prod (manual approval) |
| db-migrate.yml | Manual | Run database migrations |

### Deployment Strategy

| Environment | Strategy | Rollback |
|-------------|----------|----------|
| NonProd | Rolling update | Manual |
| Production | Blue/Green (ECS) | Automatic on health check failure |

---

## Cost Estimates

> **Note:** These estimates reflect **base infrastructure costs only** — the fixed hourly/monthly charges for running the services, assuming near-zero traffic and minimal storage. Actual costs may vary slightly based on region (us-east-1 assumed).

### NonProd Environment (Monthly) — Base Costs

| Service | Configuration | Hourly Rate | Monthly Base Cost |
|---------|---------------|-------------|-------------------|
| **ECS Fargate** | 1 task, 0.25 vCPU, 512 MB, **Spot** | ~$0.004 | **$3.00** |
| **RDS PostgreSQL** | db.t3.micro, 20 GB gp3, single-AZ | $0.017 + storage | **$15.00** |
| **NAT Instance** | t3.nano (instead of NAT Gateway) | $0.0052 | **$3.80** |
| **Application Load Balancer** | 1 ALB (base charge, no LCUs) | $0.0225 | **$16.43** |
| **S3** | <1 GB storage | $0.023/GB | **$0.02** |
| **ECR** | ~500 MB images | $0.10/GB | **$0.05** |
| **CloudWatch Logs** | Minimal ingestion, 7-day retention | per GB ingested | **$0.50** |
| **Secrets Manager** | 5 secrets | $0.40/secret | **$2.00** |
| **Route 53** | 1 hosted zone | $0.50/zone | **$0.50** |
| **Cognito** | <50K MAU (free tier) | $0 | **$0.00** |
| **SES** | Sandbox mode | $0 | **$0.00** |
| **Data Transfer** | Negligible | — | **$0.00** |
| | | | |
| **TOTAL** | | | **~$41/month** |

### Production Environment (Monthly) — Base Costs

| Service | Configuration | Hourly Rate | Monthly Base Cost |
|---------|---------------|-------------|-------------------|
| **ECS Fargate** | 2 tasks, 0.5 vCPU, 1 GB each, On-Demand | $0.031/task | **$45.00** |
| **RDS PostgreSQL** | db.t3.small, 50 GB gp3, **Multi-AZ** | $0.034 × 2 | **$52.00** |
| **NAT Gateway** | 1 NAT Gateway (base charge only) | $0.045 | **$32.85** |
| **Application Load Balancer** | 1 ALB (base charge, no LCUs) | $0.0225 | **$16.43** |
| **S3** | ~10 GB storage | $0.023/GB | **$0.23** |
| **ECR** | ~1 GB images | $0.10/GB | **$0.10** |
| **CloudWatch Logs** | Minimal ingestion, 90-day retention | per GB ingested | **$1.00** |
| **Secrets Manager** | 5 secrets | $0.40/secret | **$2.00** |
| **Route 53** | 1 hosted zone | $0.50/zone | **$0.50** |
| **Cognito** | <50K MAU (free tier) | $0 | **$0.00** |
| **SES** | Production (verified domain) | $0 base | **$0.00** |
| **WAF** | 1 Web ACL + 3 managed rule groups | $5 + $3×3 | **$14.00** |
| **Data Transfer** | Negligible | — | **$0.00** |
| | | | |
| **TOTAL** | | | **~$164/month** |

### Cost Breakdown Visualization

```
NonProd (~$41/mo)                    Production (~$164/mo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALB          ████████████ $16.43    RDS (M-AZ)  ████████████████ $52.00
RDS          ███████████  $15.00    Fargate     ██████████████   $45.00
NAT Instance ███          $3.80     NAT Gateway ██████████       $32.85
Fargate Spot ██           $3.00     ALB         █████            $16.43
Other        ██           $3.00     WAF         ████             $14.00
                                    Other       █                $3.83
```

### Why These Costs Are Fixed

| Service | Fixed Component | Variable Component (near-zero for us) |
|---------|-----------------|---------------------------------------|
| ALB | $16.43/mo base | LCU charges based on connections/bandwidth |
| NAT Gateway | $32.85/mo base | $0.045/GB data processed |
| RDS | Hourly instance + storage | IOPS, snapshots beyond retention |
| Fargate | vCPU-hour + GB-hour | Only pay for running tasks |
| S3 | $0.023/GB stored | PUT/GET requests, data transfer |
| CloudWatch | — | Per-GB log ingestion ($0.50/GB) |

### Cost Optimization Already Applied

| Optimization | NonProd | Production | Savings |
|--------------|---------|------------|---------|
| NAT Instance vs Gateway | ✅ $3.80 | ❌ $32.85 | $29/mo in nonprod |
| Fargate Spot | ✅ ~70% off | ❌ On-Demand | $6/mo in nonprod |
| Single-AZ RDS | ✅ | ❌ Multi-AZ | $26/mo in nonprod |
| WAF disabled | ✅ | ❌ Enabled | $14/mo in nonprod |

### Future Savings Opportunities

| Optimization | Potential Savings | When to Apply |
|--------------|-------------------|---------------|
| RDS Reserved Instance (1-yr) | ~35% on RDS ($18/mo prod) | After stable for 6+ months |
| Fargate Savings Plan (1-yr) | ~20% on Fargate ($9/mo prod) | After usage patterns known |
| Scheduled scaling (night off) | ~50% on Fargate | If 24/7 not required |

---

## Implementation Roadmap

### Phase 1: Foundation (Prerequisites)

```mermaid
gantt
    title Phase 1: Foundation
    dateFormat  YYYY-MM-DD
    section Bootstrap
    Terraform backend (S3 + DynamoDB)    :a1, 2024-01-01, 1d
    VPC + Subnets + Security Groups      :a2, after a1, 2d
    NAT Instance/Gateway                 :a3, after a2, 1d
    section Core Services
    RDS PostgreSQL                       :b1, after a3, 1d
    S3 Bucket                            :b2, after a3, 1d
    Secrets Manager                      :b3, after a3, 1d
```

**Deliverables:**
1. Terraform state backend configured
2. VPC with public/private subnets
3. RDS PostgreSQL running with initial schema
4. S3 bucket for documents
5. Secrets stored in Secrets Manager

### Phase 2: Application Deployment

```mermaid
gantt
    title Phase 2: Application Deployment
    dateFormat  YYYY-MM-DD
    section Containerization
    Dockerfile creation                  :c1, 2024-01-04, 1d
    ECR repository                       :c2, after c1, 1d
    Build and push image                 :c3, after c2, 1d
    section Compute
    ECS Cluster + Service                :d1, after c3, 1d
    ALB + Target Group                   :d2, after c3, 1d
    ACM Certificate                      :d3, after c3, 1d
    section Auth
    Cognito User Pool                    :e1, after d1, 1d
    SES Domain Verification              :e2, after d1, 2d
```

**Deliverables:**
1. Docker image in ECR
2. ECS service running
3. ALB with HTTPS
4. Cognito user pool configured
5. SES verified for sending

### Phase 3: Security & Monitoring

```mermaid
gantt
    title Phase 3: Security & Monitoring
    dateFormat  YYYY-MM-DD
    section Security
    WAF configuration                    :f1, 2024-01-08, 1d
    IAM roles fine-tuning                :f2, after f1, 1d
    Security review                      :f3, after f2, 1d
    section Monitoring
    CloudWatch dashboards                :g1, 2024-01-08, 1d
    CloudWatch alarms                    :g2, after g1, 1d
    Log configuration                    :g3, after g2, 1d
```

**Deliverables:**
1. WAF rules active
2. Least-privilege IAM policies
3. CloudWatch dashboard
4. Alerting configured

### Phase 4: CI/CD & Production

```mermaid
gantt
    title Phase 4: CI/CD & Production
    dateFormat  YYYY-MM-DD
    section CI/CD
    GitHub Actions workflows             :h1, 2024-01-11, 2d
    Database migration automation        :h2, after h1, 1d
    section Production
    Production environment terraform     :i1, after h2, 2d
    DNS and SSL for production           :i2, after i1, 1d
    Production deployment                :i3, after i2, 1d
    Go-live checklist                    :i4, after i3, 1d
```

**Deliverables:**
1. Automated CI/CD pipeline
2. Production environment deployed
3. Go-live documentation

---

## Appendix A: Terraform Module Structure

```
infrastructure/
├── README.md
├── backend-bootstrap/           # One-time setup
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── nat-instance.tf
│   ├── rds/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecs/
│   │   ├── main.tf
│   │   ├── task-definition.tf
│   │   ├── service.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── alb/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── s3/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── cognito/                 # Move existing cognito.tf here
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ses/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── iam/
│   │   ├── main.tf
│   │   ├── ecs-roles.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── cloudwatch/
│   │   ├── main.tf
│   │   ├── alarms.tf
│   │   ├── dashboard.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── secrets/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── waf/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/
    ├── nonprod/
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── terraform.tfvars
    │   ├── backend.tf
    │   └── outputs.tf
    └── prod/
        ├── main.tf
        ├── variables.tf
        ├── terraform.tfvars
        ├── backend.tf
        └── outputs.tf
```

---

## Appendix B: Environment Variables

### Application Environment Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `NODE_ENV` | production | Hardcoded in task definition |
| `PORT` | 3001 | Hardcoded in task definition |
| `DATABASE_URL` | PostgreSQL connection string | Secrets Manager |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID | Secrets Manager |
| `COGNITO_APP_CLIENT_ID` | Cognito App Client ID | Secrets Manager |
| `COGNITO_REGION` | us-east-1 | Hardcoded |
| `AWS_REGION` | us-east-1 | ECS metadata |
| `S3_BUCKET_NAME` | usmax-nda-documents-{env} | Environment variable |
| `SES_FROM_EMAIL` | nda@usmax.com | Secrets Manager |
| `SENTRY_DSN` | Sentry DSN (optional) | Secrets Manager |
| `FRONTEND_URL` | https://nda.usmax.com | Environment variable |

---

## Appendix C: DNS and SSL

### Domain Structure

| Domain | Environment | Purpose |
|--------|-------------|---------|
| nda-dev.yoursite.com | NonProd | Development testing |
| nda.usmax.com | Production | Customer-facing |

### SSL Certificate

- **Provider:** AWS Certificate Manager (ACM)
- **Validation:** DNS validation (auto-renewal)
- **Coverage:** Apex + wildcard (*.domain.com)

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | | | |
| Technical Reviewer | | | |
| Security Reviewer | | | |
| Project Owner | Jonah | | |
