use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncSeekExt, AsyncWriteExt};
use uuid::Uuid;

pub mod hls;
pub mod server;
pub mod scanner;
pub mod storage;
pub mod hash;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadItem {
    pub id: String,
    pub url: String,
    pub filename: String,
    pub path: String,
    pub total_bytes: u64,
    pub downloaded_bytes: u64,
    pub status: String, // queued | downloading | paused | completed | error | canceled | scheduled
    pub error: Option<String>,
    pub speed_bps: u64,
    pub threads: u32,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub scheduled_at: Option<String>,
}

pub struct DownloadManager {
    pub items: Arc<tokio::sync::Mutex<HashMap<String, DownloadItem>>>,
    pub controls: Arc<tokio::sync::Mutex<HashMap<String, tokio::sync::mpsc::Sender<String>>>>,
    pub server: server::LinkServer,
    pub speed_limit_kbps: Arc<tokio::sync::RwLock<u64>>,
    pub max_concurrent_downloads: Arc<tokio::sync::RwLock<usize>>,
    pub settings: Arc<tokio::sync::RwLock<storage::AppSettings>>,
}

impl Default for DownloadManager {
    fn default() -> Self {
        let saved_settings = storage::load_settings();
        let limit = saved_settings.speed_limit_kbps;
        let port = saved_settings.port;
        let max_conc = saved_settings.max_concurrent_downloads;
        let history = storage::load_history();
        Self {
            items: Arc::new(tokio::sync::Mutex::new(history)),
            controls: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            server: server::LinkServer::new(port),
            speed_limit_kbps: Arc::new(tokio::sync::RwLock::new(limit)),
            max_concurrent_downloads: Arc::new(tokio::sync::RwLock::new(max_conc)),
            settings: Arc::new(tokio::sync::RwLock::new(saved_settings)),
        }
    }
}

pub(crate) fn default_dir() -> PathBuf {
    dirs::download_dir().unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Downloads"))
}

pub(crate) fn sanitize_filename(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') { '_' } else { c })
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        format!("download-{}", &Uuid::new_v4().to_string()[..8])
    } else {
        trimmed.to_string()
    }
}

pub(crate) fn filename_from_url(url: &str, headers: &HashMap<String, String>) -> String {
    if let Some(cd) = headers.get("content-disposition") {
        // filename*=UTF-8''name or filename="name"
        if let Some(idx) = cd.find("filename*=") {
            let rest = &cd[idx + 10..];
            if let Some(p) = rest.find("''") {
                let raw = rest[p + 2..].split(';').next().unwrap_or("");
                if let Ok(dec) = percent_decode(raw) {
                    if !dec.trim().is_empty() {
                        return sanitize_filename(&dec);
                    }
                }
            }
        }
        if let Some(idx) = cd.find("filename=\"") {
            let rest = &cd[idx + 10..];
            let raw = rest.split('"').next().unwrap_or("");
            if !raw.trim().is_empty() {
                return sanitize_filename(raw);
            }
        }
        if let Some(idx) = cd.find("filename=") {
            let raw = cd[idx + 9..].split(';').next().unwrap_or("").trim();
            if !raw.is_empty() {
                return sanitize_filename(raw);
            }
        }
    }
    let name = url
        .split(['?', '#'])
        .next()
        .unwrap_or(url)
        .rsplit('/')
        .next()
        .unwrap_or("download");
    let name = percent_decode(name).unwrap_or_else(|_| name.to_string());
    sanitize_filename(&name)
}

fn percent_decode(s: &str) -> Result<String, ()> {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() + 1 && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).map_err(|_| ())?;
            let v = u8::from_str_radix(hex, 16).map_err(|_| ())?;
            out.push(v);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).map_err(|_| ())
}

fn format_size(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let mut v = bytes as f64;
    let mut u = 0;
    while v >= 1024.0 && u < 4 {
        v /= 1024.0;
        u += 1;
    }
    format!("{:.2} {}", v, UNITS[u])
}

