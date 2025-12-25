# Story 9.15: Enhanced Email Template Bodies

Status: done

## Story

As an NDA sender,
I want email templates to have richer, more professional content with better formatting,
So that partner communications are clear, complete, and professional.

## Acceptance Criteria

**AC1: Email body includes all relevant NDA details**
**Given** I send an NDA email using the default template
**When** the email is generated
**Then** the body includes: Company name, abbreviated name, effective date, USmax position, agency
**And** all field-merge placeholders work correctly ({{companyName}}, {{effectiveDate}}, etc.)
**And** missing fields are handled gracefully (not showing "undefined" or "null")

**AC2: Email formatting is professional**
**Given** I view a generated email
**When** I read the content
**Then** the email has proper spacing and paragraph breaks
**And** important information is emphasized or bulleted
**And** the tone is professional and clear
**And** the signature block is well-formatted

**AC3: Email provides clear next steps**
**Given** I receive an NDA email as a partner
**When** I read the email
**Then** the next steps are clearly explained ("Review, sign, return")
**And** any deadlines or urgency is communicated
**And** contact information for questions is provided

**AC4: Templates support rich formatting**
**Given** I am editing an email template
**When** I add formatting (line breaks, bullet points, emphasis)
**Then** the formatting is preserved in generated emails
**And** HTML or markdown formatting works if supported
**And** Plain text fallback exists for email clients that don't support HTML

## Tasks / Subtasks

- [ ] Enhance default email body content (Task AC: AC1)
  - [ ] Add more NDA details to email body
  - [ ] Include effective date if available
  - [ ] Include USmax position and agency
  - [ ] Add project/purpose context
  - [ ] Handle missing fields gracefully
- [ ] Improve email formatting (Task AC: AC2)
  - [ ] Add proper paragraph spacing
  - [ ] Consider bullet points for NDA details
  - [ ] Enhance signature block
  - [ ] Improve overall readability
- [ ] Clarify next steps (Task AC: AC3)
  - [ ] Make "review, sign, return" explicit
  - [ ] Add expected timeline if applicable
  - [ ] Include contact information
  - [ ] Add any compliance or legal disclaimers if needed
- [ ] Support rich formatting (Task AC: AC4)
  - [ ] Investigate HTML email support
  - [ ] If HTML: Add basic styling (bold, lists, spacing)
  - [ ] If plain text: Use spacing and characters for structure
  - [ ] Test rendering in common email clients
- [ ] Update email templates in database (Task AC: All)
  - [ ] Update default template body text
  - [ ] Add field-merge placeholders for new details
  - [ ] Test template merging works correctly
  - [ ] Update seed data if needed

## Dev Notes

### Current Implementation

**File:** src/server/services/emailService.ts lines 169-194

**Current Default Body:**
```
Dear ${pocName},

Please find attached the Non-Disclosure Agreement (NDA) for ${companyName} regarding ${abbreviatedName}.

Please review the attached document, sign, and return at your earliest convenience.

If you have any questions or concerns, please don't hesitate to reach out.

Best regards,
${signature}

NDA Reference: #${displayId}
```

**Issues:**
- Minimal details (no effective date, agency, position)
- Generic language
- No structured information (could use bullets)
- Missing context about purpose or timeline

**Enhanced Version:**
```
Dear ${pocName},

Please find attached the Non-Disclosure Agreement for your review and signature.

NDA DETAILS:
• Company: ${companyName}
• Project: ${abbreviatedName}
• USmax Position: ${usMaxPosition}
• Agency: ${agencyGroup}
• Effective Date: ${effectiveDate || 'Upon execution'}
• NDA Type: ${ndaType}

NEXT STEPS:
1. Review the attached NDA document
2. Sign where indicated
3. Return the executed copy to us

Please complete this review within [X business days / at your earliest convenience].

If you have any questions or need clarification, please contact:
${opportunityPocName} at ${opportunityPocEmail}

Best regards,
${signature}

Reference: NDA #${displayId}
```

### Architecture Requirements

- Update generateEmailBody() function
- Enhance buildEmailMergeFields() to include all available data
- Support HTML if email service allows (check SES configuration)
- Maintain backward compatibility with existing templates

### Testing Requirements

- Test with all fields populated
- Test with missing optional fields
- Test field-merge placeholders work
- Test email rendering in preview
- Send test email to verify formatting

### References

- [Email Service: src/server/services/emailService.ts generateEmailBody() lines 169-194]
- [Email Templates: database email_templates table]
- [Field Merge: buildEmailMergeFields() function]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

### File List

### Change Log
