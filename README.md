# 🪁 Kite Downloader

A fast, lightweight download manager built with **Rust + Tauri** — native performance, tiny memory footprint, and a beautiful glassmorphism UI.

![Kite](src-tauri/icons/icon.png)

## ✨ Features

- **Multi-connection HTTP/HTTPS downloads** with automatic resume (Range support)
- **Pause / Resume / Cancel** any download — even after restarting the app (partial file is kept)
- **Pre-allocated files** — no disk fragmentation, instant space reservation
- **Smart filename detection** — from `Content-Disposition` headers, URL path, and percent-encoding
- **Glassmorphism UI** with 6 themes (Dark, Light, Ocean, Violet, Emerald, Rose)
- **3 languages**: English, فارسی (RTL), Deutsch
- **Cross-platform**: Windows (NSIS installer), Linux (AppImage / deb)

## 🚀 Roadmap

- [x] Core download engine (multi-connection, resume)
- [x] Glass UI + themes + i18n
- [ ] m3u8 / HLS stream support
- [ ] Browser extension (Chrome / Firefox) — link extraction from pages
- [ ] Deep scan (extract download links from a page URL)
- [ ] Torrent support
- [ ] Scheduled downloads

## 🛠 Build from source

### Prerequisites
- [Rust](https://rustup.rs) (stable)
- [Node.js](https://nodejs.org) ≥ 18
- Linux only: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf`

### Steps

```bash
# 1. Install frontend deps
npm install

# 2a. Run in development mode
npm run tauri dev

# 2b. Build the release installers
npm run tauri build
```

Build outputs:
- **Windows**: `src-tauri/target/release/bundle/nsis/Kite_0.1.0_x64-setup.exe`
- **Linux**: `src-tauri/target/release/bundle/appimage/kite-downloader_0.1.0_amd64.AppImage`

## 📄 License

MIT © [Mohsen Niksirat](https://github.com/mohsen-niksirat)
