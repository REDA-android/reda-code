# Architecture C4 — Niveau 3 : Composants du Core Agent

```mermaid
flowchart TD
    subgraph CoreAgent["Moteur de l'Agent (`src/core/`)"]
        AgentLoop["AgentLoop\n(Boucle d'interaction et d'évaluation)"]
        
        subgraph ToolSub["Système d'Outils (`src/core/tools/`)"]
            ToolRegistry["ToolRegistry\n(Enregistrement et dispatch)"]
            WorkspaceGuard["WorkspaceGuard\n(Validation des chemins dans le projet)"]
            FSTools["FSTools\n(read_file, write_file, edit_file avec diff)"]
            ShellTool["ShellTool\n(run_command avec timeout et validation)"]
            SearchTools["SearchTools\n(glob_files, grep_code)"]
            WebTools["WebTools\n(fetch_url, search_web)"]
            
            ToolRegistry --> WorkspaceGuard
            ToolRegistry --> FSTools
            ToolRegistry --> ShellTool
            ToolRegistry --> SearchTools
            ToolRegistry --> WebTools
        end

        subgraph ProviderSub["Fournisseurs LLM (`src/core/providers/`)"]
            ProviderFactory["ProviderFactory"]
            AnthropicProvider["AnthropicProvider\n(/v1/messages SSE)"]
            OpenAIProvider["OpenAIProvider\n(OpenAI, Groq, Ollama /v1/chat/completions)"]
            GeminiProvider["GeminiProvider\n(:streamGenerateContent)"]
            SSEParser["SSEParser\n(Décodage de flux Server-Sent Events)"]

            ProviderFactory --> AnthropicProvider
            ProviderFactory --> OpenAIProvider
            ProviderFactory --> GeminiProvider
            AnthropicProvider --> SSEParser
            OpenAIProvider --> SSEParser
            GeminiProvider --> SSEParser
        end

        subgraph MCPSub["Client MCP (`src/core/mcp/`)"]
            MCPManager["MCPManager\n(Connexion stdio, listTools, callTool)"]
        end

        subgraph StorageSub["Persistance & Sécurité (`src/core/storage/`)"]
            SQLiteStore["SQLiteStore\n(Base sql.js locale)"]
            KeyStore["KeyStore\n(safeStorage Electron)"]
        end

        AgentLoop --> ProviderFactory
        AgentLoop --> ToolRegistry
        AgentLoop --> MCPManager
        AgentLoop --> SQLiteStore
    end
```

## Description des Composants

- **AgentLoop** : Reçoit la requête utilisateur et l'historique de la session. Interroge le fournisseur LLM sélectionné. Lorsqu'un outil est appelé, vérifie si une approbation est nécessaire (mode auto désactivé ou action sensible comme shell / écriture de fichier). Si approbation requise, suspend l'exécution et émet un événement vers le Renderer. Une fois approuvé, exécute l'outil et réinjecte le résultat au LLM jusqu'à complétion de la réponse.
- **WorkspaceGuard** : Empêche toute tentative de lecture ou d'écriture en dehors du dossier de travail sélectionné par l'utilisateur.
- **ProviderFactory & Providers** : Normalisent les différences entre les APIs Anthropic, OpenAI, Gemini, Groq et Ollama dans un format standardisé de streaming et de tool-calling (`ChatMessage`, `ToolCallPart`, `ToolResultPart`).
- **MCPManager** : Fait le pont entre les serveurs MCP (Model Context Protocol) déclarés dans les réglages et le registre d'outils de l'agent.
