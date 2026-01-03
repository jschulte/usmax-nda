# Story 5.12: Expiration Alerts

Status: ready-for-dev

## Story

As an **NDA User**,
I want **to be alerted when NDAs are approaching expiration**,
so that **I can take action before they expire**.

## Acceptance Criteria

### AC1: Expiration Alert Tiers
**Given** I am viewing the dashboard
**When** NDAs have expiration dates approaching
**Then** I see alerts for NDAs expiring within:
- 30 days (yellow warning)
- 60 days (informational)
- 90 days (early notice)

### AC2: Alert Display and Configuration
**And** alert thresholds are configurable by admins
**And** expired NDAs (past expiration date) are highlighted in red

## Tasks / Subtasks

- [ ] **Task 1: System Config - Expiration Thresholds** (AC: 1, 2)
  - [ ] 1.1: Add system_config entries for expiration tiers:
    - `expiration_alert_critical`: 30 (days)
    - `expiration_alert_warning`: 60 (days)
    - `expiration_alert_info`: 90 (days)
  - [ ] 1.2: Seed default threshold values
  - [ ] 1.3: Use systemConfigService from Story 5.4

- [ ] **Task 2: Dashboard Service - Expiration Queries** (AC: 1, 2)
  - [ ] 2.1: Create `getExpiringNdas(subagencyIds, thresholds)` function
  - [ ] 2.2: Query NDAs with effective_date within each threshold tier
  - [ ] 2.3: Calculate days until expiration for each
  - [ ] 2.4: Assign urgency level: critical (<30), high (<60), medium (<90)
  - [ ] 2.5: Query already expired NDAs (effective_date < today)
  - [ ] 2.6: Assign urgency: critical for expired
  - [ ] 2.7: Apply row-level security

- [ ] **Task 3: Expiring NDAs Query** (AC: 1)
  - [ ] 3.1: Query: effective_date BETWEEN today AND today + 90 days
  - [ ] 3.2: Filter: status NOT IN ('INACTIVE', 'CANCELLED', 'FULLY_EXECUTED')
  - [ ] 3.3: Calculate: daysUntilExpiration = DATEDIFF(effective_date, NOW())
  - [ ] 3.4: Categorize by threshold tier
  - [ ] 3.5: Order by effective_date ASC (soonest first)

- [ ] **Task 4: Expired NDAs Query** (AC: 2)
  - [ ] 4.1: Query: effective_date < today
  - [ ] 4.2: Filter: status NOT IN ('INACTIVE', 'CANCELLED')
  - [ ] 4.3: Calculate: daysExpired = DATEDIFF(NOW(), effective_date)
  - [ ] 4.4: Order by daysExpired DESC (most overdue first)
  - [ ] 4.5: Mark as critical urgency

- [ ] **Task 5: Dashboard Integration** (AC: 1, 2)
  - [ ] 5.1: Include expiring/expired NDAs in getItemsNeedingAttention()
  - [ ] 5.2: Combine with stale NDAs from Story 5.10
  - [ ] 5.3: Sort by urgency and days until expiration
  - [ ] 5.4: Display in AttentionItemsWidget

- [ ] **Task 6: Frontend - Expiration Indicator** (AC: 1, 2)
  - [ ] 6.1: Create ExpirationIndicator component
  - [ ] 6.2: Display: "Expiring in X days" or "Expired X days ago"
  - [ ] 6.3: Color by urgency:
    - Expired: red background, AlertTriangle icon
    - <30 days: yellow background, AlertCircle icon
    - <60 days: orange background, Info icon
    - <90 days: blue background, Calendar icon
  - [ ] 6.4: Show in dashboard attention items

- [ ] **Task 7: Frontend - NDA List Expiration Column** (AC: 1, 2)
  - [ ] 7.1: Add "Expiration" column to NDA list (optional, can be hidden)
  - [ ] 7.2: Display effective_date
  - [ ] 7.3: If expiring soon or expired, show badge with days count
  - [ ] 7.4: Color code: red for expired, yellow/orange for expiring soon

- [ ] **Task 8: Admin - Configure Thresholds** (AC: 2)
  - [ ] 8.1: Add expiration threshold configuration to admin settings
  - [ ] 8.2: Allow editing: critical (30d), warning (60d), info (90d) thresholds
  - [ ] 8.3: Validate: critical < warning < info
  - [ ] 8.4: Save to system_config table
  - [ ] 8.5: Clear cache on update

