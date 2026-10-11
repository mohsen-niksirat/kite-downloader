# 🪁 Kite Downloader — Browser Extension

The official browser companion for **Kite Downloader**, supporting Chromium-based browsers (Google Chrome, Brave, Microsoft Edge, Vivaldi, Opera) and Mozilla Firefox (Manifest V3).

## 🌟 Key Features

- **Automatic Media & Stream Sniffing**: Detects videos, audio, archives, documents, and HLS `.m3u8` video streams embedded in webpages.
- **Context Menu Integration**: Right-click any link, video, audio, or image and select **"Download with Kite"** for instant 1-click downloading.
- **Dynamic Badge Counter**: Toolbar badge displays the live count of downloadable media items detected on the active tab.
- **Fast Local Communication**: Directly communicates with Kite's native local receiver on `http://127.0.0.1:5741` with zero cloud dependencies and high privacy.

---

## 🚀 Installation Guide

### Google Chrome / Brave / Microsoft Edge

1. Open your browser and navigate to the extensions management page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
2. Enable **Developer mode** (toggle switch in the top-right corner).
3. Click the **Load unpacked** button in the top-left corner.
4. Browse to and select the `extension/` directory inside this repository.
5. The Kite Downloader Bridge extension will appear in your toolbar! Pin it for quick access.

### Mozilla Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Browse to the `extension/` directory and select `manifest.json`.
4. The extension will be loaded and active.

---

## ⚙️ How It Works

1. Ensure the **Kite Downloader** desktop application is running.
2. In Kite's **Settings** tab, verify that **Native Link Receiver** is enabled (running on port `5741` by default).
3. When you open any webpage containing downloadable media, Kite's extension badge will display the number of detected streams or files.
4. Click the extension icon in your browser to view the list and click **"⬇ Send to Kite"** or **"⬇ Send All"**.
