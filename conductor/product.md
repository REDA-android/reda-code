# reda-code — Product

**One-liner:** A desktop AI coding agent "like Claude Code" — chat with an LLM that reads, edits and runs code inside a local project folder, with human approval.

## Problem
CLI coding agents are powerful but terminal-only, tied to one vendor, and hard to supervise visually. Developers want a desktop app (Windows `.exe` + Linux) that works with any LLM (cloud or local) and shows diffs, terminal and editor side by side.

## Target users
Developers (solo / small teams) working on local repositories, FR or EN speaking, who want to choose their LLM provider (Anthropic, OpenAI, Gemini, Groq, or local Ollama).

## Key goals
1. Agent loop with tools: read/write/edit files (diff preview), shell commands, glob/grep search, web fetch/search, MCP servers.
2. Safety first: every mutating action requires approval by default; an explicit "auto" mode can be toggled.
3. Cursor/Claude-Desktop-like UX: sessions sidebar, central chat, right panel with file tree, Monaco editor and integrated terminal.
4. Persistent history (SQLite), encrypted API keys (Electron `safeStorage`), bilingual UI (FR/EN).

## Non-goals (MVP)
Code signing, auto-update, multi-window, cloud sync, inline completions.
