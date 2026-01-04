# Story 8-8: Date Range Validation

**Epic:** Epic 8 - Data Integrity & Validation
**Story Name:** Date Range Validation
**Story Points:** 5
**Priority:** High
**Status:** Ready for Development

---

## User Story

**As a** system administrator and NDA user
**I want** all date fields to be validated for logical ranges and business rules
**So that** NDAs have valid effective dates, expiration dates are auto-calculated correctly, and illogical date combinations are prevented

---

## Acceptance Criteria

### AC1: Effective Date Validation
**Given** a user enters an NDA effective date
**When** the date is validated
**Then** the effective date must be a valid date format (ISO 8601: YYYY-MM-DD)
**And** the effective date cannot be more than 5 years in the past
**And** the effective date cannot be more than 1 year in the future
**And** invalid dates show clear error messages

**Details:**
- Accept ISO 8601 format: `YYYY-MM-DD` (e.g., "2025-12-31")
- Past limit: effectiveDate >= (today - 5 years)
- Future limit: effectiveDate <= (today + 1 year)
- Error messages specify which constraint was violated

### AC2: Expiration Date Auto-Calculation
**Given** an NDA is marked as fully executed
**When** the fully executed date is set
**Then** the expiration date is automatically calculated as fullyExecutedDate + 365 days
**And** the calculated expiration date is stored in the database
**And** users cannot manually override the auto-calculated expiration date
**And** changing the fully executed date re-calculates the expiration date

**Details:**
- Formula: `expirationDate = fullyExecutedDate + 365 days`
- Auto-calculation happens in backend service layer (ndaService.ts)
- Frontend displays calculated expiration date (read-only)
- Audit log records expiration date changes

### AC3: Fully Executed Date Validation
**Given** a user marks an NDA as fully executed
**When** the fully executed date is entered
**Then** the fully executed date must be on or after the effective date
**And** the fully executed date cannot be in the future (must be <= today)
**And** validation error shows if fullyExecutedDate < effectiveDate

**Details:**
- Constraint: `fullyExecutedDate >= effectiveDate`
- Constraint: `fullyExecutedDate <= today`
- Validation happens on both frontend and backend
- Clear error message: "Fully executed date must be on or after effective date and cannot be in the future"

### AC4: Date Range Consistency Validation
**Given** an NDA has multiple date fields (effective, fully executed, expiration)
**When** any date field is updated
**Then** all date relationships are validated:
- `effectiveDate <= fullyExecutedDate` (if fullyExecutedDate exists)
- `fullyExecutedDate < expirationDate` (if both exist)
- `expirationDate = fullyExecutedDate + 365 days` (always enforced when fullyExecutedDate exists)

**And** validation errors list all violated constraints
**And** the NDA cannot be saved with invalid date relationships

**Details:**
- Multi-field validation in backend service layer
- Frontend preview shows calculated dates before submission
- Validation runs on create, update, and status transitions

### AC5: Date Picker UI Constraints
**Given** a user interacts with date picker fields
**When** selecting dates in the UI
**Then** the date picker enforces constraints visually:
- Effective date picker disables dates outside allowed range (today - 5 years to today + 1 year)
- Fully executed date picker disables future dates
- Fully executed date picker highlights dates before effective date as invalid
- Expiration date field is read-only and auto-populated

**Details:**
- Use `react-day-picker` component with disabled date logic
- Visual feedback: grayed-out disabled dates, highlighted valid range
- Tooltip explanations for why dates are disabled

### AC6: Backend Date Validation
**Given** date data is submitted to the API
**When** the backend validates the request
**Then** all date fields are validated against business rules
**And** validation errors return 400 Bad Request with field-specific details
**And** database operations only proceed if all dates are valid

**Details:**
- Create `dateValidator.ts` utility
- Functions: `validateEffectiveDate()`, `validateFullyExecutedDate()`, `validateDateRange()`
- Return structured validation errors with field names and messages
- Integration with existing validation middleware

