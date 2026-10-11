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
    receiver_port: "Port"
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
    receiver_port: "پورت"
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
    receiver_port: "Port"
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
    if (it.status === "downloading" || it.status === "queued") {
      actions += `<button class="icon-btn" data-act="pause" data-id="${it.id}" title="${t.pause}">⏸</button>`;
    }
    if (it.status === "paused") {
      actions += `<button class="icon-btn" data-act="resume" data-id="${it.id}" title="${t.resume}">▶</button>`;
    }
    if (["downloading", "queued", "paused"].includes(it.status)) {
      actions += `<button class="icon-btn" data-act="cancel" data-id="${it.id}" title="${t.cancel}">✖</button>`;
    } else {
      actions += `<button class="icon-btn" data-act="remove" data-id="${it.id}" title="${t.remove}">🗑</button>`;
    }
    if (it.status === "completed") {
      actions = `<button class="icon-btn" data-act="openfolder" data-id="${it.id}" title="${t.open_folder}">📂</button>
                 <button class="icon-btn" data-act="remove" data-id="${it.id}" title="${t.remove}">🗑</button>`;
    }
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

$("#add-btn").addEventListener("click", async () => {
  const url = $("#url-input").value.trim();
  if (!/^https?:\/\//i.test(url)) { alert(I18N[lang].invalid_url); return; }
  try {
    const item = await invoke("add_download", { url, directory: defaultDir });
    items[item.id] = item;
    $("#url-input").value = "";
    render();
  } catch (err) { alert(String(err)); }
});

$("#url-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#add-btn").click(); });

$("#clear-btn").addEventListener("click", async () => {
  const finished = Object.values(items).filter((i) => ["completed", "canceled", "error"].includes(i.status));
  for (const it of finished) {
    try { await invoke("remove_download", { id: it.id, deleteFile: false }); } catch {}
  }
});

$("#theme-select").addEventListener("change", (e) => { theme = e.target.value; applyTheme(); });
$("#lang-select").addEventListener("change", (e) => { lang = e.target.value; localStorage.setItem("kite.lang", lang); applyI18n(); });
$("#open-dir-btn").addEventListener("click", () => invoke("open_folder", { path: defaultDir }));

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
  } catch (err) { alert(String(err)); }
});

listen("download-update", (ev) => {
  items[ev.payload.id] = ev.payload;
  render();
});

(async function init() {
  applyTheme();
  defaultDir = await invoke("get_default_dir");
  $("#dir-input").value = defaultDir;
  applyI18n();
  try {
    serverStatus = await invoke("get_server_status");
    updateServerUI();
  } catch {}
  const existing = await invoke("list_downloads");
  for (const it of existing) items[it.id] = it;
  render();
})();
