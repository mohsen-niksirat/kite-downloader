// Kite Downloader Extension — Popup Controller
document.addEventListener("DOMContentLoaded", async () => {
  const statusPill = document.getElementById("status-pill");
  const statusText = document.getElementById("status-text");
  const countLabel = document.getElementById("count-label");
  const mediaListEl = document.getElementById("media-list");
  const emptyStateEl = document.getElementById("empty-state");
  const sendAllBtn = document.getElementById("send-all-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const toastEl = document.getElementById("toast");

  let currentTab = null;
  let detectedMedia = [];
  let isKiteOnline = false;

  // 1. Get active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  // 2. Ping Kite desktop
  async function checkKiteStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "pingKite" }, (res) => {
        isKiteOnline = res && res.online;
        if (isKiteOnline) {
          statusPill.className = "status-pill online";
          statusText.textContent = `Connected (${res.port})`;
        } else {
          statusPill.className = "status-pill offline";
          statusText.textContent = "Kite Offline";
        }
        resolve(isKiteOnline);
      });
    });
  }

  // 3. Load media for this tab
  async function loadMedia() {
    if (!currentTab) return;
    chrome.runtime.sendMessage({ action: "getMediaForTab", tabId: currentTab.id }, (res) => {
      detectedMedia = (res && res.media) || [];
      renderMedia();
    });
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 2800);
  }

  function renderMedia() {
    countLabel.textContent = `${detectedMedia.length} media detected`;
    mediaListEl.innerHTML = "";

    if (detectedMedia.length === 0) {
      emptyStateEl.style.display = "block";
      sendAllBtn.style.display = "none";
      return;
    }

    emptyStateEl.style.display = "none";
    sendAllBtn.style.display = "inline-block";

    detectedMedia.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "media-card";

      const badgeType = item.type || "file";
      card.innerHTML = `
        <div class="card-head">
          <span class="card-title" title="${item.filename}">${escapeHtml(item.filename)}</span>
          <span class="badge ${badgeType}">${badgeType}</span>
        </div>
        <div class="card-url" title="${item.url}">${escapeHtml(item.url)}</div>
        <div class="card-foot">
          <button class="btn-send" data-index="${index}">⬇ Send to Kite</button>
        </div>
      `;

      card.querySelector(".btn-send").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = "Sending…";

        chrome.runtime.sendMessage(
          {
            action: "downloadWithKite",
            payload: {
              url: item.url,
              filename: item.filename,
              pageUrl: item.pageUrl || currentTab.url,
              headers: {
                Referer: item.pageUrl || currentTab.url
              }
            }
          },
          (res) => {
            if (res && res.success) {
              btn.textContent = "✓ Sent!";
              showToast(`Added: ${item.filename}`);
              setTimeout(() => {
                btn.textContent = "⬇ Send to Kite";
                btn.disabled = false;
              }, 2000);
            } else {
              btn.textContent = "⚠ Failed";
              showToast(res?.error || "Failed to send link to Kite");
              setTimeout(() => {
                btn.textContent = "⬇ Send to Kite";
                btn.disabled = false;
              }, 2500);
            }
          }
        );
      });

      mediaListEl.appendChild(card);
    });
  }

  function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  // Send all detected links
  sendAllBtn.addEventListener("click", async () => {
    sendAllBtn.disabled = true;
    sendAllBtn.textContent = "Sending all…";
    let sentCount = 0;

    for (const item of detectedMedia) {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "downloadWithKite",
            payload: {
              url: item.url,
              filename: item.filename,
              pageUrl: item.pageUrl || currentTab.url,
              headers: { Referer: item.pageUrl || currentTab.url }
            }
          },
          () => {
            sentCount++;
            resolve();
          }
        );
      });
    }

    showToast(`Sent ${sentCount} items to Kite!`);
    sendAllBtn.textContent = "✓ All Sent";
    setTimeout(() => {
      sendAllBtn.textContent = "⬇ Send All";
      sendAllBtn.disabled = false;
    }, 2500);
  });

  // Rescan current tab
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    if (currentTab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ["content.js"]
      });
    }
    await checkKiteStatus();
    await loadMedia();
    setTimeout(() => {
      refreshBtn.disabled = false;
    }, 800);
  });

  await checkKiteStatus();
  await loadMedia();
});
