# Contributing to Grokki Studio

Thank you for considering contributing to Grokki Studio! We appreciate your interest in making this project better.

To ensure a smooth collaboration and maintain high quality across desktop runtime, native OS automation, and the user interface, please read the following guidelines before getting started.

---

## Issue Tracker

We use the GitHub issue tracker to keep track of bugs, feature proposals, and project-related discussions. 

Before starting work on a new feature, OS tool, or bug fix:
1. Check the issue tracker to see if there is an existing issue or active discussion related to your idea.
2. If an issue does not exist, open a new one describing the bug or proposal in detail.
3. For major architecture changes or new OS-level capabilities, please discuss your plan in an issue first before submitting a large pull request.

---

## Branch Naming

When creating branches for your contributions, please use the following conventional prefixes:

* `feat/<feature-name>` for new capabilities, tools, or UI modules (e.g. `feat/audio-visualizer`, `feat/notion-sync`)
* `fix/<bug-name>` for bug fixes and patches (e.g. `fix/blur-pipeline-leak`, `fix/gemini-timeout`)
* `refactor/<scope>` for code cleanup, performance optimizations, or restructuring
* `docs/<topic>` for documentation improvements and setup guides

This convention makes it straightforward to track, review, and associate contributions with their respective features and issues.

---

## Pull Requests

We welcome pull requests from everyone as long as they respect the quality and stability standards of the project. To submit a pull request, please follow these steps:

1. Fork the repository and create a new branch following the branch naming conventions above.
2. Make your changes in your branch with clean, focused commits.
3. Verify that your changes compile cleanly by running `npm run build` with zero TypeScript or bundling errors.
4. Test the application locally in both development mode (`npm run dev`) and standard startup (`npm start`).
5. Check the Developer Tools console for uncaught exceptions, unhandled Promise rejections, or memory leaks.
6. Verify your changes across both light and dark themes to ensure readability and contrast standards are preserved.
7. Submit a pull request to the main repository's `main` branch.
8. Provide a clear and descriptive title along with a detailed description of your changes, including screenshots or short screen captures where visual components or tools were added or modified.

Any pull requests that fail to meet these requirements or break existing OS automation safety guards may be requested for revision or closed.

---

## Architecture & Code Standards

Grokki Studio operates as a hybrid architecture combining an Electron desktop shell, native Windows OS automation scripts, and a modern React interface. Please follow these domain standards:

### Electron Main Process (`src/main/`)
* **IPC Isolation**: All communication between the frontend and Node.js runtime must go through secure `ipcMain.handle` and `ipcRenderer.invoke` channels. Never expose raw Node.js or `child_process` primitives directly to the renderer.
* **Process Safety**: Native system calls (PowerShell, keyboard/mouse automation, screen capture) must have timeouts and error boundaries to prevent hanging the main process.
* **Configuration Persistence**: Any user preference changes must be validated against `JarvisConfig` and safely persisted in `%APPDATA%\data\jarvis-config.json`.

### Preload Bridge (`src/preload/`)
* Keep the context bridge strictly typed in `src/preload/preload.js` and mirrored in `src/web/types/jarvis.d.ts`.
* Avoid exposing mutable objects or references across the context bridge boundary.

### React & UI Workspace (`src/web/`)
* **Styling**: Use Tailwind CSS v4 utility classes. Keep styles consistent with the existing minimalist, dark-glass desktop theme.
* **Typography**: Maintain clean developer-first typography without emoji clutter in production interface titles or system headers.
* **Performance**: UI animations must remain smooth at 60 FPS. Avoid unnecessary re-renders in streaming chat containers, canvas split views, or background shader passes.

### OS Automation & Scripts (`src/main/os_input.ps1`, `src/main/agent_brain.js`)
* OS commands must remain compatible with Windows 10 and Windows 11 default environments (PowerShell 5.1 and PowerShell 7+).
* Ensure proper UTF-8 string encoding when passing text between Node.js and PowerShell to avoid character corruption.

---

## Development Setup

```bash
# Clone your fork
git clone https://github.com/<your-username>/grokki-studio.git
cd grokki-studio

# Install dependencies
npm install

# Run Vite dev server with Hot Module Replacement
npm run dev

# Run production build validation
npm run build
```

---

## Community Guidelines

* **Respect & Collaboration**: Please remain constructive, polite, and respectful in all issues, pull requests, and discussions.
* **Licensing**: All contributions fall under the project's Non-Commercial License. Ensure that any code or assets you contribute do not violate third-party licenses or proprietary terms.

---

## Conclusion

We appreciate your interest in contributing to Grokki Studio! By following these guidelines, you help us keep the runtime stable, responsive, and secure for everyone.

If you have questions or need assistance, feel free to open a discussion or ask in the issue tracker.

Happy contributing!
