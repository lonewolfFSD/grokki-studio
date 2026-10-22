# Privacy Policy for Grokki Studio

**Last Updated:** October 22, 2026  
**Effective Date:** October 22, 2026

Your privacy and digital sovereignty are foundational principles of **Grokki Studio** ("Grokki", "Software", "we", "us", or "our"). This Privacy Policy describes how Grokki Studio handles data, credentials, and information when you use our Windows desktop application.

---

## 1. Core Privacy Philosophy: Local-First & Zero Surveillance

Grokki Studio is built as a **local-first desktop application**:
- **No Central Tracking Servers**: We do not operate remote telemetry collectors, ad networks, tracking pixels, or user activity surveillance servers.
- **No Data Harvesting**: We do not collect, aggregate, or sell your personal data, chat histories, code snippets, or system usage patterns.
- **User Ownership**: Your configuration, conversations, integrations, and workspace notes reside directly on your local device.

---

## 2. What Information We Do NOT Collect

To be clear on what Grokki Studio does **not** do:
- We do **not** record, capture, or transmit keystrokes outside of user-directed prompt inputs.
- We do **not** stream continuous background video or screen recordings to any remote Grokki servers.
- We do **not** log or store your third-party API keys on external servers.
- We do **not** monetize personal data or run user-profiling algorithms.

---

## 3. Data Processed Locally on Your Machine

The following data categories are generated and processed strictly within your workstation's local environment:

### A. API Keys & Authentication Credentials
- **Storage**: All user-configured API keys (e.g., Groq, OpenAI, Anthropic, Gemini, OpenRouter) and integration tokens (Notion, GitHub, Google OAuth tokens) are stored locally in application configuration files.
- **Security**: Sensitive tokens are secured using operating system-level encryption primitives (such as Windows Data Protection API / Electron `safeStorage`) to prevent unauthorized local process access.

### B. Conversation History & Artifacts
- **Storage**: Prompts, assistant responses, scratchpads, code blocks, and conversation threads are saved to local application storage (e.g., local JSON / SQLite state in your user profile).
- **Control**: You can clear all conversations at any time directly through the Studio Settings tab (*Clear All Conversations* button).

### C. Desktop Vision & Screen Capture
- **Transient Memory Execution**: When desktop vision tools or screen analysis commands are invoked, display snapshots are captured in temporary system memory (RAM).
- **Retention**: Screen frames are discarded immediately after analysis by the active model engine and are never archived locally or transmitted to unauthorized parties.

### D. System & Workspace Context
- File system reads, directory scans, and local tool executions (such as reading local Obsidian `.md` notes or VS Code diagnostic logs) are performed strictly upon user instruction within the user's authorized local file paths.

---

## 4. Third-Party Data Transmission

When you choose to utilize cloud-hosted AI providers or external workspace integrations, data is transmitted directly from your local client to the respective third-party service:

| Integration / Provider | Data Transmitted | Privacy Policy Reference |
| :--- | :--- | :--- |
| **OpenAI / Anthropic / Google Gemini** | Prompts, attachments, and model parameters sent via official HTTPS API endpoints using your provided key. | Governed by the respective provider's developer data privacy policy. |
| **Groq / OpenRouter / DeepSeek** | Prompts and inference queries routed through third-party inference APIs using your provided key. | Governed by the respective provider's terms and privacy policies. |
| **Google Workspace (Drive/Docs/Gmail)** | OAuth authentication tokens and requested document/email data strictly when workspace tools are triggered. | [Google Privacy Policy](https://policies.google.com/privacy) |
| **Notion** | Database and page read/write requests authenticated via your internal integration token. | [Notion Privacy Policy](https://www.notion.so/help/privacy-policy) |
| **GitHub CLI** | Repository metadata, pull requests, and commit logs retrieved via local authenticated `gh` CLI. | [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement) |
| **Local Models (Ollama / LM Studio)** | Data is processed 100% locally on your workstation; zero external network transmission occurs. | Complete local privacy. |

---

## 5. User Data Control & Deletion

You maintain complete sovereignty over your data:

1. **Delete Conversations**: Click the *Clear All Conversations* button in Studio Settings to permanently erase all locally stored chat histories.
2. **Remove Integrations**: Disconnect Google Workspace, clear Notion tokens, or delete API keys from the settings UI at any time.
3. **Uninstalling**: Uninstalling Grokki Studio and removing the `%APPDATA%\grokki-studio` directory completely removes all local preferences, database caches, and logs from your machine.

---

## 6. Security Practices

We take multiple architectural precautions to protect your local environment:
- **Electron Security**: Node integration is disabled in untrusted renderer contexts, context isolation is enforced, and web security is active.
- **HTTPS Only**: All outgoing API requests to third-party model providers and OAuth services strictly utilize encrypted TLS/HTTPS connections.
- **Zero Third-Party Ad Scripts**: Grokki Studio contains no third-party web trackers, advertising SDKs, or analytics beacons.

---

## 7. Children's Privacy

Grokki Studio is not intended for use by children under the age of 13. We do not knowingly collect or solicit personal data from children.

---

## 8. Changes to This Privacy Policy

We may update this Privacy Policy periodically to reflect new software capabilities, legal requirements, or integration features. Any updates will be published by committing the revised document to this repository with an updated "Last Updated" date.

---

## 9. Contact & Inquiries

For questions or security concerns regarding this Privacy Policy:
- **Security & Privacy Reports**: Open an issue on our GitHub repository: [https://github.com/lonewolfFSD/grokki-studio/issues](https://github.com/lonewolfFSD/grokki-studio/issues)
- **Community Discussions**: [https://github.com/lonewolfFSD/grokki-studio/discussions](https://github.com/lonewolfFSD/grokki-studio/discussions)
