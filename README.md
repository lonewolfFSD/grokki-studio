<div align="center">

<img src="assets/grokki_wordmark.png" alt="Grokki Wordmark" width="480"/>

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/lonewolfFSD/grokki-studio)
[![Electron](https://img.shields.io/badge/Electron-44.7.2-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Non--Commercial-red?style=for-the-badge)](LICENSE)

**An autonomous AI desktop companion living in an Apple-style Dynamic Island at the top of your screen.**  
*Equipped with real-time desktop vision, physical OS mouse/keyboard control, 65+ native Windows tools, and hybrid local/cloud intelligence.*

[Key Features](#-key-features) • [Flagship Upgrades](#-flagship-studio-upgrades) • [UI & Visual Effects Suite](#-visual-effects--design-system-components) • [Screenshots](#-preview--screenshots) • [AI Brain Engines](#-ai-brain--multi-engine-support) • [Tool Arsenal](#-complete-tool-arsenal-65-built-in-capabilities) • [Quick Start](#-quick-start) • [Installer Build](#-building-the-installer-exe)

</div>

---

## 🚀 Flagship Studio Upgrades

Grokki Studio includes 4 game-changing workspace features elevating desktop AI companion capabilities beyond standard web chatbots:

### 1. 🎨 Interactive "Artifacts / Canvas" Split Pane
*Inspired by Claude Artifacts and OpenAI Canvas*
* **Live Sandbox Previews**: Generates HTML, CSS, SVG, JavaScript, and Markdown with an embedded isolated sandbox preview drawer (`w-[48%]` split pane).
* **Syntax-Highlighted Code Editor**: Full-featured code viewer with line numbers, 1-click clipboard copy, and direct **Save to Workspace File** capabilities.
* **Responsive Layouts**: Toggle split-view or expand to full workspace width for distraction-free coding or reading.

### 2. ⚔️ Multi-Brain Dual-Battle & Consensus Engine
*Comparative intelligence across multiple frontier models*
* **Concurrent Multi-Model Execution**: Dispatches your prompt to two distinct AI brains concurrently (e.g. Gemini Flash vs. Groq Qwen/Llama or Ollama Local) via `Promise.all()`.
* **Side-by-Side Comparison Grid**: Comparative cards featuring model name badges, real-time latency indicators (in milliseconds), and individual copy and winner selection.
* **AI Consensus Synthesizer**: Click **Merge & Synthesize Consensus** to cross-examine both arguments, resolve discrepancies or hallucinations, and produce a unified verdict.
* **Hover-Expand Toolbar**: Sleek, icon-only toolbar buttons that smoothly reveal text on hover with zero layout jitter.

### 3. 📁 Deep Workspace Project Context (`@file` & `@folder`)
*Cursor-style inline code context auto-suggest*
* **Fuzzy Workspace Search**: Type `@` anywhere in the chat input to search files and folders across your active project.
* **Recursive Folder Ingestion**: Mention `@folder` to automatically index directories, filter ignored patterns (`node_modules`, `.git`, `dist`), and bundle relevant source files directly into prompt context.
* **Staged Mention Pills**: Interactive badge pills displaying file names, sizes, and 1-click removal.

### 4. 🌐 Perplexity-Style Live Web Grounding & Citations
*Real-time factual accuracy without knowledge cutoffs*
* **Deep Search Toggle**: One-click icon toggle in the chat input toolbar.
* **Real-Time Web Search**: Formulates search queries and ingests multi-source search snippets into model context before generation.
* **Interactive Citations Bar**: Displays an expandable Perplexity-style source accordion with domain badges, favicon previews, and full source URLs.
* **Inline Citation Badges (`[1]`, `[2]`)**: Interactive pill links with preview tooltips showing publication titles and destinations.

---

## 🎨 Visual Effects & Design System Components

Grokki Studio features a handcrafted, performance-optimized visual effects suite located in `src/effects/`:

| Component | Path | Description & Highlights |
| :--- | :--- | :--- |
| **`Noise`** | [`src/effects/Noise.tsx`](src/effects/Noise.tsx) | Procedural film grain, customizable contrast, CRT scanlines, and FPS-capped canvas rendering with dedicated settings toggle. |
| **`GlideSelect`** | [`src/effects/GlideSelect.tsx`](src/effects/GlideSelect.tsx) | Physics-driven gliding pill dropdown selector with keyboard typeahead navigation, tags, and provider logos. |
| **`GradualBlur`** | [`src/effects/GradualBlur.tsx`](src/effects/GradualBlur.tsx) | Multi-layer exponential blur gradient overlay providing smooth progressive scrolling blur masks. |
| **`GradientASCII`** | [`src/effects/GradientASCII.tsx`](src/effects/GradientASCII.tsx) | Ambient WebGL horizon shader with interactive ASCII glyph rendering and mouse click ripple wave dynamics. |
| **`WarmTooltip`** | [`src/effects/WarmTooltip.tsx`](src/effects/WarmTooltip.tsx) | Natural physics popover tooltips with keyboard shortcut displays, directional arrow placement, and smooth fuse decay. |
| **`LatticeLoader`** | [`src/effects/LatticeLoader.tsx`](src/effects/LatticeLoader.tsx) | Kinetic lattice structure animation for thinking pauses and background agent work indication. |
| **`BranchedMenu`** | [`src/effects/BranchedMenu.tsx`](src/effects/BranchedMenu.tsx) | Contextual branching menu tree with animated line connectors and submenu transitions. |
| **`GlassSurface`** | [`src/effects/GlassSurface.js`](src/effects/GlassSurface.js) | Hardware-accelerated frosted glass backdrop with dynamic refraction and specular highlights. |
| **`GlowCursor`** | [`src/effects/GlowCursor.tsx`](src/effects/GlowCursor.tsx) | Spring-interpolated custom desktop cursor with directional acceleration and glow trail. |

---

## 📸 Preview & Screenshots

<div align="center">
  <table>
    <tr>
      <td width="50%" align="center">
        <img src="assets/screenshots/dynamic_island_blur.png" onerror="this.src='assets/grokki_splash.jpg'" alt="Grokki Island with Real Desktop Blur" width="100%"/>
        <br/><b>⚡ Grokki Island with Real GPU Desktop Blur (`Alt+Q`)</b>
      </td>
      <td width="50%" align="center">
        <img src="assets/screenshots/studio_dashboard.png" onerror="this.src='assets/grokki_splash.jpg'" alt="Grokki Studio Dashboard" width="100%"/>
        <br/><b>🎛️ Grokki Studio Central Dashboard</b>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="assets/screenshots/ai_brain_toggle.png" onerror="this.src='assets/grokki_splash.jpg'" alt="AI Brain Paid vs Free Providers" width="100%"/>
        <br/><b>🧠 Dual AI Brain (Paid Flagships & Free Engines)</b>
      </td>
      <td width="50%" align="center">
        <img src="assets/screenshots/workspace_hub.png" onerror="this.src='assets/grokki_splash.jpg'" alt="Workspace Ecosystem Hub" width="100%"/>
        <br/><b>💼 Google, Notion, Obsidian & GitHub Integrations</b>
      </td>
    </tr>
  </table>
  <sub><i>Tip: Drop your screenshots into <code>assets/screenshots/</code> to replace the fallback previews above.</i></sub>
</div>

---

## ⚡ Key Features

Unlike browser-based chatbots or static wrappers, Grokki is a **living Windows OS agent**. He perceives your monitor, makes autonomous decisions, and physically drives your computer.

### 1. 🪟 Genuine Desktop Blur (True Apple Glass)
Windows cannot natively blur third-party desktop windows behind transparent frameless Electron shells. Grokki solves this:
* On summon (`Alt + Q`), a GPU-accelerated capture pipeline snaps your desktop background.
* It applies a real-time Apple-spec Gaussian blur layer (`blur(38px) brightness(0.55) saturate(190%)`).
* Your wallpaper, active IDE, browser, and documents blur dynamically in real-time.
* Click anywhere outside the island to dismiss.

### 2. 🦾 Real OS Mouse & Keyboard Manipulation
* Grokki doesn't just animate a cursor—he moves the **actual Windows OS mouse cursor** with smooth easing trajectories.
* Executes real left-clicks, double-clicks, right-clicks, and native keystrokes into active applications (Notepad, Word, File Explorer, Terminal).

### 3. 👁️ Ultra-Low Token Multimodal Vision
* Captures active displays and downscales frames for vision models.
* **Cost per screen scan: ~250 tokens** via Gemini Flash Vision.
* Identifies login screens, reads error squiggles in VS Code, inspects YouTube tutorials, and diagnoses active windows.

### 4. 🎯 Autonomous Goal Execution & Dynamic Pivoting
* **Zero hardcoded branching**: Grokki formulates multi-step action plans dynamically.
* *Example:* Ask Grokki to *"Play The Weeknd on Spotify"*. Grokki checks if Spotify Desktop is installed. If absent, he pivots to Spotify Web. If logged out, he inspects your screen, halts, and suggests:
  > *"Spotify isn't logged in on your browser. Would you like to log in now, or should I switch to YouTube Music instead?"*

### 5. 📋 Highlight-to-Action ("Act on Whatever I Selected")
* Highlight any text or code in your browser, PDF, or editor, and press **`Alt + Q`**.
* Ask Grokki to *"Rewrite this"*, *"Fix bugs in this selection"*, or *"Summarize this"*.
* Grokki grabs the highlighted selection, transforms it with your active AI engine, and copies the clean result directly to your clipboard (or auto-replaces it in place).

### 6. 🖤 The Living Dynamic Island Companion
* **Interactive Physics**: Click and poke Grokki's obsidian sphere face to see him squash, wink, jump, and giggle.
* **Synthesized Audio**: Procedural Apple-style UI chimes and audio feedback generated via Web Audio API.

---

## 🧠 AI Brain & Multi-Engine Support

Grokki features an interface toggle between **Paid Enterprise Flagships** and **Free Tier / Open-Source Engines**:

| Tier | Supported Engines & Providers | Highlights |
| :--- | :--- | :--- |
| **👑 Paid Models** | • **Grok (xAI)** (`grok-2-1212`, `grok-2-vision`)<br/>• **ChatGPT (OpenAI)** (`gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini`)<br/>• **Google Gemini Pro** (`gemini-2.5-pro`, `gemini-1.5-pro`)<br/>• **DeepSeek Official** (`deepseek-chat`, `deepseek-reasoner`)<br/>• **Qwen (Alibaba DashScope)** (`qwen-max`, `qwen-plus`) | Direct official API gateways, maximum token limits, deep STEM & reasoning models. |
| **⚡ Free / Open-Source** | • **Google Gemini Free Tier** (`gemini-2.5-flash`, `gemini-2.0-flash`)<br/>• **Groq Cloud** (`llama-3.3-70b-versatile`, 500+ T/s)<br/>• **Ollama Local** (`llama3.2`, `deepseek-r1`, 100% offline air-gap)<br/>• **OpenRouter** (`openrouter/auto`, community free models)<br/>• **OmniRouter** (Unified open routing gateway) | 100% free operation, private local offline models, zero cost inference. |

---

## 🛠️ Complete Tool Arsenal (65+ Built-in Capabilities)

```
Grokki Desktop Agent
├── 🖥️ System & OS Controls
│   ├── Real mouse clicks, double-clicks, right-clicks, and smooth cursor gliding
│   ├── Window management (focus, minimize, maximize, snap, close)
│   ├── Native audio volume & screen brightness controls
│   ├── System power (sleep, restart, shutdown, cancel shutdown)
│   └── 1-Click Downloads & Desktop auto-organizer
│
├── 📝 Productivity & Developer Tools
│   ├── Highlight-to-Action: Rewrites, fixes, or summarizes selected text anywhere
│   ├── VS Code Bug Doctor: Live problem/syntax diagnosis with direct copy-paste fixes
│   ├── MS Word & Notepad autonomous document authoring
│   ├── Git CLI & GitHub GUI (status, commit, push, pull, branch, clone)
│   └── Multi-format document parser (PDF, DOCX, TXT, Markdown, CSV, JSON)
│
├── 🌐 Workspace Ecosystem
│   ├── Google Workspace: Gmail, Calendar, Drive, Docs, Sheets, Tasks, Classroom
│   ├── Notion Workspace: Pages, database creation, search, notes
│   ├── Obsidian Vault: Local note creation, bi-directional linking, vault search
│   └── WhatsApp Web Automation: Automated messaging and file dispatch
│
├── 🎵 Media & Streaming
│   ├── Spotify, YouTube Music, Apple Music, and Amazon Music playback
│   ├── Media hardware keys (Next, Prev, Play/Pause, Stop)
│   └── YouTube video search, playlist manager, and lecture summarizer
│
└── 🎓 Academic Study Engine
    ├── 1-Page Exam Cheat Sheet synthesizer
    ├── Probable Exam Questions & Model Answer generator
    ├── Feynman Technique (ELI5) concept explainer
    └── ArXiv research paper search and automatic PDF downloader
```

---

## 🚀 Quick Start

### Prerequisites
- **Operating System:** Windows 10 or Windows 11 (64-bit)
- **Node.js:** v18.0.0 or higher
- **Package Manager:** npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lonewolfFSD/grokki-studio.git
   cd grokki-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Launch in Development Mode:**
   ```bash
   npm run dev
   ```

4. **Summon Grokki:**
   - Press **`Alt + Q`** from any application.
   - Or say **`"Hey Grokki"`** to trigger the background wake word detector.

---

## 📦 Building the Installer (.exe)

Grokki packages into a standalone Windows installer wizard via `electron-builder`:

```bash
# Compile and package for production (NSIS installer)
npm run dist
```

The output setup installer will be generated in `release/`:
```
release/Grokki Studio-Setup-1.0.0.exe
```

---

## 🔒 Security & Privacy Architecture

- **Private Keys**: All API keys and workspace tokens are stored in the user's local `%APPDATA%\data\` directory. Keys are never shipped in pre-built executables or sent to third-party tracking servers.
- **Zero Remote Telemetry**: Runs strictly peer-to-peer between your PC and your chosen LLM endpoints.
- **Air-Gap Capability**: Switch to **Ollama Local** in the AI Brain for a completely offline assistant with no internet access required.

---

## 🤝 Contributing

Contributions are welcome! Whether you are adding a new OS tool, refining UI components, or improving model compatibility:

1. **Fork the Repository**
2. **Create a Feature Branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit Your Changes:**
   ```bash
   git commit -m "feat: add amazing new desktop tool"
   ```
4. **Push to the Branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

Please ensure all TypeScript interfaces compile cleanly (`npm run build`) before opening a PR.

---

## 📄 License

Distributed under the **Grokki Studio Non-Commercial License**. Free for personal and educational use; commercial redistribution, monetization, or selling is strictly prohibited. See [`LICENSE`](LICENSE), [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md), and [`TERMS_OF_SERVICE.md`](TERMS_OF_SERVICE.md) for more information.

<div align="center">
  <sub>Built with ❤️ for autonomous desktop computing.</sub>
</div>
