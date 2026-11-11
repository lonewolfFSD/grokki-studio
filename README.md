<div align="center">
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/grokki_wordmark.png">
    <source media="(prefers-color-scheme: light)" srcset="assets/grokki_wordmark_light.png">
    <img src="assets/grokki_wordmark.png" alt="Grokki Studio" width="460">
  </picture>
  <p>
    <img alt="Platform" src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-27272a?style=flat&logo=windows&logoColor=white&labelColor=18181b">
    <img alt="Electron" src="https://img.shields.io/badge/Electron-44.7-27272a?style=flat&logo=electron&logoColor=white&labelColor=18181b">
    <img alt="React" src="https://img.shields.io/badge/React-19.3-27272a?style=flat&logo=react&logoColor=61DAFB&labelColor=18181b">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7.0-27272a?style=flat&logo=typescript&logoColor=white&labelColor=18181b">
    <img alt="MCP" src="https://img.shields.io/badge/Model%20Context%20Protocol-SDK%201.32-27272a?style=flat&logo=anthropic&logoColor=white&labelColor=18181b">
    <img alt="License" src="https://img.shields.io/badge/License-MIT-27272a?style=flat&labelColor=18181b">
  </p>

  <h3>Autonomous AI Desktop Assistant & Operating System Agent for Windows</h3>
  <p>Dual-engine Chat and Agent modes, Model Context Protocol (MCP) plugins, Skill playbooks, physical OS mouse & keyboard automation, real-time desktop vision, and hybrid local/cloud intelligence inside an interactive Dynamic Island.</p>

  <p>
    <a href="#dual-core-modes"><strong>Dual Modes</strong></a> ·
    <a href="#capabilities-engine"><strong>Capabilities & MCP</strong></a> ·
    <a href="#desktop-agency"><strong>OS Agency</strong></a> ·
    <a href="#dynamic-island"><strong>Dynamic Island</strong></a> ·
    <a href="#pocket-grokki-mobile"><strong>Mobile LAN</strong></a> ·
    <a href="#ai-brains"><strong>AI Brains</strong></a> ·
    <a href="#tool-arsenal"><strong>Tool Arsenal</strong></a> ·
    <a href="#installation"><strong>Installation</strong></a>
  </p>
  <br />
</div>

<p align="center">
  <img src="assets/screenshots/Grokki Studio BLURRED.png" alt="Grokki Studio Workspace" width="100%">
</p>

---

## Overview

**Grokki** is an autonomous desktop computing agent engineered natively for Windows. Unlike web-sandboxed chatbots, Grokki has native, physical agency over your operating system: he inspects native application accessibility trees with zero-token vision, executes multi-step plans across background apps, operates your mouse and keyboard, manages local files, and orchestrates specialized tool suites through standard **Model Context Protocol (MCP)** plugins and **Skills (`SKILL.md`)**.

| Core Architecture | Scope | Technical Execution |
| :--- | :--- | :--- |
| **Dual Mode Engine** | Chat & Agent | Mode-aware sidebar and runtime: general conversation vs. autonomous project agent loops |
| **Agent Skills Engine** | First-Person Playbooks | Standardized `SKILL.md` execution instructions with AI generation via "Write with Grokki" |
| **MCP Plugins Ecosystem** | MCP Specification | Built-in official capabilities + 4 MCP installation pipelines (`stdio`, `streamable-http`, presets, JSON) |
| **Native UI Automation** | Vercel `agent-desktop` | Deterministic, zero-token UI Automation (UIA) tree snapshots & background element clicking |
| **Dynamic Island** | Floating Companion Capsule | Responsive floating HUD: quick interactions, active tool indicators, and summon hopping |
| **P2P Pocket Grokki Mobile** | Private Local LAN | Encrypted QR pairing, device summon hopping, animated envelope file beam, attendance tracker |
| **Air-Gapped Local Models** | Ollama Engine | Automatic binary detection, in-app model downloader with real-time progress, zero-cloud execution |
| **Multi-Brain Consensus** | Dual-Battle Matrix | Concurrently dispatches prompts to dual brains, tracks latency, cross-examines & synthesizes |

