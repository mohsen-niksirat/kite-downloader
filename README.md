# 🪁 Kite Downloader

A fast, lightweight download manager built with **Rust + Tauri v2** — native performance, tiny memory footprint, and a beautiful glassmorphism UI.

![Kite](src-tauri/icons/icon.png)

## ✨ Features

- **Queue & Concurrency Limiting**: Configurable active download slots (1, 2, 3, 5, 10, or unlimited). Excess downloads are queued and auto-promoted upon item completion or pause.
- **Smart Category Filtering**: Categorizes downloads into Video, Audio, Compressed, Documents, Programs, and Others with dynamic count badges.
- **Instant Search**: Live search bar to filter downloads in real-time by filename or URL.
- **Batch Controls**: Global "Resume All", "Pause All", and "Clear Finished" actions.
- **Clipboard Link Sniffer**: Detects copied media & file links with a glassmorphism toast to trigger instant downloads.
- **Checksum / Hash Verifier**: Calculate streaming SHA-256 and MD5 checksums on completed files with expected hash verification.
- **Post-Download Actions & Auto-Shutdown**: Audio completion chimes (Web Audio API) and automatic PC shutdown countdown upon queue completion.
- **Direct File Launching**: Open finished files directly in their default OS applications.
- **Multi-connection HTTP/HTTPS downloads**: Automatic Range-based resume, pre-allocated files, and smart `Content-Disposition` filename detection.
- **m3u8 / HLS stream support**: High-performance HLS pipeline with master playlist parsing (highest bandwidth variant selection), concurrent segment downloading (6 parallel streams), pause/cancel support, and automatic FFmpeg MP4 remuxing (with graceful fallback to `.ts`).
- **Browser Extension (Manifest V3)**: Works on Chrome, Brave, Edge, and Firefox. Automatic media sniffing, toolbar badge counter, one-click "Send to Kite", and right-click context menu "Download with Kite".
- **Deep Scan**: Paste any webpage URL to scrape and discover downloadable media links (videos, audio, streams, archives, documents, images) with category filtering and batch download.
- **Scheduled downloads**: Set future download start times using the built-in datetime scheduler, powered by background tokio timers.
- **Auto-retry with exponential backoff**: Recovers from mid-transfer network dropouts (up to 5 attempts) and resumes seamlessly from the last downloaded byte.
- **Configurable speed limiter**: Paces downloads chunk-by-chunk using tokio intervals to keep bandwidth free for other applications.
- **Drag-and-drop support**: Drag URLs directly into the Kite window to start or inspect downloads instantly.
- **Persistence across restarts**: Download history and settings (theme, language, default directory, speed limits, receiver port, queue limits, automation toggles) are automatically saved in the user's config directory (`dirs::config_dir()/kite`). Resumes paused downloads seamlessly.
- **Glassmorphism UI**: 6 customizable themes (Dark, Light, Ocean, Violet, Emerald, Rose) with smooth backdrop-filter blur.
- **Multi-language (i18n)**: English, فارسی (RTL with Vazirmatn font), and Deutsch.
- **Cross-platform**: Windows (NSIS installer), Linux (AppImage / deb).

---

## 🧩 Browser Extension

Kite includes a Manifest V3 browser extension located in the [`extension/`](extension/) directory.

### Features
- Intercepts web media requests (`.mp4`, `.m3u8`, `.mp3`, `.zip`, `.pdf`, etc.).
- Badge counter on extension toolbar showing detected media files on the active tab.
- Extension popup displaying detected file names, URLs, and sizes with instant "Send to Kite" buttons.
- Context menu integration: Right-click any link or page media and select **Download with Kite**.
- Direct communication with Kite's native link receiver running on `http://127.0.0.1:5741`.

### Installation

#### Chromium (Chrome, Brave, Edge)
1. Open `chrome://extensions` in your browser.
2. Enable **Developer mode** (toggle in top right).
3. Click **Load unpacked** and select the `extension` folder inside this repository.

#### Firefox
1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on...**.
3. Select `extension/manifest.json`.

---

## 🏗 Architecture

Kite is designed with a lightweight vanilla frontend and a modular Rust backend communicating over Tauri v2 IPC:

```
kite-downloader/
├── src/                      # Frontend (Vanilla JS + CSS, zero-bundler)
│   ├── index.html            # Glassmorphism interface, tabs, category pills, and modals
│   ├── style.css             # CSS variables, 6 themes, RTL styles
│   └── app.js                # Tauri IPC, i18n dictionary, audio chime, event handlers
├── src-tauri/                 # Backend (Rust + Tauri v2)
│   ├── src/
│   │   ├── main.rs           # Entry point, queue manager, concurrency limiter, IPC commands
│   │   ├── hash.rs           # Streaming SHA-256 and MD5 checksum verifier
│   │   ├── hls.rs            # m3u8 playlist parser, concurrent segment pipeline, remuxer
│   │   ├── server.rs         # Local HTTP receiver for browser extension (tiny_http:5741)
│   │   ├── scanner.rs        # Deep scan regex HTML parser for link discovery
│   │   └── storage.rs        # JSON state persistence for history and settings
│   └── tauri.conf.json       # Tauri v2 configuration
└── extension/                # Manifest V3 browser extension
    ├── manifest.json         # Chrome & Firefox MV3 manifest
    ├── background.js         # Context menu & webRequest media sniffing
    ├── content.js            # DOM link scanning
    ├── popup.html & popup.js # Glassmorphic link sender popup
    └── README.md             # Extension documentation
```

---

## 🚀 Roadmap

- [x] Core download engine (multi-connection, resume, pre-allocation)
- [x] Glass UI + 6 themes + 3-language i18n
- [x] m3u8 / HLS stream support & FFmpeg remuxing
- [x] Browser extension (Chrome / Firefox MV3) — media sniffing & context menu
- [x] Deep scan (regex link scraper for page URLs & discovery modal)
- [x] Scheduled downloads + auto-retry engine
- [x] Speed limiter chunk pacing + URL drag-and-drop
- [x] Queue concurrency limiter & auto-promotion
- [x] Smart category filter & real-time search
- [x] Checksum verifier (SHA-256 / MD5) & file launcher
- [x] Clipboard link sniffer & audio notifications
- [x] Automatic shutdown on queue completion
- [x] History & settings persistence across restarts
- [ ] BitTorrent download support

---

## 🛠 Build from source

### Prerequisites
- [Rust](https://rustup.rs) (stable)
- [Node.js](https://nodejs.org) ≥ 18
- Linux only: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf`

### Steps

```bash
# 1. Install frontend dependencies
npm install

# 2a. Run in development mode
npm run tauri dev

# 2b. Build release installers
npm run tauri build
```

Build outputs:
- **Windows**: `src-tauri/target/release/bundle/nsis/Kite_0.1.0_x64-setup.exe`
- **Linux**: `src-tauri/target/release/bundle/appimage/kite-downloader_0.1.0_amd64.AppImage`

---

## 📄 License

MIT © [Mohsen Niksirat](https://github.com/mohsen-niksirat)
