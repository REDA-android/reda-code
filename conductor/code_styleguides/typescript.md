# TypeScript Style Guide

- `strict: true`, no `any` (use `unknown` + narrowing). Prefer `type` unions for data, `interface` for contracts.
- ES modules, named exports; one responsibility per file; files `camelCase.ts`, React components `PascalCase.tsx`.
- `src/core` is pure Node (no `electron` import) so it can be unit-tested; Electron specifics live in `src/main`.
- Renderer never touches Node: everything goes through the typed `window.api` bridge (`src/shared/api.ts`).
- Errors: throw `Error` with actionable messages; tools return `{ ok:false, error }` results to the model instead of throwing.
- Async: always pass `AbortSignal` through long operations (LLM streams, shell).
