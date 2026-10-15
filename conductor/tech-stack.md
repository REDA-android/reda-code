# Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Shell | Electron (latest) | main / preload / renderer, `contextIsolation: true`, `sandbox` preload |
| Build | electron-vite + Vite | single config for 3 targets |
| UI | React 19 + TypeScript (strict) | |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | tokens in `@theme` |
| Editor | Monaco (`monaco-editor`, bundled locally — no CDN) | |
| Terminal | xterm.js + `node-pty` (optional, fallback to piped shell) | |
| LLM | Native `fetch` + SSE adapters | Anthropic Messages, OpenAI Chat Completions (also Groq & Ollama via OpenAI-compatible API), Gemini `streamGenerateContent` |
| Persistence | SQLite via `sql.js` (WASM) | no native module → painless Windows cross-build |
| MCP | `@modelcontextprotocol/sdk` (stdio transport) | |
| Secrets | Electron `safeStorage` | |
| Tests | Vitest (node env) | core logic: providers, agent loop, tools, store, i18n |
| Lint | ESLint 9 flat config + typescript-eslint | |
| Packaging | electron-builder | Linux AppImage, Windows NSIS `.exe` (GitHub Actions `windows-latest`) |
