# Plan — mvp_20261015

## Phase 1 — Skeleton
- [x] Task 1.1: electron-vite + React/TS + Tailwind v4 scaffold, ESLint, Vitest
- [x] Task 1.2: design tokens + 3-pane layout (sidebar / chat / right panel)
- [x] Task 1.3: i18n FR/EN with key-parity test
- [x] Checkpoint P1

## Phase 2 — LLM providers + keys
- [x] Task 2.1: SSE parser + canonical message/stream types (tests)
- [x] Task 2.2: Anthropic, OpenAI-compatible (OpenAI/Groq/Ollama), Gemini adapters (tests with mocked fetch)
- [x] Task 2.3: encrypted key store (safeStorage) + settings store
- [x] Checkpoint P2

## Phase 3 — Agent loop + tools + approvals
- [x] Task 3.1: tool registry + workspace path guard (tests)
- [x] Task 3.2: fs tools with diffs, glob/grep, shell, web fetch/search (tests)
- [x] Task 3.3: agent loop with approval gate + auto mode (tests)
- [x] Task 3.4: chat UI, streaming, approval cards
- [x] Checkpoint P3

## Phase 4 — Persistence
- [x] Task 4.1: SQLite session store (sql.js) (tests)
- [x] Task 4.2: sessions sidebar wired via IPC
- [x] Checkpoint P4

## Phase 5 — Workspace panel
- [x] Task 5.1: file tree + Monaco editor (local bundle)
- [x] Task 5.2: integrated terminal (xterm + node-pty / fallback)
- [x] Checkpoint P5

## Phase 6 — MCP
- [x] Task 6.1: MCP manager (stdio) + tool bridging (tests)
- [x] Task 6.2: MCP settings UI
- [x] Checkpoint P6

## Phase 7 — Packaging
- [x] Task 7.1: electron-builder (AppImage + NSIS)
- [x] Task 7.2: GitHub Actions workflow for Windows `.exe`
- [x] Task 7.3: final verification (typecheck, lint, tests, Linux build, launch)
- [x] Checkpoint P7
