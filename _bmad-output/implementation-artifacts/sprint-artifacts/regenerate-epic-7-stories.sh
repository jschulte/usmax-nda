#!/bin/bash
# Batch regenerate Epic 7 stories using create-story-with-gap-analysis workflow
# Generated: 2026-01-03

set -e

STORIES=(
  "7-3"
  "7-5"
  "7-6"
  "7-7"
  "7-8"
  "7-9"
  "7-10"
  "7-11"
  "7-12"
  "7-13"
  "7-14"
  "7-15"
  "7-16"
  "7-17"
  "7-18"
  "7-19"
)

PROJECT_ROOT="/Users/jonahschulte/git/usmax-nda"
WORKFLOW_PATH="_bmad/bmm/workflows/4-implementation/create-story-with-gap-analysis"
LOG_DIR="$PROJECT_ROOT/logs/story-regeneration"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$LOG_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  Epic 7 Story Regeneration - create-story-with-gap-analysis"
echo "═══════════════════════════════════════════════════════════════"
echo "Stories to regenerate: ${#STORIES[@]}"
echo "Log directory: $LOG_DIR"
echo ""

COMPLETED=0
FAILED=0

for STORY_ID in "${STORIES[@]}"; do
  echo "───────────────────────────────────────────────────────────────"
  echo "Processing Story $STORY_ID..."
  echo "───────────────────────────────────────────────────────────────"

  LOG_FILE="$LOG_DIR/regenerate-$STORY_ID-$TIMESTAMP.log"

  # Build prompt for Claude CLI
  PROMPT=$(cat << EOF
Execute BMAD workflow: create-story-with-gap-analysis

STORY ID: $STORY_ID
WORKFLOW: $WORKFLOW_PATH/workflow.yaml
MODE: batch (auto-proceed, no interactive prompts)

INSTRUCTIONS:
1. Read workflow.yaml to understand the workflow
2. Execute step-01-initialize.md (load story $STORY_ID context)
3. Execute step-02-codebase-scan.md (perform gap analysis)
4. Execute step-03-generate-story.md (regenerate story file)

AUTO-APPROVE: Proceed through all steps without user input
OUTPUT: Regenerated story file with verified gap analysis

BEGIN workflow execution now.
EOF
)

  # Execute using Claude CLI
  cd "$PROJECT_ROOT"

  if claude -p "$PROMPT" --dangerously-skip-permissions 2>&1 | tee "$LOG_FILE"; then
    echo "✅ Story $STORY_ID regenerated successfully"
    echo "   Log: $LOG_FILE"
    ((COMPLETED++))
  else
    echo "❌ Story $STORY_ID failed"
    echo "   Log: $LOG_FILE"
    ((FAILED++))
  fi

  echo ""
done

echo "═══════════════════════════════════════════════════════════════"
echo "  Regeneration Complete"
echo "═══════════════════════════════════════════════════════════════"
echo "Completed: $COMPLETED"
echo "Failed: $FAILED"
echo "Total: ${#STORIES[@]}"
echo ""
echo "Logs: $LOG_DIR"
echo "═══════════════════════════════════════════════════════════════"