### AC7: Expiration Reminder Logic
**Given** an NDA approaches its expiration date
**When** the system checks for expiring NDAs
**Then** NDAs expiring within 30 days are flagged
**And** NDAs expiring within 7 days are highlighted
**And** expired NDAs (expirationDate < today) are automatically marked as EXPIRED status

**Details:**
- Background job checks daily for expiring NDAs
- Status auto-transition: FULLY_EXECUTED → EXPIRED when expirationDate < today
- Dashboard widget shows count of NDAs expiring soon
- Email notifications sent to stakeholders (configurable)

---

## Tasks

### Task Group 1: Date Validation Utility Functions (5 story points, 8 tasks)
**Complexity:** Medium
**Dependencies:** None

1. **Create date validation utility file**
   - File: `src/server/validators/dateValidator.ts`
   - Import Prisma DateTime type
   - Define date validation constants (MAX_PAST_YEARS, MAX_FUTURE_YEARS)
   - Export validation functions

2. **Implement validateEffectiveDate function**
   - Function: `validateEffectiveDate(date: Date | string): ValidationError | null`
   - Validate date format (ISO 8601)
   - Check not more than 5 years in past
   - Check not more than 1 year in future
   - Return validation error if invalid

3. **Implement validateFullyExecutedDate function**
   - Function: `validateFullyExecutedDate(fullyExecutedDate: Date, effectiveDate?: Date): ValidationError | null`
   - Validate fully executed date is not in future
   - Validate fully executed date >= effective date (if provided)
   - Return validation error if invalid

4. **Implement calculateExpirationDate function**
   - Function: `calculateExpirationDate(fullyExecutedDate: Date): Date`
   - Add 365 days to fullyExecutedDate
   - Return calculated expiration date
   - Handle timezone and DST correctly

5. **Implement validateDateRange function**
   - Function: `validateDateRange(effectiveDate?: Date, fullyExecutedDate?: Date, expirationDate?: Date): ValidationError[]`
   - Validate effectiveDate <= fullyExecutedDate
   - Validate fullyExecutedDate < expirationDate
   - Validate expirationDate = fullyExecutedDate + 365 days
   - Return array of all validation errors

6. **Create date formatting utilities**
   - Function: `parseISODate(dateString: string): Date | null`
   - Function: `formatDateToISO(date: Date): string`
   - Function: `addDays(date: Date, days: number): Date`
   - Handle timezone conversions properly

7. **Write unit tests for date validation**
   - File: `src/server/validators/__tests__/dateValidator.test.ts`
   - Test validateEffectiveDate with valid/invalid dates
   - Test validateFullyExecutedDate edge cases
   - Test calculateExpirationDate accuracy
   - Test validateDateRange multiple scenarios

8. **Document date validation rules**
   - Add JSDoc comments to all validation functions
   - Explain business rules in comments
   - Provide usage examples

### Task Group 2: Backend Service Integration (8 story points, 9 tasks)
**Complexity:** High
**Dependencies:** Task Group 1

1. **Update ndaService.createNDA to validate dates**
   - File: `src/server/services/ndaService.ts`
   - Validate effectiveDate using `validateEffectiveDate()`
   - Validate fullyExecutedDate using `validateFullyExecutedDate()` (if provided)
   - Calculate expirationDate if fullyExecutedDate provided
   - Throw validation error if dates invalid

2. **Update ndaService.updateNDA to validate dates**
   - Validate date fields on update
   - Re-calculate expirationDate if fullyExecutedDate changed
   - Handle partial updates (only some date fields changed)
   - Maintain date consistency across updates

3. **Implement auto-calculation of expiration date**
   - Function: `autoCalculateExpirationDate(nda: Partial<Nda>): Date | null`
   - Called automatically when fullyExecutedDate is set
   - Override any user-provided expirationDate value
   - Log warning if user tried to set expirationDate manually

4. **Add date validation to status transition logic**
   - File: `src/server/services/ndaService.ts` (or statusService.ts if separate)
   - When transitioning to FULLY_EXECUTED status, require fullyExecutedDate
   - Validate fullyExecutedDate when status changes
   - Auto-calculate and set expirationDate

