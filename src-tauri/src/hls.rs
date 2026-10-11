use std::path::PathBuf;
use futures_util::StreamExt;
use reqwest::Client;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::AsyncWriteExt;
use url::Url;

use crate::{DownloadItem, DownloadManager};

pub fn is_hls_url(url: &str) -> bool {
    let clean = url.split(['?', '#']).next().unwrap_or(url).to_lowercase();
    clean.ends_with(".m3u8") || url.to_lowercase().contains(".m3u8")
}

pub fn has_ffmpeg() -> bool {
    std::process::Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn resolve_url(base: &str, relative: &str) -> Result<String, String> {
    if relative.starts_with("http://") || relative.starts_with("https://") {
        return Ok(relative.to_string());
    }
    let base_url = Url::parse(base).map_err(|e| format!("Invalid base URL: {e}"))?;
    let resolved = base_url.join(relative).map_err(|e| format!("Failed to resolve segment URL: {e}"))?;
    Ok(resolved.to_string())
}

pub async fn run_hls_download(
    app: AppHandle,
    mut item: DownloadItem,
    mut rx: tokio::sync::mpsc::Receiver<String>,
) {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Kite/0.1")
        .build()
        .unwrap_or_default();

    let manager: State<DownloadManager> = app.state();

    let result: Result<(), String> = async {
        // 1. Fetch the playlist
        let mut req = client.get(&item.url);
        for (k, v) in &item.headers {
            if let (Ok(hk), Ok(hv)) = (k.parse::<reqwest::header::HeaderName>(), v.parse::<reqwest::header::HeaderValue>()) {
                req = req.header(hk, hv);
            }
        }
        let resp = req.send().await.map_err(|e| format!("Failed to fetch HLS playlist: {e}"))?;
        if !resp.status().is_success() {
            return Err(format!("HLS playlist HTTP error: {}", resp.status()));
        }
        let playlist_bytes = resp.bytes().await.map_err(|e| format!("Failed to read playlist bytes: {e}"))?;

        // 2. Parse playlist
        let playlist = match m3u8_rs::parse_playlist_res(&playlist_bytes) {
            Ok(p) => p,
            Err(e) => return Err(format!("Failed to parse m3u8 playlist: {e:?}")),
        };

        let (media_playlist_url, media_playlist) = match playlist {
            m3u8_rs::Playlist::MasterPlaylist(master) => {
                let best_variant = master
                    .variants
                    .iter()
                    .max_by_key(|v| v.bandwidth)
                    .ok_or_else(|| "No variants found in master playlist".to_string())?;

                let media_url = resolve_url(&item.url, &best_variant.uri)?;

                let mut mreq = client.get(&media_url);
                for (k, v) in &item.headers {
                    if let (Ok(hk), Ok(hv)) = (k.parse::<reqwest::header::HeaderName>(), v.parse::<reqwest::header::HeaderValue>()) {
                        mreq = mreq.header(hk, hv);
                    }
                }
                let mresp = mreq.send().await.map_err(|e| format!("Failed to fetch variant playlist: {e}"))?;
                if !mresp.status().is_success() {
                    return Err(format!("Variant playlist HTTP error: {}", mresp.status()));
                }
                let mbytes = mresp.bytes().await.map_err(|e| format!("Failed to read variant playlist bytes: {e}"))?;
                match m3u8_rs::parse_media_playlist_res(&mbytes) {
                    Ok(m) => (media_url, m),
                    Err(e) => return Err(format!("Failed to parse variant media playlist: {e:?}")),
                }
            }
            m3u8_rs::Playlist::MediaPlaylist(media) => (item.url.clone(), media),
        };

        if media_playlist.segments.is_empty() {
            return Err("HLS playlist contains no segments".into());
        }

        let segment_urls: Vec<String> = media_playlist
            .segments
            .iter()
            .map(|s| resolve_url(&media_playlist_url, &s.uri))
            .collect::<Result<Vec<String>, String>>()?;

        let total_segments = segment_urls.len() as u64;
        item.total_bytes = total_segments;

        // Determine destination file names
        let dir = PathBuf::from(&item.path);
        tokio::fs::create_dir_all(&dir).await.map_err(|e| e.to_string())?;

        let base_name = if item.filename.is_empty() {
            let n = crate::filename_from_url(&item.url, &item.headers);
            if n.to_lowercase().ends_with(".m3u8") {
                n[..n.len() - 5].to_string()
            } else {
                n
            }
        } else {
            let n = &item.filename;
            if n.to_lowercase().ends_with(".m3u8") {
                n[..n.len() - 5].to_string()
            } else if n.to_lowercase().ends_with(".mp4") || n.to_lowercase().ends_with(".ts") {
                n[..n.rfind('.').unwrap_or(n.len())].to_string()
            } else {
                n.to_string()
            }
        };

        let has_ff = has_ffmpeg();
        let final_filename = if has_ff {
            format!("{base_name}.mp4")
        } else {
            format!("{base_name}.ts")
        };
        item.filename = final_filename.clone();

        let temp_ts_path = dir.join(format!("{base_name}.kite_tmp.ts"));
        let final_path = dir.join(&final_filename);

        item.status = "downloading".into();
        {
            let mut items = manager.items.lock().await;
            items.insert(item.id.clone(), item.clone());
        }
        let _ = app.emit("download-update", &item);

        // Open/resume temporary TS file
        let mut file = tokio::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&temp_ts_path)
            .await
            .map_err(|e| e.to_string())?;

        let mut start_idx = item.downloaded_bytes as usize;
        let mut last_emit = std::time::Instant::now();
        let mut last_segment_time = std::time::Instant::now();

        'download_loop: while start_idx < segment_urls.len() {
            let remaining = segment_urls[start_idx..].to_vec();
            let client_ref = client.clone();
            let headers_map = item.headers.clone();

            let stream = futures_util::stream::iter(remaining.into_iter().enumerate().map(move |(offset, seg_url)| {
                let client = client_ref.clone();
                let headers = headers_map.clone();
                let seg_idx = start_idx + offset;
                async move {
                    let mut seg_retries = 0;
                    loop {
                        let mut req = client.get(&seg_url);
                        for (k, v) in &headers {
                            if let (Ok(hk), Ok(hv)) = (k.parse::<reqwest::header::HeaderName>(), v.parse::<reqwest::header::HeaderValue>()) {
                                req = req.header(hk, hv);
                            }
                        }
                        match req.send().await {
                            Ok(res) if res.status().is_success() => {
                                match res.bytes().await {
                                    Ok(bytes) => return Ok((seg_idx, bytes)),
                                    Err(_e) if seg_retries < 5 => {
                                        seg_retries += 1;
                                        tokio::time::sleep(std::time::Duration::from_secs(2u64.pow(seg_retries))).await;
                                    }
                                    Err(e) => return Err(format!("Segment {seg_idx} read error: {e}")),
                                }
                            }
                            Ok(_res) if seg_retries < 5 => {
                                seg_retries += 1;
                                tokio::time::sleep(std::time::Duration::from_secs(2u64.pow(seg_retries))).await;
                            }
                            Ok(res) => return Err(format!("Segment {seg_idx} HTTP error: {}", res.status())),
                            Err(_e) if seg_retries < 5 => {
                                seg_retries += 1;
                                tokio::time::sleep(std::time::Duration::from_secs(2u64.pow(seg_retries))).await;
                            }
                            Err(e) => return Err(format!("Segment {seg_idx} network error: {e}")),
                        }
                    }
                }
            }))
            .buffered(6); // Download up to 6 segments concurrently, keeping order

            tokio::pin!(stream);

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
                                    crate::storage::save_history(&items);
                                }
                                let _ = app.emit("download-update", &item);

                                while let Some(c2) = rx.recv().await {
                                    match c2.as_str() {
                                        "resume" => break,
                                        "cancel" => {
                                            let _ = tokio::fs::remove_file(&temp_ts_path).await;
                                            item.status = "canceled".into();
                                            let mut items = manager.items.lock().await;
                                            items.insert(item.id.clone(), item.clone());
                                            crate::storage::save_history(&items);
                                            let _ = app.emit("download-update", &item);
                                            return Ok(());
                                        }
                                        _ => {}
                                    }
                                }
                                item.status = "downloading".into();
                                {
                                    let mut items = manager.items.lock().await;
                                    items.insert(item.id.clone(), item.clone());
                                }
                                let _ = app.emit("download-update", &item);
                                start_idx = item.downloaded_bytes as usize;
                                continue 'download_loop;
                            }
                            Some("cancel") => {
                                let _ = tokio::fs::remove_file(&temp_ts_path).await;
                                item.status = "canceled".into();
                                let mut items = manager.items.lock().await;
                                items.insert(item.id.clone(), item.clone());
                                crate::storage::save_history(&items);
                                let _ = app.emit("download-update", &item);
                                return Ok(());
                            }
                            _ => {}
                        }
                    }
                    seg_res = stream.next() => {
                        match seg_res {
                            Some(Ok((_idx, bytes))) => {
                                file.write_all(&bytes).await.map_err(|e| e.to_string())?;
                                item.downloaded_bytes += 1;

                                let speed_limit = *manager.speed_limit_kbps.read().await;
                                if speed_limit > 0 {
                                    let pacing = bytes.len() as f64 / (speed_limit as f64 * 1024.0);
                                    tokio::time::sleep(std::time::Duration::from_secs_f64(pacing)).await;
                                }

                                let now = std::time::Instant::now();
                                if now.duration_since(last_emit).as_millis() > 300 {
                                    let dt = now.duration_since(last_segment_time).as_secs_f64();
                                    if dt > 0.0 {
                                        item.speed_bps = (bytes.len() as f64 / dt) as u64;
                                    }
                                    last_emit = now;
                                    last_segment_time = now;
                                    let mut items = manager.items.lock().await;
                                    items.insert(item.id.clone(), item.clone());
                                    let _ = app.emit("download-update", &item);
                                }
                            }
                            Some(Err(err)) => return Err(err),
                            None => break 'download_loop,
                        }
                    }
                }
            }
        }

        file.flush().await.map_err(|e| e.to_string())?;
        drop(file);

        // Remux to MP4 if ffmpeg is available
        if has_ff {
            item.speed_bps = 0;
            // Spawn ffmpeg remux
            let ffmpeg_status = tokio::process::Command::new("ffmpeg")
                .arg("-y")
                .arg("-i")
                .arg(&temp_ts_path)
                .arg("-c")
                .arg("copy")
                .arg("-bsf:a")
                .arg("aac_adtstoasc")
                .arg(&final_path)
                .status()
                .await;

            match ffmpeg_status {
                Ok(st) if st.success() => {
                    let _ = tokio::fs::remove_file(&temp_ts_path).await;
                }
                _ => {
                    // Fallback to TS if remux fails
                    let fallback_ts = dir.join(format!("{base_name}.ts"));
                    let _ = tokio::fs::rename(&temp_ts_path, &fallback_ts).await;
                    item.filename = format!("{base_name}.ts");
                }
            }
        } else {
            // Keep concatenated TS file
            let ts_target = dir.join(format!("{base_name}.ts"));
            let _ = tokio::fs::rename(&temp_ts_path, &ts_target).await;
            item.filename = format!("{base_name}.ts");
        }

        item.speed_bps = 0;
        item.status = "completed".into();
        {
            let mut items = manager.items.lock().await;
            items.insert(item.id.clone(), item.clone());
            crate::storage::save_history(&items);
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
        crate::storage::save_history(&items);
        let _ = app.emit("download-update", &item);
    }

    tauri::async_runtime::spawn(crate::trigger_next_queued(app.clone()));
}
