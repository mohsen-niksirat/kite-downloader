// Kite Downloader — frontend
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const I18N = {
  en: {
    nav_downloads: "Downloads", nav_settings: "Settings", nav_about: "About", nav_theme: "Theme",
    new_download: "New Download", start: "Start", url_ph: "Paste a download link (https://... or m3u8)",
    clear_list: "Clear list", empty_msg: "No downloads yet. Paste a link above to get started!",
    save_location: "Save location", open_folder: "Open", appearance: "Appearance",
    theme_label: "Theme", lang_label: "Language",
    about_text: "A fast, lightweight download manager built with Rust + Tauri. Native performance, tiny memory footprint, glassmorphism UI.",
    stat_active: "Active", stat_done: "Completed", stat_speed: "Speed",
    pause: "Pause", resume: "Resume", cancel: "Cancel", remove: "Remove",
    invalid_url: "Please enter a valid URL (http/https).",
    starting: "Starting…",
    segments: "segments",
    link_receiver_title: "Native link receiver",
    receiver_desc: "Accept downloads from browser extension",
    receiver_active: "Active",
    receiver_inactive: "Inactive",
    receiver_port: "Port",
    tab_direct: "Direct Link",
    tab_scan: "Deep Scan",
    btn_scan: "Scan",
    scan_ph: "Paste webpage URL to deep scan for media...",
    scanning: "Scanning page…",
    scan_modal_title: "Discovered Links",
    select_all: "Select All",
    download_selected: "Download Selected",
    no_links_found: "No media links found on this page.",
    filter_all: "All",
    filter_video: "Videos",
    filter_stream: "Streams",
    filter_audio: "Audio",
    filter_archive: "Archives",
    filter_doc: "Documents",
    filter_img: "Images",
    selected_count: "selected",
    schedule_time: "Start at:",
    speed_limit_label: "Speed Limiter",
    speed_limit_desc: "Throttle maximum download speed (0 = unlimited)",
    start_now: "Start now",
    dropped_link: "Added dropped link"
  },
  fa: {
    nav_downloads: "دانلودها", nav_settings: "تنظیمات", nav_about: "درباره", nav_theme: "تم",
    new_download: "دانلود جدید", start: "شروع", url_ph: "لینک دانلود را بچسبانید (https://... یا m3u8)",
    clear_list: "پاک کردن لیست", empty_msg: "هنوز دانلودی نیست. یک لینک در بالا وارد کنید!",
    save_location: "محل ذخیره", open_folder: "بازکردن", appearance: "ظاهر",
    theme_label: "تم", lang_label: "زبان",
    about_text: "یک دانلود منیجر سریع و سبک ساخته‌شده با Rust و Tauri. کارایی نیتیو، مصرف رم کم، رابط شیشه‌ای.",
    stat_active: "فعال", stat_done: "کامل‌شده", stat_speed: "سرعت",
    pause: "توقف", resume: "ادامه", cancel: "لغو", remove: "حذف",
    invalid_url: "لطفاً یک آدرس معتبر (http/https) وارد کنید.",
    starting: "در حال شروع…",
    segments: "بخش",
    link_receiver_title: "دریافت‌کننده نیتیو لینک",
    receiver_desc: "دریافت مستقیم لینک‌ها از افزونه مرورگر",
    receiver_active: "فعال",
    receiver_inactive: "غیرفعال",
    receiver_port: "پورت",
    tab_direct: "لینک مستقیم",
    tab_scan: "اسکن صفحه",
    btn_scan: "اسکن",
    scan_ph: "آدرس صفحه وب را برای اسکن فایل‌ها وارد کنید...",
    scanning: "در حال بررسی صفحه…",
    scan_modal_title: "لینک‌های پیدا شده",
    select_all: "انتخاب همه",
    download_selected: "دانلود موارد انتخابی",
    no_links_found: "هیچ فایل یا رسانه‌ای در این صفحه یافت نشد.",
    filter_all: "همه",
    filter_video: "ویدیوها",
    filter_stream: "استریم‌ها",
    filter_audio: "صوتی",
    filter_archive: "فشرده",
    filter_doc: "اسناد",
    filter_img: "تصاویر",
    selected_count: "انتخاب‌شده",
    schedule_time: "زمان شروع:",
    speed_limit_label: "محدودکننده سرعت",
    speed_limit_desc: "محدود کردن حداکثر سرعت دانلود (۰ = نامحدود)",
    start_now: "شروع فوری",
    dropped_link: "لینک رها شده اضافه شد"
  },
  de: {
    nav_downloads: "Downloads", nav_settings: "Einstellungen", nav_about: "Über", nav_theme: "Design",
    new_download: "Neuer Download", start: "Starten", url_ph: "Download-Link einfügen (https://... oder m3u8)",
    clear_list: "Liste leeren", empty_msg: "Noch keine Downloads. Füge oben einen Link ein!",
    save_location: "Speicherort", open_folder: "Öffnen", appearance: "Darstellung",
    theme_label: "Design", lang_label: "Sprache",
    about_text: "Ein schneller, leichter Download-Manager mit Rust + Tauri. Native Leistung, geringer RAM-Verbrauch, Glas-UI.",
    stat_active: "Aktiv", stat_done: "Fertig", stat_speed: "Tempo",
    pause: "Pause", resume: "Fortsetzen", cancel: "Abbrechen", remove: "Entfernen",
    invalid_url: "Bitte eine gültige URL (http/https) eingeben.",
    starting: "Starte…",
    segments: "Segmente",
    link_receiver_title: "Nativer Link-Empfänger",
    receiver_desc: "Downloads von Browser-Erweiterung empfangen",
    receiver_active: "Aktiv",
    receiver_inactive: "Inaktiv",
    receiver_port: "Port",
    tab_direct: "Direkter Link",
    tab_scan: "Deep Scan",
    btn_scan: "Scannen",
    scan_ph: "Webseiten-URL eingeben, um nach Medien zu scannen...",
    scanning: "Seite wird gescannt…",
    scan_modal_title: "Gefundene Links",
    select_all: "Alle auswählen",
    download_selected: "Ausgewählte herunterladen",
    no_links_found: "Keine Mediendateien auf dieser Seite gefunden.",
    filter_all: "Alle",
    filter_video: "Videos",
    filter_stream: "Streams",
    filter_audio: "Audio",
    filter_archive: "Archive",
    filter_doc: "Dokumente",
    filter_img: "Bilder",
    selected_count: "ausgewählt",
    schedule_time: "Startzeit:",
    speed_limit_label: "Geschwindigkeitsbegrenzer",
    speed_limit_desc: "Maximale Download-Geschwindigkeit drosseln (0 = unbegrenzt)",
    start_now: "Jetzt starten",
    dropped_link: "Abgelegter Link hinzugefügt"
  }
};

