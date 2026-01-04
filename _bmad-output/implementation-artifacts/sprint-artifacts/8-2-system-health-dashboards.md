# Story 8.2: System Health Dashboards

Status: ready-for-dev

## Story

As an **Admin**,
I want **real-time system health metrics and monitoring dashboards**,
So that **I can monitor uptime, performance, and resource usage to detect issues proactively**.

## Acceptance Criteria

**AC1: Health Dashboard Access and Display**
**Given** I have admin permissions
**When** I access the "System Health" dashboard via admin navigation
**Then** I see a comprehensive health overview with:
- System uptime percentage (current month + all-time)
- Error rate (errors per minute/hour with trend graph)
- API response times (p50, p95, p99 percentiles)
- Database performance metrics (query latency, connection pool status)
- Active user count (current sessions)
- Resource usage (CPU, memory, disk space percentages)
**And** all metrics display with visual indicators (green/yellow/red status)
**And** metrics update automatically without manual refresh

**AC2: Near Real-Time Metric Updates**
**Given** I'm viewing the health dashboard
**When** system metrics change
**Then** dashboard updates within 30 seconds without page reload
**And** I see a "Last Updated" timestamp for each metric section
**And** critical threshold breaches trigger visual alerts (red backgrounds, warning icons)
**And** I can manually trigger an immediate refresh via a "Refresh Now" button

**AC3: Error Rate Monitoring and Visualization**
**Given** the system is processing errors
**When** I view the error rate section
**Then** I see:
- Current error rate (errors per minute)
- Error rate trend graph (last 24 hours)
- Error breakdown by type (database, auth, validation, external service)
- Spike detection with timestamps
**And** clicking an error type navigates to filtered Sentry dashboard
**And** error rates use color coding (green <1/min, yellow 1-10/min, red >10/min)

**AC4: API Performance Monitoring**
**Given** the API is handling requests
**When** I view API performance metrics
**Then** I see:
- Average response time (all endpoints)
- Response time percentiles (p50, p95, p99)
- Slowest endpoints (top 5 with avg response time)
- Request rate (requests per second)
**And** response times use threshold indicators (green <500ms, yellow 500-2000ms, red >2000ms)
**And** clicking an endpoint shows detailed metrics for that route

**AC5: Database Performance and Health**
**Given** PostgreSQL is running
**When** I view database metrics
**Then** I see:
- Connection pool status (active/idle/max connections)
- Average query execution time
- Slow query count (queries >1 second)
- Database disk space usage percentage
**And** connection pool near capacity (>80%) shows warning
**And** disk space >90% shows critical alert
**And** metrics link to CloudWatch Logs for detailed query analysis

**AC6: Active Users and Sessions**
**Given** users are logged into the system
**When** I view active user metrics
**Then** I see:
- Current active session count
- Peak concurrent users (today)
- Session distribution graph (last 24 hours)
**And** clicking session count shows list of active users with login timestamps
**And** I can identify idle sessions (>30 min inactive)

**AC7: Resource Usage Monitoring**
**Given** the application is running on Lightsail
**When** I view resource usage
**Then** I see:
- CPU usage percentage (current + 24h trend)
- Memory usage percentage (current + 24h trend)
- Disk space usage (used/total GB + percentage)
- Network throughput (incoming/outgoing bandwidth)
**And** thresholds trigger warnings (CPU >80%, Memory >85%, Disk >90%)
**And** clicking a metric shows detailed CloudWatch metrics

## Tasks / Subtasks

⚠️ **DRAFT TASKS** - Generated from requirements analysis. Will be validated and refined against actual codebase when dev-story runs.

- [ ] Design System Health Dashboard UI (AC: 1-7)
  - [ ] Create admin-only route `/admin/system-health`
  - [ ] Design responsive dashboard layout with metric cards
  - [ ] Implement color-coded status indicators (green/yellow/red)
  - [ ] Add "Last Updated" timestamps to each metric section
  - [ ] Create "Refresh Now" button with loading state
  - [ ] Design metric trend graphs using lightweight charting library
- [ ] Implement CloudWatch Metrics Integration (AC: 1-7)
  - [ ] Set up CloudWatch SDK client for metrics retrieval
  - [ ] Create `cloudWatchService.ts` for metric queries
  - [ ] Implement functions: getErrorRate(), getAPIPerformance(), getDatabaseMetrics(), getResourceUsage()
  - [ ] Configure CloudWatch custom metrics for application-specific data (active users, session count)
  - [ ] Implement metric aggregation logic (p50/p95/p99 percentiles, averages, sums)
  - [ ] Add caching layer (Redis or in-memory) to prevent excessive CloudWatch API calls (30-second cache TTL)