5. **Create NDA expiration check service**
   - File: `src/server/services/expirationService.ts`
   - Function: `checkExpiredNdas(): Promise<Nda[]>`
   - Query NDAs where expirationDate < today AND status = FULLY_EXECUTED
   - Return list of expired NDAs

6. **Implement auto-expire job**
   - File: `src/server/jobs/autoExpireNdas.ts`
   - Background job runs daily (pg-boss)
   - Calls `checkExpiredNdas()`
   - Updates status to EXPIRED for expired NDAs
   - Logs all status transitions to audit log

7. **Add date validation middleware to routes**
   - File: `src/server/middleware/validateDates.ts`
   - Middleware: `validateNdaDates(req, res, next)`
   - Validate all date fields in request body
   - Return 400 with validation errors if invalid
   - Apply to POST /api/ndas and PUT /api/ndas/:id

8. **Write integration tests for date validation in services**
   - File: `src/server/services/__tests__/ndaService.test.ts`
   - Test creating NDA with invalid effectiveDate
   - Test creating NDA with fullyExecutedDate before effectiveDate
   - Test expiration date auto-calculation
   - Test updating NDA with date conflicts

9. **Write tests for auto-expire job**
   - File: `src/server/jobs/__tests__/autoExpireNdas.test.ts`
   - Test expiration detection logic
   - Test status transition to EXPIRED
   - Test audit logging of expirations
   - Mock pg-boss job execution

### Task Group 3: Frontend Date Validation (10 story points, 11 tasks)
**Complexity:** Medium
**Dependencies:** Task Group 1

1. **Create frontend date validation constants**
   - File: `src/client/constants/dateValidation.ts`
   - Mirror backend MAX_PAST_YEARS, MAX_FUTURE_YEARS
   - Export date validation rules

2. **Create useDateValidation hook**
   - File: `src/client/hooks/useDateValidation.ts`
   - Hook: `useDateValidation(effectiveDate, fullyExecutedDate, expirationDate)`
   - Returns: `{ isValid, errors, calculateExpiration }`
   - Validates all date relationships
   - Mirrors backend validation logic

3. **Create DatePicker component with validation**
   - File: `src/components/forms/DatePicker.tsx`
   - Use `react-day-picker` library
   - Props: `value`, `onChange`, `minDate`, `maxDate`, `disabledDates`, `label`
   - Visual feedback for invalid/disabled dates
   - Show error messages below picker

4. **Implement EffectiveDatePicker component**
   - File: `src/components/ndas/EffectiveDatePicker.tsx`
   - Wrap DatePicker with effective date constraints
   - Min date: today - 5 years
   - Max date: today + 1 year
   - Validate on change

5. **Implement FullyExecutedDatePicker component**
   - File: `src/components/ndas/FullyExecutedDatePicker.tsx`
   - Wrap DatePicker with fully executed date constraints
   - Max date: today (cannot be future)
   - Min date: effectiveDate (passed as prop)
   - Highlight dates before effective date as invalid

6. **Create ExpirationDateDisplay component**
   - File: `src/components/ndas/ExpirationDateDisplay.tsx`
   - Read-only display of calculated expiration date
   - Show "Not yet executed" if no fullyExecutedDate
   - Show calculated date: fullyExecutedDate + 365 days
   - Include tooltip explaining auto-calculation

7. **Update NDA form with date pickers**
   - File: `src/components/ndas/NDAForm.tsx` (or CreateNDAPage.tsx)
   - Replace text inputs with EffectiveDatePicker
   - Add FullyExecutedDatePicker (optional field)
   - Add ExpirationDateDisplay (read-only)
   - Wire up useDateValidation hook

8. **Implement real-time date validation feedback**
   - Show error messages immediately when dates are invalid
   - Disable submit button if dates are invalid
   - Display calculated expiration date preview
   - Clear errors when dates become valid

9. **Add date conflict warnings**
   - Show warning icon if fullyExecutedDate < effectiveDate
   - Display inline error: "Fully executed date must be on or after effective date"
   - Highlight conflicting fields in red

