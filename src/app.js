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
    dropped_link: "Added dropped link",
    cat_all: "All", cat_video: "Video", cat_audio: "Audio", cat_compressed: "Compressed",
    cat_documents: "Documents", cat_programs: "Programs", cat_others: "Others",
    search_ph: "Search downloads...",
    batch_resume: "Resume All", batch_pause: "Pause All", batch_clear: "Clear Finished",
    action_open_file: "Open File", action_checksum: "Verify Checksum",
    hash_modal_title: "File Checksum Verification",
    computed_hash: "Calculated Hash:",
    compare_hash: "Verify with expected hash (optional):",
    hash_matches: "✓ Checksum matches perfectly!",
    hash_mismatch: "✗ Checksum does NOT match! File may be corrupt.",
    copy: "Copy", copied: "Copied!",
    max_concurrent_label: "Queue & Concurrent Downloads",
    max_concurrent_desc: "Max active downloads at the same time (rest are queued)",
    automation_title: "Automation & Notifications",
    clip_monitor_label: "Clipboard Link Monitor",
    clip_monitor_desc: "Auto-detect downloadable links copied to clipboard",
    sound_label: "Completion Sound",
    sound_desc: "Play audio chime when a download completes",
    auto_shutdown_label: "Shutdown PC when queue completes",
    shutdown_title: "Computer Shutdown",
    shutdown_desc: "All downloads finished. Your computer will shut down in:",
    abort_shutdown: "Abort Shutdown",
    clip_detected: "Download link in clipboard"
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
    dropped_link: "لینک رها شده اضافه شد",
    cat_all: "همه", cat_video: "ویدیو", cat_audio: "صوتی", cat_compressed: "فشرده",
    cat_documents: "اسناد", cat_programs: "برنامه‌ها", cat_others: "سایر",
    search_ph: "جستجوی دانلودها...",
    batch_resume: "ادامه همه", batch_pause: "توقف همه", batch_clear: "پاکسازی پایان‌یافته‌ها",
    action_open_file: "اجرای فایل", action_checksum: "بررسی هش و صحت فایل",
    hash_modal_title: "بررسی صحت و امضای دیجیتال فایل",
    computed_hash: "هش محاسبه‌شده:",
    compare_hash: "بررسی تطابق با هش مورد انتظار (اختیاری):",
    hash_matches: "✓ هش کاملاً منطبق و فایل کاملاً سالم است!",
    hash_mismatch: "✗ هش همخوانی ندارد! فایل ممکن است مخدوش باشد.",
    copy: "کپی", copied: "کپی شد!",
    max_concurrent_label: "صف دانلود و تعداد همزمان",
    max_concurrent_desc: "حداکثر تعداد دانلود همزمان (بقیه در صف قرار می‌گیرند)",
    automation_title: "اتوماسیون و اعلان‌ها",
    clip_monitor_label: "پایش خودکار کلیپ‌بورد",
    clip_monitor_desc: "تشخیص خودکار لینک‌های دانلود کپی‌شده در کلیپ‌بورد",
    sound_label: "صدای اتمام دانلود",
    sound_desc: "پخش صدای ملایم هنگام تکمیل موفق دانلود",
    auto_shutdown_label: "خاموشی سیستم پس از پایان صف",
    shutdown_title: "خاموش‌سازی رایانه",
    shutdown_desc: "تمامی دانلودها به پایان رسید. رایانه خاموش می‌شود در:",
    abort_shutdown: "لغو خاموشی",
    clip_detected: "لینک دانلود در کلیپ‌بورد شناسایی شد"
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
    dropped_link: "Abgelegter Link hinzugefügt",
    cat_all: "Alle", cat_video: "Video", cat_audio: "Audio", cat_compressed: "Archive",
    cat_documents: "Dokumente", cat_programs: "Programme", cat_others: "Sonstige",
    search_ph: "Downloads durchsuchen...",
    batch_resume: "Alle fortsetzen", batch_pause: "Alle anhalten", batch_clear: "Fertige löschen",
    action_open_file: "Datei öffnen", action_checksum: "Prüfsumme überprüfen",
    hash_modal_title: "Dateiprüfsummen-Überprüfung",
    computed_hash: "Berechneter Hash:",
    compare_hash: "Mit erwartetem Hash abgleichen (optional):",
    hash_matches: "✓ Prüfsumme stimmt genau überein!",
    hash_mismatch: "✗ Prüfsumme stimmt NICHT überein! Datei evtl. beschädigt.",
    copy: "Kopieren", copied: "Kopiert!",
    max_concurrent_label: "Warteschlange & Gleichzeitige Downloads",
    max_concurrent_desc: "Maximale gleichzeitige Downloads (Rest wartet in Warteschlange)",
    automation_title: "Automatisierung & Benachrichtigungen",
    clip_monitor_label: "Zwischenablage-Überwachung",
    clip_monitor_desc: "Download-Links in der Zwischenablage automatisch erkennen",
    sound_label: "Abschluss-Ton",
    sound_desc: "Ton abspielen, wenn ein Download abgeschlossen ist",
    auto_shutdown_label: "PC nach Abschluss herunterfahren",
    shutdown_title: "Computer herunterfahren",
    shutdown_desc: "Alle Downloads beendet. PC fährt herunter in:",
    abort_shutdown: "Abbrechen",
    clip_detected: "Download-Link in der Zwischenablage erkannt"
  }
};