- [ ] **Task 9: Testing** (AC: All)
  - [ ] 9.1: Unit tests for getExpiringNdas() with different thresholds
  - [ ] 9.2: Unit tests for expired NDA detection
  - [ ] 9.3: Unit tests for days until expiration calculation
  - [ ] 9.4: API tests for expiration alerts
  - [ ] 9.5: Component tests for ExpirationIndicator

## Dev Notes

### Expiration Alert Implementation

**Tiered Alert Queries:**
```typescript
interface ExpirationThresholds {
  critical: number; // 30 days
  warning: number;  // 60 days
  info: number;     // 90 days
}

async function getExpiringNdas(
  subagencyIds: string[],
  thresholds: ExpirationThresholds
): Promise<ExpiringNda[]> {
  const today = startOfDay(new Date());
  const criticalDate = addDays(today, thresholds.critical);
  const warningDate = addDays(today, thresholds.warning);
  const infoDate = addDays(today, thresholds.info);

  // Query NDAs expiring within max threshold
  const expiringNdas = await prisma.nda.findMany({
    where: {
      subagencyId: { in: subagencyIds },
      status: { notIn: ['INACTIVE', 'CANCELLED', 'FULLY_EXECUTED'] },
      effectiveDate: {
        gte: today,
        lte: infoDate
      }
    },
    include: {
      subagency: { include: { agencyGroup: true } }
    },
    orderBy: { effectiveDate: 'asc' }
  });

  // Also query expired NDAs
  const expiredNdas = await prisma.nda.findMany({
    where: {
      subagencyId: { in: subagencyIds },
      status: { notIn: ['INACTIVE', 'CANCELLED'] },
      effectiveDate: { lt: today }
    },
    include: {
      subagency: { include: { agencyGroup: true } }
    },
    orderBy: { effectiveDate: 'desc' }
  });

  // Calculate days and assign urgency
  const results: ExpiringNda[] = [];

  expiredNdas.forEach(nda => {
    const daysExpired = differenceInDays(today, nda.effectiveDate);
    results.push({
      nda,
      daysUntilExpiration: -daysExpired, // Negative for expired
      isExpired: true,
      urgency: 'critical',
      alertTier: 'expired'
    });
  });

  expiringNdas.forEach(nda => {
    const daysUntil = differenceInDays(nda.effectiveDate, today);
    let urgency: UrgencyLevel;
    let alertTier: string;

    if (daysUntil <= thresholds.critical) {
      urgency = 'critical';
      alertTier = '30-day';
    } else if (daysUntil <= thresholds.warning) {
      urgency = 'high';
      alertTier = '60-day';
    } else {
      urgency = 'medium';
      alertTier = '90-day';
    }

    results.push({
      nda,
      daysUntilExpiration: daysUntil,
      isExpired: false,
      urgency,
      alertTier
    });
  });

  return results.sort((a, b) => {
    // Expired first, then by days until expiration
    if (a.isExpired !== b.isExpired) return a.isExpired ? -1 : 1;
    return a.daysUntilExpiration - b.daysUntilExpiration;
  });
}
```

### Frontend Expiration Indicator