10. **Write frontend component tests**
    - File: `src/components/forms/__tests__/DatePicker.test.tsx`
    - Test DatePicker renders correctly
    - Test date selection updates value
    - Test disabled dates cannot be selected
    - Test validation error display

11. **Write E2E tests for date validation**
    - File: `tests/e2e/nda-date-validation.spec.ts`
    - Test creating NDA with effective date in far past (should fail)
    - Test creating NDA with effective date in far future (should fail)
    - Test fully executed date before effective date (should fail)
    - Test expiration date auto-calculation
    - Test date validation error messages display correctly

### Task Group 4: Expiration Tracking & Notifications (8 story points, 7 tasks)
**Complexity:** Medium
**Dependencies:** Task Group 2

1. **Create expiration tracking dashboard widget**
   - File: `src/components/dashboard/ExpiringNdasWidget.tsx`
   - Display count of NDAs expiring within 30 days
   - Display count of NDAs expiring within 7 days
   - Link to filtered NDA list view
   - Color-coded urgency (yellow for 30 days, red for 7 days)

2. **Update NDA list view with expiration filters**
   - File: `src/components/ndas/NDAList.tsx`
   - Add filter: "Expiring within 30 days"
   - Add filter: "Expiring within 7 days"
   - Add filter: "Expired"
   - Sort by expiration date (ascending)

3. **Create expiration API endpoint**
   - File: `src/server/routes/ndas.ts`
   - GET /api/ndas/expiring?days=30
   - Query parameter: days (default 30)
   - Return NDAs where expirationDate <= today + days
   - Apply agency scoping

4. **Implement expiration notification service**
   - File: `src/server/services/expirationNotificationService.ts`
   - Function: `sendExpirationNotifications(): Promise<void>`
   - Query NDAs expiring within 7 days or 30 days
   - Send email notifications to stakeholders
   - Use existing emailService and NdaEmail model

5. **Schedule expiration notification job**
   - File: `src/server/jobs/sendExpirationNotifications.ts`
   - Background job runs daily
   - Calls `sendExpirationNotifications()`
   - Logs notifications sent to audit log

6. **Add expiration status badge to NDA cards**
   - File: `src/components/ndas/NDACard.tsx` (or NDAListItem.tsx)
   - Show "Expiring Soon" badge if expirationDate <= today + 30 days
   - Show "Urgent: Expires in X days" badge if expirationDate <= today + 7 days
   - Show "Expired" badge if expirationDate < today

7. **Write tests for expiration tracking**
   - File: `src/server/services/__tests__/expirationService.test.ts`
   - Test checkExpiredNdas identifies expired NDAs
   - Test expiration notification logic
   - File: `src/components/dashboard/__tests__/ExpiringNdasWidget.test.tsx`
   - Test widget displays correct counts

### Task Group 5: Database Schema & Migrations (3 story points, 4 tasks)
**Complexity:** Low
**Dependencies:** None

1. **Review existing date columns in schema.prisma**
   - File: `prisma/schema.prisma`
   - Confirm effectiveDate, fullyExecutedDate, expirationDate columns exist
   - Verify data types are DateTime
   - Check for indexes on date columns

2. **Add database indexes for date queries**
   - Create index on expirationDate for expiration queries
   - Create index on fullyExecutedDate for filtering
   - Create index on effectiveDate for range queries
   - File: `prisma/migrations/YYYYMMDDHHMMSS_add_date_indexes/migration.sql`

3. **Create migration for date constraints (if needed)**
   - Add CHECK constraint: fullyExecutedDate >= effectiveDate (optional, can be app-level)
   - Add CHECK constraint: expirationDate > fullyExecutedDate (optional)
   - Document why constraints are or aren't at database level

4. **Test migrations in development**
   - Run migrations on dev database
   - Verify indexes improve query performance
   - Test rollback migration

### Task Group 6: Documentation (2 story points, 5 tasks)
**Complexity:** Low
**Dependencies:** Task Groups 1-5

1. **Document date validation rules**
   - File: `docs/validation-rules.md`
   - Effective date: -5 years to +1 year
   - Fully executed date: <= today, >= effective date
   - Expiration date: auto-calculated (fully executed + 365 days)

