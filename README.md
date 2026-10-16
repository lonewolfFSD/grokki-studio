# 🖤 Grokki - Autonomous OS Companion & Agent

A true autonomous desktop AI companion modeled after **Grok**, living in an Apple Dynamic Island at the top of your screen. Grokki uses **vision screen scanning**, **real OS mouse control**, **zero-hardcoding goal execution**, and **genuine Apple desktop blur** to do the hard work for you.

---

## ⚡ What Makes Grokki Next-Gen

### 1. Genuine Desktop Blur (100% Real Apple Glass)
* Windows cannot blur external windows via standard CSS `backdrop-filter`. Grokki solves this by capturing a real-time desktop frame on summon (`Alt + Q`) and rendering it as a GPU-accelerated blurred backdrop layer (`blur(38px) brightness(0.55) saturate(190%)`).
* Your open apps, icons, and wallpaper are **genuinely blurred in real-time**, just like macOS Spotlight / iOS Siri!
* Click anywhere outside to dismiss.

### 2. Autonomous NLP Vision & OS Control (Zero Hardcoding)
* **Goal-Oriented Planning**: No rigid `if/else` statements.
* **Auto-Fallback & Screen Scanning**:
  * If you ask for *"Spotify"*: Grokki checks if the desktop app is installed. If not, he automatically shifts to the web version!
  * **Screen Vision Scan**: Grokki scans the web screen to detect if you are logged in.
  * **Interactive Decision**: If signed out, Grokki proactively asks:
    > *"Spotify isn't signed in on your browser. Would you like to sign in now, or should I switch to YouTube Music instead?"*
    > `[Switch to YouTube Music]` `[Stay on Spotify Web]` `[Search YouTube]`
  * Clicking an option or speaking your answer immediately executes the pivot!

### 3. Ultra-Low Token Usage
* When using Gemini 2.0 Flash Vision, screenshots are downscaled to 512×288 thumbnail frames.
* **Cost per screen scan: only ~250 tokens**!
* Extremely lightweight, ultra-fast responses without burning your quota.

### 4. Real OS Mouse Control & Keystrokes
* Grokki doesn't just animate a cursor—he moves the **actual Windows OS mouse cursor** and executes real left-clicks and typed keystrokes into active applications.

### 5. The Living Grokki Character
* Solid obsidian black sphere with signature tilted twin pill eyes `""`.
* **Poke Reaction**: Click him to watch him squash, hop, wink, and giggle with a cute synthesized bubble squeak.
* **Sound Synthesizer**: Procedural Apple-style chimes and clicks via Web Audio API.

---

## 🚀 How to Run

In your terminal at `e:\Assistant AI`:
```powershell
npm start
```

* Press **`Alt + Q`** to summon Grokki.
* Try giving dynamic orders:
  * `"Open Spotify"` (Watch him check for the app, fall back to web, scan screen, and ask to pivot to YouTube Music!)
  * `"Open Notepad and type I love AI"`
  * `"Search YouTube for relaxing lofi music"`
  * Click on Grokki's face to poke him!
