# Architecture C4 — Niveau 1 : Contexte Système

```mermaid
flowchart TD
    User["Développeur (Utilisateur)"]
    App["reda-code (Application Desktop Electron)"]
    LLMs["Fournisseurs LLM Externes / Locaux\n(Anthropic, OpenAI, Gemini, Groq, Ollama)"]
    FS["Système de fichiers local\n(Espace de travail / Code source)"]
    MCPServers["Serveurs MCP Externes\n(Outils additionnels stdio)"]

    User -->|"Interagit via UI (Chat, Éditeur, Terminal, Approbations)"| App
    App -->|"Appels API Streaming & Tool Calling"| LLMs
    App -->|"Lecture, écriture, diffs, recherche"| FS
    App -->|"Exécution de commandes shell"| FS
    App -->|"Protocole JSON-RPC stdio"| MCPServers
```

## Description des Acteurs et Systèmes

- **Développeur** : Utilise l'application desktop pour dialoguer avec l'agent de code, superviser et valider les modifications de fichiers ou exécutions de commandes shell.
- **reda-code** : Application desktop Electron (React + TypeScript + Tailwind) intégrant un moteur d'agent IA autonome avec boucle de réflexion, outils sécurisés, persistance SQLite, terminal et éditeur de code.
- **Fournisseurs LLM** : APIs externes sécurisées (Anthropic Claude, OpenAI GPT, Google Gemini, Groq) ou instance locale (Ollama) fournissant les capacités de raisonnement et de génération de code avec tool-calling.
- **Système de fichiers local** : Répertoire de travail restreint (Workspace) sur lequel l'agent opère en toute sécurité avec validation humaine par défaut.
- **Serveurs MCP** : Processus locaux communiquant via Model Context Protocol (stdio) pour étendre les outils de l'agent.