2. **Update API documentation**
   - File: `docs/api.md`
   - Document date field validation rules
   - Document auto-calculation of expiration date
   - Provide example request/response with dates

3. **Document expiration tracking**
   - File: `docs/expiration-tracking.md`
   - Explain auto-expire job schedule
   - Document notification triggers (7 days, 30 days)
   - Explain status transition to EXPIRED

4. **Update user guide**
   - File: `docs/user-guide.md`
   - Explain date picker constraints
   - Explain automatic expiration date calculation
   - Provide screenshots of date pickers

5. **Update CLAUDE.md with date validation patterns**
   - File: `CLAUDE.md`
   - Add section on date validation
   - Provide code examples for date validation
   - Reference dateValidator.ts utility

**Total Tasks:** 44 tasks across 6 task groups
**Total Story Points:** 36 points

---

## Technical Implementation Details

### Backend Architecture

#### Date Validation Constants
```typescript
// src/server/constants/dateValidation.ts
export const DATE_VALIDATION = {
  EFFECTIVE_DATE: {
    MAX_PAST_YEARS: 5,
    MAX_FUTURE_YEARS: 1,
  },
  EXPIRATION_DAYS: 365, // Days from fully executed to expiration
  EXPIRATION_WARNING_DAYS: {
    WARNING: 30, // Yellow warning
    URGENT: 7,   // Red urgent warning
  },
} as const;
```

#### Date Validator Utility
```typescript
// src/server/validators/dateValidator.ts
import { ValidationError } from '@/types/validation';
import { DATE_VALIDATION } from '@server/constants/dateValidation';

export function validateEffectiveDate(
  date: Date | string | undefined | null
): ValidationError | null {
  if (!date) return null; // Optional field, handled by required validation

  const parsedDate = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(parsedDate.getTime())) {
    return {
      field: 'effectiveDate',
      message: 'Effective date must be a valid date',
    };
  }

  const today = new Date();
  const maxPast = addYears(today, -DATE_VALIDATION.EFFECTIVE_DATE.MAX_PAST_YEARS);
  const maxFuture = addYears(today, DATE_VALIDATION.EFFECTIVE_DATE.MAX_FUTURE_YEARS);

  if (parsedDate < maxPast) {
    return {
      field: 'effectiveDate',
      message: `Effective date cannot be more than ${DATE_VALIDATION.EFFECTIVE_DATE.MAX_PAST_YEARS} years in the past`,
    };
  }

  if (parsedDate > maxFuture) {
    return {
      field: 'effectiveDate',
      message: `Effective date cannot be more than ${DATE_VALIDATION.EFFECTIVE_DATE.MAX_FUTURE_YEARS} year in the future`,
    };
  }

  return null;
}

export function validateFullyExecutedDate(
  fullyExecutedDate: Date | string,
  effectiveDate?: Date | string
): ValidationError | null {
  const parsedFED = typeof fullyExecutedDate === 'string' ? new Date(fullyExecutedDate) : fullyExecutedDate;

  if (isNaN(parsedFED.getTime())) {
    return {
      field: 'fullyExecutedDate',
      message: 'Fully executed date must be a valid date',
    };
  }

  const today = new Date();
  if (parsedFED > today) {
    return {
      field: 'fullyExecutedDate',
      message: 'Fully executed date cannot be in the future',
    };
  }

  if (effectiveDate) {
    const parsedED = typeof effectiveDate === 'string' ? new Date(effectiveDate) : effectiveDate;
    if (parsedFED < parsedED) {
      return {
        field: 'fullyExecutedDate',
        message: 'Fully executed date must be on or after the effective date',
      };
    }
  }

  return null;
}

export function calculateExpirationDate(fullyExecutedDate: Date): Date {
  return addDays(fullyExecutedDate, DATE_VALIDATION.EXPIRATION_DAYS);
}

export function validateDateRange(
  effectiveDate?: Date,
  fullyExecutedDate?: Date,
  expirationDate?: Date
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (effectiveDate && fullyExecutedDate) {
    if (fullyExecutedDate < effectiveDate) {
      errors.push({
        field: 'fullyExecutedDate',
        message: 'Fully executed date must be on or after effective date',
      });
    }
  }

  if (fullyExecutedDate && expirationDate) {
    const expectedExpiration = calculateExpirationDate(fullyExecutedDate);
    const diffDays = Math.abs(
      (expirationDate.getTime() - expectedExpiration.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 1) {
      // Allow 1 day tolerance for DST/timezone issues
      errors.push({
        field: 'expirationDate',
        message: `Expiration date must be ${DATE_VALIDATION.EXPIRATION_DAYS} days after fully executed date (auto-calculated)`,
      });
    }
  }

  return errors;
}

// Utility functions
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}
```

