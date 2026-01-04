#!/usr/bin/env python3
"""
Clean Repetitive Content from Story Files
Removes paragraphs that appear more than 2 times in a file

Usage:
  python clean-repetitions.py --epic 7              # Clean Epic 7 only
  python clean-repetitions.py --all                 # Clean all stories
  python clean-repetitions.py --dry-run             # Preview changes
"""

import os
import sys
import argparse
from pathlib import Path
from collections import defaultdict

STORY_DIR = Path("_bmad-output/implementation-artifacts/sprint-artifacts")


def clean_repetitions(filepath: Path, dry_run: bool = True) -> int:
    """Remove repetitive paragraphs from a story file"""

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into paragraphs (double newline separated)
    paragraphs = content.split('\n\n')

    # Track paragraph occurrences (only for substantial paragraphs >50 chars)
    para_counts = defaultdict(int)
    para_indices = defaultdict(list)

    for i, para in enumerate(paragraphs):
        cleaned = para.strip()
        if len(cleaned) > 50:  # Only track substantial paragraphs
            para_counts[cleaned] += 1
            para_indices[cleaned].append(i)

    # Find paragraphs that appear more than 2 times
    repetitive_paras = {p: count for p, count in para_counts.items() if count > 2}

    if not repetitive_paras:
        return 0  # No repetitions found

    # Remove duplicates (keep first occurrence, remove rest)
    cleaned_paragraphs = []
    seen_paras = set()
    removed_count = 0

    for i, para in enumerate(paragraphs):
        cleaned = para.strip()

        # If this is a repetitive paragraph
        if cleaned in repetitive_paras:
            if cleaned not in seen_paras:
                # Keep first occurrence
                cleaned_paragraphs.append(para)
                seen_paras.add(cleaned)
            else:
                # Skip duplicates
                removed_count += 1
        else:
            # Keep non-repetitive paragraphs
            cleaned_paragraphs.append(para)

    if removed_count > 0:
        new_content = '\n\n'.join(cleaned_paragraphs)

        if dry_run:
            print(f"Would remove {removed_count} repetitions from {filepath.name}")
            for para, count in repetitive_paras.items():
                preview = para[:60] + "..." if len(para) > 60 else para
                print(f"  - '{preview}' appears {count} times")
        else:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ Removed {removed_count} repetitions from {filepath.name}")
            for para, count in repetitive_paras.items():
                preview = para[:60] + "..." if len(para) > 60 else para
                print(f"  - '{preview}' appeared {count} times (kept 1)")

    return removed_count


def main():
    parser = argparse.ArgumentParser(description="Clean repetitive content from story files")
    parser.add_argument('--epic', type=int, help='Clean only specified epic')
    parser.add_argument('--all', action='store_true', help='Clean all story files')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without modifying files')

    args = parser.parse_args()

    if not args.epic and not args.all:
        print("Error: Must specify --epic N or --all")
        sys.exit(1)

    # Change to project root
    project_root = Path(__file__).parent.parent.parent
    os.chdir(project_root)

    if not STORY_DIR.exists():
        print(f"❌ Story directory not found: {STORY_DIR}")
        sys.exit(1)

    # Get story files to process
    if args.epic:
        story_files = sorted(STORY_DIR.glob(f"{args.epic}-*.md"))
        print(f"🧹 Cleaning Epic {args.epic} stories ({len(story_files)} files)\n")
    else:
        story_files = sorted(STORY_DIR.glob("[0-9]*.md"))
        print(f"🧹 Cleaning all story files ({len(story_files)} files)\n")

    if args.dry_run:
        print("[DRY RUN MODE - No files will be modified]\n")

    total_removed = 0
    files_cleaned = 0

    for filepath in story_files:
        removed = clean_repetitions(filepath, args.dry_run)
        if removed > 0:
            files_cleaned += 1
            total_removed += removed

    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Summary:")
    print(f"Files processed: {len(story_files)}")
    print(f"Files with repetitions: {files_cleaned}")
    print(f"Total repetitions removed: {total_removed}")

    if args.dry_run:
        print("\nRun without --dry-run to actually modify files")


if __name__ == "__main__":
    main()
