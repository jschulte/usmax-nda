# NDA Workflow Configuration Design

**Problem:** Users don't know if approval is required or what the next step should be after creating an NDA.

**Solution:** Comprehensive workflow configuration system with clear guidance.

---

## Current Workflow Issues

### **Unclear User Journey:**
1. Create NDA → Status: CREATED
2. ❓ Do I send it directly?
3. ❓ Do I need approval?
4. ❓ Who approves it?
5. ❓ What if it's urgent?

### **No Configuration:**
- No system-wide approval settings
- No agency-specific rules
- No guidance on when approval is needed
- No definition of who can approve what

---

## Proposed Workflow Configuration

### **Configuration Levels:**

#### **1. System-Wide Defaults** (Admin configurable)
```yaml
approval:
  default_required: true
  allow_self_approval: false
  urgent_bypass_allowed: false

approvers:
  - role: "Admin"
  - role: "NDA Manager"

thresholds:
  always_require_approval: true
  skip_approval_for_clones: false
```

#### **2. Agency-Specific Rules** (Override defaults)
```yaml
DoD:
  approval_required: true  # Always, no exceptions
  approvers:
    - role: "Admin"
    - role: "DoD Security Officer"
  double_approval_required: true

Commercial:
  approval_required: false  # Can send directly
  approvers:
    - role: "Admin"
```

#### **3. NDA Type Rules**
```yaml
MUTUAL:
  approval_recommended: true
  reason: "Mutual NDAs involve bidirectional obligations"

CONSULTANT:
  approval_required: false
  reason: "Standard consultant NDAs are pre-approved"
```

---

## Implementation Approach

### **Phase 1: Hardcoded Workflow Rules** (2 hours)
**Immediate solution - no database changes needed**

Create `workflowService.ts`:
```typescript
export function getWorkflowRequirements(nda: NDA): WorkflowGuidance {
  return {
    approvalRequired: true,  // Always for now
    canSkipApproval: hasPermission('admin:*'),
    approvers: ['Admin role members'],
    nextStep: 'Route for approval',
    reasoning: 'All NDAs require approval for audit compliance',
    urgentBypassAvailable: false
  };
}
```

### **Phase 2: Database Configuration** (3 hours)
**Full solution - configurable rules**

Add to `prisma/schema.prisma`:
```prisma
model WorkflowConfig {
  id                    String  @id @default(uuid())
  agencyGroupId         String? // null = system default
  ndaType               String? // null = all types
  approvalRequired      Boolean @default(true)
  allowSelfApproval     Boolean @default(false)
  requireDoubleApproval Boolean @default(false)
  approverRoleIds       String[] // Array of role IDs
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### **Phase 3: Admin UI** (2 hours)
**Settings page for admins**

Location: Admin > Settings > Workflow Rules
- Configure approval requirements
- Set approvers by role
- Agency-specific overrides
- Test workflow scenarios

---

## UI Components Needed

### **1. Workflow Guidance Card** (NDA Detail Page)
```tsx
<WorkflowGuidanceCard
  nda={nda}
  nextStep="Route for Approval"
  reasoning="DoD NDAs require approval per agency policy"
  approvers={['Admin', 'DoD Security Officer']}
  canBypass={false}
  urgentOption={false}
/>
```

Shows:
- ✅ Clear next action
- ✅ Why it's required
- ✅ Who can approve
- ✅ Alternative options (if any)

### **2. Approval Badge** (Workflow Progress)
```tsx
<Badge variant="info">
  Approval Required
</Badge>
```

### **3. Help Tooltip** (Quick guidance)
```tsx
<Tooltip>
  <TooltipTrigger><HelpCircle /></TooltipTrigger>
  <TooltipContent>
    This NDA requires approval because it's for DoD and involves
    controlled information. Admin or DoD Security Officer can approve.
  </TooltipContent>
