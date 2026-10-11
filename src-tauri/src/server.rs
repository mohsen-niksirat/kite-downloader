use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tiny_http::{Header, Response, Server, StatusCode};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionDownloadRequest {
    pub url: String,
    pub filename: Option<String>,
    #[serde(default)]
    pub headers: Option<HashMap<String, String>>,
    #[serde(rename = "pageUrl")]
    pub page_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub enabled: bool,
    pub port: u16,
}

#[derive(Clone)]
pub struct LinkServer {
    pub running: Arc<AtomicBool>,
    pub port: u16,
}

impl LinkServer {
    pub fn new(port: u16) -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            port,
        }
    }

    pub fn start(&self, app: AppHandle) -> Result<(), String> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }
        self.running.store(true, Ordering::SeqCst);
        let running_flag = self.running.clone();
        let port = self.port;

        std::thread::spawn(move || {
            let server = match Server::http(format!("127.0.0.1:{port}")) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Failed to bind link receiver on 127.0.0.1:{port}: {e}");
                    running_flag.store(false, Ordering::SeqCst);
                    return;
                }
            };

            while running_flag.load(Ordering::SeqCst) {
                match server.recv_timeout(Duration::from_millis(400)) {
                    Ok(Some(mut request)) => {
                        let cors_origin = Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
                        let cors_methods = Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap();
                        let cors_headers = Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization"[..]).unwrap();
                        let content_type = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();

                        if request.method().as_str() == "OPTIONS" {
                            let resp = Response::empty(StatusCode(204))
                                .with_header(cors_origin)
                                .with_header(cors_methods)
                                .with_header(cors_headers);
                            let _ = request.respond(resp);
                            continue;
                        }

                        let url_path = request.url().to_string();
                        if request.method().as_str() == "GET" && (url_path == "/ping" || url_path == "/health") {
                            let resp = Response::from_string("{\"status\":\"ok\",\"app\":\"kite\"}")
                                .with_header(cors_origin)
                                .with_header(content_type);
                            let _ = request.respond(resp);
                            continue;
                        }

                        if request.method().as_str() == "POST" {
                            let mut body = String::new();
                            let read_res = request.as_reader().read_to_string(&mut body);
                            if read_res.is_err() {
                                let resp = Response::from_string("{\"error\":\"Failed to read body\"}")
                                    .with_status_code(StatusCode(400))
                                    .with_header(cors_origin)
                                    .with_header(content_type);
                                let _ = request.respond(resp);
                                continue;
                            }

                            match serde_json::from_str::<ExtensionDownloadRequest>(&body) {
                                Ok(dl_req) => {
                                    let app_clone = app.clone();
                                    tauri::async_runtime::spawn(async move {
                                        let default_dir = crate::default_dir().to_string_lossy().to_string();
                                        let _ = crate::add_download_core(
                                            app_clone,
                                            dl_req.url,
                                            dl_req.filename,
                                            Some(default_dir),
                                            dl_req.headers,
                                            None,
                                        ).await;
                                    });

                                    let resp = Response::from_string("{\"status\":\"ok\",\"message\":\"Download queued\"}")
                                        .with_header(cors_origin)
                                        .with_header(content_type);
                                    let _ = request.respond(resp);
                                }
                                Err(e) => {
                                    let resp = Response::from_string(format!("{{\"error\":\"Invalid JSON: {e}\"}}"))
                                        .with_status_code(StatusCode(400))
                                        .with_header(cors_origin)
                                        .with_header(content_type);
                                    let _ = request.respond(resp);
                                }
                            }
                            continue;
                        }

                        let resp = Response::from_string("{\"error\":\"Not found\"}")
                            .with_status_code(StatusCode(404))
                            .with_header(cors_origin)
                            .with_header(content_type);
                        let _ = request.respond(resp);
                    }
                    Ok(None) => {}
                    Err(e) => {
                        eprintln!("Link receiver error: {e}");
                    }
                }
            }
        });

        Ok(())
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }

    pub fn status(&self) -> ServerStatus {
        ServerStatus {
            enabled: self.running.load(Ordering::SeqCst),
            port: self.port,
        }
    }
}