---

## Dual Core Modes

Grokki separates daily conversational assistance from multi-turn autonomous coding and system tasks through two purpose-built modes:

### 1. Grokki Chat Mode
- **Clean Conversational Flow**: Optimized for rapid questions, brainstorming, writing, and research.
- **Dynamic Suggested Prompts**: Smart contextual prompt chips tailored to your workflow.
- **Context-Aware Navigation**: Hides agent-specific configuration clutter to maintain a distraction-free conversation canvas.
- **Fast Keyboard Search (`Ctrl+K`)**: Full-text modal search across past chats with keyboard navigation and instant opening.

### 2. Grokki Agent Mode
- **Locked Project Root**: Point the agent to any workspace directory on disk; roots are automatically locked upon first interaction to prevent accidental cross-folder drift.
- **Granular Execution Permissions**:
  - `Read-Only`: Allows the agent to inspect files, search code, and analyze structure without writing.
  - `Workspace-Write`: Constrains write operations strictly to the selected project root.
  - `Full-System`: Authorizes native terminal execution, package installations, and system commands.
  - `Turbo`: High-speed autonomous loop with batch tool dispatch.
- **Effort Dial**: Select between `Low` (3–5 steps), `Medium` (10 steps), and `High` (25+ steps) turn limits.
- **Autonomous Multi-Turn Loops**: Emits tool calls, parses output, reflects on errors, and iterates until the goal is achieved.

---

## Capabilities Engine

Grokki features a unified capabilities system combining **Agent Skills** (system instructions & behavioral playbooks) and **Plugins** (MCP tool extensions).

### 1. Agent Skills & Playbooks (`SKILL.md`)
Skills define how Grokki acts as a specialist using standardized `SKILL.md` files:
- **First-Person Prompt Architecture**: Structured as authoritative, first-person system directives (`"You are a lazy senior developer. The best code is the code never written..."`) with YAML frontmatter headers (`name`, `description`).
- **"Write with Grokki" AI Skill Generator**:
  - Describe what you want Grokki to do in natural language (e.g. *"Surgical bug doctor that traces root causes"*).
  - Grokki writes a complete, battle-tested `SKILL.md` in the background.
  - A persistent notification toast alerts you upon completion with a left-aligned **Open in Skill Editor** button.
- **In-Tab Skill Studio**:
  - Dedicated sub-tabs for viewing skill details, editing YAML frontmatter, and testing instructions.
  - Drag-and-drop `.md` importing, direct export to disk, and one-click opening in File Explorer.

### 2. Plugins & Model Context Protocol (MCP)
Grokki includes a full-featured in-tab plugin manager supporting both official native services and community MCP servers:

#### Official Core Capabilities (Built-In)
- **Google Workspace (Core)**: Access Gmail, Google Drive, Google Calendar, Docs, and Sheets directly. *(Requires connected Google account in Workspace settings)*
- **Desktop Automation (`agent-desktop`) (Core)**: Zero-token native Windows UI automation, background element clicks, typing, and window lifecycle control.
- **Notion Workspace**: Query, create, and manage Notion pages, project task databases, and documentation. *(Requires connected Notion account in Workspace settings)*
- **Obsidian Vault**: Read, write, and index local Markdown notes with bi-directional wikilinks in your personal vault. *(Requires configured Obsidian vault in Workspace settings)*
- **WhatsApp Gateway**: Automated WhatsApp messaging, direct message dispatch, and contact interactions. *(Requires paired WhatsApp session in Workspace settings)*
- **Developer Tools & Git**: Execute Git status, commits, branch management, and automated code reviews. *(Requires connected GitHub account in Workspace settings)*
- **Persistent Memory (Core)**: Episodic vector memory and entity recall across chat sessions powered by LanceDB.

*Note: Official plugins requiring third-party authentication are strictly gated—they cannot be turned on until their respective accounts are linked in Workspace settings.*