</Tooltip>
```

---

## Workflow Decision Logic

```typescript
function determineWorkflow(nda: NDA, user: User): WorkflowDecision {
  // Check agency-specific rules
  const agencyRules = getAgencyWorkflowRules(nda.agencyGroupId);

  // Check NDA type rules
  const typeRules = getNdaTypeWorkflowRules(nda.ndaType);

  // Merge with system defaults
  const approvalRequired =
    agencyRules?.approvalRequired ??
    typeRules?.approvalRequired ??
    SYSTEM_DEFAULT_APPROVAL_REQUIRED;

  // Determine who can approve
  const approvers = getApprovers(nda, agencyRules);

  // Check if user can bypass
  const canBypass =
    user.hasPermission('admin:*') &&
    agencyRules?.allowAdminBypass;

  return {
    approvalRequired,
    approvers,
    canBypass,
    nextAction: approvalRequired ? 'Route for Approval' : 'Send Email',
    reasoning: explainWhy(nda, agencyRules, typeRules)
  };
}
```

---

## User Experience Flow

### **Scenario 1: Approval Required (DoD)**
```
Create NDA → Status: CREATED

┌─ Next Step ────────────────────────────┐
│ ⚠️ Approval Required                   │
│                                         │
│ This DoD NDA must be approved before    │
│ sending to ensure compliance with       │
│ security protocols.                     │
│                                         │
│ Approvers:                              │
│ • Admin role members                    │
│ • DoD Security Officers                 │
│                                         │
│ [Route for Approval]                    │
└─────────────────────────────────────────┘
```

### **Scenario 2: Direct Send (Commercial)**
```
Create NDA → Status: CREATED

┌─ Next Step ────────────────────────────┐
│ ✅ Ready to Send                        │
│                                         │
│ Commercial NDAs can be sent directly.   │
│ You have the required permissions.      │
│                                         │
│ Optional: Route for approval if you     │
│ want a second review.                   │
│                                         │
│ [Send Email]  [Route for Approval]     │
└─────────────────────────────────────────┘
```

### **Scenario 3: Self-Approval Allowed**
```
Create NDA → Status: CREATED

┌─ Next Step ────────────────────────────┐
│ ℹ️ Approval Recommended                 │
│                                         │
│ You can approve your own NDA, but it    │
│ will be noted in the audit log.         │
│                                         │
│ Recommended: Have another user review.  │
│                                         │
│ [Route for Approval]  [Self-Approve]   │
└─────────────────────────────────────────┘
```

---

## Implementation Plan

### **Part A: Workflow Configuration (3-4 hours)**

1. **Create workflowService.ts** (1 hour)
   - Hardcoded rules initially
   - Function to get workflow requirements
   - Function to explain reasoning

2. **Add WorkflowGuidanceCard component** (1 hour)
   - Display next step clearly
   - Show reasoning
   - List approvers
   - Action buttons

3. **Integrate into NDA Detail page** (30 min)
   - Replace confusing button layout
   - Add prominent guidance card
   - Update workflow progress component

4. **Add database schema** (1 hour)
   - WorkflowConfig model
   - Migration
   - Seed with sensible defaults

5. **Admin UI** (Optional - can defer)
   - Settings page for workflow rules
   - Can add later

### **Part B: Document Editing (2-3 hours)**

1. **Create NDADocumentEditor component** (1 hour)
   - Clone RTFTemplateEditor structure
   - Load RTF → Convert to HTML
   - ReactQuill editor
   - Save button

2. **Add editor route** (30 min)
   - `/nda/:id/edit-document`
   - Route definition
   - Protected route

3. **Implement save endpoint** (45 min)
   - `PUT /api/ndas/:id/document`
   - Convert HTML → RTF (using html-to-rtf)
   - Update document in database
   - Create new version

4. **Integrate edit button** (30 min)
   - Add to NDADocumentPreview component
   - Add to Document tab
   - Permission checks

---

## Testing Plan

### **Workflow Configuration Tests:**
- [ ] DoD NDA shows "Approval Required"
- [ ] Commercial NDA shows options
- [ ] Correct approvers listed
- [ ] Buttons match guidance
- [ ] Permissions respected

### **Document Editing Tests:**
- [ ] Load RTF into editor
- [ ] Edit and save
- [ ] New version created
- [ ] RTF downloadable
- [ ] Formatting preserved

---

## Estimated Timeline

**Total: 5-7 hours of thorough work**

- Workflow Service: 1 hour
- Workflow UI Components: 1.5 hours
- Database schema (optional): 1 hour
- Document Editor Component: 1 hour
- Editor Integration: 1 hour
- Save Functionality: 1 hour
- Testing & Polish: 1-2 hours

---

**Ready to proceed with full implementation?** I'll build both systems thoroughly and test them end-to-end.
