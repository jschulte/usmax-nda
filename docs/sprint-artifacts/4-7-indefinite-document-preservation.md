# Story 4.7: Indefinite Document Preservation

Status: ready-for-dev

## Story

As a **compliance officer**,
I want **all document versions preserved indefinitely**,
so that **we meet FAR retention requirements and never lose critical legal agreements**.

## Acceptance Criteria

### AC1: S3 Versioning for Preservation
**Given** Document uploaded to S3
**When** S3 versioning is enabled
**Then** Every version preserved (never overwritten)
**And** Previous versions accessible via S3 version ID

### AC2: Version Preservation on Re-Upload
**Given** User uploads new version of same filename
**When** Upload occurs
**Then** S3 creates new version (doesn't delete old)
**And** documents table creates new row (preserves metadata for both versions)

### AC3: Long-Term Retrievability
**Given** System runs for 5+ years
**When** Documents accumulate
**Then** All documents remain retrievable
**And** Optional: Documents >6 years old transition to Glacier (cost optimization)
**And** Glacier documents still downloadable (just slower retrieval)

### AC4: Multi-Region Disaster Recovery
**Given** Disaster recovery scenario
**When** us-east-1 region fails
**Then** All documents available from us-west-2 replica
**And** Zero data loss (multi-region CRR)

## Tasks / Subtasks

- [ ] **Task 1: S3 Bucket Configuration - Versioning** (AC: 1, 2)
  - [ ] 1.1: Enable S3 versioning on usmax-nda-documents bucket (us-east-1)
  - [ ] 1.2: Enable S3 versioning on replica bucket (us-west-2)
  - [ ] 1.3: Configure via Terraform/CloudFormation (infrastructure as code)
  - [ ] 1.4: Verify versioning enabled (test by uploading same filename twice)
  - [ ] 1.5: Document bucket configuration in infrastructure docs

- [ ] **Task 2: S3 Cross-Region Replication** (AC: 4)
  - [ ] 2.1: Configure CRR rule: us-east-1 → us-west-2
  - [ ] 2.2: Enable replication for all objects (prefix: ndas/)
  - [ ] 2.3: Replicate delete markers (preserve deletion history)
  - [ ] 2.4: Verify replication working (upload test file, check replica)
  - [ ] 2.5: Configure via Terraform/CloudFormation

- [ ] **Task 3: S3 Lifecycle Policy - Glacier Transition** (AC: 3)
  - [ ] 3.1: Create lifecycle policy for documents >6 years old
  - [ ] 3.2: Transition to GLACIER_IR (Instant Retrieval) or GLACIER
  - [ ] 3.3: Preserve all versions (apply to current + noncurrent versions)
  - [ ] 3.4: Test retrieval from Glacier (ensure downloads still work)
  - [ ] 3.5: Document cost impact (Glacier vs Standard storage)
  - [ ] 3.6: Make Glacier transition optional/configurable

- [ ] **Task 4: Application - No Deletion Logic** (AC: 1, 2, 3)
  - [ ] 4.1: Audit codebase for any document deletion logic
  - [ ] 4.2: Ensure no DELETE endpoints for documents
  - [ ] 4.3: Ensure no S3 DeleteObject commands in code
  - [ ] 4.4: Ensure Prisma onDelete: Cascade only for metadata (not S3 files)
  - [ ] 4.5: Add code comments: "Documents are never deleted per FAR retention"

- [ ] **Task 5: Multi-Region Failover Testing** (AC: 4)
  - [ ] 5.1: Extend s3Service to detect region failures
  - [ ] 5.2: Implement automatic failover: us-east-1 → us-west-2
  - [ ] 5.3: Test failover by temporarily blocking us-east-1 access
  - [ ] 5.4: Verify downloads work from replica region
  - [ ] 5.5: Log failover events to CloudWatch/Sentry

- [ ] **Task 6: Document Preservation Monitoring** (AC: 1, 3)
  - [ ] 6.1: Create CloudWatch metric for document count
  - [ ] 6.2: Create CloudWatch alert for CRR lag (replication delay)
  - [ ] 6.3: Create CloudWatch alert for versioning disabled
  - [ ] 6.4: Monthly report: total documents, storage used, Glacier transitions

- [ ] **Task 7: Disaster Recovery Procedure** (AC: 4)
  - [ ] 7.1: Document DR procedure in runbook
  - [ ] 7.2: Steps to switch to us-west-2 if us-east-1 fails
  - [ ] 7.3: Update DATABASE_URL and S3_REGION env vars
  - [ ] 7.4: Test DR procedure quarterly
  - [ ] 7.5: Verify zero data loss after failover

- [ ] **Task 8: Testing & Validation** (AC: All)
  - [ ] 8.1: Test S3 versioning (upload same filename twice, verify both versions exist)
  - [ ] 8.2: Test CRR (upload to us-east-1, verify replica in us-west-2)
  - [ ] 8.3: Test Glacier retrieval (if lifecycle policy implemented)
  - [ ] 8.4: Test multi-region failover logic
  - [ ] 8.5: Verify no deletion logic exists in application code

## Dev Notes

### S3 Versioning Configuration

**Terraform/CloudFormation:**
```hcl
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Replica bucket (us-west-2)
resource "aws_s3_bucket_versioning" "documents_replica" {
  provider = aws.west
  bucket   = aws_s3_bucket.documents_replica.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

**What Versioning Provides:**
- Every upload creates new version (version ID assigned)
- Previous versions accessible via version ID
- Delete markers created (soft delete)
- Can restore any version at any time
- Zero data loss from accidental overwrites

### Cross-Region Replication (CRR)

**Terraform Configuration:**
```hcl
resource "aws_s3_bucket_replication_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all-documents"
    status = "Enabled"

    filter {
      prefix = "ndas/" # Only replicate NDA documents
    }

    destination {
      bucket        = aws_s3_bucket.documents_replica.arn
      storage_class = "STANDARD"

      replication_time {
        status = "Enabled"
        time {
          minutes = 15 # S3 RTC - replicate within 15 minutes
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    delete_marker_replication {
      status = "Enabled" # Replicate deletions too
    }
  }
}
```

**IAM Role for CRR:**
```hcl
resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Principal = {
        Service = "s3.amazonaws.com"
      }
      Effect = "Allow"
    }]
  })
}

