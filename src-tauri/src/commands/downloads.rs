//! Downloads the database icons from Data Dragon into a folder of the app data folder. Only
//! Data Dragon URLs are accepted; progress goes to the main window as "db://download".

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use futures_util::{stream, StreamExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::error::{Error, Result};
use crate::storage::files;
use crate::storage::paths::{join_relative, DataPaths};

const ALLOWED: &str = "https://ddragon.leagueoflegends.com/";
const CONCURRENCY: usize = 16;

#[derive(Deserialize)]
pub struct Download {
    url: String,
    rel: String,
}

#[derive(Clone, Serialize)]
struct Tick {
    done: usize,
    total: usize,
}

async fn fetch(client: &reqwest::Client, url: &str, dest: &std::path::Path) -> Result<()> {
    if !url.starts_with(ALLOWED) {
        return Err(Error::Path(url.to_string()));
    }
    if dest.exists() {
        return Ok(());
    }
    let res = client.get(url).send().await?;
    if !res.status().is_success() {
        return Err(Error::Other(format!("HTTP {} for {url}", res.status().as_u16())));
    }
    files::write_bytes(dest, &res.bytes().await?)
}

/// Downloads every file into `dir`; resolves with the messages of the failed downloads.
#[tauri::command]
pub async fn download_files(app: AppHandle, paths: State<'_, DataPaths>, dir: String, files: Vec<Download>) -> Result<Vec<String>> {
    let base = paths.data(&dir)?;
    let client = reqwest::Client::new();
    let total = files.len();
    let done = Arc::new(AtomicUsize::new(0));
    let results: Vec<Result<()>> = stream::iter(files)
        .map(|file| {
            let (client, base, done, app) = (client.clone(), base.clone(), Arc::clone(&done), app.clone());
            async move {
                let result = match join_relative(&base, &file.rel) {
                    Ok(dest) => fetch(&client, &file.url, &dest).await,
                    Err(e) => Err(e),
                };
                let n = done.fetch_add(1, Ordering::SeqCst) + 1;
                let _ = app.emit_to("main", "db://download", Tick { done: n, total });
                result
            }
        })
        .buffer_unordered(CONCURRENCY)
        .collect()
        .await;
    Ok(results.into_iter().filter_map(|r| r.err().map(|e| e.to_string())).collect())
}
