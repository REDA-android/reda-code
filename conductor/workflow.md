# Workflow

- **TDD strictness:** moderate — Vitest tests required for core logic (`src/core/**`: providers, agent loop, tools, store); UI tested manually.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `build:`). One commit (at least) per phase.
- **Checkpoint per phase:** before closing a phase run `npm run typecheck && npm run lint && npm test`; all green → mark phase `[x]` in the track plan and commit.
- **Definition of done (track):** typecheck, lint, tests green; `npm run build:linux` produces an AppImage; app launches.
- **Branching:** `main` only for MVP.
