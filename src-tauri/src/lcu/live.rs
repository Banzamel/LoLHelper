//! The Live Client Data API (https://127.0.0.1:2999), served by the game itself while a match
//! runs. Polled by the frontend every few seconds; nothing answers outside a match.

use std::time::Duration;

use reqwest::Client;
use serde_json::Value;

use crate::error::Result;
use crate::lcu::http;

const URL: &str = "https://127.0.0.1:2999/liveclientdata/allgamedata";
const TIMEOUT: Duration = Duration::from_millis(2500);

pub struct LiveClient {
    client: Client,
}

impl LiveClient {
    pub fn new() -> Result<Self> {
        Ok(Self { client: http::local_client(TIMEOUT)? })
    }

    /// The whole game snapshot, or None while no match runs (or the game is still loading).
    pub async fn game_data(&self) -> Option<Value> {
        let res = self.client.get(URL).send().await.ok()?;
        if !res.status().is_success() {
            return None;
        }
        res.json().await.ok()
    }
}