pub async fn run_download(app: AppHandle, mut item: DownloadItem, mut rx: tokio::sync::mpsc::Receiver<String>) {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Kite/0.1")
        .build()
        .unwrap();

    let manager: State<DownloadManager> = app.state();
    let result: Result<(), String> = async {
        // Probe the file with a HEAD/GET range:0-0 to get size + final name
        let probe = client
            .get(&item.url)
            .header("Range", "bytes=0-0")
            .headers(item.headers.iter().map(|(k, v)| (k.parse().unwrap(), v.parse().unwrap())).collect())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = probe.status();
        if !status.is_success() {
            return Err(format!("HTTP {}", status.as_u16()));
        }
        let hdrs: HashMap<String, String> = probe
            .headers()
            .iter()
            .filter_map(|(k, v)| v.to_str().ok().map(|s| (k.to_string(), s.to_string())))
            .collect();

        let total = match hdrs.get("content-range") {
            Some(cr) => cr
                .rsplit('/')
                .next()
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0),
            None => hdrs.get("content-length").and_then(|s| s.parse::<u64>().ok()).unwrap_or(0),
        };
        item.total_bytes = total;

        if item.filename.is_empty() {
            item.filename = filename_from_url(&item.url, &hdrs);
        }

        let dir = PathBuf::from(&item.path);
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let file_path = dir.join(&item.filename);

        // Pre-allocate file
        let mut file = if std::path::Path::new(&file_path).exists() && status.as_u16() == 206 {
            let f = tokio::fs::OpenOptions::new().append(true).open(&file_path).await.map_err(|e| e.to_string())?;
            item.downloaded_bytes = f.metadata().await.map(|m| m.len()).unwrap_or(0);
            f
        } else {
            item.downloaded_bytes = 0;
            tokio::fs::File::create(&file_path).await.map_err(|e| e.to_string())?
        };

        if total > 0 && item.downloaded_bytes == 0 {
            file.set_len(total).await.map_err(|e| e.to_string())?;
            file.seek(std::io::SeekFrom::Start(0)).await.map_err(|e| e.to_string())?;
        }

        item.status = "downloading".into();
        {
            let mut items = manager.items.lock().await;
            items.insert(item.id.clone(), item.clone());
            storage::save_history(&items);
        }
        let _ = app.emit("download-update", &item);

        let mut retry_count = 0u32;
        const MAX_RETRIES: u32 = 5;

        'stream_retry: loop {
            let mut req = client.get(&item.url);
            for (k, v) in &item.headers {
                if let (Ok(hk), Ok(hv)) = (k.parse::<reqwest::header::HeaderName>(), v.parse::<reqwest::header::HeaderValue>()) {
                    req = req.header(hk, hv);
                }
            }
            if item.downloaded_bytes > 0 {
                req = req.header("Range", format!("bytes={}-", item.downloaded_bytes));
            }

            let resp = match req.send().await {
                Ok(r) if r.status().is_success() => r,
                Ok(r) => {
                    if retry_count < MAX_RETRIES {
                        retry_count += 1;
                        let backoff = 2u64.pow(retry_count);
                        item.error = Some(format!("HTTP {}. Retrying in {backoff}s ({retry_count}/{MAX_RETRIES})", r.status().as_u16()));
                        item.speed_bps = 0;
                        {
                            let mut items = manager.items.lock().await;
                            items.insert(item.id.clone(), item.clone());
                        }
                        let _ = app.emit("download-update", &item);
                        tokio::time::sleep(tokio::time::Duration::from_secs(backoff)).await;
                        continue 'stream_retry;
                    } else {
                        return Err(format!("HTTP {}", r.status().as_u16()));
                    }
                }
                Err(e) => {
                    if retry_count < MAX_RETRIES {
                        retry_count += 1;
                        let backoff = 2u64.pow(retry_count);
                        item.error = Some(format!("Network error: {e}. Retrying in {backoff}s ({retry_count}/{MAX_RETRIES})"));
                        item.speed_bps = 0;
                        {
                            let mut items = manager.items.lock().await;
                            items.insert(item.id.clone(), item.clone());
                        }
                        let _ = app.emit("download-update", &item);
                        tokio::time::sleep(tokio::time::Duration::from_secs(backoff)).await;
                        continue 'stream_retry;
                    } else {
                        return Err(e.to_string());
                    }
                }
            };

            if item.error.is_some() {
                item.error = None;
                let _ = app.emit("download-update", &item);
            }

            let mut stream = resp.bytes_stream();
            let mut last_emit = std::time::Instant::now();
            let mut last_bytes = item.downloaded_bytes;
            let mut speed = 0u64;

            loop {
                tokio::select! {
                    cmd = rx.recv() => {
                        match cmd.as_deref() {
                            Some("pause") => {
                                item.status = "paused".into();
                                item.speed_bps = 0;
                                {
                                    let mut items = manager.items.lock().await;
                                    items.insert(item.id.clone(), item.clone());
                                    storage::save_history(&items);
                                }
                                let _ = app.emit("download-update", &item);
                                while let Some(c2) = rx.recv().await {
                                    match c2.as_str() {
                                        "resume" => break,
                                        "cancel" => {
                                            let _ = tokio::fs::remove_file(&file_path).await;
                                            item.status = "canceled".into();
                                            let mut items = manager.items.lock().await;
                                            items.insert(item.id.clone(), item.clone());
                                            storage::save_history(&items);
                                            let _ = app.emit("download-update", &item);
                                            return Ok(());
                                        }
                                        _ => {}
                                    }
                                }
                                item.status = "downloading".into();
                                retry_count = 0;
                                let f = tokio::fs::OpenOptions::new().write(true).open(&file_path).await.map_err(|e| e.to_string())?;
                                let mut f = f;
                                f.seek(std::io::SeekFrom::Start(item.downloaded_bytes)).await.map_err(|e| e.to_string())?;
                                file = f;
                                continue 'stream_retry;
                            }
                            Some("cancel") => {
                                let _ = tokio::fs::remove_file(&file_path).await;
                                item.status = "canceled".into();
                                let mut items = manager.items.lock().await;
                                items.insert(item.id.clone(), item.clone());
                                storage::save_history(&items);
                                let _ = app.emit("download-update", &item);
                                return Ok(());
                            }
                            _ => {}
                        }
                    }
                    chunk = stream.next() => {
                        match chunk {
                            Some(Ok(bytes)) => {
                                retry_count = 0;
                                file.write_all(&bytes).await.map_err(|e| e.to_string())?;
                                item.downloaded_bytes += bytes.len() as u64;

                                let limit_kbps = *manager.speed_limit_kbps.read().await;
                                if limit_kbps > 0 {
                                    let pacing = bytes.len() as f64 / (limit_kbps as f64 * 1024.0);
                                    tokio::time::sleep(tokio::time::Duration::from_secs_f64(pacing)).await;
                                }

                                let now = std::time::Instant::now();
                                if now.duration_since(last_emit).as_millis() > 300 {
                                    let dt = now.duration_since(last_emit).as_secs_f64();
                                    let db = item.downloaded_bytes - last_bytes;
                                    if dt > 0.0 { speed = (db as f64 / dt) as u64; }
                                    last_emit = now;
                                    last_bytes = item.downloaded_bytes;
                                    item.speed_bps = speed;
                                    let mut items = manager.items.lock().await;
                                    items.insert(item.id.clone(), item.clone());
                                    let _ = app.emit("download-update", &item);
                                }
                            }
                            Some(Err(e)) => {
                                if retry_count < MAX_RETRIES {
                                    retry_count += 1;
                                    let backoff = 2u64.pow(retry_count);
                                    item.error = Some(format!("Stream error: {e}. Retrying in {backoff}s ({retry_count}/{MAX_RETRIES})"));
                                    item.speed_bps = 0;
                                    {
                                        let mut items = manager.items.lock().await;
                                        items.insert(item.id.clone(), item.clone());
                                    }
                                    let _ = app.emit("download-update", &item);
                                    let _ = file.seek(std::io::SeekFrom::Start(item.downloaded_bytes)).await;
                                    tokio::time::sleep(tokio::time::Duration::from_secs(backoff)).await;
                                    continue 'stream_retry;
                                } else {
                                    return Err(e.to_string());
                                }
                            }
                            None => break 'stream_retry,
                        }
                    }
                }
            }
        }

        file.flush().await.map_err(|e| e.to_string())?;
        item.speed_bps = 0;
        item.status = "completed".into();
        if item.total_bytes == 0 {
            item.total_bytes = item.downloaded_bytes;
        }
        {
            let mut items = manager.items.lock().await;
            items.insert(item.id.clone(), item.clone());
            storage::save_history(&items);
        }
        let _ = app.emit("download-update", &item);
        Ok(())
    }
    .await;

    if let Err(e) = result {
        item.status = "error".into();
        item.error = Some(e);
        item.speed_bps = 0;
        let mut items = manager.items.lock().await;
        items.insert(item.id.clone(), item.clone());
        storage::save_history(&items);
        let _ = app.emit("download-update", &item);
    }

    tauri::async_runtime::spawn(trigger_next_queued(app.clone()));
}

