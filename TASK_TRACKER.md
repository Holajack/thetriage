# Quiz System Fix - Multi-Agent Task Tracker

> **Last Updated**: 2026-02-05
> **Project**: Quiz System Bug Fixes & Enhancements
> **Total Tasks**: 12 | **Completed**: 0 | **In Progress**: 0

---

## Task Status Legend
| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Being worked on |
| `blocked` | Waiting on dependency |
| `review` | Code complete, needs verification |
| `completed` | Done and verified |

---

## Critical Bug Fixes (Priority 1)

| Task ID | Description | Branch | Status | Tests | Dependencies |
|---------|-------------|--------|--------|-------|--------------|
| QZ-001 | Fix percentileRank schema error (null vs undefined) | `fix/quiz-schema-validation` | `pending` | ❌ | None |
| QZ-002 | Fix progress bar calculation (shows 7% at start) | `fix/quiz-progress-calc` | `pending` | ❌ | None |
| QZ-003 | Fix double-tap to start quiz (race condition) | `fix/quiz-start-flow` | `pending` | ❌ | None |
| QZ-004 | Remove undefined loadQuizProgress() call | `fix/quiz-undefined-func` | `pending` | ❌ | None |

---

## UI/UX Fixes (Priority 2)

| Task ID | Description | Branch | Status | Tests | Dependencies |
|---------|-------------|--------|--------|-------|--------------|
| QZ-005 | Fix question count display (84 → 15) | `fix/quiz-question-count` | `pending` | ❌ | None |
| QZ-006 | Add Quick vs In-Depth quiz mode selector | `feat/quiz-mode-selector` | `pending` | ❌ | QZ-005 |

---

## Question Quality Review (Priority 3)

| Task ID | Description | Branch | Status | Tests | Dependencies |
|---------|-------------|--------|--------|-------|--------------|
| QZ-007 | Review Study Habits questions (84 questions) | `review/quiz-study-habits` | `pending` | ❌ | QZ-001 |
| QZ-008 | Review Learning Style questions | `review/quiz-learning-style` | `pending` | ❌ | QZ-001 |
| QZ-009 | Review Motivation Profile questions | `review/quiz-motivation` | `pending` | ❌ | QZ-001 |
| QZ-010 | Review Focus & Attention questions | `review/quiz-focus` | `pending` | ❌ | QZ-001 |
| QZ-011 | Review Goal Setting questions | `review/quiz-goals` | `pending` | ❌ | QZ-001 |
| QZ-012 | Review Stress & Anxiety questions | `review/quiz-stress` | `pending` | ❌ | QZ-001 |

---

## Task Details

### QZ-001: Fix percentileRank Schema Error
**File**: `convex/quizSessions.ts`
**Lines**: 502, 529
**Problem**: Code sets `percentileRank: null` but schema uses `v.optional(v.number())` which doesn't accept `null`
**Fix**: Remove the `percentileRank` field entirely (omit instead of setting to null)

**Verification Tests**:
- [ ] Run `npx convex dev` - deploys without errors
- [ ] Complete a quiz - no "schema validation" error
- [ ] Quiz results save to database successfully

---

### QZ-002: Fix Progress Bar Calculation
**File**: `src/components/InteractiveQuiz.tsx`
**Line**: 113
**Problem**: Uses `(currentQuestionIndex + 1) / total * 100` which shows 7% at start
**Fix**: Change to `Object.keys(answers).length / total * 100`

**Verification Tests**:
- [ ] Start quiz - shows 0% complete
- [ ] Answer 1 question - shows ~6.67%
- [ ] Answer 14 questions - shows ~93%
- [ ] Answer 15 questions - shows 100%

---

### QZ-003: Fix Double-Tap Start Issue
**File**: `src/screens/main/SelfDiscoveryQuizScreen.tsx`
**Lines**: 218-222
**Problem**: `startQuiz()` calls `closeDetail()` which sets `selectedQuiz = null` before setting `showQuiz = true`
**Fix**: Only close modal, don't clear selectedQuiz

**Verification Tests**:
- [ ] Tap quiz card - modal opens
- [ ] Tap "Start Quiz" button once - quiz starts immediately
- [ ] No double-tap required

---

### QZ-004: Remove Undefined Function Call
**File**: `src/screens/main/SelfDiscoveryQuizScreen.tsx`
**Line**: 239
**Problem**: Calls `loadQuizProgress()` which doesn't exist
**Fix**: Remove the call (Convex auto-refreshes)

**Verification Tests**:
- [ ] Complete a quiz
- [ ] Close results screen - no error
- [ ] Quiz list refreshes automatically

---

### QZ-005: Fix Question Count Display
**File**: `src/screens/main/SelfDiscoveryQuizScreen.tsx`
**Line**: 196
**Problem**: Shows `cat.questionsCount` (84 total) instead of session count (15)
**Fix**: Always show 15 (or dynamic based on mode)

**Verification Tests**:
- [ ] Open quiz detail modal - shows "15 questions"
- [ ] Does not show 84 questions

---

### QZ-006: Add Quiz Mode Selector
**Files**:
- `src/screens/main/SelfDiscoveryQuizScreen.tsx`
- `src/components/InteractiveQuiz.tsx`
**Problem**: No way to choose quick vs in-depth quiz
**Fix**: Add mode selector UI, pass questionsCount prop

**Verification Tests**:
- [ ] Modal shows Quick (15) and In-Depth (25) options
- [ ] Selecting Quick shows "15 questions, 5-7 min"
- [ ] Selecting In-Depth shows "25 questions, ~12 min"
- [ ] Quiz loads correct number of questions

---

### QZ-007 to QZ-012: Question Quality Reviews
**Files**: `convex/quizQuestionData.ts` and related seed files
**Scope**: Review all questions for:
- Grammar and clarity
- Research backing
- Appropriate difficulty
- No duplicates
- Proper Likert scale alignment

**Verification Tests**:
- [ ] All questions reviewed by AI agent
- [ ] Grammar issues fixed
- [ ] Research citations added where applicable
- [ ] Quality report generated

---

## Session Assignment

| Session | Tasks Assigned | Worktree Path |
|---------|----------------|---------------|
| Session 1 | QZ-001, QZ-002 | `../thetriage-s1` |
| Session 2 | QZ-003, QZ-004 | `../thetriage-s2` |
| Session 3 | QZ-005, QZ-006 | `../thetriage-s3` |
| Session 4 | QZ-007, QZ-008 | `../thetriage-s4` |
| Session 5 | QZ-009, QZ-010 | `../thetriage-s5` |
| Session 6 | QZ-011, QZ-012 | `../thetriage-s6` |

---

## Merge Order

1. **Phase 1** (No dependencies): QZ-001, QZ-002, QZ-003, QZ-004
2. **Phase 2** (After Phase 1): QZ-005
3. **Phase 3** (After QZ-005): QZ-006
4. **Phase 4** (After QZ-001): QZ-007 through QZ-012

---

## Commands

```bash
# Update task status
python execution/update_task.py QZ-001 in_progress

# Mark test as passed
python execution/update_task.py QZ-001 --test "Quiz completes without error" --passed

# Complete a task
python execution/update_task.py QZ-001 completed

# View current status
cat task_status.json | jq '.tasks[] | {id, status, tests}'

# Create worktree for a task
git worktree add ../thetriage-s1 -b fix/quiz-schema-validation
```
