# Product Guidelines

## Voice & tone
Concise, technical, friendly. No marketing fluff. Errors say what happened and what to do next.

## Language
Bilingual FR/EN. Every user-facing string goes through `t()` (`src/renderer/src/i18n`). Both dictionaries must have identical keys (enforced by a test).

## Design principles
- Dark, modern, low-contrast chrome / high-contrast content (Cursor / Claude Desktop feel).
- Design tokens only (CSS variables in `styles.css` via Tailwind v4 `@theme`); no ad-hoc hex in components.
- The user is always in control: approval cards show exactly what will run / change (command, diff) before execution.
- Keyboard first: `Enter` sends, `Shift+Enter` newline, `Esc` stops the agent.
