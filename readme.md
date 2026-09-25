# LooseCast

Local stream deck controller and OBS Studio overlay application built with Electron, Express, and Socket.io.

LooseCast allows streamers to trigger media overlays, play sound effects, execute multi-step automation macros, control OBS Studio via WebSocket, update atomic text counters, and control scenes remotely from a mobile browser on the local network.

## Core Capabilities

### Media Overlay and Meme Player
- Format support: MP4, WebM, MOV, MP3, WAV, OGG, GIF, WebP, PNG, JPG.
- Client-side chroma key filter for green screen videos directly in the browser overlay.
- Visual effects: screen shake, zoom, flash, glitch, and volume normalization.
- Video thumbnail generation powered by local FFmpeg.

### OBS Studio WebSocket Integration
- Compatible with OBS Studio 28+ (WebSocket v5 protocol).
- Switch active program scenes.
- Toggle scene item visibility.
- Mute and unmute audio inputs (microphone, desktop audio).
- Real-time connection status synchronization with auto-reconnect.

### Multi-Step Automation Engine
- Chain multiple actions into a single trigger (play audio, pause, switch scene, toggle source, unmute audio).
- Import and export macro presets via JSON.

### MyInstants Soundboard Integration
- Search sound memes directly from MyInstants inside the app.
- Audio preview and one-click import into local media storage.

### Mobile Deck Remote (LAN)
- Open the deck interface on mobile or tablet browsers via local IP or QR code.
- Trigger media, change scenes, and update counters without alt-tabbing during full-screen games.

### Atomic Game Counters
- Track game stats (Kills, Deaths, Wins, Losses, or custom counters).
- Atomic disk synchronization to local text files for OBS Text (GDI+) sources.

### Architecture and Security
- Local-first architecture: all core assets and dependencies run offline without external CDNs.
- Atomic file operations with temporary file swapping to prevent data corruption.
- Strict path sanitization to prevent path traversal vulnerabilities.
- One-click backup and restore of media, counters, and configurations to ZIP archives.
- Multi-language interface support (Bahasa Indonesia and English).

## System Requirements

- Operating System: Windows 10 / 11 (64-bit), macOS, or Linux
- Node.js: Version 18.x or later
- OBS Studio: Version 28 or later (OBS WebSocket v5 enabled)

## Installation and Execution

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

Desktop GUI application (Electron):
```bash
npm run dev
```

Headless web server mode:
```bash
npm start
```
Dashboard will be accessible at: `http://localhost:3000`

Run automated test suite:
```bash
npm test
```

## OBS Studio Setup Guide

### Step 1: Add Browser Source Overlay
1. In OBS Studio, go to the **Sources** panel and click **+** > **Browser**.
2. Name the source (for example: `LooseCast Overlay`).
3. Set the URL to:
   ```text
   http://localhost:3000/obs.html
   ```
4. Set Width to `1920` and Height to `1080` (or match your canvas resolution).
5. Check:
   - Shutdown source when not visible
   - Refresh browser when scene becomes active
6. Click **OK**.

### Step 2: Configure OBS WebSocket
1. In OBS Studio, open **Tools** > **WebSocket Server Settings**.
2. Check **Enable WebSocket server** (default port is `4455`).
3. In the LooseCast dashboard (Settings / Hub tab), enter your OBS port and password, then click **Connect**.

### Step 3: Display Game Counters in OBS
1. Create a counter in the LooseCast dashboard (e.g. `Kills`).
2. In OBS Studio, add a **Text (GDI+)** source.
3. Check **Read from file**, then browse to the counter text file located in `assets/text/` (or your configured user data folder).

## Mobile Remote Deck Setup

1. Ensure your PC and mobile device are connected to the same local Wi-Fi or LAN network.
2. In the LooseCast dashboard, open the **Connect to Phone** section.
3. Scan the displayed QR code with your mobile camera or navigate directly to `http://<YOUR_LOCAL_IP>:3000/deck.html`.

## Project Structure

```text
LooseCast/
├── build/                   # App icons and packaging resources
├── electron/                # Electron main process and preload bridge
│   ├── main.js              # Application lifecycle, tray, updater, logging
│   └── preload.js           # Secure IPC contextBridge bindings
├── lang/                    # Localization files (id.json, en.json)
├── public/                  # Frontend web assets
│   ├── index.html           # Main dashboard
│   ├── deck.html            # Mobile / tablet deck controller
│   ├── customdeck.html      # Media manager and deck configuration
│   ├── obs.html             # Browser source overlay
│   ├── splash.html          # Startup splash screen
│   └── css / js / fonts     # Local stylesheets, scripts, and font files
├── src/
│   ├── config/              # Application constants and defaults
│   ├── controllers/         # Express route controllers
│   ├── services/            # Core business logic (Media, OBS, Macros, Counters)
│   └── utils/               # Path security, atomic file store, logger
├── tests/                   # Automated unit and integration test suite
├── loosecast-ui.js          # Shared client-side UI controller and i18n
├── server.js                # Express and Socket.io server entry point
└── package.json
```

## Packaging and Releases

To compile executable binaries for Windows:

```bash
# Build both NSIS Installer and Portable executable
npm run build

# Build NSIS Installer only
npm run build:installer

# Build Portable standalone executable only
npm run build:portable
```

Compiled executables will be output to the `dist/` directory:
- `LooseCast Setup 1.0.0.exe` (NSIS Installer)
- `LooseCast-Portable-1.0.0.exe` (Portable executable)

## Automated Tests

Run the built-in Node.js test runner:

```bash
npm test
```

Test coverage includes:
- Path traversal and security validations
- Atomic file transactions and crash resilience
- OBS WebSocket controller and macro sequencing
- Media upload, MIME filtering, and metadata parsing
- Backup archive creation and extraction integrity

## Author

- Developer: Muhammad Fadhila Abiyyu Faris
- Website: https://fadhilaabiyyu.my.id
- Repository: https://github.com/fadhila36/LooseCast