**Component:**
```tsx
import { AlertTriangle, AlertCircle, Info, Calendar } from 'lucide-react';

interface ExpirationIndicatorProps {
  daysUntilExpiration: number;
  effectiveDate: Date;
  isExpired: boolean;
}

function ExpirationIndicator({ daysUntilExpiration, effectiveDate, isExpired }: ExpirationIndicatorProps) {
  if (isExpired) {
    const daysOverdue = Math.abs(daysUntilExpiration);
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-800 border border-red-300">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Expired {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} ago
        </span>
      </div>
    );
  }

  // Expiring soon
  const config = {
    critical: { color: 'yellow', icon: AlertCircle, label: 'Expires soon' },
    high: { color: 'orange', icon: Info, label: 'Expiring' },
    medium: { color: 'blue', icon: Calendar, label: 'Expiring' }
  };

  const tier = daysUntilExpiration <= 30 ? 'critical' :
               daysUntilExpiration <= 60 ? 'high' : 'medium';

  const { color, icon: Icon, label } = config[tier];

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-${color}-100 text-${color}-800 border border-${color}-300`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">
        {label} in {daysUntilExpiration} {daysUntilExpiration === 1 ? 'day' : 'days'}
      </span>
    </div>
  );
}
```

### Dashboard Display

**Attention Items with Expiration:**
```tsx
function AttentionItem({ item }: { item: AttentionItem }) {
  if (item.reason === 'expiring-soon' || item.reason === 'expired') {
    return (
      <Link to={`/nda/${item.nda.id}`} className="block p-3 rounded-lg border hover:bg-gray-50">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`h-5 w-5 mt-0.5 ${
              item.isExpired ? 'text-red-600' : 'text-yellow-600'
            }`}
          />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">NDA #{item.nda.displayId}</span>
              <Badge variant="outline">{item.nda.status}</Badge>
            </div>

            <p className="text-sm font-medium mb-1">{item.nda.companyName}</p>

            <p className="text-xs text-gray-600">
              {item.isExpired
                ? `Expired ${Math.abs(item.daysUntilExpiration)} days ago`
                : `Expiring in ${item.daysUntilExpiration} days`}
            </p>
          </div>

          <ExpirationIndicator
            daysUntilExpiration={item.daysUntilExpiration}
            effectiveDate={item.nda.effectiveDate}
            isExpired={item.isExpired}
          />
        </div>
      </Link>
    );
  }

  // ... other attention item types
}
```

### Admin Configuration UI

**Expiration Threshold Settings:**
```tsx
function ExpirationThresholdsSettings() {
  const [config, setConfig] = useState({
    expiration_alert_critical: 30,
    expiration_alert_warning: 60,
    expiration_alert_info: 90
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expiration Alert Thresholds</CardTitle>
        <CardDescription>
          Configure when users receive expiration alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Critical Alert (days before expiration)</Label>
          <Input
            type="number"
            min={1}
            max={90}
            value={config.expiration_alert_critical}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              expiration_alert_critical: parseInt(e.target.value)
            }))}
          />
          <p className="text-sm text-gray-500 mt-1">
            Yellow warning alert for NDAs expiring within this many days
          </p>
        </div>

        <div>
          <Label>Warning Alert (days)</Label>
          <Input
            type="number"
            min={config.expiration_alert_critical + 1}
            max={180}
            value={config.expiration_alert_warning}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              expiration_alert_warning: parseInt(e.target.value)
            }))}
          />
          <p className="text-sm text-gray-500 mt-1">
            Orange informational alert
          </p>
        </div>

        <div>
          <Label>Early Notice (days)</Label>
          <Input
            type="number"
            min={config.expiration_alert_warning + 1}
            max={365}
            value={config.expiration_alert_info}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              expiration_alert_info: parseInt(e.target.value)
            }))}
          />
          <p className="text-sm text-gray-500 mt-1">
            Blue early notice alert
          </p>
        </div>

        <Button onClick={() => saveMutation.mutate(config)}>
          Save Expiration Thresholds
        </Button>
      </CardContent>
    </Card>
  );
}
```

### NDA List Display

**Expiration Badge in Table:**
```tsx
function NDAListRow({ nda }: { nda: NdaWithExpiration }) {
  const daysUntil = nda.effectiveDate
    ? differenceInDays(nda.effectiveDate, new Date())
    : null;

  const isExpiring = daysUntil !== null && daysUntil <= 90 && daysUntil > 0;
  const isExpired = daysUntil !== null && daysUntil <= 0;

  return (
    <TableRow>
      <TableCell>#{nda.displayId}</TableCell>
      <TableCell>{nda.companyName}</TableCell>
      <TableCell><StatusBadge status={nda.status} /></TableCell>
      <TableCell>
        {formatDate(nda.effectiveDate)}
        {(isExpiring || isExpired) && (
          <ExpirationBadge
            daysUntil={daysUntil}
            isExpired={isExpired}
          />
        )}
      </TableCell>
      <TableCell>...</TableCell>
    </TableRow>
  );
}
```

### Integration with Metrics

**From Story 5.9:**
```typescript
// "Expiring Soon" metric uses same query
async function getExpiringSoonCount(subagencyIds: string[], days: number) {
  return await prisma.nda.count({
    where: {
      subagencyId: { in: subagencyIds },
      status: { notIn: ['INACTIVE', 'CANCELLED', 'FULLY_EXECUTED'] },
      effectiveDate: {
        gte: new Date(),
        lte: addDays(new Date(), days)
      }
    }
  });
}

