// Kite Downloader Extension — Background Service Worker
const KITE_PORT = 5741;
const KITE_URL = `http://127.0.0.1:${KITE_PORT}`;

// In-memory media store: tabId -> array of media items
const tabMedia = new Map();

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "kite-download-context",
    title: "Download with Kite",
    contexts: ["link", "video", "audio", "image"]
  });

  if (chrome.action && chrome.action.setBadgeBackgroundColor) {
    chrome.action.setBadgeBackgroundColor({ color: "#f97316" });
  }
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "kite-download-context") {
    const targetUrl = info.srcUrl || info.linkUrl;
    if (!targetUrl) return;

    await sendToKite({
      url: targetUrl,
      pageUrl: tab?.url || info.pageUrl || "",
      headers: {
        Referer: tab?.url || info.pageUrl || ""
      }
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;

  if (message.action === "reportMedia") {
    if (tabId) {
      const existing = tabMedia.get(tabId) || [];
      const incoming = message.media || [];
      const mergedMap = new Map();
      for (const item of [...existing, ...incoming]) {
        mergedMap.set(item.url, item);
      }
      const updated = Array.from(mergedMap.values());
      tabMedia.set(tabId, updated);

      const count = updated.length;
      chrome.action.setBadgeText({
        text: count > 0 ? String(count) : "",
        tabId: tabId
      });
      chrome.action.setBadgeBackgroundColor({ color: "#f97316", tabId });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === "getMediaForTab") {
    const list = tabMedia.get(message.tabId) || [];
    sendResponse({ media: list });
    return true;
  }

  if (message.action === "downloadWithKite") {
    sendToKite(message.payload).then((res) => {
      sendResponse(res);
    });
    return true;
  }

  if (message.action === "pingKite") {
    checkKiteConnection().then((ok) => {
      sendResponse({ online: ok, port: KITE_PORT });
    });
    return true;
  }
});

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  tabMedia.delete(tabId);
});

// Check connectivity to local Kite server
async function checkKiteConnection() {
  try {
    const res = await fetch(`${KITE_URL}/ping`, {
      method: "GET",
      mode: "cors"
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

// Send download request to Kite
async function sendToKite(payload) {
  try {
    const res = await fetch(`${KITE_URL}/download`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text();
      return { success: false, error: txt || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: "Could not connect to Kite. Make sure Kite is running and Native Link Receiver is active."
    };
  }
}