#### 4 MCP Installation Pipelines (In-Tab Sub-View)
- **Live MCP Registry**: Real-time integration with GitHub's live MCP repository search (`topic:mcp-server`) with verified presets, real author avatars, star counts, and 1-click installation:
  - `GitHub Integration`: Repositories, commits, pull requests, issues (`@modelcontextprotocol/server-github`).
  - `Playwright Browser`: Structured accessibility snapshots and web actions (`@modelcontextprotocol/server-playwright`).
  - `PostgreSQL Database`: Schema inspection and queries (`@modelcontextprotocol/server-postgres`).
  - `SQLite Explorer`: Local SQLite databases via Python `uvx` (`mcp-server-sqlite`).
  - `Filesystem Sandboxed`: Workspace directory read/write (`@modelcontextprotocol/server-filesystem`).
  - `Chrome DevTools`: Headless DevTools execution and performance profiling.
  - `Scrapling Web Scraper`: Fast web scraping framework (`scrapling-mcp`).
  - `Context7 Platform`: Up-to-date documentation and code index fetching (`@upstash/context7-mcp`).
- **Custom `stdio` Subprocesses**: Run any local MCP executable (`npx`, `uvx`, `python`, `node`, `docker`, binary path) with custom arguments and environment variables.
- **Remote `streamable-http` / `sse` Endpoints**: Connect to remote MCP servers over HTTP/SSE with Bearer token authentication.
- **Import Config JSON**: Directly paste standard MCP configuration JSON (`{"mcpServers": { ... }}`); Grokki parses and installs all servers automatically.

---

## Desktop Agency

Grokki bridges cloud intelligence with native Windows automation:

### Vercel `agent-desktop` Native UI Automation Bridge
- **Zero-Token Accessibility Snapshots**: Inspects the native Windows UI Automation (UIA) tree directly into structured elements with scoped `@ref` IDs, bypassing vision models and saving hundreds of vision tokens per interaction.
- **Headless Background Operation**: Clicks buttons, switches tabs, and inputs text programmatically in the background without stealing active window focus or moving your mouse cursor.
- **Stale Reference Protection**: Real-time validation rejects outdated refs with `STALE_REF` if dialogs shift, preventing misclicks.
- **Hybrid Vision Fallback**: Seamlessly falls back to multimodal vision for raw canvases, video players, and graphic-heavy apps.

---

## Dynamic Island

Grokki features a responsive, floating Dynamic Island companion on your desktop:

- **Quick Summon & Dismiss**: Summon or dismiss the Dynamic Island instantly from anywhere using `Alt + Q`.
- **Active State Indicators**: Real-time status indicators for background agent execution, active tools, speech-to-text, and local model pulls.
- **Voice Input Capsule**: Quick floating speech-to-text dynamic island activated via `Ctrl + Space`.

---

## Peer-to-Peer Pocket Grokki Mobile

Bring your desktop assistant to your smartphone over your local Wi-Fi with zero cloud relays or open ports:

* **Local Web Interface**: Access the mobile interface at `http://<LAN_IP>:8765` on any smartphone on your local network.
* **Cryptographic QR Pairing**: Pair instantly by scanning the dynamic QR code on your desktop.
* **Summon Hopping**: Teleport Grokki between your desktop Dynamic Island and your smartphone with fluid portal transitions.
* **Animated Envelope File Transfer**: Drag and drop files on desktop to package them into an animated envelope and beam them directly to your phone for offline access.
* **ERP & Academic Attendance Tracking**: Sync and view university records, course attendance percentages, and shortage warnings (`+N classes needed for 75%`).

---

## AI Brains

Grokki supports both cloud flagships and completely offline local inference:

| Provider | Models | Highlights |
| :--- | :--- | :--- |
| **Ollama Local (Air-Gap)** | `llama3.2`, `deepseek-r1`, `qwen2.5-coder` | 100% offline, private inference with in-app model pull progress bar & daemon launcher |
| **Google Gemini** | `gemini-2.5-flash`, `gemini-2.5-pro` | 1M+ token context window, multimodal vision, high-speed reasoning |
| **Groq Cloud** | `qwen/qwen3.8-27b`, `llama-3.3-70b-versatile` | Ultra-fast inference (500+ tokens/sec) on LPUs |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o3-mini` | Direct API gateway, leading structured output and code generation |
| **xAI Grok** | `grok-2-1212`, `grok-2-vision` | High-speed frontier intelligence with vision support |
| **DeepSeek** | `deepseek-chat`, `deepseek-reasoner` | Specialized STEM and code reasoning architecture |
| **OpenRouter** | `openrouter/auto`, community models | Unified aggregator with automatic model fallback |

---

## Tool Arsenal

```
Grokki Agent Runtime
├── Capabilities & Extensions
│   ├── Agent Skills (SKILL.md playbooks, "Write with Grokki" AI generation, YAML validation)
│   └── Model Context Protocol (MCP) Engine (stdio, streamable-http, live registry, JSON import)
│
├── Native Desktop UI Automation (agent-desktop)
│   ├── Accessibility tree snapshots (`desktop_snapshot`) with scoped @ref IDs
│   ├── Deterministic background clicks (`desktop_click`) without mouse movement
│   ├── Headless text and value input (`desktop_type`)
│   └── App and window lifecycle control (`desktop_app_control`)
│
├── Workspace Integrations
│   ├── Google Workspace: Gmail, Calendar, Drive, Docs, Sheets, Tasks
│   ├── Notion: Databases, pages, notes, and documentation
│   ├── Obsidian: Local vault note authoring, bi-directional linking, search
│   ├── WhatsApp Gateway: Self-hosted Baileys / OpenWA integration
│   └── Git & GitHub: Status, commit, push, pull, branch, clone
│
├── Developer & Productivity Tools
│   ├── Artifact Canvas: Live HTML/CSS/SVG sandbox preview and editor
│   ├── Persistent Memory: Episodic vector memory recall powered by LanceDB
│   ├── VS Code Bug Doctor: Live problem and syntax diagnosis with direct fixes
│   └── Document Parser: PDF, DOCX, TXT, Markdown, CSV, JSON
│
└── Voice & Speech Synthesis
    ├── ElevenLabs neural speech engine
    ├── Local VoiceStudio server integration with health checking
    └── SenseVoice / Edge TTS with adjustable speed & live preview
```

---

## Installation

### Prerequisites
- **Operating System:** Windows 10 or Windows 11 (64-bit)
- **Node.js:** v18.0.0 or higher
- **Package Manager:** npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/lonewolfFSD/grokki-studio.git
cd grokki-studio

# Install dependencies
npm install

# Start in development mode with live HMR
npm run dev
```

### Shortcuts
- **`Alt + Q`**: Summon or dismiss the Dynamic Island from any application.
- **`Ctrl + Space`**: Open the floating Speech-to-Text dynamic island.
- **`Ctrl + K`**: Open the Fast Search modal across conversations.
- **`Ctrl + ,`**: Open Studio Settings.
- **`http://<LAN_IP>:8765`**: Connect your smartphone to **Pocket Grokki Mobile**.

---

## Packaging

Grokki packages into a standalone Windows installer wizard via `electron-builder`:

```bash
# Compile and build production installer (NSIS executable)
npm run dist
```

The output installer is generated in `release/`:
```text
release/Grokki Studio-Setup-1.52.331.exe
```

---

## Security & Privacy

- **Local Credentials**: All API keys, tokens, and workspace preferences are stored locally on your machine in `%APPDATA%\data\jarvis-config.json`. Keys are never sent to external telemetry servers.
- **Air-Gap Capability**: Switch to **Ollama Local** in settings to run fully offline without an internet connection.
- **No Remote Telemetry**: All operations run strictly between your local desktop and your configured endpoints.

---

## License

Distributed under the **MIT License**. Free and open-source software for personal, educational, and commercial use. See [`LICENSE.md`](LICENSE.md) for details.

<div align="center">
  <sub>Built for autonomous desktop computing on Windows.</sub>
</div>