resource "aws_iam_role_policy" "replication" {
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.documents.arn
        Effect   = "Allow"
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl"
        ]
        Resource = "${aws_s3_bucket.documents.arn}/*"
        Effect   = "Allow"
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ]
        Resource = "${aws_s3_bucket.documents_replica.arn}/*"
        Effect   = "Allow"
      }
    ]
  })
}
```

### Lifecycle Policy for Glacier Transition

**Optional Cost Optimization:**
```hcl
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "transition-old-documents-to-glacier"
    status = "Enabled"

    filter {
      prefix = "ndas/"
    }

    # Transition current versions after 6 years
    transition {
      days          = 2190 # 6 years
      storage_class = "GLACIER_IR" # Instant Retrieval - still fast downloads
    }

    # Transition noncurrent versions after 6 years
    noncurrent_version_transition {
      noncurrent_days = 2190
      storage_class   = "GLACIER_IR"
    }
  }
}
```

**Glacier Retrieval:**
- GLACIER_IR: Millisecond retrieval (same as Standard)
- GLACIER: 1-5 hour retrieval (expedited/standard/bulk)
- Documents remain downloadable (pre-signed URLs work)
- Slightly higher per-request cost, lower storage cost

### Application Code - No Deletion

**Enforce Preservation:**
```typescript
// CRITICAL: Documents are NEVER deleted per FAR retention requirements

// ❌ FORBIDDEN - This code must NOT exist:
// await prisma.document.delete({ where: { id } });
// await s3Client.send(new DeleteObjectCommand({ ... }));

// ✅ ALLOWED - Soft delete via flag (if needed):
// await prisma.document.update({
//   where: { id },
//   data: { isArchived: true } // Metadata only, S3 file preserved
// });

// Note: Prisma onDelete: Cascade only deletes database rows, NOT S3 files
// S3 files are preserved indefinitely regardless of database state
```

**Code Audit:**
```bash
# Verify no deletion logic exists
grep -r "DeleteObject" src/server/
grep -r "document.delete" src/server/
grep -r "deleteDocument" src/server/

