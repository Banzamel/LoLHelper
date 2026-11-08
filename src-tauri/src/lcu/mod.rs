//! The League client (LCU) and the game's Live Client Data API, both local HTTPS servers with
//! Riot's self-signed certificate.

pub mod connection;
pub mod credentials;
pub mod http;
pub mod live;
pub mod socket;
