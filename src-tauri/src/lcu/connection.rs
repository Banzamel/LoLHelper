//! The connection to the League client, kept up by one background task: every few seconds it
//! looks for the client, opens the event WebSocket and forwards status changes and events to
//! the main window. REST requests use the credentials of the open connection.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter};

use crate::error::{Error, Result};
use crate::lcu::credentials::{self, Credentials};
use crate::lcu::{http, socket};

const RETRY: Duration = Duration::from_secs(4);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Clone, Serialize)]
pub struct Status {
    pub connected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<&'static str>,
}

#[derive(Default)]
struct Inner {
    creds: Option<Credentials>,
    league_dir: String,
    running: bool,
}

pub struct LcuConnection {
    inner: Arc<Mutex<Inner>>,
    client: Client,
}

impl LcuConnection {
    pub fn new() -> Result<Self> {
        Ok(Self { inner: Arc::new(Mutex::new(Inner::default())), client: http::local_client(REQUEST_TIMEOUT)? })
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, Inner>> {
        self.inner.lock().map_err(|_| Error::Other("LCU state poisoned".into()))
    }

    pub fn status(&self) -> Result<Status> {
        Ok(status_of(self.lock()?.creds.as_ref()))
    }

    /// Starts the background task (once); a new League folder is used from the next search on.
    pub fn start(&self, app: AppHandle, league_dir: String) -> Result<()> {
        let mut inner = self.lock()?;
        inner.league_dir = league_dir;
        if inner.running {
            return Ok(());
        }
        inner.running = true;
        let shared = Arc::clone(&self.inner);
        tauri::async_runtime::spawn(watch(app, shared));
        Ok(())
    }

    pub async fn request(&self, method: &str, path: &str, body: Option<Value>) -> Result<Value> {
        let creds = self.lock()?.creds.clone().ok_or_else(|| Error::Lcu("LCU not connected".into()))?;
        http::request(&self.client, creds.port, &creds.password, method, path, body).await
    }
}

fn status_of(creds: Option<&Credentials>) -> Status {
    Status { connected: creds.is_some(), port: creds.map(|c| c.port), source: creds.map(|c| c.source) }
}

fn set_creds(shared: &Mutex<Inner>, creds: Option<Credentials>) {
    if let Ok(mut inner) = shared.lock() {
        inner.creds = creds;
    }
}

async fn watch(app: AppHandle, shared: Arc<Mutex<Inner>>) {
    loop {
        let dir = shared.lock().map(|i| i.league_dir.clone()).unwrap_or_default();
        // The process lookup starts PowerShell, which blocks; keep it off the async workers.
        let found = tauri::async_runtime::spawn_blocking(move || credentials::find(&dir)).await.ok().flatten();
        if let Some(creds) = found {
            let opened = {
                let (app, shared, creds) = (app.clone(), Arc::clone(&shared), creds.clone());
                move || {
                    set_creds(&shared, Some(creds.clone()));
                    let _ = app.emit_to("main", "lcu://status", status_of(Some(&creds)));
                }
            };
            let events = app.clone();
            let result = socket::run(&creds, opened, move |payload| { let _ = events.emit_to("main", "lcu://event", payload); }).await;
            let was_connected = shared.lock().map(|i| i.creds.is_some()).unwrap_or(false);
            set_creds(&shared, None);
            if was_connected {
                let _ = app.emit_to("main", "lcu://status", status_of(None));
            }
            if let Err(e) = result {
                eprintln!("[lcu] {e}");
            }
        }
        tokio::time::sleep(RETRY).await;
    }
}
