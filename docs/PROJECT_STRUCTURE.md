# Project Structure — Where Things Live

A quick map of the HikeWise / Triage repo so you can find things fast.

## Root (keep it minimal — only these belong here)

| File                                       | What it is                                                        |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `App.tsx`, `index.ts`                      | App entry points (`index.ts` is the `main` in package.json)       |
| `app.json`, `eas.json`                     | Expo app config + EAS build/submit profiles                       |
| `metro.config.js`                          | Metro bundler config                                              |
| `tsconfig.json`, `global.d.ts`, `svg.d.ts` | TypeScript config + ambient type declarations (must stay at root) |
| `package.json`, `package-lock.json`        | Dependencies                                                      |
| `README.md`                                | Project readme                                                    |
| `CLAUDE.md`, `GEMINI.md`                   | AI assistant instructions (auto-loaded from root by their tools)  |
| `docker-compose.n8n.yml`                   | n8n stack — referenced by `execution/setup_n8n.sh`                |
| `ci_post_clone.sh`                         | Build hook                                                        |

> Rule of thumb: if it's not framework config or an app entry point, it doesn't belong loose in the root.

## Directories

| Folder                                           | Contents                                                                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                                           | App source — `screens/`, `components/`, `navigation/`, `hooks/`, `context/`, `providers/`, `services/`, `utils/`, `theme/`, `config/`, `data/`, `assets/` |
| `convex/`                                        | Backend functions + schema (Convex)                                                                                                                       |
| `assets/`                                        | Images, fonts, sounds, 3D models shipped with the app                                                                                                     |
| `ios/`, `android/`                               | Native projects                                                                                                                                           |
| `scripts/`                                       | One-off + maintenance scripts (see subfolders below)                                                                                                      |
| `scripts/ios/`                                   | iOS build & app-icon helper scripts                                                                                                                       |
| `scripts/ci/`                                    | GitHub Actions setup, deploy, expo publish scripts                                                                                                        |
| `scripts/assets/`                                | 3D model / glTF optimization scripts                                                                                                                      |
| `docs/`                                          | All project documentation (this file lives here)                                                                                                          |
| `credentials/`                                   | App Store `.p8` keys — **gitignored**, never committed                                                                                                    |
| `directives/`, `execution/`                      | Agentic dev framework (markdown directives + Python orchestration)                                                                                        |
| `n8n-workflows/`                                 | n8n automation workflow definitions                                                                                                                       |
| `fastlane/`, `ci_scripts/`, `.github/workflows/` | CI/CD + store deployment                                                                                                                                  |
| `maestro/`, `playwright/`                        | E2E / UI test flows                                                                                                                                       |
| `store-assets/`                                  | App Store listing assets (screenshots, metadata, legal)                                                                                                   |

## Conventions

- **New one-off scripts** → `scripts/` (use a subfolder if it fits ios/ci/assets).
- **New docs** → `docs/`.
- **Secrets / keys** → `credentials/` (already gitignored). Never commit credentials.
- **Keep the root clean.** Resist dropping debug/test scripts there — they pile up fast.