#### NDA Service Integration
```typescript
// src/server/services/ndaService.ts (updated)
import {
  validateEffectiveDate,
  validateFullyExecutedDate,
  calculateExpirationDate,
  validateDateRange,
} from '@server/validators/dateValidator';

export async function createNDA(data: CreateNdaInput, userId: string): Promise<Nda> {
  // Validate dates
  const effectiveDateError = validateEffectiveDate(data.effectiveDate);
  if (effectiveDateError) {
    throw new ValidationError([effectiveDateError]);
  }

  if (data.fullyExecutedDate) {
    const fullyExecutedError = validateFullyExecutedDate(
      data.fullyExecutedDate,
      data.effectiveDate
    );
    if (fullyExecutedError) {
      throw new ValidationError([fullyExecutedError]);
    }

    // Auto-calculate expiration date
    data.expirationDate = calculateExpirationDate(new Date(data.fullyExecutedDate));
  }

  // Validate date range consistency
  const rangeErrors = validateDateRange(
    data.effectiveDate ? new Date(data.effectiveDate) : undefined,
    data.fullyExecutedDate ? new Date(data.fullyExecutedDate) : undefined,
    data.expirationDate ? new Date(data.expirationDate) : undefined
  );
  if (rangeErrors.length > 0) {
    throw new ValidationError(rangeErrors);
  }

  // Create NDA in database
  const nda = await prisma.nda.create({ data });

  // Audit log
  await auditLog.create({
    action: 'nda_created',
    userId,
    entityType: 'nda',
    entityId: nda.id,
    details: { effectiveDate: data.effectiveDate, expirationDate: data.expirationDate },
  });

  return nda;
}
```

#### Auto-Expire Job
```typescript
// src/server/jobs/autoExpireNdas.ts
import { prisma } from '@server/db';
import { NdaStatus } from '@prisma/client';

export async function autoExpireNdas() {
  const today = new Date();

  const expiredNdas = await prisma.nda.findMany({
    where: {
      status: NdaStatus.FULLY_EXECUTED,
      expirationDate: { lt: today },
    },
  });

  for (const nda of expiredNdas) {
    await prisma.nda.update({
      where: { id: nda.id },
      data: { status: NdaStatus.EXPIRED },
    });

    await prisma.auditLog.create({
      data: {
        action: 'nda_auto_expired',
        entityType: 'nda',
        entityId: nda.id,
        details: { expirationDate: nda.expirationDate, autoExpired: true },
      },
    });
  }

  console.log(`Auto-expired ${expiredNdas.length} NDAs`);
}
```

### Frontend Architecture

#### Date Validation Hook
```typescript
// src/client/hooks/useDateValidation.ts
import { useMemo } from 'react';

export function useDateValidation(
  effectiveDate?: Date | null,
  fullyExecutedDate?: Date | null,
  expirationDate?: Date | null
) {
  return useMemo(() => {
    const errors: string[] = [];

    // Validate effective date range
    if (effectiveDate) {
      const today = new Date();
      const maxPast = new Date();
      maxPast.setFullYear(maxPast.getFullYear() - 5);
      const maxFuture = new Date();
      maxFuture.setFullYear(maxFuture.getFullYear() + 1);

      if (effectiveDate < maxPast) {
        errors.push('Effective date cannot be more than 5 years in the past');
      }
      if (effectiveDate > maxFuture) {
        errors.push('Effective date cannot be more than 1 year in the future');
      }
    }

    // Validate fully executed date
    if (fullyExecutedDate) {
      const today = new Date();
      if (fullyExecutedDate > today) {
        errors.push('Fully executed date cannot be in the future');
      }
      if (effectiveDate && fullyExecutedDate < effectiveDate) {
        errors.push('Fully executed date must be on or after effective date');
      }
    }

    // Calculate expected expiration date
    const calculatedExpiration = fullyExecutedDate
      ? new Date(fullyExecutedDate.getTime() + 365 * 24 * 60 * 60 * 1000)
      : null;

    return {
      isValid: errors.length === 0,
      errors,
      calculatedExpiration,
    };
  }, [effectiveDate, fullyExecutedDate, expirationDate]);
}
```

