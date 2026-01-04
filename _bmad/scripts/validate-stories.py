#!/usr/bin/env python3
"""
Story File Validation Script
Detects corrupted story files before they cause implementation problems

Usage:
  python validate-stories.py                    # Validate all stories
  python validate-stories.py --epic 7           # Validate Epic 7 only
  python validate-stories.py --fix-checkboxes   # Auto-uncheck all boxes (DANGEROUS)
  python validate-stories.py --verbose          # Show detailed output

Exit codes:
  0 = All stories valid
  1 = Validation errors found
"""

import os
import sys
import re
import argparse
from pathlib import Path
from typing import List, Tuple, Dict
from collections import defaultdict

# Validation thresholds
MIN_FILE_SIZE = 10 * 1024  # 10KB
RECOMMENDED_SIZE = 15 * 1024  # 15KB
MAX_REPETITIONS = 3  # Same paragraph appearing more than this is suspicious
MIN_TASKS = 20  # Minimum number of task checkboxes

# Common template placeholders that should be filled in
TEMPLATE_PLACEHOLDERS = [
    "[Add technical notes]",
    "[TODO",
    "TBD",
    "[PLACEHOLDER]",
    "FIXME",
]

# Story file location
STORY_DIR = Path("_bmad-output/implementation-artifacts/sprint-artifacts")


class ValidationError:
    def __init__(self, story_file: str, severity: str, message: str):
        self.story_file = story_file
        self.severity = severity  # 'critical', 'warning', 'info'
        self.message = message

    def __str__(self):
        icon = "🔴" if self.severity == "critical" else "⚠️" if self.severity == "warning" else "ℹ️"
        return f"{icon} {self.story_file}: {self.message}"


def validate_story_file(filepath: Path) -> List[ValidationError]:
    """Validate a single story file"""
    errors = []
    filename = filepath.name

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception as e:
        errors.append(ValidationError(
            filename, "critical", f"Failed to read file: {e}"
        ))
        return errors

    # Check 1: File size
    file_size = filepath.stat().st_size
    if file_size < MIN_FILE_SIZE:
        errors.append(ValidationError(
            filename, "critical",
            f"File too small: {file_size} bytes (minimum: {MIN_FILE_SIZE} bytes)"
        ))
    elif file_size < RECOMMENDED_SIZE:
        errors.append(ValidationError(
            filename, "warning",
            f"File below recommended size: {file_size} bytes (recommended: {RECOMMENDED_SIZE} bytes)"
        ))

    # Check 2: Repetitive content (copy-paste loops)
    paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
    paragraph_counts = defaultdict(int)
    for para in paragraphs:
        paragraph_counts[para] += 1

    for para, count in paragraph_counts.items():
        if count > MAX_REPETITIONS:
            preview = para[:80] + "..." if len(para) > 80 else para
            errors.append(ValidationError(
                filename, "critical",
                f"Repetitive content: paragraph appears {count} times: \"{preview}\""
            ))

    # Check 3: Task checkboxes
    checked_boxes = content.count('- [x]') + content.count('- [X]')
    unchecked_boxes = content.count('- [ ]')
    total_boxes = checked_boxes + unchecked_boxes

    if total_boxes == 0:
        errors.append(ValidationError(
            filename, "critical",
            "No task checkboxes found (should have 40-80 tasks)"
        ))
    elif total_boxes < MIN_TASKS:
        errors.append(ValidationError(
            filename, "warning",
            f"Too few tasks: {total_boxes} (recommended: 40-80)"
        ))

    if checked_boxes > 0:
        ratio = (checked_boxes / total_boxes) * 100 if total_boxes > 0 else 0
        errors.append(ValidationError(
            filename, "critical",
            f"Found {checked_boxes} checked boxes (all should be unchecked [ ]). {ratio:.1f}% of tasks incorrectly marked complete."
        ))

    # Check 4: Template placeholders not filled in
    for placeholder in TEMPLATE_PLACEHOLDERS:
        if placeholder in content:
            errors.append(ValidationError(
                filename, "warning",
                f"Template placeholder not filled: \"{placeholder}\""
            ))

    # Check 5: Story structure (has required sections)
    required_sections = [
        "## Story",
        "## Acceptance Criteria",
        "## Tasks",
        "## Dev Notes",
    ]
    for section in required_sections:
        if section not in content:
            errors.append(ValidationError(
                filename, "critical",
                f"Missing required section: {section}"
            ))

    # Check 6: Acceptance criteria quality
    ac_count = len(re.findall(r'\*\*Given\*\*|\*\*When\*\*|\*\*Then\*\*', content))
    if ac_count < 5:
        errors.append(ValidationError(
            filename, "warning",
            f"Too few acceptance criteria: {ac_count // 3} (recommended: 5-7)"
        ))

    return errors