let lang = localStorage.getItem("kite.lang") || "en";
let theme = localStorage.getItem("kite.theme") || "dark";
let defaultDir = "";
let items = {}; // id -> item
let activeCategory = "all";
let searchQuery = "";
let appSettings = {
  theme: "dark",
  lang: "en",
  defaultDir: "",
  port: 5741,
  speedLimitKbps: 0,
  maxConcurrentDownloads: 3,
  clipboardMonitor: true,
  playSound: true,
  autoShutdown: false,
};

const $ = (s) => document.querySelector(s);

function getFileCategory(filename, url) {
  const target = (filename || url || "").toLowerCase().split("?")[0];
  if (/\.(mp4|mkv|avi|mov|webm|ts|flv|m3u8)$/.test(target)) return "video";
  if (/\.(mp3|flac|wav|aac|ogg|m4a)$/.test(target)) return "audio";
  if (/\.(zip|rar|7z|tar|gz|bz2|xz|iso)$/.test(target)) return "compressed";
  if (/\.(pdf|epub|docx|xlsx|pptx|txt|csv)$/.test(target)) return "documents";
  if (/\.(exe|msi|dmg|pkg|deb|rpm|apk)$/.test(target)) return "programs";
  return "others";
}

function playCompletionChime() {
  if (!appSettings.playSound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(1046.5, now, 0.4);       // C6
    playTone(1567.98, now + 0.12, 0.6); // G6
  } catch (e) {
    console.warn("Audio chime error", e);
  }
}

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
  if (theme !== "light" && theme !== "dark") document.body.dataset.theme = theme;
  $("#theme-select").value = theme;
  localStorage.setItem("kite.theme", theme);
}