# All should return no results
```

### Multi-Region Failover Logic

**Enhanced from Story 4.3:**
```typescript
async function getDocumentWithFailover(s3Key: string, region: string = 'us-east-1') {
  const primaryRegion = region;
  const replicaRegion = region === 'us-east-1' ? 'us-west-2' : 'us-east-1';

  try {
    return await s3Client(primaryRegion).send(new GetObjectCommand({
      Bucket: getBucketForRegion(primaryRegion),
      Key: s3Key
    }));
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      // Object may not be replicated yet (< 15 min after upload)
      logger.warn('Object not found in primary, checking replica', { s3Key });
    }

    logger.info('Failing over to replica region', {
      from: primaryRegion,
      to: replicaRegion,
      s3Key
    });

    // Attempt replica
    return await s3Client(replicaRegion).send(new GetObjectCommand({
      Bucket: getBucketForRegion(replicaRegion),
      Key: s3Key
    }));
  }
}
```

### Disaster Recovery Scenario

**Primary Region Failure (us-east-1):**
1. Detection: CloudWatch alarm on S3 availability
2. Notification: Page on-call engineer
3. Failover: Update S3_PRIMARY_REGION env var to 'us-west-2'
4. Restart application to use replica bucket
5. All downloads now served from us-west-2
6. Zero data loss (CRR guarantees replication)

**Recovery Time Objective (RTO):**
- Manual failover: <1 hour (env var change + restart)
- Automatic failover: Immediate (application retries replica)

**Recovery Point Objective (RPO):**
- Zero data loss (synchronous CRR within 15 minutes)
- Recent uploads (<15 min) may need replica check

### Monitoring and Alerting

**CloudWatch Metrics:**
```typescript
// Track document preservation health
const metrics = [
  {
    name: 'DocumentCount',
    value: await prisma.document.count(),
    unit: 'Count'
  },
  {
    name: 'S3ReplicationLag',
    value: replicationMetrics.lag,
    unit: 'Seconds'
  },
  {
    name: 'S3VersioningEnabled',
    value: versioningConfig.status === 'Enabled' ? 1 : 0,
    unit: 'Count'
  }
];

await cloudWatch.putMetricData({ Namespace: 'USMax/Documents', MetricData: metrics });
```

**Alerts:**
- CRR lag > 30 minutes → Warning
- CRR lag > 2 hours → Critical
- Versioning disabled → Critical (immediate page)
- Document count decreasing → Investigate (should only increase)

### Cost Optimization Strategy

**Storage Tiers:**
- **Years 0-6:** S3 Standard (~$0.023/GB/month)
- **Years 6+:** S3 Glacier IR (~$0.004/GB/month) - 80% savings

**Expected Growth:**
```
10 NDAs/month × 5 documents/NDA × 1MB/doc = 50 MB/month
Annual: 600 MB/year
6 years: 3.6 GB
20 years: 12 GB

Cost (20 years):
- Standard (12GB): $2.76/month
- With Glacier (6GB Standard + 6GB Glacier): $1.38 + $0.24 = $1.62/month
- Savings: ~$1/month (~40% reduction)
```

**Conclusion:** Glacier transition optional - cost savings minimal for expected volume.

### Compliance Requirements

**FAR/DFARS Retention:**
- Federal contracts require indefinite retention of agreements
- No statute of limitations on contract disputes
- Must preserve all versions (revisions show negotiation history)
- Disaster recovery required (cannot lose documents)

**CMMC Level 1:**
- Encryption at rest (S3 SSE)
- Access control (pre-signed URLs only)
- Audit trail (all access logged)
- Multi-region redundancy

### Infrastructure as Code

**Terraform Module Structure:**
```
infrastructure/
├── modules/
│   └── s3-document-storage/
│       ├── main.tf          # Buckets, versioning, CRR
│       ├── lifecycle.tf     # Glacier transition rules
│       ├── iam.tf           # Replication role
│       ├── monitoring.tf    # CloudWatch alarms
│       └── outputs.tf       # Bucket names, ARNs
└── environments/
    ├── demo/
    │   └── main.tf          # Use s3-document-storage module
    └── prod/
        └── main.tf          # Use s3-document-storage module