pub fn trigger_next_queued(app: AppHandle) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>> {
    Box::pin(async move {
        let manager: State<DownloadManager> = app.state();
        let max_concurrent = *manager.max_concurrent_downloads.read().await;

        let next_item = {
            let mut items = manager.items.lock().await;
            let active_count = items.values().filter(|it| it.status == "downloading").count();
            if active_count >= max_concurrent {
                return;
            }

            let mut queued: Vec<_> = items.values().filter(|it| it.status == "queued").cloned().collect();
            queued.sort_by(|a, b| a.id.cmp(&b.id));

            if let Some(mut first) = queued.into_iter().next() {
                first.status = "downloading".into();
                first.error = None;
                items.insert(first.id.clone(), first.clone());
                storage::save_history(&items);
                Some(first)
            } else {
                if active_count == 0 {
                    let settings = manager.settings.read().await;
                    if settings.auto_shutdown {
                        let _ = app.emit("queue-finished", serde_json::json!({ "autoShutdown": true }));
                        #[cfg(target_os = "windows")]
                        { let _ = std::process::Command::new("shutdown").args(["/s", "/t", "30"]).spawn(); }
                    } else {
                        let _ = app.emit("queue-finished", serde_json::json!({ "autoShutdown": false }));
                    }
                }
                None
            }
        };

        if let Some(item_clone) = next_item {
            let _ = app.emit("download-update", &item_clone);
            let (tx, rx) = tokio::sync::mpsc::channel::<String>(8);
            manager.controls.lock().await.insert(item_clone.id.clone(), tx);
            if hls::is_hls_url(&item_clone.url) {
                tauri::async_runtime::spawn(hls::run_hls_download(app.clone(), item_clone, rx));
            } else {
                tauri::async_runtime::spawn(run_download(app.clone(), item_clone, rx));
            }
        }
    })
}

