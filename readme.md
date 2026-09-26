# LooseCast

Local stream deck controller and OBS Studio overlay application built with **Tauri v2 (Rust)**, **Express**, and **Socket.io**.

LooseCast empowers content creators and live streamers to trigger media overlays, play sound effects, execute multi-step automation macros, control OBS Studio via WebSocket, track live atomic score counters (K/D · W/L), and control scenes remotely from any mobile browser on the local network.

---

## ✨ Core Capabilities

### 🎬 Media Overlay & Meme Player
- **Rich Format Support**: MP4, WebM, MOV, MP3, WAV, OGG, GIF, WebP, PNG, JPG.
- **Hardware-Accelerated Green Screen**: Client-side chroma key filter for green screen videos directly in the browser overlay.
- **Dynamic Visual Effects**: Screen shake, zoom, flash, glitch, and automated volume normalization.
- **Local Thumbnail Engine**: Fast video thumbnail generation powered by local FFmpeg.

### 🔌 OBS Studio WebSocket Integration
- Compatible with **OBS Studio 28+** (WebSocket v5 protocol).
- Switch active program scenes and preview scenes.
- Toggle scene item visibility on the fly.
- Mute/unmute and adjust audio inputs (microphone, desktop audio).
- Real-time connection synchronization with automated reconnection handling.

### ⚡ Multi-Step Automation Engine (Macros)
- Chain complex streaming actions into a single tap (e.g., play sound ➔ wait 500ms ➔ switch scene ➔ show source ➔ unmute mic).
- Import and export macro presets via JSON.

### 🎵 MyInstants Soundboard Integration
- Search and discover trending meme sound effects directly within the app.
- Instant audio preview and one-click import into local soundboard storage.

### 📱 Mobile Deck Remote (LAN)
- Access the deck interface from any smartphone or tablet browser via local IP or QR Code.
- Zero installation required on mobile devices.
- Trigger media, switch scenes, and update counters without alt-tabbing during full-screen games.

### ⏱️ Atomic Score Counters (K/D · W/L Tracker)
- Track game stats (Kills, Deaths, Wins, Losses, Streaks, or custom metrics).
- Atomic disk synchronization to `.txt` files in `assets/text/` for OBS **Text (GDI+)** / FreeType 2 sources with instant (0ms) update latency.
- Support for physical keyboard shortcuts (hotkeys) and long-press controls.

### 🛡️ Architecture & Native Tauri v2 Performance
- **Ultra-Lightweight Footprint**: Powered by Tauri v2 with native Rust bindings (approx. 30MB RAM vs 200MB+ in traditional Electron apps).
- **Native OS Integration**: System tray integration, native desktop notifications, window state preservation, auto-start on boot, and clipboard integration.
- **Local-First & Offline**: All core assets, sound files, and dependencies run 100% locally without external CDN dependencies.
- **Atomic Storage**: Safe file operations with temporary swap files to prevent corruption during unexpected shutdowns.
- **One-Click Backup & Restore**: Export and import full media libraries, decks, and settings as ZIP archives.
- **Bilingual Interface**: Seamless switching between Bahasa Indonesia and English.

---

## 💻 System Requirements

- **Operating System**: Windows 10 / 11 (64-bit), macOS, or Linux
- **Node.js**: Version 18.x or later
- **Rust Toolchain**: `rustc` & `cargo` (for building Tauri desktop app)
- **OBS Studio**: Version 28 or later (with OBS WebSocket server enabled)

---

## 🚀 Installation & Development

### 1. Clone Repository
```bash
git clone https://github.com/fadhila36/LooseCast.git
cd LooseCast
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Application

#### Desktop GUI Application (Tauri v2):
```bash
npm run dev
# atau
npm run tauri:dev
```

#### Headless Web Server Mode:
```bash
npm start
```
*Web dashboard will be accessible at: `http://localhost:3000`*

#### Run Automated Test Suite:
```bash
npm test
```

---

## 📺 OBS Studio Setup Guide

