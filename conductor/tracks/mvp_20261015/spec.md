# Spec — mvp_20261015

Build the reda-code MVP desktop app as described in [product.md](../../product.md).

## Functional requirements
- FR1 Multi-provider LLM chat with streaming + tool calling: Anthropic, OpenAI, Gemini, Groq, Ollama.
- FR2 Agent tools scoped to the selected workspace folder: `read_file`, `write_file`, `edit_file` (unified diff), `list_dir`, `glob`, `grep`, `run_shell`, `web_fetch`, `web_search`, plus MCP tools.
- FR3 Approval required for mutating tools (`write_file`, `edit_file`, `run_shell`, MCP); auto mode toggle skips approval.
- FR4 Sessions persisted in SQLite; sidebar lists, creates, renames, deletes sessions.
- FR5 Right panel: file tree, Monaco editor (open/save), integrated terminal.
- FR6 MCP servers configured in settings (stdio), tools listed & callable.
- FR7 API keys encrypted with `safeStorage`; never sent to the renderer.
- FR8 FR/EN UI switch.
- FR9 Packaging: Linux AppImage locally, Windows NSIS `.exe` via GitHub Actions.

## Non-functional
- Path traversal outside workspace is rejected by every file tool.
- Shell commands have a timeout and are cancellable.
- Renderer has no Node access (contextIsolation, typed preload bridge).