let lang = localStorage.getItem("kite.lang") || "en";
let theme = localStorage.getItem("kite.theme") || "dark";
let defaultDir = "";
let items = {}; // id -> item

const $ = (s) => document.querySelector(s);

function fmtBytes(b) {
  if (!b || b <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let v = b, i = 0;
  while (v >= 1024 && i < 4) { v /= 1024; i++; }
  return v.toFixed(2) + " " + u[i];
}

function fmtSpeed(b) { return b > 0 ? fmtBytes(b) + "/s" : "—"; }

function applyI18n() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (I18N[lang][k]) el.textContent = I18N[lang][k];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const k = el.getAttribute("data-i18n-ph");
    if (I18N[lang][k]) el.placeholder = I18N[lang][k];
  });
  $("#lang-select").value = lang;
  updateServerUI();
  render();
}

function applyTheme() {
  document.body.dataset.theme = theme === "light" ? "light" : "";
  // color themes apply to :root vars; light is separate
  if (theme !== "light" && theme !== "dark") document.body.dataset.theme = theme;
  $("#theme-select").value = theme;
  localStorage.setItem("kite.theme", theme);
}

function render() {
  const list = $("#dl-list");
  const arr = Object.values(items).sort((a, b) => b.id.localeCompare(a.id));
  $("#empty-state").classList.toggle("hidden", arr.length > 0);
  const t = I18N[lang];
  const active = arr.filter((i) => i.status === "downloading" || i.status === "queued").length;
  const done = arr.filter((i) => i.status === "completed").length;
  const speed = arr.reduce((s, i) => s + (i.status === "downloading" ? i.speedBps : 0), 0);
  $("#stat-active").textContent = `${t.stat_active}: ${active}`;
  $("#stat-done").textContent = `${t.stat_done}: ${done}`;
  $("#stat-speed").textContent = `${t.stat_speed}: ${fmtSpeed(speed)}`;

  list.innerHTML = "";
  for (const it of arr) {
    const pct = it.totalBytes > 0 ? Math.min(100, (it.downloadedBytes / it.totalBytes) * 100) : 0;
    const el = document.createElement("div");
    el.className = "glass-card dl-item";
    const badge = `<span class="badge ${it.status}">${it.status}</span>`;
    const err = it.error ? `<div class="dl-meta" style="color:var(--err)">⚠ ${it.error}</div>` : "";
    const isHls = it.url && (it.url.includes(".m3u8") || (it.filename && (it.filename.endsWith(".ts") || it.filename.endsWith(".mp4")) && it.totalBytes < 50000 && !it.totalBytes.toString().includes("000000")));
    const sizeTxt = isHls
      ? (it.totalBytes > 0 ? `${it.downloadedBytes} / ${it.totalBytes} ${t.segments} (${pct.toFixed(1)}%)` : `${it.downloadedBytes} ${t.segments}`)
      : (it.totalBytes > 0 ? `${fmtBytes(it.downloadedBytes)} / ${fmtBytes(it.totalBytes)} (${pct.toFixed(1)}%)` : fmtBytes(it.downloadedBytes));
    let actions = "";
    if (it.status === "scheduled") {
      actions += `<button class="icon-btn" data-act="resume" data-id="${it.id}" title="${t.start_now}">▶</button>`;
      actions += `<button class="icon-btn" data-act="cancel" data-id="${it.id}" title="${t.cancel}">✖</button>`;
    } else if (it.status === "downloading" || it.status === "queued") {
      actions += `<button class="icon-btn" data-act="pause" data-id="${it.id}" title="${t.pause}">⏸</button>`;
    }
    if (it.status === "paused") {
      actions += `<button class="icon-btn" data-act="resume" data-id="${it.id}" title="${t.resume}">▶</button>`;
    }
    if (["downloading", "queued", "paused"].includes(it.status)) {
      actions += `<button class="icon-btn" data-act="cancel" data-id="${it.id}" title="${t.cancel}">✖</button>`;
    } else if (it.status !== "scheduled") {
      actions += `<button class="icon-btn" data-act="remove" data-id="${it.id}" title="${t.remove}">🗑</button>`;
    }
    if (it.status === "completed") {
      actions = `<button class="icon-btn" data-act="openfolder" data-id="${it.id}" title="${t.open_folder}">📂</button>
                 <button class="icon-btn" data-act="remove" data-id="${it.id}" title="${t.remove}">🗑</button>`;
    }
    const schedInfo = it.scheduledAt && it.status === "scheduled" ? `<div class="dl-meta" style="color:var(--accent2); margin-top:4px">⏰ ${new Date(it.scheduledAt).toLocaleString()}</div>` : "";
    el.innerHTML = `
      <div class="dl-head">
        <span class="dl-name">${escapeHtml(it.filename || it.url)}</span>
        ${badge}
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="dl-head" style="margin-top:8px">
        <span class="dl-meta">${sizeTxt}</span>
        <span class="dl-meta">${it.status === "downloading" ? fmtSpeed(it.speedBps) : ""}</span>
      </div>
      ${schedInfo}
      ${err}
      <div class="dl-actions">${actions}</div>`;
    list.appendChild(el);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-act]");
  if (btn) {
    const { act, id } = btn.dataset;
    try {
      if (act === "pause") await invoke("control_download", { id, action: "pause" });
      else if (act === "resume") await invoke("control_download", { id, action: "resume" });
      else if (act === "cancel") await invoke("control_download", { id, action: "cancel" });
      else if (act === "remove") await invoke("remove_download", { id, deleteFile: false });
      else if (act === "openfolder") {
        const it = items[id];
        if (it) await invoke("open_folder", { path: it.path });
      }
    } catch (err) { console.error(err); }
    return;
  }
  const nav = e.target.closest(".nav-btn[data-page]");
  if (nav) {
    document.querySelectorAll(".nav-btn[data-page]").forEach((n) => n.classList.remove("active"));
    nav.classList.add("active");
    ["downloads", "settings", "about"].forEach((p) =>
      $(`#page-${p}`).classList.toggle("hidden", p !== nav.dataset.page));
  }
});

