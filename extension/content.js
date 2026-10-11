// Kite Downloader Extension — Content Script for Page Media Sniffing
(function () {
  const MEDIA_REGEX = /\.(m3u8|mpd|mp4|mkv|webm|avi|mov|flv|ts|mp3|wav|ogg|flac|aac|m4a|zip|rar|7z|tar|gz|iso|pdf|exe|dmg|apk|torrent)(\?.*)?$/i;

  function guessFilename(url, fallbackTitle) {
    try {
      const u = new URL(url);
      const cleanPath = u.pathname.split("/").filter(Boolean).pop();
      if (cleanPath && cleanPath.includes(".")) {
        return decodeURIComponent(cleanPath);
      }
    } catch {}
    if (fallbackTitle && fallbackTitle.trim()) {
      return fallbackTitle.trim().replace(/[\\/:*?"<>|]/g, "_");
    }
    return "download";
  }

  function getMediaType(url) {
    const lower = url.toLowerCase();
    if (lower.includes(".m3u8") || lower.includes(".mpd")) return "stream";
    if (/\.(mp4|mkv|webm|avi|mov|flv|ts)(\?|$)/i.test(lower)) return "video";
    if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?|$)/i.test(lower)) return "audio";
    if (/\.(zip|rar|7z|tar|gz|iso)(\?|$)/i.test(lower)) return "archive";
    if (/\.pdf(\?|$)/i.test(lower)) return "document";
    return "file";
  }

  function scanMedia() {
    const results = new Map();

    // 1. Scan <video> and <audio> tags
    document.querySelectorAll("video, audio").forEach((el) => {
      const src = el.currentSrc || el.src;
      if (src && /^https?:\/\//i.test(src)) {
        results.set(src, {
          url: src,
          filename: guessFilename(src, el.getAttribute("title") || document.title),
          type: getMediaType(src),
          pageUrl: window.location.href
        });
      }
    });

    // 2. Scan <source> tags
    document.querySelectorAll("source").forEach((el) => {
      const src = el.src || el.getAttribute("src");
      if (src && /^https?:\/\//i.test(src)) {
        results.set(src, {
          url: src,
          filename: guessFilename(src, document.title),
          type: getMediaType(src),
          pageUrl: window.location.href
        });
      }
    });

    // 3. Scan <a> links
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.href;
      if (href && /^https?:\/\//i.test(href) && MEDIA_REGEX.test(href)) {
        const text = a.innerText.trim();
        results.set(href, {
          url: href,
          filename: guessFilename(href, text || document.title),
          type: getMediaType(href),
          pageUrl: window.location.href
        });
      }
    });

    const mediaList = Array.from(results.values());
    if (mediaList.length > 0) {
      try {
        chrome.runtime.sendMessage({
          action: "reportMedia",
          media: mediaList
        });
      } catch {}
    }
  }

  // Initial scan
  scanMedia();

  // Re-scan when DOM changes (dynamic video player injection)
  let scanTimer = null;
  const observer = new MutationObserver(() => {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scanMedia, 1200);
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "href"]
  });
})();