def validate_all_stories(epic_filter: int = None, verbose: bool = False) -> Tuple[List[ValidationError], Dict]:
    """Validate all story files, optionally filtered by epic"""
    all_errors = []
    stats = {
        'total_files': 0,
        'valid_files': 0,
        'files_with_errors': 0,
        'critical_errors': 0,
        'warnings': 0,
        'total_size': 0,
        'avg_size': 0,
    }

    if not STORY_DIR.exists():
        print(f"❌ Story directory not found: {STORY_DIR}")
        return all_errors, stats

    # Get all .md files
    story_files = sorted(STORY_DIR.glob("[0-9]*.md"))

    # Filter by epic if specified
    if epic_filter is not None:
        story_files = [f for f in story_files if f.name.startswith(f"{epic_filter}-")]

    for filepath in story_files:
        stats['total_files'] += 1
        stats['total_size'] += filepath.stat().st_size

        errors = validate_story_file(filepath)

        if errors:
            stats['files_with_errors'] += 1
            all_errors.extend(errors)

            for error in errors:
                if error.severity == "critical":
                    stats['critical_errors'] += 1
                elif error.severity == "warning":
                    stats['warnings'] += 1
        else:
            stats['valid_files'] += 1

        if verbose and errors:
            print(f"\n{filepath.name}:")
            for error in errors:
                print(f"  {error}")

    if stats['total_files'] > 0:
        stats['avg_size'] = stats['total_size'] // stats['total_files']

    return all_errors, stats


def fix_checkboxes(epic_filter: int = None, dry_run: bool = True):
    """Auto-uncheck all checkboxes in story files (DANGEROUS - use with caution)"""
    story_files = sorted(STORY_DIR.glob("[0-9]*.md"))

    if epic_filter is not None:
        story_files = [f for f in story_files if f.name.startswith(f"{epic_filter}-")]

    modified_count = 0
    checkbox_count = 0

    for filepath in story_files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace all [x] and [X] with [ ]
        original_content = content
        content = re.sub(r'- \[x\]', '- [ ]', content, flags=re.IGNORECASE)

        if content != original_content:
            changes = original_content.count('- [x]') + original_content.count('- [X]')
            checkbox_count += changes

            if dry_run:
                print(f"Would uncheck {changes} boxes in {filepath.name}")
            else:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✓ Unchecked {changes} boxes in {filepath.name}")
                modified_count += 1

    if dry_run:
        print(f"\n[DRY RUN] Would modify {len([f for f in story_files if '-' in f.name])} files, unchecking {checkbox_count} boxes")
        print("Run with --no-dry-run to actually modify files")
    else:
        print(f"\n✅ Modified {modified_count} files, unchecked {checkbox_count} total boxes")


def main():
    parser = argparse.ArgumentParser(description="Validate BMAD story files")
    parser.add_argument('--epic', type=int, help='Validate only specified epic (e.g., --epic 7)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed errors')
    parser.add_argument('--fix-checkboxes', action='store_true', help='Auto-uncheck all checkboxes')
    parser.add_argument('--no-dry-run', action='store_true', help='Actually modify files (with --fix-checkboxes)')
    parser.add_argument('--summary', '-s', action='store_true', help='Show summary only')

    args = parser.parse_args()

    # Change to project root
    project_root = Path(__file__).parent.parent.parent
    os.chdir(project_root)

    if args.fix_checkboxes:
        print("🔧 CHECKBOX FIX MODE\n")
        fix_checkboxes(args.epic, dry_run=not args.no_dry_run)
        return

    print("📋 BMAD Story File Validation\n")
    if args.epic:
        print(f"Validating Epic {args.epic} stories only...\n")

    errors, stats = validate_all_stories(args.epic, args.verbose)

    # Print summary
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)
    print(f"Total files scanned:     {stats['total_files']}")
    print(f"Valid files:             {stats['valid_files']} ✅")
    print(f"Files with errors:       {stats['files_with_errors']}")
    print(f"Critical errors:         {stats['critical_errors']} 🔴")
    print(f"Warnings:                {stats['warnings']} ⚠️")
    print(f"Average file size:       {stats['avg_size'] // 1024}KB")
    print("="*60)

    # Group errors by severity
    critical_errors = [e for e in errors if e.severity == "critical"]
    warnings = [e for e in errors if e.severity == "warning"]

    if critical_errors and not args.summary:
        print(f"\n🔴 CRITICAL ERRORS ({len(critical_errors)}):\n")
        for error in critical_errors[:20]:  # Show first 20
            print(f"  {error}")
        if len(critical_errors) > 20:
            print(f"  ... and {len(critical_errors) - 20} more critical errors")

    if warnings and not args.summary and args.verbose:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):\n")
        for error in warnings[:20]:
            print(f"  {error}")
        if len(warnings) > 20:
            print(f"  ... and {len(warnings) - 20} more warnings")

    # Exit code
    if stats['critical_errors'] > 0:
        print("\n❌ VALIDATION FAILED - Critical errors found")
        sys.exit(1)
    elif stats['files_with_errors'] > 0:
        print("\n⚠️  VALIDATION PASSED with warnings")
        sys.exit(0)
    else:
        print("\n✅ ALL STORIES VALID")
        sys.exit(0)


if __name__ == "__main__":
    main()
