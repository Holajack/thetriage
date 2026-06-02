# CLAUDE.md — HikeWise

> This file is instructions for Claude when working in this repo.
> It's a living document. When Claude makes a mistake, we add a rule so it doesn't repeat.
> Keep this file under ~150 lines. If it grows past that, split concerns into `.claude/rules/*.md`.

---

## 1. Project Overview

HikeWise is a student productivity app co-founded with Nikolai.

- Public presence: https://hikewise.app
- Platform: [fill in — iOS/Android/web/all three]
- Stage: Pre-launch, preparing for app store submission

## 2. Tech Stack

- **Frontend:** React / Next.js (web), React Native or Expo (mobile)
- **Backend:** [fill in — Node? Python? Supabase? Firebase?]
- **Database:** [fill in]
- **Auth:** [fill in]
- **Hosting:** Vercel (web)
- **Package manager:** [npm / pnpm / yarn — pick one and stick to it]

## 3. Task Management Protocol

Before writing code for any non-trivial change, Claude must:

1. **Plan first.** Write the plan to `tasks/todo.md` with numbered steps.
2. **Verify the plan.** Check in with the user before starting implementation.
3. **Track progress.** Mark items complete as you go.
4. **Explain changes.** Give a high-level summary after each step.
5. **Document results.** Add a review section to `tasks/todo.md`.
6. **Capture lessons.** If a correction happens, add the rule to `lessons.md` and (if it's a repo-wide pattern) to this CLAUDE.md.

For small changes (single-file edits, typo fixes, minor refactors), skip the plan and just do it.

## 4. Core Principles

- **Simplicity first.** Make every change as simple as possible. Fewer lines, fewer abstractions, fewer dependencies.
- **Root causes, not band-aids.** No `setTimeout` to hide race conditions. No `try/catch` to swallow errors. Fix the actual problem.
- **Minimal impact.** Only touch what the task requires. Don't "helpfully" refactor adjacent code.
- **Match the codebase.** Use the patterns already in this repo, even if you prefer others.

## 5. Code Quality — Hard Bans

These are not suggestions. They block review.

- ✗ **Never** use `any` in TypeScript to silence type errors. Fix the type or use `unknown` + a narrowing check.
- ✗ **Never** leave `console.log`, `print()`, or `debugger` statements in committed code.
- ✗ **Never** use `setTimeout` / `setInterval` to paper over a timing or race condition bug.
- ✗ **Never** catch an error and do nothing with it (no `catch (e) {}` or bare `except: pass`).
- ✗ **Never** duplicate a function across files. If you need it twice, extract it.
- ✗ **Never** add comments that just restate the code (`// increment counter` above `counter++`).
- ✗ **Never** hardcode API keys, URLs with tokens, passwords, or connection strings. Use environment variables.
- ✗ **Never** concatenate strings into SQL queries. Use parameterized queries or an ORM.
- ✗ **Never** delete a test to make a build pass.
- ✗ **Never** cast something to a permissive type (`as any`, `@ts-ignore`) to ship faster.

## 6. Code Quality — Preferred Patterns

- ✓ Small, focused functions (ideally under 30 lines, doing one thing).
- ✓ Descriptive names over comments. `getActiveUserSubscriptions()` beats `// get subs` + `getSubs()`.
- ✓ Error handling that does something: log with context, surface to the user, or retry with backoff.
- ✓ Validation at trust boundaries (where user input enters your system, where API responses arrive).
- ✓ Tests that check behavior, not implementation. "When I submit the form, the user is redirected" — not "the handler function was called once."

## 7. Naming Conventions

- **Files:** `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- **Functions / variables:** `camelCase`.
- **Constants:** `SCREAMING_SNAKE_CASE` only for true constants (config values, magic strings).
- **Types / interfaces / components:** `PascalCase`.
- **Boolean variables:** start with `is`, `has`, `should`, `can` (`isLoading`, `hasAccess`).
- **Event handlers:** start with `handle` or `on` (`handleSubmit`, `onClose`).

## 8. File Structure

```
src/
├── components/       # Reusable UI components
├── screens/ or pages/ # Top-level views / routes
├── hooks/            # Custom React hooks
├── lib/ or utils/    # Shared utilities (pure functions)
├── services/         # API clients, external integrations
├── types/            # TypeScript types/interfaces
├── constants/        # App-wide constants
└── __tests__/        # Tests mirroring the structure above
```

Keep files under 300 lines. If a component file grows past that, it probably needs splitting.

## 9. Security Requirements

- Secrets go in `.env.local` (never committed). Document required keys in `.env.example`.
- All user input is validated server-side, even if validated on the client. Client validation is UX; server validation is security.
- Never trust URL params, request bodies, or form data without schema validation (use Zod or similar).
- Use HTTPS everywhere. Set `Secure` and `HttpOnly` flags on cookies.
- Authentication checks happen on every protected route, not once at the edge.
- Don't log PII (emails, user IDs are fine; names, addresses, phone numbers are not).

## 10. Before Writing Code — Pre-flight Checklist

Claude must do these before writing a single line for a non-trivial change:

1. Read 2-3 existing files in the same area to understand the patterns.
2. Check if a similar utility already exists (`grep` for keywords, search for similar function names).
3. Confirm the approach with the user if any assumption feels shaky.

## 11. After Writing Code — Self-Review Checklist

Before saying "done," Claude must:

1. Run the formatter: `npm run format` (or `ruff format .` for Python).
2. Run the linter: `npm run lint` (or `ruff check .`).
3. Run the tests: `npm test`.
4. Re-read the diff and ask: "Would a senior engineer roll their eyes at any of this?"
5. Remove any debug statements, commented-out code, or TODO markers added during development.

## 12. Commands

(Fill these in for your project. Claude will use them.)

- Install deps: `npm install`
- Run dev: `npm run dev`
- Run tests: `npm test`
- Run a single test: `npm test -- path/to/test.ts`
- Lint: `npm run lint`
- Format: `npm run format`
- Type-check: `npm run typecheck`
- Build: `npm run build`

## 13. Lessons Learned

When Claude does something wrong, add a rule here so it doesn't happen again.
Start fresh with each project. Examples of what goes here:

- ~~Claude tried to install `moment` — we use `date-fns` in this repo.~~
- ~~Claude created a new `formatCurrency` util when one already exists in `lib/formatters.ts`.~~

(Empty to start. Grow this file over time.)