pub async fn add_download_core(
    app: AppHandle,
    url: String,
    filename: Option<String>,
    directory: Option<String>,
    headers: Option<HashMap<String, String>>,
    scheduled_at: Option<String>,
) -> Result<DownloadItem, String> {
    let manager: State<DownloadManager> = app.state();
    let id = Uuid::new_v4().to_string();
    let mut item = DownloadItem {
        id: id.clone(),
        url: url.trim().to_string(),
        filename: filename.unwrap_or_default(),
        path: directory.unwrap_or_else(|| default_dir().to_string_lossy().to_string()),
        total_bytes: 0,
        downloaded_bytes: 0,
        status: "queued".into(),
        error: None,
        speed_bps: 0,
        threads: 8,
        headers: headers.unwrap_or_default(),
        scheduled_at: scheduled_at.clone(),
    };

    let (tx, rx) = tokio::sync::mpsc::channel::<String>(8);

    let is_scheduled = if let Some(ref sched_str) = scheduled_at {
        let now_sec = chrono::Utc::now().timestamp();
        let target_sec = if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(sched_str) {
            dt.timestamp()
        } else if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(sched_str, "%Y-%m-%dT%H:%M") {
            ndt.and_utc().timestamp()
        } else {
            0
        };
        target_sec > now_sec
    } else {
        false
    };

    if is_scheduled {
        item.status = "scheduled".into();
        manager.controls.lock().await.insert(id.clone(), tx);
        {
            let mut items = manager.items.lock().await;
            items.insert(item.id.clone(), item.clone());
            storage::save_history(&items);
        }
        let _ = app.emit("download-update", &item);

        let app_clone = app.clone();
        let item_clone = item.clone();
        let sched_str = scheduled_at.unwrap();

        tauri::async_runtime::spawn(async move {
            let now_sec = chrono::Utc::now().timestamp();
            let target_sec = if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&sched_str) {
                dt.timestamp()
            } else if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(&sched_str, "%Y-%m-%dT%H:%M") {
                ndt.and_utc().timestamp()
            } else {
                now_sec
            };
            let delay_sec = (target_sec - now_sec).max(0) as u64;
            let sleep_fut = tokio::time::sleep(tokio::time::Duration::from_secs(delay_sec));
            tokio::pin!(sleep_fut);

            let mut rx = rx;
            tokio::select! {
                _ = &mut sleep_fut => {
                    let mgr: State<DownloadManager> = app_clone.state();
                    {
                        let mut items = mgr.items.lock().await;
                        if let Some(it) = items.get_mut(&item_clone.id) {
                            if it.status != "scheduled" {
                                return;
                            }
                            it.status = "queued".into();
                        }
                    }
                    tauri::async_runtime::spawn(trigger_next_queued(app_clone.clone()));
                }
                cmd = rx.recv() => {
                    match cmd.as_deref() {
                        Some("cancel") => {
                            let mgr: State<DownloadManager> = app_clone.state();
                            let mut items = mgr.items.lock().await;
                            let updated_item = if let Some(it) = items.get_mut(&item_clone.id) {
                                it.status = "canceled".into();
                                Some(it.clone())
                            } else {
                                None
                            };
                            if let Some(it) = updated_item {
                                storage::save_history(&items);
                                let _ = app_clone.emit("download-update", &it);
                            }
                        }
                        Some("resume") => {
                            tauri::async_runtime::spawn(trigger_next_queued(app_clone.clone()));
                        }
                        _ => {}
                    }
                }
            }
        });

        return Ok(item);
    }

    let max_concurrent = *manager.max_concurrent_downloads.read().await;
    let should_start = {
        let items = manager.items.lock().await;
        let active_count = items.values().filter(|it| it.status == "downloading").count();
        active_count < max_concurrent
    };

    if should_start {
        item.status = "downloading".into();
        manager.controls.lock().await.insert(id.clone(), tx);
    } else {
        item.status = "queued".into();
    }

    {
        let mut items = manager.items.lock().await;
        items.insert(item.id.clone(), item.clone());
        storage::save_history(&items);
    }

    let _ = app.emit("download-update", &item);

    if should_start {
        if hls::is_hls_url(&item.url) {
            tauri::async_runtime::spawn(hls::run_hls_download(app, item.clone(), rx));
        } else {
            tauri::async_runtime::spawn(run_download(app, item.clone(), rx));
        }
    }
    Ok(item)
}