// Story 5.12 extends with tiered alerts and expired tracking
```

### Email Notifications

**Future Integration (Story 5.13):**
```typescript
// When email notifications are implemented:
// - Send email when NDA enters each threshold tier
// - Daily digest of expiring NDAs
// - Immediate alert for newly expired NDAs
// - Configurable per user notification preferences
```

### Performance Optimization

**Efficient Queries:**
```sql
-- Index for expiration queries
CREATE INDEX idx_ndas_effective_date ON ndas(effective_date)
  WHERE status NOT IN ('INACTIVE', 'CANCELLED');

-- Composite index for filtered expiration queries
CREATE INDEX idx_ndas_status_effective ON ndas(status, effective_date);
```

**Caching:**
- Cache expiration alerts with dashboard data (5 minutes)
- Refresh on NDA create/update
- Daily background job to identify newly expiring NDAs

### Business Rules

**Expiration vs Fully Executed:**
- If NDA marked FULLY_EXECUTED before effective_date, no expiration alert
- Expired NDAs in EMAILED/IN_REVISION status are critical (partner delayed)
- Expired CREATED NDAs are lower priority (never sent anyway)

**Alert Prioritization:**
```typescript
function getExpirationPriority(nda: Nda, daysUntil: number): number {
  if (daysUntil < 0) {
    // Expired - priority based on status
    return nda.status === 'EMAILED' ? 1 : 2; // EMAILED expired = highest priority
  }

  // Expiring - priority based on days
  if (daysUntil <= 30) return 3;
  if (daysUntil <= 60) return 4;
  return 5;
}
```

### Integration with Other Stories

**Builds on:**
- Story 5.4: System config for thresholds
- Story 5.8: Dashboard attention items
- Story 5.9: Expiring soon metric

**Used by:**
- Story 5.13: Email notifications for expiration alerts
- Story 5.8: Dashboard display

**Related to:**
- Story 5.10: Stale NDA identification (combined in attention items)

### Project Structure Notes

**Files to Modify:**
- `src/server/services/dashboardService.ts` - ADD getExpiringNdas()
- `src/components/dashboard/AttentionItemsWidget.tsx` - DISPLAY expiration alerts
- `src/components/screens/Requests.tsx` - OPTIONAL expiration column
- `src/components/screens/admin/SystemSettings.tsx` - ADD threshold config

**New Files:**
- `src/components/ui/ExpirationIndicator.tsx` - NEW
- `src/server/utils/expirationCalculator.ts` - NEW
- Migration file for expiration indexes and system_config entries

**Follows established patterns:**
- System config from Story 5.4
- Dashboard service from Story 5.8
- Attention items from Stories 5.8-5.10
- Row-level security enforcement

### References

- [Source: docs/epics.md#Epic 5: Search, Filtering & Dashboard - Story 5.12]
- [Source: Story 5.4 - System config thresholds]
- [Source: Story 5.8 - Dashboard attention items]
- [Source: Story 5.9 - Expiring soon metric]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Context Reference

Story created from PRD/Epics specifications without code anchoring.

### Completion Notes List

- Story created using BMAD create-story workflow
- Three-tier expiration alerts: 30/60/90 days
- Expired NDA detection and highlighting
- ExpirationIndicator component with color-coded urgency
- System config for threshold management
- Integration with dashboard attention items
- Performance optimization via indexes

### File List

Files to be created/modified during implementation:
- `prisma/schema.prisma` - ADD system_config entries for thresholds
- `src/server/services/dashboardService.ts` - MODIFY (add getExpiringNdas)
- `src/server/utils/expirationCalculator.ts` - NEW
- `src/components/ui/ExpirationIndicator.tsx` - NEW
- `src/components/dashboard/AttentionItemsWidget.tsx` - MODIFY (display expiring)
- `src/components/screens/admin/SystemSettings.tsx` - MODIFY (threshold config)
- `prisma/seed.ts` - MODIFY (seed expiration thresholds)
- Migration file for expiration indexes
- `src/server/services/__tests__/dashboardService.test.ts` - MODIFY (test expiration)