- [ ] Create Health Dashboard API Endpoints (AC: 1-7)
  - [ ] `GET /api/admin/health/metrics` - Returns all health metrics (uptime, errors, performance, resources)
  - [ ] `GET /api/admin/health/errors` - Returns detailed error breakdown with types and trends
  - [ ] `GET /api/admin/health/api-performance` - Returns API performance metrics with slowest endpoints
  - [ ] `GET /api/admin/health/database` - Returns database performance and connection pool status
  - [ ] `GET /api/admin/health/active-users` - Returns current active sessions with user details
  - [ ] `GET /api/admin/health/resources` - Returns CPU, memory, disk, network usage
  - [ ] Add admin permission check middleware to all health endpoints
- [ ] Implement System Uptime Tracking (AC: 1)
  - [ ] Create `system_uptime` table or systemConfig entry for deployment timestamp
  - [ ] Calculate uptime based on: (current time - last deployment time) - (total downtime)
  - [ ] Implement downtime tracking via health check failures (store in database or CloudWatch)
  - [ ] Calculate uptime percentage: (uptime / total time) * 100
  - [ ] Display monthly uptime (current month) and all-time uptime
- [ ] Implement Error Rate Monitoring (AC: 3)
  - [ ] Query Sentry API for error counts grouped by time period (1min, 5min, 1hour)
  - [ ] Calculate errors per minute: total errors / minutes
  - [ ] Group errors by type (database, auth, validation, external service) via tags
  - [ ] Generate 24-hour trend data (array of { timestamp, errorCount } objects)
  - [ ] Detect spikes (error rate >3x average in last hour)
  - [ ] Store Sentry project URL for deep-link navigation
- [ ] Implement API Performance Monitoring (AC: 4)
  - [ ] Instrument Express middleware to log response times per endpoint
  - [ ] Store response times in CloudWatch Logs with structured JSON
  - [ ] Query CloudWatch Insights for: avg response time, p50/p95/p99 percentiles, request rate
  - [ ] Identify slowest endpoints (top 5 by average response time in last hour)
  - [ ] Implement color-coded thresholds (green <500ms, yellow 500-2000ms, red >2000ms)
- [ ] Implement Database Performance Monitoring (AC: 5)
  - [ ] Query Prisma connection pool status: activeConnections, idleConnections, maxConnections
  - [ ] Calculate average query execution time from CloudWatch Logs (Prisma query logs)
  - [ ] Count slow queries (execution time >1000ms) in last hour
  - [ ] Query Lightsail/RDS API for disk space usage (used GB / total GB * 100)
  - [ ] Implement warnings: connection pool >80%, disk space >90%
- [ ] Implement Active User Session Tracking (AC: 6)
  - [ ] Query `Contact` table for users with `lastActiveAt` within last 30 minutes
  - [ ] Count active sessions from Cognito or session store (if sessions tracked in DB)
  - [ ] Calculate peak concurrent users today (max activeSessionCount in systemConfig or CloudWatch)
  - [ ] Generate 24-hour session distribution graph (sessions per hour)
  - [ ] Implement "View Active Users" detail modal with user names and login times
- [ ] Implement Resource Usage Monitoring (AC: 7)
  - [ ] Query CloudWatch for Lightsail metrics: CPUUtilization, MemoryUtilization, DiskSpaceUsed, NetworkIn/Out
  - [ ] Retrieve current resource values and 24-hour trend data
  - [ ] Calculate percentages: (used / total) * 100
  - [ ] Implement threshold alerts: CPU >80%, Memory >85%, Disk >90%
  - [ ] Link to CloudWatch dashboard for detailed metric history
- [ ] Implement Near Real-Time Dashboard Updates (AC: 2)
  - [ ] Add frontend auto-refresh polling (every 30 seconds via setInterval)
  - [ ] Display "Last Updated: X seconds ago" timestamp
  - [ ] Implement "Refresh Now" button to force immediate update
  - [ ] Add loading spinners during metric refresh
  - [ ] Implement visual flash/animation when metrics update (e.g., brief highlight)
- [ ] Add Critical Threshold Alert System (AC: 2, 3, 5, 7)
  - [ ] Implement visual alerts: red background, warning icon, border highlight for breached thresholds
  - [ ] Define thresholds: Error rate >10/min, API response >2s, DB connections >80%, Disk >90%, CPU >80%, Memory >85%
  - [ ] Display alert message with specific threshold breach info
  - [ ] Optionally trigger email/Slack notification to admins (via Sentry/CloudWatch alarms)
