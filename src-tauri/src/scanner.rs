use std::collections::HashSet;
use regex::Regex;
use serde::{Deserialize, Serialize};
use url::Url;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedMedia {
    pub url: String,
    pub filename: String,
    pub media_type: String,
}

pub async fn scan_page_links(page_url: &str) -> Result<Vec<ScannedMedia>, String> {
    let base_url = Url::parse(page_url).map_err(|e| format!("Invalid URL: {e}"))?;

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Kite/0.1")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(page_url).send().await.map_err(|e| format!("Failed to fetch page: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Page returned HTTP {}", resp.status()));
    }

    let html = resp.text().await.map_err(|e| format!("Failed to read HTML: {e}"))?;

    // Regex to extract href, src, or raw URLs
    let attr_re = Regex::new(r#"(?i)(?:href|src)\s*=\s*["']([^"']+)["']"#).unwrap();
    let url_re = Regex::new(r#"(?i)https?://[^\s"'<>]+"#).unwrap();

    let mut raw_candidates = Vec::new();
    for cap in attr_re.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            raw_candidates.push(m.as_str().to_string());
        }
    }
    for m in url_re.find_iter(&html) {
        raw_candidates.push(m.as_str().to_string());
    }

    let target_ext_re = Regex::new(r#"(?i)\.(m3u8|mpd|mp4|mkv|webm|avi|mov|flv|ts|mp3|wav|ogg|flac|aac|m4a|zip|rar|7z|tar|gz|iso|pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|webp|svg|bmp)(\?.*)?$"#).unwrap();

    let mut results = Vec::new();
    let mut seen_urls = HashSet::new();

    for candidate in raw_candidates {
        let trimmed = candidate.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("javascript:") || trimmed.starts_with("data:") {
            continue;
        }

        let resolved_url = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
            trimmed.to_string()
        } else if let Ok(u) = base_url.join(trimmed) {
            u.to_string()
        } else {
            continue;
        };

        if !seen_urls.insert(resolved_url.clone()) {
            continue;
        }

        let path_and_query = match Url::parse(&resolved_url) {
            Ok(u) => {
                let path = u.path();
                let query = u.query().unwrap_or("");
                if query.is_empty() {
                    path.to_string()
                } else {
                    format!("{path}?{query}")
                }
            }
            Err(_) => resolved_url.clone(),
        };

        if !target_ext_re.is_match(&path_and_query) {
            continue;
        }

        let filename = crate::filename_from_url(&resolved_url, &std::collections::HashMap::new());
        let media_type = classify_media(&resolved_url);

        results.push(ScannedMedia {
            url: resolved_url,
            filename,
            media_type,
        });
    }

    Ok(results)
}

fn classify_media(url: &str) -> String {
    let lower = url.to_lowercase();
    let clean = lower.split(['?', '#']).next().unwrap_or(&lower);
    if clean.ends_with(".m3u8") || clean.ends_with(".mpd") {
        "stream".to_string()
    } else if clean.ends_with(".mp4") || clean.ends_with(".mkv") || clean.ends_with(".webm")
        || clean.ends_with(".avi") || clean.ends_with(".mov") || clean.ends_with(".flv") || clean.ends_with(".ts") {
        "video".to_string()
    } else if clean.ends_with(".mp3") || clean.ends_with(".wav") || clean.ends_with(".ogg")
        || clean.ends_with(".flac") || clean.ends_with(".aac") || clean.ends_with(".m4a") {
        "audio".to_string()
    } else if clean.ends_with(".zip") || clean.ends_with(".rar") || clean.ends_with(".7z")
        || clean.ends_with(".tar") || clean.ends_with(".gz") || clean.ends_with(".iso") {
        "archive".to_string()
    } else if clean.ends_with(".pdf") || clean.ends_with(".doc") || clean.ends_with(".docx")
        || clean.ends_with(".xls") || clean.ends_with(".xlsx") || clean.ends_with(".ppt") || clean.ends_with(".pptx") {
        "document".to_string()
    } else if clean.ends_with(".png") || clean.ends_with(".jpg") || clean.ends_with(".jpeg")
        || clean.ends_with(".gif") || clean.ends_with(".webp") || clean.ends_with(".svg") || clean.ends_with(".bmp") {
        "image".to_string()
    } else {
        "file".to_string()
    }
}
