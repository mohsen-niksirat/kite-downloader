use std::fs::File;
use std::io::Read;
use std::path::Path;
use sha2::{Digest, Sha256};
use md5::Md5;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecksumResult {
    pub algorithm: String,
    pub hash: String,
    pub filename: String,
    pub file_size: u64,
}

pub fn compute_checksum(path_str: &str, algorithm: &str) -> Result<ChecksumResult, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("File not found: {path_str}"));
    }

    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let file_size = file.metadata().map_err(|e| e.to_string())?.len();
    let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown").to_string();

    let mut buffer = [0u8; 65536];

    let algo_lower = algorithm.to_lowercase();
    let hash_str = if algo_lower == "md5" {
        let mut hasher = Md5::new();
        loop {
            let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }
        let result = hasher.finalize();
        hex::encode(result)
    } else {
        let mut hasher = Sha256::new();
        loop {
            let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }
        let result = hasher.finalize();
        hex::encode(result)
    };

    Ok(ChecksumResult {
        algorithm: if algo_lower == "md5" { "MD5".into() } else { "SHA-256".into() },
        hash: hash_str,
        filename,
        file_size,
    })
}