$("#tab-direct-btn").addEventListener("click", () => {
  $("#tab-direct-btn").classList.add("active");
  $("#tab-scan-btn").classList.remove("active");
  $("#row-direct").classList.remove("hidden");
  $("#row-scan").classList.add("hidden");
});
$("#tab-scan-btn").addEventListener("click", () => {
  $("#tab-scan-btn").classList.add("active");
  $("#tab-direct-btn").classList.remove("active");
  $("#row-scan").classList.remove("hidden");
  $("#row-direct").classList.add("hidden");
});

$("#schedule-toggle-btn").addEventListener("click", () => {
  $("#row-schedule").classList.toggle("hidden");
  $("#schedule-toggle-btn").classList.toggle("ghost");
});

$("#add-btn").addEventListener("click", async () => {
  const url = $("#url-input").value.trim();
  if (!/^https?:\/\//i.test(url)) { alert(I18N[lang].invalid_url); return; }
  const isSchedRowVisible = !$("#row-schedule").classList.contains("hidden");
  const schedVal = $("#schedule-input").value;
  const scheduledAt = (isSchedRowVisible && schedVal) ? new Date(schedVal).toISOString() : null;

  try {
    const item = await invoke("add_download", { url, directory: defaultDir, scheduledAt });
    items[item.id] = item;
    $("#url-input").value = "";
    if (scheduledAt) {
      $("#row-schedule").classList.add("hidden");
      $("#schedule-toggle-btn").classList.add("ghost");
      $("#schedule-input").value = "";
    }
    render();
  } catch (err) { alert(String(err)); }
});

$("#url-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#add-btn").click(); });

