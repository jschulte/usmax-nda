# API Service Layer

Comprehensive API service layer for the USMax NDA frontend. All services use TypeScript with proper typing and handle authentication automatically via cookies.

## Architecture

### Base API Client (`api.ts`)

Provides core HTTP methods with:
- Automatic `credentials: 'include'` for cookie-based auth
- Base URL from `VITE_API_URL` environment variable (defaults to `http://localhost:3001`)
- JSON content-type headers
- Consistent error handling with `ApiError` class
- Query parameter handling

### Service Modules

Each service module corresponds to a backend domain:

1. **ndaService.ts** - NDA operations
2. **agencyService.ts** - Agency groups and subagencies
3. **userService.ts** - User/contact management
4. **dashboardService.ts** - Dashboard and metrics
5. **templateService.ts** - RTF templates
6. **auditService.ts** - Audit logs
7. **adminService.ts** - Admin operations
8. **notificationService.ts** - Notification preferences and subscriptions

## Usage Examples

### NDA Operations

```typescript
import { listNDAs, getNDA, createNDA, updateNDAStatus } from '@/services';

// List NDAs with filtering
const result = await listNDAs({
  page: 1,
  limit: 20,
  status: 'CREATED',
  search: 'Boeing',
});

// Get NDA details
const nda = await getNDA('nda-id');

// Create NDA
const newNda = await createNDA({
  companyName: 'Example Corp',
  agencyGroupId: 'agency-id',
  abbreviatedName: 'EXCORP',
  authorizedPurpose: 'Proposal support',
  relationshipPocId: 'contact-id',
});

// Update NDA status
await updateNDAStatus('nda-id', 'EMAILED');
```

### Agency Management

```typescript
import { listAgencyGroups, createAgencyGroup, createSubagency } from '@/services';

// List all agency groups
const { agencyGroups } = await listAgencyGroups();

// Create agency group
const group = await createAgencyGroup({
  name: 'Department of Defense',
  code: 'DOD',
  description: 'Main defense agencies',
});

// Create subagency
const subagency = await createSubagency(group.agencyGroup.id, {
  name: 'Air Force',
  code: 'USAF',
});
```

### User Management

```typescript
import { listUsers, getUserAccessSummary, searchContacts } from '@/services';

// List users with filtering
const users = await listUsers({
  page: 1,
  limit: 20,
  search: 'john',
  active: true,
});

// Get user access summary (roles, permissions, agencies)
const summary = await getUserAccessSummary('user-id');

// Search contacts (internal and external)
const { contacts } = await searchContacts('john smith', 'all');
```

### Dashboard

```typescript
import { getDashboard, getMetrics } from '@/services';

// Get full dashboard
const dashboard = await getDashboard();
// Returns: recentNdas, itemsNeedingAttention, metrics, recentActivity

// Get metrics only
const metrics = await getMetrics();
// Returns: activeCount, expiringSoon, averageCycleTime
```

### Templates

```typescript
import { listTemplates, generatePreview } from '@/services';

// List templates for an agency
const { templates } = await listTemplates('agency-group-id');

// Generate document preview
const { preview } = await generatePreview('nda-id', 'template-id');
// Returns: previewUrl, mergedFields, templateUsed
```

### Audit Logs

```typescript
import { listAuditLogs, getNDAAuditTrail, exportAuditLogs } from '@/services';

// List audit logs (admin only)
const logs = await listAuditLogs({
  page: 1,
  limit: 50,
  entityType: 'nda',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});

// Get NDA audit trail
const trail = await getNDAAuditTrail('nda-id');
// Returns timeline with icons, colors, and descriptions

// Export audit logs to CSV
const blob = await exportAuditLogs({ format: 'csv' });
const url = URL.createObjectURL(blob);
```

### Admin Operations

```typescript
import { listRoles, assignRole, exportAccessReport } from '@/services';

// List all roles
const { roles } = await listRoles();

// Assign role to user
await assignRole('user-id', 'role-id');

// Export access report (CMMC compliance)
const blob = await exportAccessReport();
```

### Notifications

```typescript
import {
  getPreferences,
  updatePreferences,
  subscribe,
  unsubscribe,
} from '@/services';

// Get notification preferences
const { preferences } = await getPreferences();

// Update preferences
await updatePreferences({
  onNdaCreated: true,
  onStatusChanged: true,
  onFullyExecuted: true,
});

// Subscribe to NDA notifications
await subscribe('nda-id');

// Unsubscribe
await unsubscribe('nda-id');
```

## Error Handling

All services throw `ApiError` on failure:

```typescript
import { getNDA, ApiError } from '@/services';

try {
  const nda = await getNDA('invalid-id');
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Error Code:', error.code);

    if (error.statusCode === 404) {
      // Handle not found
    } else if (error.statusCode === 403) {
      // Handle forbidden
    }
  }
}
```

## Configuration

Set the API base URL in your `.env` file:

```bash
VITE_API_URL=http://localhost:3001
```

For production:

```bash
VITE_API_URL=https://api.usmax-nda.com
```

## Authentication

All requests automatically include credentials (cookies) via `credentials: 'include'`. The backend handles JWT authentication via HTTP-only cookies.

No manual token management needed on the frontend.

## File Uploads

For file uploads (like document upload), you'll need to use `FormData`:

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('isFullyExecuted', 'true');

const response = await fetch(
  `${import.meta.env.VITE_API_URL}/api/ndas/${ndaId}/documents/upload`,
  {
    method: 'POST',
    credentials: 'include',
    body: formData, // Don't set Content-Type, let browser set it
  }
);
```

## Type Safety

All services are fully typed with TypeScript interfaces that match the backend contracts. Import types as needed:

```typescript
import type {
  NdaStatus,
  UsMaxPosition,
  NdaDetail,
  ListNdasParams,
  CreateNdaData,
} from '@/services';
```

## Best Practices

1. **Use the centralized export**: Import from `@/services` instead of individual files
2. **Handle errors**: Always wrap service calls in try/catch
3. **Type your state**: Use the provided types for component state
4. **Destructure responses**: Most responses wrap data in an object (e.g., `{ ndas, pagination }`)
5. **Check pagination**: Many list endpoints return pagination metadata
