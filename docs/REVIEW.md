# REVIEW.md

> This file tells Claude Code's `/code-review` command what matters in this repo.
> It calibrates severity: what counts as Important vs Nit vs skip entirely.

---

## Important — flag these every time

### Security (zero-tolerance)

- Hardcoded API keys, tokens, passwords, or connection strings
- SQL queries built via string concatenation with user input
- Missing authentication/authorization checks on protected routes
- User input passed to `eval`, `exec`, unsafe innerHTML setters, or similar
- Secrets logged to console, files, or external services
- CORS set to `*` on endpoints that handle private data
- Missing input validation on API endpoints or form handlers
- HTTP (not HTTPS) URLs for anything non-local
- Cookies without `Secure` / `HttpOnly` / `SameSite` flags

### Data integrity

- Database writes without transactions when they should be atomic
- Missing error handling around async operations that touch user data
- Race conditions in handlers that create/update records
- Missing `await` on promises that matter

### Correctness

- Off-by-one errors in loops or pagination
- Incorrect null/undefined handling
- Mutated state that should be immutable (especially in React)
- Missing cleanup in `useEffect` hooks (event listeners, subscriptions, timers)
- Incorrect dependency arrays in `useEffect` / `useMemo` / `useCallback`

### Violations of CLAUDE.md hard bans

- Any use of `any`, `@ts-ignore`, or `as any` to bypass types
- `console.log` / `print()` / `debugger` in non-dev code
- Empty catch blocks (`catch (e) {}`, `except: pass`)
- `setTimeout` used as a race condition fix
- Duplicated code blocks that should be shared utilities

---

## Nit — mention at most 5 per review, summarize the rest

- Naming that's unclear but not wrong
- Comments that restate obvious code
- Magic numbers that could be named constants
- Functions over 50 lines that could be split
- Minor style inconsistencies not caught by Prettier/ESLint
- Opportunities to simplify but nothing broken

---

## Skip entirely — do not post findings for these

- Formatting issues (Prettier/Ruff handle those)
- Style nits already covered by ESLint
- Anything in `node_modules/`, `.next/`, `dist/`, `build/`
- Anything in `tests/fixtures/` or test data files
- Generated files (`*.generated.*`, `*.d.ts` for third-party libs)
- Files in `legacy/` or `archive/` directories
- Documentation-only changes (`*.md` edits with no code changes)

---

## Review volume rules

- **Hard cap: 5 nits per review.** Summarize the rest as a count.
- **No duplicate findings.** If the same issue appears 3 times, comment on the first and reference the others by line number.
- **No theoretical issues.** "This could be a problem if X happens" doesn't count unless X is plausible in this codebase.

---

## Context notes for the reviewer

- This is a pre-launch app — treat any authentication, payment, or data handling code with extra scrutiny.
- We use TypeScript strictly. Any escape hatch (`any`, `@ts-ignore`) is important.
- We ship to app stores. Flag anything that would fail Apple's or Google's review (unsafe data handling, missing privacy declarations, etc.).
- The user is a solo/small team, not an enterprise. Don't flag lack of enterprise infrastructure (SSO, audit logs, etc.) unless user-facing data is at risk.
