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
    <img alt="License" src="https://img.shields.io/badge/License-Non--Commercial-27272a?style=flat&labelColor=18181b">
  </p>

  <h3>Autonomous AI Desktop Assistant & Operating System Agent for Windows</h3>
  <p>Dual-engine Chat and Agent modes, Model Context Protocol (MCP) plugins, Calide-style Skill playbooks, physical OS mouse & keyboard automation, real-time desktop vision, and hybrid local/cloud intelligence living in an Apple-style Dynamic Island & Top Notch.</p>

  <p>
    <a href="#dual-core-modes"><strong>Dual Modes</strong></a> ·
    <a href="#capabilities-engine"><strong>Capabilities & MCP</strong></a> ·
    <a href="#desktop-agency"><strong>OS Agency</strong></a> ·
    <a href="#hitodama-control-center"><strong>Top Notch</strong></a> ·
    <a href="#ai-brains"><strong>AI Brains</strong></a> ·
    <a href="#tool-arsenal"><strong>Tool Arsenal</strong></a> ·
    <a href="#installation"><strong>Installation</strong></a>
  </p>
  <br />
</div>

<p align="center">
  <img src="assets/screenshots/Grokki Studio BLURRED.png" alt="Grokki Studio & Dynamic Island Workspace" width="100%">
</p>

---

## Overview

**Grokki** is an autonomous desktop computing agent designed to live directly at the top edge of your Windows screen. Unlike web-sandboxed chatbots, Grokki has native, physical agency over your operating system: he inspects native application accessibility trees with zero-token vision, executes multi-step plans across background apps, operates your mouse and keyboard, manages local files, and orchestrates specialized tool suites through standard **Model Context Protocol (MCP)** plugins and **Skills (`SKILL.md`)**.

| Core Architecture | Scope | Technical Execution |
| :--- | :--- | :--- |
| **Dual Mode Engine** | Chat & Agent | Mode-aware sidebar and runtime: general conversation vs. autonomous project agent loops |
| **Agent Skills Engine** | First-Person Calide Playbooks | Standardized `SKILL.md` execution instructions with AI generation via "Write with Grokki" |
| **MCP Plugins Ecosystem** | DeepSeek & Claude Standard | Built-in official packs + 4 MCP installation pipelines (`stdio`, `streamable-http`, presets, JSON) |
| **Native UI Automation** | Vercel `agent-desktop` | Deterministic, zero-token UI Automation (UIA) tree snapshots & background element clicking |
| **Hitodama Top Notch** | Dynamic Island & Notch | Zero-shadow frosted glass capsule: volume, media transport, apps, clipboard history, stats |
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
- **Fast Keyboard Search (`Ctrl+K`)**: Full-text modal search across past chats with keyboard arrows and instant opening.

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
- **First-Person Calide Prompt Architecture**: Structured as authoritative, first-person system directives (`"You are a lazy senior developer. The best code is the code never written..."`) with YAML frontmatter headers (`name`, `description`).
- **"Write with Grokki" AI Skill Generator**:
  - Describe what you want Grokki to do in natural language (e.g. *"Surgical bug doctor that traces root causes"*).
  - Grokki writes a complete, battle-tested `SKILL.md` in the background.
  - A persistent notification toast alerts you upon completion with a left-aligned **Open in Skill Editor** button.
- **In-Tab Skill Studio**:
  - Dedicated sub-tabs for viewing skill details, editing YAML frontmatter, and testing instructions.
  - Drag-and-drop `.md` importing, direct export to disk, and one-click opening in File Explorer.

### 2. Plugins & Model Context Protocol (MCP)
Modeled directly after the **DeepSeek Harness (`dsh`)** and **Claude Code** plugin architectures, Grokki includes a full-featured in-tab plugin manager:

#### Official Core Packs (Built-in)
1. **Agent Teams (Beta)**: Multi-agent coordination, team roster management, and shared task boards.
2. **Voice input (Beta)**: Local offline speech-to-text powered by SenseVoice (FunASR).
3. **Shell**: Execution safety boundaries (command timeout limits, max output lines, hung process auto-kill).
4. **Agent loop**: Step limits, read/write authorization gates, and tool dispatch rules.
5. **Subagent**: Recursion depth controls, concurrent subagent limits, and model inheritance strategies.
6. **Web search**: Pluggable search providers (DeepSeek Search, Brave Search, DuckDuckGo, Google).

#### 4 MCP Installation Pipelines (In-Tab Sub-View)
- **Marketplace Presets**: 1-click verified installs for popular MCP servers:
  - `GitHub MCP`: Pull requests, issues, repo search (`@modelcontextprotocol/server-github`).
  - `PostgreSQL Database`: Schema inspection and safe queries (`@modelcontextprotocol/server-postgres`).
  - `Filesystem Sandboxed`: Workspace directory read/write (`@modelcontextprotocol/server-filesystem`).
  - `Playwright Browser`: Headless browser automation (`@modelcontextprotocol/server-playwright`).
  - `Brave Search`: Privacy-first search indexing (`@modelcontextprotocol/server-brave-search`).
  - `SQLite Explorer`: Local database inspection via Python `uvx` (`mcp-server-sqlite`).
  - `Knowledge Memory Graph`: Entity-relationship memory (`@modelcontextprotocol/server-memory`).
  - `DeepSeek Cordis Router`: Official DeepSeek Harness client (`@deepseek-ai/dsh-mcp-client`).