- [ ] Add Tests for Health Dashboard (AC: 1-7)
  - [ ] Unit tests for cloudWatchService metric aggregation functions
  - [ ] Unit tests for health dashboard API endpoints (mock CloudWatch SDK)
  - [ ] Unit tests for threshold breach detection logic
  - [ ] Integration tests for `/api/admin/health/metrics` endpoint
  - [ ] Frontend component tests for health dashboard UI (metric cards, graphs, refresh button)
  - [ ] E2E tests for admin viewing health dashboard and clicking detailed metric links
- [ ] Document Health Dashboard Usage (AC: 1-7)
  - [ ] Update admin documentation with health dashboard location and features
  - [ ] Document metric definitions (what each metric measures, thresholds, color codes)
  - [ ] Document troubleshooting steps for common threshold breaches
  - [ ] Document how to set up CloudWatch custom metrics for new deployments
  - [ ] Add screenshots of health dashboard to README or docs

## Gap Analysis

_This section will be populated by dev-story when gap analysis runs._

**Note:** This story is primarily AWS infrastructure monitoring. CloudWatch metrics already exist for most infrastructure. Main development work is building the dashboard UI and API layer to query/aggregate CloudWatch data.

---

## Dev Notes

### Current Implementation Status

**Existing Infrastructure (Per Sprint Status & Architecture):**
- Sentry error tracking already integrated (Story 8.1, errorReportingService.ts)
- CloudWatch Logs operational for structured logging
- Lightsail instance metrics automatically collected by AWS CloudWatch
- No existing admin health dashboard UI or API endpoints

**Expected Workflow:**
1. Create CloudWatch service layer to query AWS metrics
2. Build admin API endpoints to aggregate health data
3. Design and implement admin health dashboard UI
4. Add near real-time updates with polling mechanism
5. Implement threshold-based alerts and color coding
6. Test with mock CloudWatch data and in staging environment

### Architecture Patterns

**Monitoring Stack (Architecture Decision):**
```
Frontend Dashboard → Backend API → CloudWatch SDK → AWS CloudWatch Metrics
                                 ↓
                            Sentry API → Error metrics
                                 ↓
                            Prisma → DB connection pool status
```

**Middleware Order (Critical for Security):**
```typescript
// Health endpoints require admin permission
app.use(authenticateJWT);    // ← Cognito JWT validation
app.use(attachUserContext);  // ← Load user from DB
app.use(checkPermissions('admin:*'));   // ← Admin only!
app.use(scopeToAgencies);    // ← Row-level security filter

// Health dashboard routes (admin only)
app.get('/api/admin/health/metrics', healthController.getMetrics);
```

**Caching Strategy:**
```typescript
// Cache CloudWatch queries to prevent rate limiting
const metricsCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCachedMetrics(key: string, fetcher: () => Promise<any>) {
  const cached = metricsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetcher();
  metricsCache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### Technical Requirements

**CloudWatch Metrics Integration (FR99):**
- **FR99:** System health dashboards showing uptime, error rates, performance metrics, resource usage

**Required CloudWatch Metrics:**
- **CPUUtilization:** Lightsail instance CPU usage (percentage)
- **MemoryUtilization:** Memory usage (percentage, requires CloudWatch agent)
- **DiskUsedPercent:** Disk space usage (percentage)
- **NetworkIn/NetworkOut:** Network throughput (bytes)
- **Custom Metrics:** Active users, session count, error rate (application-level)

**CloudWatch SDK Configuration:**
```typescript
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient, StartQueryCommand } from '@aws-sdk/client-cloudwatch-logs';

