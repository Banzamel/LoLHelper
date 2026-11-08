//! HTTPS to the League client and the game on 127.0.0.1. Both use a self-signed certificate
//! issued by Riot, so certificate checks are off for these local clients only; every other
//! request of the app (Data Dragon, updates) uses the normal checks.

use std::time::Duration;

use base64::Engine;
use reqwest::{Client, Method};
use serde_json::Value;

use crate::error::{Error, Result};

pub fn local_client(timeout: Duration) -> Result<Client> {
    Ok(Client::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .timeout(timeout)
        .build()?)
}

pub fn basic_auth(password: &str) -> String {
    let token = base64::engine::general_purpose::STANDARD.encode(format!("riot:{password}"));
    format!("Basic {token}")
}

/// A request to the client's REST API; the body is JSON (or empty), errors carry the status.
pub async fn request(client: &Client, port: u16, password: &str, method: &str, path: &str, body: Option<Value>) -> Result<Value> {
    let method = Method::from_bytes(method.as_bytes()).map_err(|e| Error::Lcu(e.to_string()))?;
    let mut req = client
        .request(method, format!("https://127.0.0.1:{port}{path}"))
        .header("Authorization", basic_auth(password))
        .header("Accept", "application/json");
    if let Some(body) = body {
        req = req.json(&body);
    }
    let res = req.send().await?;
    let status = res.status();
    let text = res.text().await?;
    let json = if text.is_empty() { Value::Null } else { serde_json::from_str(&text).unwrap_or(Value::String(text)) };
    if status.is_client_error() || status.is_server_error() {
        return Err(Error::Lcu(format!("LCU {} {path}", status.as_u16())));
    }
    Ok(json)
}
