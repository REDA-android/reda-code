# Architecture C4 — Niveau 2 : Conteneurs

```mermaid
flowchart TB
    subgraph Electron["Application Electron (Desktop)"]
        subgraph Renderer["Renderer Process (Chromium)"]
            ReactUI["React UI (TypeScript + Tailwind CSS)\n- Chat & Stream View\n- Diff & Approval Cards\n- Sessions Sidebar\n- File Tree Explorer\n- Monaco Editor\n- xterm.js Terminal\n- Settings & i18n (FR/EN)"]
        end

        subgraph Preload["Preload Script"]
            ContextBridge["Electron contextBridge\n(IPC type-safe sécurisé)"]
        end

        subgraph MainProcess["Main Process (Node.js)"]
            IPCMain["Gestionnaire IPC Main"]
            AgentLoop["Boucle Agent (Loop Engine)\nOrchestration du dialogue, tool calling et approbations"]
            LLMClient["Couche Fournisseurs LLM\n(Anthropic, OpenAI, Gemini, Groq, Ollama)"]
            ToolRegistry["Registre d'Outils Sécurisés\n(FS Guard, Diffs, Shell, Glob/Grep, Web)"]
            MCPManager["Gestionnaire MCP\n(Clients stdio vers serveurs externes)"]
            KeyStore["KeyStore sécurisé\n(Electron safeStorage)"]
            SQLiteDB["Base de données locale\n(sql.js SQLite - sessions, messages, settings)"]
            PTYTerminal["Gestionnaire PTY Terminal\n(Spawn shell local)"]
        end
    end

    ReactUI <--> ContextBridge
    ContextBridge <--> IPCMain
    IPCMain --> AgentLoop
    IPCMain --> SQLiteDB
    IPCMain --> KeyStore
    IPCMain --> PTYTerminal

    AgentLoop --> LLMClient
    AgentLoop --> ToolRegistry
    AgentLoop --> MCPManager
    AgentLoop --> SQLiteDB
```

## Description des Conteneurs

1. **Renderer Process** : Interface utilisateur réactive construite avec React 19, TypeScript et Tailwind CSS v4. Gère l'affichage bilingue (i18n), l'état des sessions, le rendu markdown, les cartes d'approbation avec diffs unifiés, l'arbre de fichiers interactif, l'éditeur Monaco et le terminal xterm.js.
2. **Preload Script** : Pont sécurisé isolant le Renderer du Main process via `contextBridge.exposeInMainWorld`, exposant une API IPC typée (`window.api`).
3. **Main Process** : Moteur d'exécution Node.js supervisant l'accès au système de fichiers, l'exécution des commandes, le chiffrement des clés d'API (OS keychain via `safeStorage`), la persistance SQLite (sans binaire natif grâce à `sql.js`), le client MCP et la boucle d'agent.
