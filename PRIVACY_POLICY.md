# Privacy Policy for Grokki Studio

**Last Updated:** October 18, 2026  
**Effective Date:** October 18, 2026  

Welcome to **Grokki Studio** ("Grokki", "we", "us", or "our"). Grokki Studio is an autonomous, open-source desktop AI companion and assistant for Windows.

Your privacy is our core engineering priority. Grokki Studio is built from the ground up on a **local-first, zero-telemetry architecture**. We do not operate tracking servers, we do not log your activity, and we never sell your personal data.

This Privacy Policy explains what information is processed, where it is stored, and how external third-party integrations interact with your device.

---

## 1. Summary of Core Privacy Principles

* **Zero Central Telemetry:** Grokki Studio contains no tracking beacons, usage trackers, analytics suites, or telemetry reporting back to us or any central server.
* **100% Local Storage:** All configuration settings, conversation memory, profile preferences, and OAuth tokens reside exclusively on your local machine (`%APPDATA%\Grokki Studio\` or local `data/` folder).
* **Direct-to-Provider AI Calls:** Your prompts and vision inputs travel directly from your machine to your chosen AI provider (Google Gemini, OpenAI, xAI Grok, Groq, DeepSeek, Qwen, OpenRouter, or your local Ollama instance). No intermediary servers sit in between.
* **100% Offline Voice & Wake Word:** Offline TTS (Kokoro-82M ONNX) and background wake word detection (`System.Speech.Recognition`) run entirely locally on your CPU/GPU with zero audio sent to the cloud.

---

## 2. Information Handled by Grokki Studio

### A. Local Profile & Preferences
* **What:** Your preferred user name, nickname, assistant tone, hotkeys, theme preferences, and memory profile.
* **Storage:** Stored locally in plain text JSON on your device:
  * Windows: `%APPDATA%\Grokki Studio\jarvis-config.json` and `grokki_profile.json`
* **Access:** Processed strictly by your local Grokki process. Never transmitted to third parties unless provided as context to an AI prompt at your request.

### B. Screen Vision & Screenshots
* **What:** When executing goal-oriented desktop tasks (such as checking whether a website is logged in or interacting with an application), Grokki may capture a temporary thumbnail screenshot.
* **Processing:** 
  * Captured frames are downscaled (e.g., 512×288) in memory.
  * Transmitted **only** to the vision-capable AI provider configured by you (e.g., Google Gemini 2.0 Flash) solely to fulfill the requested desktop automation goal.
  * Screenshots are discarded immediately from memory and are **never** archived or uploaded to external servers.

### C. OS Control, Keystrokes & Automation
* **What:** Grokki utilizes Windows automation scripts (`os_input.ps1`) to simulate mouse clicks and type text into active applications when explicitly commanded by the user.
* **Security:** Grokki does not monitor or record your keystrokes outside of direct assistant prompt interactions. Keystroke injection is strictly output-only.

### D. Audio & Speech Data
* **Voice Wake Word:** Listens locally using the native Windows speech recognition engine (`System.Speech.Recognition`) for your specified wake phrase (default: *"Hey Grokki"*). Microphone audio is processed in memory on your CPU and is **never** recorded, saved, or uploaded to any cloud service.
* **Voice Output (TTS):** When local text-to-speech is enabled, Grokki synthesizes speech using the local Kokoro-82M ONNX model. Synthesis occurs 100% offline on your device.

---

## 3. Third-Party Integrations & APIs

Grokki Studio allows you to optionally connect your own accounts to enable desktop automation features. All integrations connect directly using official vendor APIs:

### A. Google Workspace Integration (Gmail, Calendar, Drive, Docs, Sheets, Classroom, YouTube)
* **Authentication:** Uses official Google OAuth 2.0. Your client credentials and OAuth access/refresh tokens are stored strictly in your local user directory (`%APPDATA%\Grokki Studio\`).
* **Data Access:** Grokki accesses Google Workspace data (such as emails, calendar events, or documents) **only when you explicitly give an instruction** (e.g., *"Summarize my last 3 unread emails"* or *"Schedule a meeting for tomorrow"*).
* **Google API Limited Use Disclosure:**
  * Grokki Studio's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the **Limited Use** requirements.
  * Grokki Studio does not use Google Workspace data to train generalized AI models.
  * No human employee or developer has access to your Google account data.

### B. GitHub Integration
* **Authentication:** OAuth 2.0 or Personal Access Token (PAT) stored locally.
* **Data Access:** Reads or manages repository issues, pull requests, and file contents strictly upon user request.

### C. Notion & Obsidian
* **Notion:** Official Notion API token stored locally; reads and updates pages only upon your command.
* **Obsidian:** Directly accesses your local markdown vault file directory on your own disk. Zero network requests are made for Obsidian interactions.

### D. Third-Party AI Providers
When you send prompts or request autonomous actions, Grokki communicates directly with your chosen provider using the API key you provide:
* **Google Gemini:** [Google Privacy Policy](https://policies.google.com/privacy)
* **OpenAI (ChatGPT):** [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy)
* **xAI (Grok):** [xAI Privacy Policy](https://x.ai/privacy)
* **Groq:** [Groq Privacy Policy](https://groq.com/privacy-policy/)
* **DeepSeek:** [DeepSeek Privacy Policy](https://www.deepseek.com/privacy)
* **OpenRouter / OmniRouter:** Subject to provider routing policies.
* **Ollama (Local LLM):** 100% offline, air-gapped; zero external network traffic.

---

## 4. Data Security

* All credentials, API keys, and OAuth tokens are stored in the user-scoped Windows `%APPDATA%` directory, protected by Windows User Account Control (UAC) and operating system file access permissions.
* We strongly recommend maintaining antivirus protection and keeping your operating system up to date to prevent malicious software from accessing your local configuration files.

---

## 5. Children's Privacy

Grokki Studio is not directed to children under 13 years of age. We do not knowingly collect or maintain personal information from children under 13.

---

## 6. Changes to this Policy

As Grokki Studio evolves, we may update this Privacy Policy. Any updates will be reflected in this document with a revised "Last Updated" date. We encourage you to review this policy periodically.

---

## 7. Contact & Questions

If you have questions, feedback, or concerns about this Privacy Policy or your data security, please open an issue or discussion on the official GitHub repository:

* **Repository:** [https://github.com/lonewolfFSD/grokki-studio](https://github.com/lonewolfFSD/grokki-studio)
* **Maintainer:** [lonewolfFSD](https://github.com/lonewolfFSD)
