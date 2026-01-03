# BMM Workflows

## Available Workflows in bmm

**create-product-brief**
- Path: `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`
- Create comprehensive product briefs through collaborative step-by-step discovery as creative Business Analyst working with the user as peers.

**research**
- Path: `_bmad/bmm/workflows/1-analysis/research/workflow.md`
- Conduct comprehensive research across multiple domains using current web data and verified sources - Market, Technical, Domain and other research types.

**create-ux-design**
- Path: `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`
- Work with a peer UX Design expert to plan your applications UX patterns, look and feel.

**create-prd**
- Path: `_bmad/bmm/workflows/2-plan-workflows/prd/workflow.md`
- Creates a comprehensive PRD through collaborative step-by-step discovery between two product managers working as peers.

**check-implementation-readiness**
- Path: `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`
- Critical validation workflow that assesses PRD, Architecture, and Epics & Stories for completeness and alignment before implementation. Uses adversarial review approach to find gaps and issues.

**create-architecture**
- Path: `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`
- Collaborative architectural decision facilitation for AI-agent consistency. Replaces template-driven architecture with intelligent, adaptive conversation that produces a decision-focused architecture document optimized for preventing agent conflicts.

**create-epics-and-stories**
- Path: `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`
- Transform PRD requirements and Architecture decisions into comprehensive stories organized by user value. This workflow requires completed PRD + Architecture documents (UX recommended if UI exists) and breaks down requirements into implementation-ready epics and user stories that incorporate all available technical and design context. Creates detailed, actionable stories with complete acceptance criteria for development teams.

**autonomous-epic**
- Path: `_bmad/bmm/workflows/4-implementation/autonomous-epic/workflow.yaml`
- Autonomous epic processing using super-dev-pipeline - creates and develops all stories in an epic with minimal human intervention. Step-file architecture with smart batching!

**code-review**
- Path: `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml`
- Perform an ADVERSARIAL Senior Developer code review that finds 3-10 specific problems in every story. Challenges everything: code quality, test coverage, architecture compliance, security, performance. NEVER accepts `looks good` - must find minimum issues and can auto-fix with user approval.

**correct-course**
- Path: `_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml`
- Navigate significant changes during sprint execution by analyzing impact, proposing solutions, and routing for implementation

**create-story**
- Path: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Create the next user story from epics+stories with enhanced context analysis and direct ready-for-dev marking

**create-story-with-gap-analysis**
- Path: `_bmad/bmm/workflows/4-implementation/create-story-with-gap-analysis/workflow.yaml`
- Create/regenerate story with SYSTEMATIC codebase gap analysis using verified file scanning (Glob/Read tools)

