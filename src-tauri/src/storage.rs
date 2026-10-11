use std::collections::HashMap;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::DownloadItem;

fn default_max_concurrent() -> usize { 3 }
fn default_true() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub lang: String,
    pub default_dir: String,
    pub port: u16,
    pub speed_limit_kbps: u64,
    #[serde(default = "default_max_concurrent")]
    pub max_concurrent_downloads: usize,
    #[serde(default = "default_true")]
    pub clipboard_monitor: bool,
    #[serde(default = "default_true")]
    pub play_sound: bool,
    #[serde(default)]
    pub auto_shutdown: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            lang: "en".to_string(),
            default_dir: crate::default_dir().to_string_lossy().to_string(),
            port: 5741,
            speed_limit_kbps: 0,
            max_concurrent_downloads: 3,
            clipboard_monitor: true,
            play_sound: true,
            auto_shutdown: false,
        }
    }
}

fn config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join(".config"))
        .join("kite")
}

pub fn load_history() -> HashMap<String, DownloadItem> {
    let path = config_dir().join("history.json");
    if !path.exists() {
        return HashMap::new();
    }
    match std::fs::read_to_string(&path) {
        Ok(data) => {
            let mut items: HashMap<String, DownloadItem> = serde_json::from_str(&data).unwrap_or_default();
            // On startup: any running item must be shown as paused and speed reset to 0
            for it in items.values_mut() {
                if it.status == "downloading" || it.status == "queued" {
                    it.status = "paused".to_string();
                }
                it.speed_bps = 0;
            }
            items
        }
        Err(_) => HashMap::new(),
    }
}

pub fn save_history(items: &HashMap<String, DownloadItem>) {
    let dir = config_dir();
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("history.json");
    if let Ok(data) = serde_json::to_string_pretty(items) {
        let _ = std::fs::write(path, data);
    }
}

pub fn load_settings() -> AppSettings {
    let path = config_dir().join("settings.json");
    if !path.exists() {
        return AppSettings::default();
    }
    match std::fs::read_to_string(&path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}

pub fn save_settings(settings: &AppSettings) {
    let dir = config_dir();
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("settings.json");
    if let Ok(data) = serde_json::to_string_pretty(settings) {
        let _ = std::fs::write(path, data);
    }
}