```

### Application Code - Preservation Guarantees

**No Deletion Code:**
```typescript
// ✅ CORRECT - Create new document record, preserve all versions
async function uploadDocument(ndaId: string, file: File) {
  // S3 versioning ensures old version preserved
  const s3Key = `ndas/${ndaId}/${uuidv4()}-${file.name}`;
  await s3Service.uploadDocument(file, s3Key);

  // Database creates new row (doesn't UPDATE existing)
  const document = await prisma.document.create({
    data: { /* metadata */ }
  });

  return document;
}

// ❌ FORBIDDEN - Never delete documents
// async function deleteDocument(documentId: string) {
//   await prisma.document.delete({ where: { id: documentId } });
//   await s3Client.send(new DeleteObjectCommand({ ... })); // NEVER DO THIS
// }
```

**Soft Delete If Needed:**
```typescript
// If business requires "hiding" documents (not deletion):
async function archiveDocument(documentId: string, userId: string) {
  await prisma.document.update({
    where: { id: documentId },
    data: {
      isArchived: true, // Soft delete flag
      archivedBy: userId,
      archivedAt: new Date()
    }
  });

  // S3 file remains intact - only metadata updated
  // Document still retrievable by admin if needed
}
```

### Version Preservation Example

**Upload Workflow:**
```
1. Initial upload: NDA-TechCorp.pdf (S3 version ID: v1)
   - documents table: row 1 (version_number: 1)

2. User uploads revision: NDA-TechCorp.pdf (same filename)
   - S3 creates new version (version ID: v2)
   - S3 preserves v1 (accessible via version ID)
   - documents table: row 2 (version_number: 2)
   - Both rows point to same s3_key, different version IDs available

3. Five years later: Both versions still accessible
   - Database has both metadata rows
   - S3 has both versions
   - Pre-signed URLs work for both
```

### Testing Strategy

**Versioning Tests:**
1. Upload document with filename "test.pdf"
2. Upload again with same filename "test.pdf"
3. Verify 2 database rows exist
4. Verify 2 S3 versions exist (list-object-versions)
5. Verify both downloadable

**CRR Tests:**
1. Upload document to us-east-1
2. Wait 30 seconds (replication time)
3. Check us-west-2 bucket for replica
4. Verify replica has same version ID
5. Verify replica downloadable

**Failover Tests:**
1. Mock us-east-1 failure (return error)
2. Trigger download
3. Verify automatic failover to us-west-2
4. Verify download succeeds from replica

### Project Structure Notes

**Infrastructure Files:**
- `infrastructure/modules/s3-document-storage/` - NEW module
- `infrastructure/environments/demo/main.tf` - MODIFY (add S3 module)
- `infrastructure/environments/prod/main.tf` - MODIFY (add S3 module)

**Application Files:**
- No application code changes (infrastructure story)
- `src/server/services/s3Service.ts` - VERIFY failover logic exists
- `docs/runbooks/disaster-recovery.md` - NEW (DR procedures)

**Monitoring:**
- `.github/workflows/check-s3-versioning.yml` - NEW (weekly verification job)
- CloudWatch dashboard for document preservation metrics

### References

- [Source: docs/epics.md#Epic 4: Document Management & Execution - Story 4.7]
- [Source: docs/architecture.md#Document Storage Architecture - S3 Multi-Region]
- [Source: docs/architecture.md#Disaster Recovery]
- [Source: Story 4.1 - S3 storage foundation]
- [Source: Story 4.3 - Multi-region failover]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Infrastructure/compliance story for document preservation
- S3 versioning and CRR configuration requirements defined
- Disaster recovery procedures documented
- Cost optimization via Glacier transition analyzed
- Application code preservation guarantees established

### File List

Files to be created/modified during implementation:
- `infrastructure/modules/s3-document-storage/main.tf` - NEW (S3 buckets, versioning, CRR)
- `infrastructure/modules/s3-document-storage/lifecycle.tf` - NEW (Glacier transition)
- `infrastructure/modules/s3-document-storage/monitoring.tf` - NEW (CloudWatch alerts)
- `infrastructure/environments/demo/main.tf` - MODIFY (use S3 module)
- `docs/runbooks/disaster-recovery.md` - NEW (DR procedures)
- `.github/workflows/check-s3-versioning.yml` - NEW (weekly verification)
- Code audit for deletion logic - VERIFY none exists