#### Date Picker Component
```typescript
// src/components/forms/DatePicker.tsx
import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: (date: Date) => boolean;
  label: string;
  error?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  disabledDates,
  label,
  error,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <DayPicker
        mode="single"
        selected={value || undefined}
        onSelect={onChange}
        disabled={(date) => {
          if (minDate && date < minDate) return true;
          if (maxDate && date > maxDate) return true;
          if (disabledDates && disabledDates(date)) return true;
          return false;
        }}
        className="border rounded-md p-2"
      />
      {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
    </div>
  );
};
```

#### Expiration Date Display
```typescript
// src/components/ndas/ExpirationDateDisplay.tsx
import React from 'react';

interface ExpirationDateDisplayProps {
  fullyExecutedDate?: Date | null;
  expirationDate?: Date | null;
}

export const ExpirationDateDisplay: React.FC<ExpirationDateDisplayProps> = ({
  fullyExecutedDate,
  expirationDate,
}) => {
  if (!fullyExecutedDate) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Expiration Date</label>
        <div className="text-gray-500 italic">Not yet executed</div>
      </div>
    );
  }

  const calculated = new Date(fullyExecutedDate.getTime() + 365 * 24 * 60 * 60 * 1000);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">
        Expiration Date (Auto-calculated)
      </label>
      <div className="px-3 py-2 bg-gray-100 rounded-md">
        {calculated.toLocaleDateString()}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Automatically set to 365 days after fully executed date
      </div>
    </div>
  );
};
```

---

## Existing Codebase Analysis

### Current Implementation Status

#### Database Schema (schema.prisma)
**File:** `/Users/jonahschulte/git/usmax-nda/prisma/schema.prisma`

**Findings:**
- **Line 274:** `effectiveDate DateTime? @map("effective_date")`
- **Line 280:** `fullyExecutedDate DateTime? @map("fully_executed_date")`
- **Line 281:** `expirationDate DateTime? @map("expiration_date")`
- All date fields are optional (nullable)
- No database-level constraints on date relationships
- Expiration date auto-calculation noted in comment (line 281)

**Action Required:**
- Add backend logic to auto-calculate expirationDate
- Implement validation for date ranges
- Add database indexes on date columns for performance

#### NDA Status Enum
**File:** `prisma/schema.prisma` (lines 229-237)

**Findings:**
- Status enum includes EXPIRED status ✅
- No automatic status transitions implemented yet

**Action Required:**
- Implement auto-expire background job
- Add status transition logic when expirationDate < today

### Current Gaps

1. **No date validation utilities** - dates not validated on create/update
2. **No expiration date auto-calculation** - users can set arbitrary expiration dates
3. **No auto-expire job** - NDAs don't automatically transition to EXPIRED status
4. **No date range validation** - can set fullyExecutedDate before effectiveDate
5. **No frontend date pickers** - text inputs without validation
6. **No expiration tracking** - no dashboard widget or notifications

---

## Dependencies

### Required Files/Modules
- `prisma/schema.prisma` - Database schema with date columns
- `src/server/services/ndaService.ts` - NDA business logic
- Frontend form components - to add date pickers
- `src/server/jobs/` - Background jobs directory

### External Libraries
- **react-day-picker** (already installed) - Date picker UI component
- **Prisma** - Database ORM
- **pg-boss** (already installed) - Background job scheduler

