# Phase 1 Build Plan - USmax NDA Management System MVP

**Target:** 6-8 weeks to operational system
**Goal:** Legacy parity + smart improvements for user delight
**Delivery:** Bulletproof, production-ready replacement

---

## Build Philosophy

**"Simple, Solid, Shipped"**
- ✅ All legacy functionality preserved
- ✅ Modern UX that delights users
- ✅ Bulletproof reliability (won't fail like legacy)
- ✅ Fast delivery (system is down NOW)
- ❌ No feature bloat
- ❌ No unvalidated complexity

**"One-Click Anything"**
- Every workflow optimized for speed
- Reduce 15-field forms to 3-4 with intelligence
- Keyboard shortcuts for power users
- Instant feedback on every action

**"User Delight Mandate"**
- Goal: "Excited to NDA all day"
- Approach: Remove friction, add intelligence
- Measure: Speed, simplicity, helpfulness

---

## Pre-Build Requirements

### Must Complete BEFORE Development Starts

**1. Customer Validation Meeting**
- Present: `docs/assumptions-validation-doc.md`
- Collect answers to Tier 1 questions (6 critical)
- Collect answers to Tier 2 questions (5 scoping)
- Validate Tier 3 feature concepts (4 items)
- **Timeline:** ASAP (blocks development)

**2. Technical Decisions Based on Answers**
- PDF vs. RTF document format (Tier 1 Q2)
- Status state machine definition (Tier 1 Q4)
- Template system scope (Tier 1 Q5)
- Email recipient logic (Tier 1 Q3)
- Non-USmax NDA behavior (Tier 1 Q10)
- POC structure - 2 vs. 3 POC types (Tier 1 Q11)
- RBAC granularity - simple roles vs. permissions (Tier 1 Q12)
- Database choice - DynamoDB vs. Aurora Serverless (Tier 1 Q13)
- Document retention period - 3, 4, or 6 years (Tier 1 Q7)
- CMMC compliance level needed (Tier 1 Q8)

**3. Infrastructure Setup**
- Cloud provider: AWS (already confirmed by customer)
- Serverless framework: AWS SAM or Serverless Framework
- Database: Aurora Serverless v2 or DynamoDB (validate with customer - Tier 1 Q13)
- Document storage: S3 with encryption and versioning
- Email service: AWS SES (serverless-native)
- Authentication: AWS Cognito with MFA
- Monitoring: Sentry (errors) + CloudWatch (AWS-native) or New Relic

---

## Phase 1 Feature Scope

### Core Features (Legacy Parity)

**✅ NDA Lifecycle Management**
1. Create NDA Request with all legacy fields
2. Generate document from template (PDF or RTF based on validation)
3. Email NDA with attachments
4. Upload fully executed documents
5. Mark as fully executed
6. Change status to inactive
7. View NDA history timeline

**✅ Access Control**
8. Agency Groups CRUD
9. Subagencies CRUD (within groups)
10. User/Contact management
11. Assign group-level and subagency-level access
12. Row-level security (users only see authorized NDAs)

**✅ Search & Filter**
13. Advanced filtering (all legacy filter fields)
14. Sortable columns
15. Pagination
16. Search across all fields

**✅ Authentication & Security**
17. SSO/OIDC login with MFA (AWS Cognito)
18. Role-based access control (validate granularity - simple roles vs. RBAC permissions)
   - Minimum: Read-Only, NDA User, Admin
   - Optional: Granular permissions (nda:create, nda:update, etc.)
19. Encrypted document storage (S3 server-side encryption)
20. Secure document downloads (time-limited pre-signed URLs)

**✅ Audit & Compliance**
21. Centralized audit log viewer
22. Per-NDA history tracking
23. Export audit logs (CSV/Excel)

---

### Smart Improvements (User Delight Features)

**✅ Intelligent Form Entry (3 Paths)**
24. Company-First: Select company → auto-fill everything
25. Clone Path: Duplicate existing → change only differences
26. Agency-First: Select agency → suggest common patterns

**✅ Time-Saving Automations**
27. Email templates (pick → customize → send)
28. Auto-save drafts (never lose work)
29. Smart date defaults (today, +1 year)
30. Real-time form validation (catch errors early)
31. Recently used items at top of dropdowns

**✅ Efficiency Enhancements**
32. Filter presets ("My NDAs", "Pending", "Expiring Soon")
33. Column sort memory (remember preferences)
34. Date range shortcuts ("Last 30 Days", "This Quarter")
35. Inline status changes (no modal required)
36. Keyboard shortcuts (Ctrl+N = New, Ctrl+F = Search, etc.)

**✅ User Engagement**
37. User-focused dashboard (my NDAs, recent activity, tasks, notifications)
38. Notification system (bell icon, badge count, real-time updates)
39. At-a-glance metrics (active NDAs, expiring soon, avg cycle time)

**✅ Polish & Professional**
40. Modern, responsive UI (desktop, tablet, mobile)
41. Dark mode support
42. Loading states and skeletons
43. Toast notifications for confirmations
44. Error handling with helpful messages

**✅ Observability & Reliability**
45. Error tracking (Sentry)
46. Performance monitoring (New Relic/Datadog)
47. Uptime alerts (prevent silent failure)
48. Google Analytics (feature usage tracking)

---

## Technical Architecture

### Frontend
- **Framework:** React 19.x
- **Build Tool:** Vite (or Next.js if SSR needed - evaluate during tech spike)
- **Language:** TypeScript (strict mode)
- **UI Library:** Radix UI + Tailwind CSS (accessibility + modern design)
- **State Management:** TanStack Query (server state) + Zustand (client state)
- **Form Handling:** React Hook Form + Zod validation
- **Routing:** React Router (or Next.js routing if using Next.js)

### Backend
- **Architecture:** Serverless (required per scope doc)
- **API Style:** REST (simple, proven)
- **Database:** Aurora Serverless v2 (PostgreSQL-compatible, true serverless) or DynamoDB (AWS-native NoSQL)
  - **Decision pending:** Validate customer preference (Tier 1 Q13)
  - **Recommendation:** Aurora Serverless v2 (relational benefits + serverless scaling)
- **Document Storage:** S3 with encryption at rest, versioning enabled
- **Email:** AWS SES (serverless-native) or SendGrid
- **Authentication:** AWS Cognito with MFA (serverless-native OAuth2/OIDC)

### DevOps & Monitoring
- **CI/CD:** GitHub Actions
- **Hosting:** AWS/Azure/GCP serverless platform
- **Monitoring:** Sentry (errors) + New Relic/Datadog (APM)
- **Analytics:** Google Analytics
- **Infrastructure as Code:** Terraform (per CLAUDE.md requirements)

---

## 8-Week Implementation Timeline

### Week 1-2: Foundation & Infrastructure

**Backend:**
- [ ] Set up database schema (based on legacy-screens-requirements.md data model)
- [ ] Implement authentication (SSO + MFA)
- [ ] Create base API structure
- [ ] Set up serverless framework
- [ ] Configure document storage

**Frontend:**
- [ ] Initialize React 19 + Vite/Next.js project
- [ ] Set up Radix UI + Tailwind
- [ ] Implement authentication flows
- [ ] Create base layout (Sidebar + TopBar)
- [ ] Set up routing structure

**DevOps:**
- [ ] Configure CI/CD pipeline
- [ ] Set up Sentry + monitoring
- [ ] Configure staging environment
- [ ] Implement infrastructure as code

---

### Week 3-4: Core Operations

**Backend:**
- [ ] NDA CRUD API endpoints
- [ ] Agency Groups/Subagencies API
- [ ] Contacts/Users API
- [ ] Row-level security implementation
- [ ] Document generation service (PDF/RTF)
- [ ] Email service integration

**Frontend:**
- [ ] NDA Request form with 3 smart entry paths
- [ ] NDA Admin list with filtering
- [ ] NDA Detail view with history
- [ ] Agency Groups/Subagencies management screens
- [ ] Contacts directory
- [ ] Email composer component

**Testing:**
- [ ] Unit tests for critical business logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for create NDA workflow

---

### Week 5-6: Distribution & Completion Workflows

**Backend:**
- [ ] Document upload API
- [ ] Version tracking
- [ ] Email template system
- [ ] Status transition logic
- [ ] History/audit event tracking
- [ ] Notification service

**Frontend:**
- [ ] Upload executed documents UI
- [ ] Email template picker
- [ ] Status change workflows
- [ ] Clone/duplicate NDA feature
- [ ] Document download (single + bulk)
- [ ] Filter presets implementation

**Testing:**
- [ ] E2E tests for email workflow
- [ ] E2E tests for document upload/download
- [ ] Access control testing

---

### Week 7-8: Delight Features & Production Hardening

**Backend:**
- [ ] Smart suggestion algorithms (company history, template suggestions)
- [ ] Notification event handlers
- [ ] Analytics event tracking
- [ ] Performance optimization
- [ ] Load testing

**Frontend:**
- [ ] User-focused dashboard
- [ ] Notification system (bell icon, badge count)
- [ ] At-a-glance metrics
- [ ] Keyboard shortcuts
- [ ] Auto-save implementation
- [ ] Real-time validation
- [ ] Polish: loading states, error handling, responsive design
- [ ] Dark mode

**Testing & QA:**
- [ ] Full regression testing
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit (508 compliance)
- [ ] Security audit
- [ ] Performance testing
- [ ] User acceptance testing (UAT) with customer stakeholders

**Production Prep:**
- [ ] Production environment setup
- [ ] Monitoring dashboards configured
- [ ] Alert rules defined
- [ ] Backup/disaster recovery tested
- [ ] Security hardening complete
- [ ] Documentation for users (help guides)
- [ ] Training materials (if needed)

---

## Development Approach

### Agile Sprints (2-week iterations)

**Sprint 1-2:** Foundation + Infrastructure
**Sprint 3-4:** Core Operations
**Sprint 5-6:** Distribution & Completion
**Sprint 7-8:** Delight & Hardening

### Weekly Check-ins with Friend
- Demo working features
- Get feedback
- Adjust priorities if needed
- Validate assumptions

### Continuous Validation
- Show working software early and often
- Get feedback before building deep
- Pivot quickly if assumptions are wrong
- Maintain "ship fast" mindset

---

## Quality Gates

### Cannot Ship to Production Without:

**Functionality:**
- ✅ All P0 features working end-to-end
- ✅ Zero critical bugs
- ✅ All Tier 1 questions answered and implemented correctly

**Security:**
- ✅ MFA enforced
- ✅ Row-level security tested and verified
- ✅ Document encryption at rest and in transit
- ✅ Security audit passed

**Reliability:**
- ✅ Error tracking configured and tested
- ✅ Uptime monitoring with alerts
- ✅ Database backups automated
- ✅ Disaster recovery plan tested

**Compliance:**
- ✅ Audit logging comprehensive
- ✅ Data retention policies implemented
- ✅ Access control audit trail complete

**User Experience:**
- ✅ Responsive on desktop, tablet, mobile
- ✅ 508 accessibility compliance
- ✅ Cross-browser compatibility (Chrome, Firefox, Edge, Safari)
- ✅ Performance: <2s page load, <500ms interactions

**Documentation:**
- ✅ User help guides
- ✅ Admin documentation
- ✅ API documentation (for future integrations)
- ✅ Runbook for operations

---

## Risk Mitigation

### Top Risks & Mitigations

**Risk 1: Building Wrong Thing (Game of Telephone)**
- **Mitigation:** Weekly demos to stakeholders, validation doc, mockups before code
- **Contingency:** Modular architecture allows pivots

**Risk 2: Scope Creep**
- **Mitigation:** Strict P0/P1 prioritization, explicit cut list, "no new features" rule
- **Contingency:** Push to Phase 2 if new requests emerge

**Risk 3: Timeline Slip**
- **Mitigation:** 2-week sprints with shippable increments, ruthless prioritization
- **Contingency:** Ship P0 only in 6 weeks, add P1 features in weeks 7-8

**Risk 4: Technical Complexity**
- **Mitigation:** Use proven technologies, avoid custom solutions for standard problems
- **Contingency:** Simplify approach (e.g., if PDF generation is hard, use simpler library)

**Risk 5: Another System Failure**
- **Mitigation:** Cloud-hosted (no hardware), monitoring/alerts, automated backups
- **Contingency:** Multi-region deployment, failover plans

---

## Phase 2+ Roadmap (Post-MVP)

**After Phase 1 ships and users are operational:**

### Phase 2A: Advanced Time-Savers (2-3 weeks)
- Smart suggestions and auto-complete intelligence
- NDA health monitoring and proactive alerts
- Expiration calendar view
- Context menus and advanced keyboard shortcuts

### Phase 2B: Optional Enhancements (Validate First)
- DocuSign/e-signature integration (if requested)
- Lightweight workflow approvals (if needed)
- Template management UI (if multiple templates)
- Advanced analytics dashboard (if desired)

### Phase 3: Future Innovations (Based on Usage Data)
- Features identified through Google Analytics
- User-requested enhancements
- Competitive differentiators
- Integration with other government systems

---

## Success Definition

**Phase 1 is successful if:**

1. ✅ Users are fully operational (can create/track/complete NDAs)
2. ✅ System is faster and easier than legacy
3. ✅ Zero critical production issues in first 30 days
4. ✅ Users provide positive feedback ("this is so much better!")
5. ✅ Delivered on time (8 weeks or less)
6. ✅ Foundation supports Phase 2 enhancements without major refactoring

**Measurement:**
- User satisfaction survey (post-launch)
- Time to complete NDA (vs. legacy baseline)
- System uptime (99.9% target)
- Bug count (zero critical, <5 medium in first month)
- Adoption rate (100% of users migrated within 2 weeks)

---

## Next Immediate Actions

**This Week:**
1. ✅ Complete brainstorming session (done!)
2. ✅ Create validation doc for customer meeting (done!)
3. ✅ Create feature priority matrix (done!)
4. ✅ Create build plan (this document - done!)
5. ⏭️ Schedule customer validation meeting
6. ⏭️ Technical spike: React 19 + Vite vs. Next.js evaluation (2 days)
7. ⏭️ Create database schema based on legacy data model
8. ⏭️ Set up project repository and infrastructure

**Next Week (After Customer Validation):**
1. Finalize technical architecture based on customer answers
2. Refine build plan based on feedback
3. Begin Sprint 1: Foundation setup
4. Start building!

---

## Handoff to BMad Method Planning Workflows

**After customer validation complete:**

### Next BMad Workflow: Create PRD
- **Agent:** pm
- **Command:** `/bmad:bmm:workflows:create-prd`
- **Input:**
  - `docs/legacy-screens-requirements.md` (baseline)
  - `docs/assumptions-validation-doc.md` (validated answers)
  - `docs/feature-priority-matrix.md` (scope decisions)
  - This build plan (implementation approach)

### Then: Create Architecture
- **Agent:** architect
- **Command:** `/bmad:bmm:workflows:create-architecture`
- **Purpose:** Design actual system architecture with validated requirements

### Then: Create Epics & Stories
- **Agent:** pm
- **Command:** `/bmad:bmm:workflows:create-epics-stories`
- **Purpose:** Break down into implementable user stories

---

## Dependencies & Assumptions

### External Dependencies
- Customer validation meeting (blocks everything)
- Cloud provider account access
- Email service provider account
- Monitoring service accounts (Sentry, New Relic)
- Document storage bucket

### Technical Assumptions
- React 19 is stable and production-ready (validate during spike)
- Serverless architecture is appropriate for scale (validate with Tier 2 Q9 - volume)
- PDF generation libraries are sufficient (vs. custom RTF)
- Email service can handle government security requirements

### Business Assumptions
- Users will adopt modern UI (replacement window opportunity)
- Email templates will save time (validate Tier 3 Q12)
- Notification system will engage users (validate Tier 3 Q15)
- Dashboard provides value (validate Tier 3 Q14)

---

## Rollout Strategy

### Beta Phase (Week 7)
- Deploy to staging environment
- Friend + 2-3 customer power users test
- Collect feedback and fix critical issues
- Performance and security validation

### Production Launch (Week 8)
- Deploy to production
- Migrate all users (training session if needed)
- Monitor closely for first 48 hours
- On-call support for first week
- Daily check-ins with stakeholders for user feedback

### Post-Launch (Week 9+)
- Monitor usage analytics
- Collect feature adoption data
- Identify Phase 2 priorities
- Address any bugs or UX issues
- Plan enhancements based on real usage

---

## Team & Resources

### Required Roles
- **Full-Stack Developer:** You (primary developer)
- **Customer Liaison:** Friend (requirements validation, feedback)
- **End Users:** Customer staff (UAT, feedback)

### Optional Support
- **UI/UX Designer:** Polish and visual design (if budget allows)
- **QA Engineer:** Testing support (or you handle it)
- **DevOps:** Infrastructure setup (or you handle it)

---

## Budget Considerations

### Infrastructure Costs (Monthly Estimates)
- Cloud hosting: $50-200/month (depends on scale)
- Database: $25-100/month
- Document storage: $10-50/month
- Email service: $10-50/month (volume-based)
- Monitoring: $50-150/month (New Relic/Datadog)
- Domain + SSL: $20/month

**Total:** ~$165-570/month depending on scale and services

### Optional Services (Phase 2+)
- DocuSign: $25-40/user/month (if adopted)
- Advanced analytics: $100-300/month (if needed)

---

## Definition of Done

**Phase 1 is complete when:**

- [x] All P0 features implemented and tested
- [x] All P1 features implemented (or explicitly deferred with customer approval)
- [x] Security audit passed
- [x] Performance benchmarks met (<2s loads, <500ms interactions)
- [x] Accessibility compliance verified
- [x] User acceptance testing completed
- [x] Production deployment successful
- [x] Monitoring and alerts operational
- [x] Users are trained and operational
- [x] Documentation complete
- [x] Friend confirms: "Customer is happy"

---

## Communication Plan

### Weekly Progress Updates
- Completed work summary
- Demo of working features
- Blockers or questions requiring customer input
- Next week's development plan

### Customer Touchpoints
- **Week 0:** Requirements validation meeting
- **Week 4:** Mid-point demo (core features working)
- **Week 7:** Beta testing and user acceptance
- **Week 8:** Production launch
- **Week 9:** Post-launch feedback session

---

## Contingency Plans

### If Timeline Slips
- Ship P0 only (core operations)
- Move P1 features to Phase 1.5 (2 weeks post-launch)
- Communicate early, adjust expectations

### If Customer Feedback Requires Major Changes
- Evaluate impact on timeline
- Reprioritize feature matrix
- Potentially scope down to absolute minimum
- Communicate trade-offs and options clearly

### If Technical Challenges Arise
- Simplify approach (proven solutions over custom)
- Defer complex features to Phase 2
- Engage additional technical expertise if needed

---

## Key Success Factors

1. **Customer validation BEFORE building** (avoid game-of-telephone failures)
2. **Ship fast, ship quality** (they need operational system NOW)
3. **Modular architecture** (allows pivots and future enhancements)
4. **Comprehensive monitoring** (never let system fail silently)
5. **User delight focus** (exceed expectations, not just meet requirements)
6. **Weekly demos** (continuous validation, early course correction)
7. **Ruthless prioritization** (cut features that don't serve core mission)

---

**Last Updated:** 2025-12-12
**Status:** Awaiting customer validation to finalize and begin Sprint 1
**Next Milestone:** Customer validation meeting → Technical spike → Development kickoff
