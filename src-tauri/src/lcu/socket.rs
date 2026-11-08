//! The client's WAMP WebSocket: subscribes to the events the app follows and hands every
//! event message ([8, topic, payload]) to `on_event` until the connection closes.

use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::Connector;

use crate::error::{Error, Result};
use crate::lcu::credentials::Credentials;
use crate::lcu::http::basic_auth;

const SUBSCRIPTIONS: [&str; 3] = [
    "OnJsonApiEvent_lol-champ-select_v1_session",
    "OnJsonApiEvent_lol-gameflow_v1_gameflow-phase",
    "OnJsonApiEvent_lol-perks_v1_currentpage",
];

fn connector() -> Result<Connector> {
    let tls = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .build()
        .map_err(|e| Error::Lcu(e.to_string()))?;
    Ok(Connector::NativeTls(tls))
}

/// Connects, subscribes and runs the read loop. `on_open` runs once the socket is up;
/// returns when the client closes the connection.
pub async fn run(creds: &Credentials, on_open: impl FnOnce(), mut on_event: impl FnMut(Value)) -> Result<()> {
    let mut request = format!("wss://127.0.0.1:{}/", creds.port).into_client_request().map_err(|e| Error::Lcu(e.to_string()))?;
    let headers = request.headers_mut();
    headers.insert("Authorization", basic_auth(&creds.password).parse().map_err(|_| Error::Lcu("bad token".into()))?);
    headers.insert("Sec-WebSocket-Protocol", "wamp".parse().map_err(|_| Error::Lcu("bad protocol".into()))?);
    let (mut ws, _) = tokio_tungstenite::connect_async_tls_with_config(request, None, false, Some(connector()?))
        .await
        .map_err(|e| Error::Lcu(e.to_string()))?;
    for topic in SUBSCRIPTIONS {
        let subscribe = serde_json::json!([5, topic]).to_string();
        ws.send(Message::text(subscribe)).await.map_err(|e| Error::Lcu(e.to_string()))?;
    }
    on_open();
    while let Some(message) = ws.next().await {
        let Ok(Message::Text(text)) = message else {
            if message.is_err() { break; }
            continue;
        };
        // Keep-alives and malformed frames are skipped.
        let Ok(Value::Array(parts)) = serde_json::from_str::<Value>(text.as_str()) else { continue };
        if parts.first().and_then(Value::as_i64) == Some(8) {
            if let Some(payload) = parts.get(2) {
                on_event(payload.clone());
            }
        }
    }
    Ok(())
}
