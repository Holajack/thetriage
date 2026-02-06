#!/bin/bash
# Setup Git Worktrees for Parallel Quiz Fix Development
# Run from the main thetriage directory

set -e

echo "🔧 Setting up git worktrees for parallel development..."

# Get the parent directory
PARENT_DIR=$(dirname "$(pwd)")

# Create worktrees for each session's tasks
# Session 1: QZ-001 (schema) and QZ-002 (progress)
echo "📁 Creating worktree for Session 1 (QZ-001, QZ-002)..."
git worktree add "$PARENT_DIR/thetriage-s1" -b fix/quiz-schema-validation 2>/dev/null || \
    echo "   Branch already exists, using existing worktree"

# Session 2: QZ-003 (double-tap) and QZ-004 (undefined func)
echo "📁 Creating worktree for Session 2 (QZ-003, QZ-004)..."
git worktree add "$PARENT_DIR/thetriage-s2" -b fix/quiz-start-flow 2>/dev/null || \
    echo "   Branch already exists, using existing worktree"

# Session 3: QZ-005 (question count) and QZ-006 (mode selector)
echo "📁 Creating worktree for Session 3 (QZ-005, QZ-006)..."
git worktree add "$PARENT_DIR/thetriage-s3" -b fix/quiz-question-count 2>/dev/null || \
    echo "   Branch already exists, using existing worktree"

echo ""
echo "✅ Worktrees created successfully!"
echo ""
echo "📍 Worktree locations:"
echo "   Session 1: $PARENT_DIR/thetriage-s1 (fix/quiz-schema-validation)"
echo "   Session 2: $PARENT_DIR/thetriage-s2 (fix/quiz-start-flow)"
echo "   Session 3: $PARENT_DIR/thetriage-s3 (fix/quiz-question-count)"
echo ""
echo "🚀 To start working in a session:"
echo "   cd $PARENT_DIR/thetriage-s1"
echo "   # Open a new Claude Code instance here"
echo ""
echo "📋 Task assignments:"
echo "   Session 1: QZ-001 (schema error), QZ-002 (progress bar)"
echo "   Session 2: QZ-003 (double-tap), QZ-004 (undefined function)"
echo "   Session 3: QZ-005 (question count), QZ-006 (mode selector)"
echo ""
echo "🔄 To update task status:"
echo "   python execution/update_task.py QZ-001 in_progress"
echo "   python execution/update_task.py --list"