#[tauri::command]
async fn add_download(
    app: AppHandle,
    _state: State<'_, DownloadManager>,
    url: String,
    filename: Option<String>,
    directory: Option<String>,
    headers: Option<HashMap<String, String>>,
    scheduled_at: Option<String>,
) -> Result<DownloadItem, String> {
    add_download_core(app, url, filename, directory, headers, scheduled_at).await
}

#[tauri::command]
async fn control_download(app: AppHandle, state: State<'_, DownloadManager>, id: String, action: String) -> Result<(), String> {
    let mut controls = state.controls.lock().await;
    if let Some(tx) = controls.remove(&id) {
        let _ = tx.send(action.clone()).await;
        if action == "pause" || action == "cancel" {
            let mut items = state.items.lock().await;
            if let Some(item) = items.get_mut(&id) {
                item.status = if action == "cancel" { "canceled".into() } else { "paused".into() };
                item.speed_bps = 0;
                let clone = item.clone();
                storage::save_history(&items);
                let _ = app.emit("download-update", &clone);
            }
            drop(items);
            tauri::async_runtime::spawn(trigger_next_queued(app.clone()));
        }
    } else if action == "cancel" || action == "pause" {
        let mut items = state.items.lock().await;
        if let Some(item) = items.get_mut(&id) {
            item.status = if action == "cancel" { "canceled".into() } else { "paused".into() };
            item.speed_bps = 0;
            let clone = item.clone();
            storage::save_history(&items);
            let _ = app.emit("download-update", &clone);
        }
        drop(items);
        tauri::async_runtime::spawn(trigger_next_queued(app.clone()));
    } else if action == "resume" {
        let max_concurrent = *state.max_concurrent_downloads.read().await;
        let mut items = state.items.lock().await;
        let active_count = items.values().filter(|it| it.status == "downloading").count();
        let should_start = active_count < max_concurrent;

        let to_resume = if let Some(item) = items.get_mut(&id) {
            if item.status == "paused" || item.status == "error" || item.status == "canceled" || item.status == "scheduled" {
                item.status = if should_start { "downloading".into() } else { "queued".into() };
                item.error = None;
                Some((item.clone(), should_start))
            } else {
                None
            }
        } else {
            None
        };

        if let Some((item_clone, start_now)) = to_resume {
            storage::save_history(&items);
            let _ = app.emit("download-update", &item_clone);
            if start_now {
                let (tx, rx) = tokio::sync::mpsc::channel::<String>(8);
                controls.insert(id.clone(), tx);
                if hls::is_hls_url(&item_clone.url) {
                    tauri::async_runtime::spawn(hls::run_hls_download(app, item_clone, rx));
                } else {
                    tauri::async_runtime::spawn(run_download(app, item_clone, rx));
                }
            }
            return Ok(());
        }
        return Err("download not found".into());
    } else {
        return Err("download not found or finished".into());
    }
    Ok(())
}