const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });
const logsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
```

**Sentry API Integration:**
```typescript
// Retrieve error metrics from Sentry API
const sentryApiUrl = `https://sentry.io/api/0/organizations/${orgSlug}/issues/`;
const sentryApiToken = process.env.SENTRY_AUTH_TOKEN;
// Query parameters: statsPeriod=24h, query=is:unresolved
```

**Dashboard Update Frequency:**
- Auto-refresh: Every 30 seconds (frontend polling)
- Manual refresh: Immediate on button click
- Cache TTL: 30 seconds (backend CloudWatch query cache)
- Real-time alerts: Via CloudWatch Alarms (not dashboard polling)

### Architecture Constraints

**Performance Optimization:**
- CloudWatch API calls are rate-limited (10 TPS for GetMetricStatistics)
- Implement 30-second cache to prevent excessive AWS API calls
- Aggregate multiple metrics in single API response (reduce HTTP requests)
- Use CloudWatch Insights for complex log queries (more efficient than filtering in app)

**Security Requirements:**
- Health dashboard is admin-only (checkPermissions('admin:*') middleware)
- Never expose AWS credentials to frontend
- CloudWatch SDK credentials from environment variables or IAM role
- Sentry API token stored in environment variables (never hardcoded)

**Cost Considerations:**
- CloudWatch API calls incur costs (~$0.01 per 1000 requests)
- CloudWatch Logs Insights queries cost ~$0.005 per GB scanned
- Implement caching to minimize API calls (estimated cost <$5/month)
- Use CloudWatch metric filters instead of querying all logs

### File Structure Requirements

**Backend Services:**
- `src/server/services/cloudWatchService.ts` - AWS CloudWatch integration (NEW)
- `src/server/services/healthDashboardService.ts` - Aggregate health metrics (NEW)
- `src/server/services/errorReportingService.ts` - Sentry integration (EXISTING)

**Backend Controllers:**
- `src/server/controllers/healthController.ts` - Health dashboard API handlers (NEW)

**Backend Routes:**
- `src/server/routes/adminRoutes.ts` - Admin-only routes (health dashboard endpoints) (UPDATE)

**Frontend Components:**
- `src/components/screens/admin/SystemHealthDashboard.tsx` - Main dashboard (NEW)
- `src/components/admin/MetricCard.tsx` - Reusable metric display component (NEW)
- `src/components/admin/TrendGraph.tsx` - Lightweight chart component (NEW)

**Tests:**
- `src/server/services/__tests__/cloudWatchService.test.ts` (NEW)
- `src/server/services/__tests__/healthDashboardService.test.ts` (NEW)
- `src/server/controllers/__tests__/healthController.test.ts` (NEW)
- `src/components/screens/admin/__tests__/SystemHealthDashboard.test.tsx` (NEW)

### Testing Requirements

**Unit Tests:**
- Test CloudWatch metric aggregation (p50/p95/p99 percentile calculations)
- Test error rate calculation from Sentry API response
- Test threshold breach detection logic (CPU >80%, errors >10/min, etc.)
- Test caching mechanism (cache hit/miss, TTL expiration)
- Mock CloudWatch SDK and Sentry API to avoid real API calls

**Integration Tests:**
- Test health dashboard API endpoints return expected metric structure
- Test admin permission enforcement (non-admin gets 403)
- Test metric cache invalidation after TTL
- Test "Refresh Now" clears cache and fetches fresh data

**Frontend Tests:**
- Test dashboard renders all metric cards
- Test auto-refresh polling (every 30 seconds)
- Test "Refresh Now" button triggers immediate update
- Test threshold color coding (green/yellow/red) applied correctly
- Test navigation to Sentry/CloudWatch dashboards

**Test Coverage Goal:**
- ≥80% coverage for cloudWatchService.ts
- ≥80% coverage for healthDashboardService.ts
- ≥80% coverage for healthController.ts
- 100% coverage for threshold detection logic (critical path)

### Previous Story Intelligence

**Related Prior Work:**
- Story 8.1 (Error Monitoring with Sentry) - errorReportingService.ts provides error tracking foundation
- Story 6.x (Audit & Compliance) - auditService.ts provides logging infrastructure
- CloudWatch Logs already configured for structured logging (Winston integration)

**Integration Points:**
- errorReportingService.ts: Query Sentry for error metrics
- auditService.ts: May provide audit event counts for activity metrics
- Prisma connection pool: Use prisma.$metrics() or query pool status for DB metrics

### Project Structure Notes

**Monitoring Architecture:**
- Three-tier monitoring: Sentry (errors) + CloudWatch (infrastructure) + Custom Metrics (application)
- Health dashboard aggregates all sources into single UI
- CloudWatch Alarms for proactive alerting (separate from dashboard)

**Dashboard Design Principles:**
- At-a-glance status indicators (green/yellow/red)
- Drill-down navigation to detailed metrics (click metric → CloudWatch/Sentry)
- Mobile-responsive layout (admin may check health from phone)
- Accessibility compliance (WCAG 2.1 AA, screen reader support)

**Code Conventions:**
- Use TypeScript strict mode for all new files
- CloudWatch SDK calls wrapped in try/catch with fallback values
- All percentages rounded to 1 decimal place for consistency
- Timestamps displayed in user's timezone (frontend conversion)

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics-backup-20251223-155341.md#Epic-8-Story-8.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Monitoring-Observability]
- [Source: _bmad-output/project-context.md#Error-Handling-Pattern]
- [Source: sprint-artifacts/sprint-status.yaml - Epic 8 comments]

**Functional Requirements:**
- FR99: System health dashboards with uptime, error rates, API performance, resource usage

**Non-Functional Requirements:**
- NFR-O1: All errors captured with stack traces (Sentry integration)
- NFR-O3: System health monitoring with real-time dashboards
- NFR-R2: 99.9% uptime target (tracked via health dashboard)

**Architecture Decisions:**
- CloudWatch for infrastructure metrics
- Sentry for application error tracking
- Winston for structured JSON logs
- Custom metrics for application-specific data (active users, sessions)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List