function render() {
  const list = $("#dl-list");
  const allArr = Object.values(items);
  const t = I18N[lang];

  // Update category counts
  const catCounts = { all: allArr.length, video: 0, audio: 0, compressed: 0, documents: 0, programs: 0, others: 0 };
  for (const it of allArr) {
    const c = getFileCategory(it.filename, it.url);
    if (catCounts[c] !== undefined) catCounts[c]++;
    else catCounts.others++;
  }
  for (const [k, v] of Object.entries(catCounts)) {
    const b = $(`#cat-count-${k}`);
    if (b) b.textContent = v;
  }

  // Filter items
  let arr = allArr.sort((a, b) => b.id.localeCompare(a.id));
  if (activeCategory !== "all") {
    arr = arr.filter((i) => getFileCategory(i.filename, i.url) === activeCategory);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    arr = arr.filter((i) => (i.filename || "").toLowerCase().includes(q) || (i.url || "").toLowerCase().includes(q));
  }

  $("#empty-state").classList.toggle("hidden", arr.length > 0);
  const active = allArr.filter((i) => i.status === "downloading" || i.status === "queued").length;
  const done = allArr.filter((i) => i.status === "completed").length;
  const speed = allArr.reduce((s, i) => s + (i.status === "downloading" ? i.speedBps : 0), 0);
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
      actions = `<button class="icon-btn" data-act="openfile" data-id="${it.id}" title="${t.action_open_file}">📄</button>
                 <button class="icon-btn" data-act="openfolder" data-id="${it.id}" title="${t.open_folder}">📂</button>
                 <button class="icon-btn" data-act="checksum" data-id="${it.id}" title="${t.action_checksum}">🛡</button>
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
      else if (act === "openfile") {
        const it = items[id];
        if (it) await invoke("open_file", { path: it.path });
      }
      else if (act === "checksum") {
        const it = items[id];
        if (it) openHashModal(it);
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

// Category filter tabs
document.querySelectorAll(".cat-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".cat-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeCategory = pill.dataset.cat || "all";
    render();
  });
});

// Search input
$("#search-input").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  render();
});

// Batch controls
$("#batch-resume-btn").addEventListener("click", async () => {
  try { await invoke("resume_all_downloads"); } catch (err) { console.error(err); }
});

$("#batch-pause-btn").addEventListener("click", async () => {
  try { await invoke("pause_all_downloads"); } catch (err) { console.error(err); }
});

$("#batch-clear-btn").addEventListener("click", async () => {
  try {
    await invoke("clear_completed_downloads");
    const existing = await invoke("list_downloads");
    items = {};
    for (const it of existing) items[it.id] = it;
    render();
  } catch (err) { console.error(err); }
});


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
    speedLimitKbps: parseInt($("#speed-limit-input").value || "0", 10) || 0,
    maxConcurrentDownloads: appSettings.maxConcurrentDownloads,
    clipboardMonitor: appSettings.clipboardMonitor,
    playSound: appSettings.playSound,
    autoShutdown: appSettings.autoShutdown,
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

$("#max-concurrent-select").addEventListener("change", (e) => {
  const val = parseInt(e.target.value, 10) || 3;
  appSettings.maxConcurrentDownloads = val;
  invoke("set_max_concurrent", { max: val }).catch(console.error);
  syncSettings();
});

$("#clip-monitor-chk").addEventListener("change", (e) => {
  appSettings.clipboardMonitor = e.target.checked;
  syncSettings();
});

$("#sound-chk").addEventListener("change", (e) => {
  appSettings.playSound = e.target.checked;
  syncSettings();
});

$("#queue-auto-shutdown-chk").addEventListener("change", (e) => {
  appSettings.autoShutdown = e.target.checked;
  syncSettings();
});

$("#open-dir-btn").addEventListener("click", () => invoke("open_folder", { path: defaultDir }));

// --- Checksum Verifier Modal ---
let currentHashItem = null;
let currentHashAlgo = "sha256";

async function openHashModal(item) {
  currentHashItem = item;
  currentHashAlgo = "sha256";
  $("#hash-file-name").textContent = item.filename || item.url;
  $("#hash-sha256-btn").classList.add("active");
  $("#hash-md5-btn").classList.remove("active");
  $("#hash-compare-input").value = "";
  $("#hash-match-status").textContent = "";
  $("#hash-result-input").value = I18N[lang].calculating || "Calculating...";
  $("#hash-modal").classList.remove("hidden");
  await updateHashCalculation();
}

async function updateHashCalculation() {
  if (!currentHashItem) return;
  try {
    const res = await invoke("calculate_hash", { path: currentHashItem.path, algorithm: currentHashAlgo });
    $("#hash-result-input").value = res;
    checkHashMatch();
  } catch (err) {
    $("#hash-result-input").value = "Error: " + err;
  }
}

function checkHashMatch() {
  const expected = $("#hash-compare-input").value.trim().toLowerCase();
  const computed = $("#hash-result-input").value.trim().toLowerCase();
  const statusEl = $("#hash-match-status");
  if (!expected) {
    statusEl.textContent = "";
    return;
  }
  if (expected === computed) {
    statusEl.textContent = I18N[lang].hash_matches;
    statusEl.style.color = "var(--ok)";
  } else {
    statusEl.textContent = I18N[lang].hash_mismatch;
    statusEl.style.color = "var(--err)";
  }
}

$("#hash-sha256-btn").addEventListener("click", () => {
  if (currentHashAlgo === "sha256") return;
  currentHashAlgo = "sha256";
  $("#hash-sha256-btn").classList.add("active");
  $("#hash-md5-btn").classList.remove("active");
  updateHashCalculation();
});

$("#hash-md5-btn").addEventListener("click", () => {
  if (currentHashAlgo === "md5") return;
  currentHashAlgo = "md5";
  $("#hash-md5-btn").classList.add("active");
  $("#hash-sha256-btn").classList.remove("active");
  updateHashCalculation();
});

$("#hash-compare-input").addEventListener("input", checkHashMatch);

$("#copy-hash-btn").addEventListener("click", async () => {
  const text = $("#hash-result-input").value;
  if (!text || text.startsWith("Error")) return;
  try {
    await navigator.clipboard.writeText(text);
    const orig = $("#copy-hash-btn").textContent;
    $("#copy-hash-btn").textContent = I18N[lang].copied;
    setTimeout(() => { $("#copy-hash-btn").textContent = orig; }, 1800);
  } catch (e) {
    console.error("Clipboard copy failed", e);
  }
});

$("#close-hash-modal-btn").addEventListener("click", () => {
  $("#hash-modal").classList.add("hidden");
  currentHashItem = null;
});

// --- Auto-Shutdown Handler ---
let shutdownInterval = null;

listen("queue-finished", () => {
  if (!appSettings.autoShutdown) return;
  let seconds = 30;
  $("#shutdown-timer").textContent = `${seconds}s`;
  $("#shutdown-modal").classList.remove("hidden");
  if (shutdownInterval) clearInterval(shutdownInterval);
  shutdownInterval = setInterval(async () => {
    seconds--;
    $("#shutdown-timer").textContent = `${seconds}s`;
    if (seconds <= 0) {
      clearInterval(shutdownInterval);
      shutdownInterval = null;
      try {
        await invoke("shutdown_computer");
      } catch (err) {
        console.error("Shutdown call failed", err);
      }
    }
  }, 1000);
});

$("#abort-shutdown-btn").addEventListener("click", async () => {
  if (shutdownInterval) {
    clearInterval(shutdownInterval);
    shutdownInterval = null;
  }
  $("#shutdown-modal").classList.add("hidden");
  try {
    await invoke("abort_shutdown");
  } catch (err) {
    console.error("Abort shutdown failed", err);
  }
});

// --- Clipboard URL Monitor ---
let lastClipboardText = "";
let clipboardToastTimer = null;

async function pollClipboard() {
  if (!appSettings.clipboardMonitor) return;
  if (!document.hasFocus()) return;
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text || text === lastClipboardText) return;
    if (/^https?:\/\/[^\s]+$/i.test(text)) {
      const isMedia = /\.(mp4|mkv|avi|mov|webm|ts|m3u8|mp3|flac|wav|zip|rar|7z|tar|gz|iso|pdf|exe|msi|apk)(\?.*)?$/i.test(text);
      if (isMedia) {
        lastClipboardText = text;
        $("#clipboard-url-text").textContent = text;
        $("#clipboard-toast").classList.remove("hidden");
        if (clipboardToastTimer) clearTimeout(clipboardToastTimer);
        clipboardToastTimer = setTimeout(() => {
          $("#clipboard-toast").classList.add("hidden");
        }, 12000);
      }
    }
  } catch {}
}
setInterval(pollClipboard, 2500);

$("#clipboard-dl-btn").addEventListener("click", async () => {
  const url = $("#clipboard-url-text").textContent.trim();
  $("#clipboard-toast").classList.add("hidden");
  if (url) {
    try {
      const item = await invoke("add_download", { url, directory: defaultDir, scheduledAt: null });
      items[item.id] = item;
      render();
    } catch (err) {
      alert(String(err));
    }
  }
});

$("#clipboard-dismiss-btn").addEventListener("click", () => {
  $("#clipboard-toast").classList.add("hidden");
});

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
  const prev = items[ev.payload.id];
  if (prev && prev.status !== "completed" && ev.payload.status === "completed") {
    playCompletionChime();
  }
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
      if (saved.maxConcurrentDownloads !== undefined) {
        appSettings.maxConcurrentDownloads = saved.maxConcurrentDownloads;
        $("#max-concurrent-select").value = String(saved.maxConcurrentDownloads);
      }
      if (saved.clipboardMonitor !== undefined) {
        appSettings.clipboardMonitor = saved.clipboardMonitor;
        $("#clip-monitor-chk").checked = saved.clipboardMonitor;
      }
      if (saved.playSound !== undefined) {
        appSettings.playSound = saved.playSound;
        $("#sound-chk").checked = saved.playSound;
      }
      if (saved.autoShutdown !== undefined) {
        appSettings.autoShutdown = saved.autoShutdown;
        $("#queue-auto-shutdown-chk").checked = saved.autoShutdown;
      }
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