#[tauri::command]
async fn list_downloads(state: State<'_, DownloadManager>) -> Result<Vec<DownloadItem>, String> {
    let items = state.items.lock().await;
    let mut v: Vec<DownloadItem> = items.values().cloned().collect();
    v.sort_by(|a, b| b.id.cmp(&a.id));
    Ok(v)
}

#[tauri::command]
async fn remove_download(state: State<'_, DownloadManager>, id: String, delete_file: bool) -> Result<(), String> {
    let path = {
        let items = state.items.lock().await;
        items.get(&id).map(|i| PathBuf::from(&i.path).join(&i.filename))
    };
    if let (Some(tx), Some(_)) = (state.controls.lock().await.remove(&id), state.items.lock().await.get(&id)) {
        let _ = tx.send("cancel".to_string()).await;
    }
    if delete_file {
        if let Some(p) = path {
            let _ = tokio::fs::remove_file(p).await;
        }
    }
    let mut items = state.items.lock().await;
    items.remove(&id);
    storage::save_history(&items);
    Ok(())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    { let _ = std::process::Command::new("explorer").arg(path).spawn(); }
    #[cfg(target_os = "macos")]
    { let _ = std::process::Command::new("open").arg(path).spawn(); }
    #[cfg(all(unix, not(target_os = "macos")))]
    { let _ = std::process::Command::new("xdg-open").arg(path).spawn(); }
    Ok(())
}

#[tauri::command]
fn get_default_dir() -> String {
    default_dir().to_string_lossy().to_string()
}

#[tauri::command]
fn format_bytes(bytes: u64) -> String {
    format_size(bytes)
}

#[tauri::command]
fn get_server_status(state: State<'_, DownloadManager>) -> server::ServerStatus {
    state.server.status()
}

#[tauri::command]
fn toggle_server(app: AppHandle, state: State<'_, DownloadManager>, enable: bool) -> Result<server::ServerStatus, String> {
    if enable {
        state.server.start(app)?;
    } else {
        state.server.stop();
    }
    Ok(state.server.status())
}

#[tauri::command]
async fn scan_page(url: String) -> Result<Vec<scanner::ScannedMedia>, String> {
    scanner::scan_page_links(&url).await
}

#[tauri::command]
async fn get_settings(state: State<'_, DownloadManager>) -> Result<storage::AppSettings, String> {
    Ok(state.settings.read().await.clone())
}