**dev-story**
- Path: `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Execute a story by implementing tasks/subtasks, writing tests, validating, and updating the story file per acceptance criteria

**gap-analysis**
- Path: `_bmad/bmm/workflows/4-implementation/gap-analysis/workflow.yaml`
- Validate story tasks against actual codebase - audit completed stories or validate before development

**push-all**
- Path: `_bmad/bmm/workflows/4-implementation/push-all/workflow.yaml`
- Stage changes, create commit with safety checks, and push to remote

**recover-sprint-status**
- Path: `_bmad/bmm/workflows/4-implementation/recover-sprint-status/workflow.yaml`
- Recover sprint-status.yaml when tracking has drifted. Analyzes story files, git commits, and autonomous reports to rebuild accurate status.

**retrospective**
- Path: `_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml`
- Run after epic completion to review overall success, extract lessons learned, and explore if new information emerged that might impact the next epic

**sprint-planning**
- Path: `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml`
- Generate and manage the sprint status tracking file for Phase 4 implementation, extracting all epics and stories from epic files and tracking their status through the development lifecycle

**sprint-status**
- Path: `_bmad/bmm/workflows/4-implementation/sprint-status/workflow.yaml`
- Summarize sprint-status.yaml, surface risks, and route to the right implementation workflow.

**story-pipeline**
- Path: `_bmad/bmm/workflows/4-implementation/story-pipeline/workflow.yaml`
- Automated story development pipeline with token-efficient step-file architecture. Replaces separate Claude calls with single-session orchestration.

**super-dev-pipeline**
- Path: `_bmad/bmm/workflows/4-implementation/super-dev-pipeline/workflow.yaml`
- Step-file architecture with smart batching - works for both greenfield and brownfield development with disciplined execution and intelligent task grouping

**super-dev-story**
- Path: `_bmad/bmm/workflows/4-implementation/super-dev-story/workflow.yaml`
- Enhanced story development with post-implementation validation and automated code review - ensures stories are truly complete before marking done

**validate-all-epics**
- Path: `_bmad/bmm/workflows/4-implementation/validate-all-epics/workflow.yaml`
- Validate and fix sprint-status.yaml for ALL epics. Runs validate-epic-status on every epic in parallel, consolidates results, rebuilds accurate sprint-status.yaml.

**validate-all-stories**
- Path: `_bmad/bmm/workflows/4-implementation/validate-all-stories/workflow.yaml`
- Comprehensive audit of ALL stories: verify tasks against codebase, run code quality reviews, check integrations. The bulletproof audit for production readiness.

**validate-all-stories-deep**
- Path: `_bmad/bmm/workflows/4-implementation/validate-all-stories-deep/workflow.yaml`
- Comprehensive platform audit using Haiku agents. Validates ALL stories by reading actual code. The bulletproof validation for production readiness.

**validate-epic-status**
- Path: `_bmad/bmm/workflows/4-implementation/validate-epic-status/workflow.yaml`
- Validate and fix sprint-status.yaml for a single epic. Scans story files for task completion, validates quality (>10KB, proper tasks), checks git commits, updates sprint-status.yaml to match REALITY.

**validate-story**
- Path: `_bmad/bmm/workflows/4-implementation/validate-story/workflow.yaml`
- Deep validation of a single story: verify tasks against codebase, run code quality review, check for regressions. Produces verification report with actionable findings.

**validate-story-deep**
- Path: `_bmad/bmm/workflows/4-implementation/validate-story-deep/workflow.yaml`
- Deep story validation using Haiku agents to read and verify actual code. Each task gets micro code review to verify implementation quality.

**create-tech-spec**
- Path: `_bmad/bmm/workflows/bmad-quick-flow/create-tech-spec/workflow.md`
- Conversational spec engineering - ask questions, investigate code, produce implementation-ready tech-spec.

**quick-dev**
- Path: `_bmad/bmm/workflows/bmad-quick-flow/quick-dev/workflow.md`
- Flexible development - execute tech-specs OR direct instructions with optional planning.

**document-project**
- Path: `_bmad/bmm/workflows/document-project/workflow.yaml`
- Analyzes and documents brownfield projects by scanning codebase, architecture, and patterns to create comprehensive reference documentation for AI-assisted development

**create-excalidraw-dataflow**
- Path: `_bmad/bmm/workflows/excalidraw-diagrams/create-dataflow/workflow.yaml`
- Create data flow diagrams (DFD) in Excalidraw format

**create-excalidraw-diagram**
- Path: `_bmad/bmm/workflows/excalidraw-diagrams/create-diagram/workflow.yaml`
- Create system architecture diagrams, ERDs, UML diagrams, or general technical diagrams in Excalidraw format

**create-excalidraw-flowchart**
- Path: `_bmad/bmm/workflows/excalidraw-diagrams/create-flowchart/workflow.yaml`
- Create a flowchart visualization in Excalidraw format for processes, pipelines, or logic flows

**create-excalidraw-wireframe**
- Path: `_bmad/bmm/workflows/excalidraw-diagrams/create-wireframe/workflow.yaml`
- Create website or app wireframes in Excalidraw format

**generate-project-context**
- Path: `_bmad/bmm/workflows/generate-project-context/workflow.md`
- Creates a concise project-context.md file with critical rules and patterns that AI agents must follow when implementing code. Optimized for LLM context efficiency.

**testarch-atdd**
- Path: `_bmad/bmm/workflows/testarch/atdd/workflow.yaml`
- Generate failing acceptance tests before implementation using TDD red-green-refactor cycle

**testarch-automate**
- Path: `_bmad/bmm/workflows/testarch/automate/workflow.yaml`
- Expand test automation coverage after implementation or analyze existing codebase to generate comprehensive test suite

**testarch-ci**
- Path: `_bmad/bmm/workflows/testarch/ci/workflow.yaml`
- Scaffold CI/CD quality pipeline with test execution, burn-in loops, and artifact collection

**testarch-framework**
- Path: `_bmad/bmm/workflows/testarch/framework/workflow.yaml`
- Initialize production-ready test framework architecture (Playwright or Cypress) with fixtures, helpers, and configuration

**testarch-nfr**
- Path: `_bmad/bmm/workflows/testarch/nfr-assess/workflow.yaml`
- Assess non-functional requirements (performance, security, reliability, maintainability) before release with evidence-based validation

**testarch-test-design**
- Path: `_bmad/bmm/workflows/testarch/test-design/workflow.yaml`
- Dual-mode workflow: (1) System-level testability review in Solutioning phase, or (2) Epic-level test planning in Implementation phase. Auto-detects mode based on project phase.

**testarch-test-review**
- Path: `_bmad/bmm/workflows/testarch/test-review/workflow.yaml`
- Review test quality using comprehensive knowledge base and best practices validation

**testarch-trace**
- Path: `_bmad/bmm/workflows/testarch/trace/workflow.yaml`
- Generate requirements-to-tests traceability matrix, analyze coverage, and make quality gate decision (PASS/CONCERNS/FAIL/WAIVED)

**workflow-init**
- Path: `_bmad/bmm/workflows/workflow-status/init/workflow.yaml`
- Initialize a new BMM project by determining level, type, and creating workflow path

**workflow-status**
- Path: `_bmad/bmm/workflows/workflow-status/workflow.yaml`
- Lightweight status checker - answers ""what should I do now?"" for any agent. Reads YAML status file for workflow tracking. Use workflow-init for new projects.


## Execution

When running any workflow:
1. LOAD {project-root}/_bmad/core/tasks/workflow.xml
2. Pass the workflow path as 'workflow-config' parameter
3. Follow workflow.xml instructions EXACTLY
4. Save outputs after EACH section

## Modes
- Normal: Full interaction
- #yolo: Skip optional steps