let scannedItems = [];
let currentFilter = "all";
let selectedScanUrls = new Set();

function renderScanModal() {
  const list = $("#scan-results-list");
  const filtered = scannedItems.filter(item => {
    if (currentFilter === "all") return true;
    return item.mediaType === currentFilter;
  });

  $("#scan-count-badge").textContent = String(scannedItems.length);
  $("#scan-selected-count").textContent = `${selectedScanUrls.size} ${I18N[lang].selected_count}`;

  list.innerHTML = "";
  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--muted)">${I18N[lang].no_links_found}</div>`;
    return;
  }

  filtered.forEach(item => {
    const el = document.createElement("div");
    el.className = "scan-item";
    const isChecked = selectedScanUrls.has(item.url);
    el.innerHTML = `
      <input type="checkbox" class="scan-item-chk" ${isChecked ? "checked" : ""} />
      <div class="scan-item-info">
        <div style="display:flex; align-items:center; gap:8px">
          <span class="scan-item-name">${escapeHtml(item.filename)}</span>
          <span class="badge ${item.mediaType}">${item.mediaType}</span>
        </div>
        <div class="scan-item-url">${escapeHtml(item.url)}</div>
      </div>
    `;
    el.addEventListener("click", (e) => {
      const chk = el.querySelector(".scan-item-chk");
      if (e.target !== chk) {
        chk.checked = !chk.checked;
      }
      if (chk.checked) selectedScanUrls.add(item.url);
      else selectedScanUrls.delete(item.url);
      $("#scan-select-all").checked = selectedScanUrls.size === scannedItems.length;
      $("#scan-selected-count").textContent = `${selectedScanUrls.size} ${I18N[lang].selected_count}`;
    });
    list.appendChild(el);
  });
}

$("#scan-btn").addEventListener("click", async () => {
  const url = $("#scan-input").value.trim();
  if (!/^https?:\/\//i.test(url)) { alert(I18N[lang].invalid_url); return; }
  const btn = $("#scan-btn");
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = I18N[lang].scanning;
  try {
    const results = await invoke("scan_page", { url });
    scannedItems = results || [];
    selectedScanUrls = new Set(scannedItems.map(i => i.url));
    $("#scan-select-all").checked = true;
    currentFilter = "all";
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.toggle("active", p.dataset.filter === "all"));
    renderScanModal();
    $("#scan-modal").classList.remove("hidden");
  } catch (err) {
    alert(String(err));
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
});

$("#scan-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#scan-btn").click(); });

$("#close-scan-modal-btn").addEventListener("click", () => $("#scan-modal").classList.add("hidden"));
$("#scan-cancel-btn").addEventListener("click", () => $("#scan-modal").classList.add("hidden"));

$("#scan-select-all").addEventListener("change", (e) => {
  if (e.target.checked) {
    scannedItems.forEach(i => selectedScanUrls.add(i.url));
  } else {
    selectedScanUrls.clear();
  }
  renderScanModal();
});