### Step 1: Add Browser Source Overlay
1. In OBS Studio, open the **Sources** panel and click **`+`** ➔ **`Browser`**.
2. Name the source (e.g., `LooseCast Overlay`).
3. Set the **URL** to:
   ```text
   http://localhost:3000/obs.html
   ```
4. Set Width to `1920` and Height to `1080` (or match your base canvas resolution).
5. Recommended settings:
   - ✅ *Shutdown source when not visible*
   - ✅ *Refresh browser when scene becomes active*
6. Click **OK**.

### Step 2: Connect OBS WebSocket
1. In OBS Studio, open **Tools** ➔ **WebSocket Server Settings**.
2. Check **Enable WebSocket server** (default port: `4455`).
3. In LooseCast (Settings / Hub tab), enter your OBS port & password, then click **Connect**.

### Step 3: Display K/D · W/L Counters in OBS
1. In LooseCast sidebar, open **K/D · W/L Counter** and create or select a counter (e.g., `Kill / Death`).
2. Click the **Copy Path** button to copy the local `.txt` file path.
3. In OBS Studio, add a **`Text (GDI+)`** source.
4. Check **`Read from file`**, click **Browse**, and select the copied `.txt` file.
5. Whenever you increment/decrement the counter from Deck or hotkeys, OBS updates instantly!

---

## 📱 Mobile Remote Deck Setup

1. Connect your PC and smartphone/tablet to the same Wi-Fi or local network.
2. In LooseCast sidebar, click **`Hubungkan ke HP`** (Connect to Phone).
3. Scan the displayed **QR code** with your phone's camera, or navigate to:
   ```text
   http://<YOUR_PC_IP>:3000/deck.html
   ```

---

## 📂 Project Structure

```text
LooseCast/
├── build/                   # Application icons & branding assets
├── public/                  # Frontend web UI & assets
│   ├── index.html           # Main dashboard
│   ├── deck.html            # Stream deck controller (PC & Mobile)
│   ├── customdeck.html      # Media manager & deck editor
│   ├── obs.html             # Browser source overlay engine
│   ├── splash.html          # Native startup splash screen
│   ├── css/                 # Modern design system & styles
│   └── js/                  # Client scripts & Tauri bridge
├── src/
│   ├── config/              # Application constants & defaults
│   ├── controllers/         # Express route controllers
│   ├── services/            # Business logic (Media, OBS, Macros, Counters, MyInstants)
│   └── utils/               # Path security, atomic store, logger
├── src-tauri/               # Tauri v2 native Rust backend
│   ├── src/                 # Rust entrypoint, commands, tray, window setup
│   ├── Cargo.toml           # Rust dependencies & plugins
│   └── tauri.conf.json      # Tauri application configuration
├── lang/                    # Localization dictionaries (id.json, en.json)
├── tests/                   # Automated unit & integration tests
├── loosecast-ui.js          # Shared UI framework & responsive helpers
├── server.js                # Express & Socket.io server entry point
└── package.json             # NPM package manifest & scripts
```

---

## 📦 Building Executable Packages

To build production-ready installer and standalone binaries using Tauri v2:

```bash
npm run build
# atau
npm run tauri:build
```

Compiled executables will be output to:
- `src-tauri/target/release/bundle/nsis/` (Windows NSIS Setup `.exe`)
- `src-tauri/target/release/bundle/msi/` (Windows MSI Installer)

---

## 🧪 Automated Testing

LooseCast comes with a test suite covering all critical services:

```bash
npm test
```

Test coverage includes:
- ✅ Security & path traversal validations
- ✅ Atomic file transaction resilience
- ✅ OBS WebSocket controller & macro sequencing
- ✅ Media MIME validation, upload handler, and MyInstants proxy
- ✅ Backup archive creation & ZIP restore verification
- ✅ Atomic counter increment/decrement operations

---

## 👤 Author

- **Developer**: Muhammad Fadhila Abiyyu Faris
- **Website**: [fadhilaabiyyu.my.id](https://fadhilaabiyyu.my.id)
- **Repository**: [github.com/fadhila36/LooseCast](https://github.com/fadhila36/LooseCast)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