- **Custom `stdio` Subprocesses**: Run any local MCP executable (`npx`, `uvx`, `python`, `node`, `docker`, binary path) with custom arguments and environment variables (`KEY=VALUE`).
- **Remote `streamable-http` / `sse` Endpoints**: Connect to remote MCP servers via DeepSeek's native HTTP streaming protocol with Bearer token authentication.
- **Import Config JSON**: Directly paste any `claude_desktop_config.json` (`{"mcpServers": { ... }}`) or DeepSeek patch JSON; Grokki parses and installs all servers automatically.

---

## Desktop Agency

Grokki bridges cloud intelligence with native Windows automation:

### Vercel `agent-desktop` Native UI Automation Bridge
- **Zero-Token Accessibility Snapshots**: Inspects the native Windows UI Automation (UIA) tree directly into structured elements with scoped `@ref` IDs, bypassing vision models and saving hundreds of vision tokens per interaction.
- **Headless Background Operation**: Clicks buttons, switches tabs, and inputs text programmatically in the background without stealing active window focus or moving your mouse cursor.
- **Stale Reference Protection**: Real-time validation rejects outdated refs with `STALE_REF` if dialogs shift, preventing misclicks.
- **Hybrid Vision Fallback**: Seamlessly falls back to Gemini Vision for raw canvases, video players, and graphic-heavy apps.

---

## Hitodama Control Center

Access essential operating system controls instantly by hovering near the top notch or tapping the dynamic island:

* **Zero-Shadow Capsule Architecture**: Engineered with a high-contrast frosted glass design system that dynamically follows your active theme palette.
* **Unified Control Hub**:
  * **Controls**: Live OS volume bar capsule with percentage thumb, preset buttons (`25%`, `50%`, `75%`, `MAX`), and quick tiles (`Wi-Fi`, `Bluetooth`, `Audio Output`, `Night Light`, `Dark Mode`, `Speech to Text`).
  * **Today**: Agenda timeline, upcoming calendar appointments, and quick tasks.
  * **Studio**: Live Windows Media playback detection displaying album art covers, track title, artist, playback status badge, and transport controls.
  * **Apps**: Fast application launcher categorized by work, code, media, and tools.
  * **Games**: Installed PC games launcher with auto-fetched poster art.
  * **Wallpaper**: Instant dynamic wallpaper switcher with blur presets.
  * **Themes**: Live theme palette selector with instant desktop & mobile sync.
  * **Clipboard**: Persistent clipboard history with image thumbnail previews, direct one-click paste into active windows, pin/unpin toggles, and deletion.
  * **Stats**: Real-time hardware telemetry: CPU load %, processor model, RAM usage (`used / total GB`), and host system uptime.

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
| **OpenRouter** | `openrouter/auto`, community free models | Unified aggregator with automatic model fallback |

---

## Tool Arsenal

```
Grokki Agent Runtime
├── Capabilities & Extensions
│   ├── Agent Skills (SKILL.md playbooks, "Write with Grokki" AI generation, YAML validation)
│   └── Model Context Protocol (MCP) Engine (stdio, streamable-http, presets, JSON import)
│
├── Native Desktop UI Automation (agent-desktop)
│   ├── Accessibility tree snapshots (`desktop_snapshot`) with scoped @ref IDs
│   ├── Deterministic background clicks (`desktop_click`) without mouse movement
│   ├── Headless text and value input (`desktop_type`)
│   └── App and window lifecycle control (`desktop_app_control`)
│
├── Hitodama Control Center (Desktop Notch & Pocket Companion)
│   ├── OS volume slider, media transport controls & album artwork
│   ├── Persistent clipboard history with image thumbnail previews
│   └── Telemetry: CPU load %, RAM used/total, host uptime
│
├── Workspace Integrations
│   ├── Google Workspace: Gmail, Calendar, Drive, Docs, Sheets, Tasks
│   ├── Notion: Databases, pages, notes, and documentation
│   ├── Obsidian: Local vault note authoring, bi-directional linking, search
│   └── WhatsApp Gateway: Self-hosted Baileys / OpenWA integration
│
├── Developer & Productivity Tools
│   ├── Artifact Canvas: Live HTML/CSS/SVG sandbox preview and editor
│   ├── VS Code Bug Doctor: Live problem and syntax diagnosis with direct fixes
│   ├── Git CLI: status, commit, push, pull, branch, clone
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
- **Top Edge Hover**: Hover your mouse at the top-center edge of your screen to slide down the **Hitodama Notch**.
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

Distributed under the **Grokki Studio Non-Commercial License**. Free for personal and educational use; commercial redistribution, monetization, or reselling is strictly prohibited. See [`LICENSE`](LICENSE), [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md), and [`TERMS_OF_USE.md`](TERMS_OF_USE.md) for details.

<div align="center">
  <sub>Built for autonomous desktop computing on Windows.</sub>
</div>