#[tauri::command]
async fn pause_all_downloads(app: AppHandle, state: State<'_, DownloadManager>) -> Result<(), String> {
    let mut controls = state.controls.lock().await;
    for tx in controls.values() {
        let _ = tx.send("pause".to_string()).await;
    }
    controls.clear();
    drop(controls);

    let mut items = state.items.lock().await;
    for it in items.values_mut() {
        if it.status == "downloading" || it.status == "queued" {
            it.status = "paused".into();
            it.speed_bps = 0;
            let _ = app.emit("download-update", &*it);
        }
    }
    storage::save_history(&items);
    Ok(())
}

#[tauri::command]
async fn resume_all_downloads(app: AppHandle, state: State<'_, DownloadManager>) -> Result<(), String> {
    {
        let mut items = state.items.lock().await;
        for it in items.values_mut() {
            if it.status == "paused" || it.status == "error" || it.status == "canceled" {
                it.status = "queued".into();
                it.error = None;
                let _ = app.emit("download-update", &*it);
            }
        }
        storage::save_history(&items);
    }
    let max = *state.max_concurrent_downloads.read().await;
    for _ in 0..max {
        tauri::async_runtime::spawn(trigger_next_queued(app.clone()));
    }
    Ok(())
}

#[tauri::command]
async fn clear_completed_downloads(state: State<'_, DownloadManager>) -> Result<Vec<DownloadItem>, String> {
    let mut items = state.items.lock().await;
    items.retain(|_, it| it.status != "completed" && it.status != "canceled");
    storage::save_history(&items);
    let mut v: Vec<DownloadItem> = items.values().cloned().collect();
    v.sort_by(|a, b| b.id.cmp(&a.id));
    Ok(v)
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err("File does not exist".into());
    }
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd").args(["/C", "start", "", &path]).spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&path).spawn();
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let _ = std::process::Command::new("xdg-open").arg(&path).spawn();
    }
    Ok(())
}

#[tauri::command]
async fn calculate_hash(path: String, algorithm: Option<String>) -> Result<hash::ChecksumResult, String> {
    let algo = algorithm.unwrap_or_else(|| "sha256".to_string());
    tokio::task::spawn_blocking(move || {
        hash::compute_checksum(&path, &algo)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn shutdown_computer() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("shutdown").args(["/s", "/t", "30"]).spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("osascript").args(["-e", "tell app \"System Events\" to shut down"]).spawn();
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let _ = std::process::Command::new("systemctl").arg("poweroff").spawn();
    }
    Ok(())
}

#[tauri::command]
fn abort_shutdown() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("shutdown").arg("/a").spawn();
    }
    Ok(())
}

#[tauri::command]
async fn set_max_concurrent(state: State<'_, DownloadManager>, limit: usize) -> Result<(), String> {
    *state.max_concurrent_downloads.write().await = limit;
    let mut settings = state.settings.write().await;
    settings.max_concurrent_downloads = limit;
    storage::save_settings(&settings);
    Ok(())
}

#[tauri::command]
async fn save_settings(state: State<'_, DownloadManager>, settings: storage::AppSettings) -> Result<(), String> {
    *state.speed_limit_kbps.write().await = settings.speed_limit_kbps;
    *state.max_concurrent_downloads.write().await = settings.max_concurrent_downloads;
    *state.settings.write().await = settings.clone();
    storage::save_settings(&settings);
    Ok(())
}

#[tauri::command]
async fn set_speed_limit(state: State<'_, DownloadManager>, kbps: u64) -> Result<(), String> {
    *state.speed_limit_kbps.write().await = kbps;
    let mut settings = state.settings.write().await;
    settings.speed_limit_kbps = kbps;
    storage::save_settings(&settings);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DownloadManager::default())
        .setup(|app| {
            let manager: State<DownloadManager> = app.state();
            let _ = manager.server.start(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_download,
            control_download,
            list_downloads,
            remove_download,
            open_folder,
            open_file,
            get_default_dir,
            format_bytes,
            get_server_status,
            toggle_server,
            scan_page,
            get_settings,
            save_settings,
            set_speed_limit,
            set_max_concurrent,
            pause_all_downloads,
            resume_all_downloads,
            clear_completed_downloads,
            calculate_hash,
            shutdown_computer,
            abort_shutdown
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