document.querySelectorAll(".filter-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    currentFilter = pill.dataset.filter;
    renderScanModal();
  });
});

$("#scan-download-btn").addEventListener("click", async () => {
  const toDownload = scannedItems.filter(i => selectedScanUrls.has(i.url));
  if (toDownload.length === 0) return;
  $("#scan-modal").classList.add("hidden");
  for (const item of toDownload) {
    try {
      const dl = await invoke("add_download", {
        url: item.url,
        filename: item.filename,
        directory: defaultDir
      });
      items[dl.id] = dl;
    } catch (err) {
      console.error("Failed to add", item.url, err);
    }
  }
  render();
});

$("#clear-btn").addEventListener("click", async () => {
  const finished = Object.values(items).filter((i) => ["completed", "canceled", "error"].includes(i.status));
  for (const it of finished) {
    try { await invoke("remove_download", { id: it.id, deleteFile: false }); } catch {}
  }
});

async function syncSettings() {
  const settings = {
    theme,
    lang,
    defaultDir,
    port: serverStatus.port || 5741,
    speedLimitKbps: parseInt($("#speed-limit-input").value || "0", 10) || 0
  };
  try {
    await invoke("save_settings", { settings });
  } catch (e) {
    console.error("Failed to save settings", e);
  }
}

$("#theme-select").addEventListener("change", (e) => {
  theme = e.target.value;
  applyTheme();
  syncSettings();
});

$("#lang-select").addEventListener("change", (e) => {
  lang = e.target.value;
  localStorage.setItem("kite.lang", lang);
  applyI18n();
  syncSettings();
});

$("#dir-input").addEventListener("change", (e) => {
  defaultDir = e.target.value.trim();
  syncSettings();
});

$("#speed-limit-input").addEventListener("input", () => {
  const val = parseInt($("#speed-limit-input").value || "0", 10) || 0;
  invoke("set_speed_limit", { kbps: val }).catch(console.error);
  syncSettings();
});

$("#open-dir-btn").addEventListener("click", () => invoke("open_folder", { path: defaultDir }));

// Drag and drop link onto window to start download
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});

window.addEventListener("drop", async (e) => {
  e.preventDefault();
  let text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
  if (text) {
    const lines = text.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^https?:\/\//i.test(line)) {
        try {
          const item = await invoke("add_download", { url: line, directory: defaultDir, scheduledAt: null });
          items[item.id] = item;
          render();
          const dlNav = document.querySelector(".nav-btn[data-page='downloads']");
          if (dlNav) dlNav.click();
        } catch (err) {
          console.error("Drop download error", err);
        }
      }
    }
  }
});

let serverStatus = { enabled: true, port: 5741 };

function updateServerUI() {
  const t = I18N[lang];
  const btn = $("#receiver-toggle-btn");
  const info = $("#receiver-port-info");
  if (!btn || !info) return;
  info.textContent = `${t.receiver_port}: ${serverStatus.port}`;
  if (serverStatus.enabled) {
    btn.textContent = t.receiver_active;
    btn.className = "btn";
  } else {
    btn.textContent = t.receiver_inactive;
    btn.className = "btn ghost";
  }
}

$("#receiver-toggle-btn").addEventListener("click", async () => {
  try {
    serverStatus = await invoke("toggle_server", { enable: !serverStatus.enabled });
    updateServerUI();
    syncSettings();
  } catch (err) { alert(String(err)); }
});

listen("download-update", (ev) => {
  items[ev.payload.id] = ev.payload;
  render();
});

(async function init() {
  try {
    const saved = await invoke("get_settings");
    if (saved) {
      if (saved.theme) theme = saved.theme;
      if (saved.lang) lang = saved.lang;
      if (saved.defaultDir) defaultDir = saved.defaultDir;
      if (saved.speedLimitKbps > 0) {
        $("#speed-limit-input").value = saved.speedLimitKbps;
      }
      if (saved.port) serverStatus.port = saved.port;
    }
  } catch (e) {
    console.error("Could not load settings", e);
  }

  if (!defaultDir) {
    defaultDir = await invoke("get_default_dir");
  }
  $("#dir-input").value = defaultDir;

  applyTheme();
  applyI18n();

  try {
    serverStatus = await invoke("get_server_status");
    updateServerUI();
  } catch {}

  const existing = await invoke("list_downloads");
  for (const it of existing) items[it.id] = it;
  render();
})();