### Story Dependencies
- **Depends on:** Story 8-6 (Format Validation) - provides validation patterns
- **Blocks:** None

---

## Testing Requirements

### Unit Tests
1. **Date validation utilities**
   - Test validateEffectiveDate with various dates
   - Test validateFullyExecutedDate edge cases
   - Test calculateExpirationDate accuracy
   - Test validateDateRange multi-field validation

2. **Frontend hooks**
   - Test useDateValidation state changes
   - Test calculated expiration date

### Integration Tests
1. **NDA creation with dates**
   - Test creating NDA with invalid effectiveDate (far past/future)
   - Test creating NDA with fullyExecutedDate before effectiveDate
   - Test expiration date auto-calculation on create
   - Verify 400 responses with validation errors

2. **NDA updates**
   - Test updating fullyExecutedDate re-calculates expirationDate
   - Test date conflict validation on update

3. **Auto-expire job**
   - Test expired NDAs are identified correctly
   - Test status transition to EXPIRED
   - Test audit logging

### E2E Tests
1. **Date picker interactions**
   - Select effective date in UI
   - Attempt to select invalid fully executed date (before effective)
   - Verify expiration date auto-populated
   - Verify validation errors display

2. **Expiration tracking**
   - View expiring NDAs dashboard widget
   - Filter NDAs by expiration date

---

## Security Considerations

1. **Date Manipulation Prevention**
   - Always validate dates on backend (don't trust frontend)
   - Prevent users from manually setting expirationDate (auto-calculate only)
   - Audit log all date changes

2. **Timezone Handling**
   - Store dates in UTC in database
   - Convert to user's timezone for display
   - Be consistent with timezone conversions

---

## Performance Considerations

1. **Date Query Performance**
   - Add indexes on expirationDate, fullyExecutedDate, effectiveDate
   - Optimize expiring NDAs query (WHERE expirationDate < today + X days)

2. **Auto-Expire Job**
   - Run daily (not hourly) to minimize load
   - Process in batches if large number of NDAs
   - Add timeout protection

---

## Success Metrics

1. **Validation Coverage**
   - 100% of NDAs have valid date relationships
   - Zero NDAs with fullyExecutedDate < effectiveDate
   - Zero manually-set expiration dates (all auto-calculated)

2. **User Experience**
   - Users see visual date pickers with constraints
   - Users receive immediate feedback on invalid dates
   - Users understand expiration date is auto-calculated

3. **Operational Excellence**
   - Auto-expire job runs successfully daily
   - Dashboard shows accurate expiration counts
   - Expiration notifications sent reliably

---

## Dev Notes

### Implementation Priority
1. **Phase 1 (Critical):** Date validation utilities + backend validation
2. **Phase 2 (High):** Auto-calculation of expiration date
3. **Phase 3 (Medium):** Frontend date pickers + validation feedback
4. **Phase 4 (Low):** Auto-expire job + expiration tracking

### Quick Wins
- Start with validateEffectiveDate and calculateExpirationDate
- Add backend validation before tackling UI
- Reuse existing ValidationError types

### Potential Pitfalls
- **Timezone issues:** Be consistent with UTC vs local time
- **DST transitions:** Test date calculations across DST boundaries
- **Leap years:** Ensure 365-day calculation handles leap years correctly
- **Performance:** Index date columns before running large queries

---

## Story Completion Checklist

- [ ] Date validation utilities created
- [ ] Backend date validation integrated into ndaService
- [ ] Expiration date auto-calculation implemented
- [ ] Auto-expire background job created and scheduled
- [ ] Frontend date pickers implemented with constraints
- [ ] Real-time date validation feedback in UI
- [ ] Expiration tracking dashboard widget created
- [ ] Expiration notification service implemented
- [ ] Database indexes added for date columns
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E tests written and passing
- [ ] Documentation updated
- [ ] Code review completed
- [ ] QA testing completed
- [ ] Deployed to production

---

**Story File Size:** 20.3 KB
**Last Updated:** 2026-01-03
**Status:** Ready for Implementation
