// LCU connection: REST requests and the WAMP WebSocket event stream. The client uses a
// self-signed certificate on 127.0.0.1, so certificate checks are disabled for it only.
const https = require('https');
const { EventEmitter } = require('events');
const WebSocket = require('ws');
const { findCredentials } = require('./credentials');

const agent = new https.Agent({ rejectUnauthorized: false });
const SUBSCRIPTIONS = ['OnJsonApiEvent_lol-champ-select_v1_session', 'OnJsonApiEvent_lol-gameflow_v1_gameflow-phase', 'OnJsonApiEvent_lol-perks_v1_currentpage'];

class LcuClient extends EventEmitter {
  constructor() {
    super();
    this.creds = null;
    this.ws = null;
    this.timer = null;
    this.customDir = null;
    this.connected = false;
  }

  start(customDir) {
    this.customDir = customDir;
    this.stop();
    this.tick();
    this.timer = setInterval(() => this.tick(), 4000);
  }

  stop() {
    clearInterval(this.timer);
    if (this.ws) this.ws.terminate();
    this.ws = null;
  }

  async tick() {
    if (this.connected || this.connecting) return;
    this.connecting = true;
    try {
      const creds = await findCredentials(this.customDir);
      if (creds) await this.connect(creds);
    } finally {
      this.connecting = false;
    }
  }

  connect(creds) {
    return new Promise((resolve) => {
      const auth = Buffer.from(`riot:${creds.password}`).toString('base64');
      const ws = new WebSocket(`wss://127.0.0.1:${creds.port}/`, 'wamp', { headers: { Authorization: `Basic ${auth}` }, rejectUnauthorized: false });
      ws.on('open', () => {
        this.creds = creds;
        this.ws = ws;
        this.connected = true;
        for (const s of SUBSCRIPTIONS) ws.send(JSON.stringify([5, s]));
        this.emit('status', { connected: true, port: creds.port, source: creds.source });
        resolve(true);
      });
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          if (msg[0] === 8 && msg[2]) this.emit('event', msg[2]);
        } catch { /* ignore keep-alive and malformed frames */ }
      });
      ws.on('close', () => this.onDisconnect());
      ws.on('error', () => { ws.terminate(); this.onDisconnect(); resolve(false); });
    });
  }

  onDisconnect() {
    if (!this.connected) return;
    this.connected = false;
    this.ws = null;
    this.creds = null;
    this.emit('status', { connected: false });
  }

  request(method, endpoint, body) {
    if (!this.creds) return Promise.reject(new Error('LCU not connected'));
    const { port, password } = this.creds;
    const data = body === undefined ? null : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = https.request({
        host: '127.0.0.1', port, path: endpoint, method, agent,
        headers: {
          Authorization: `Basic ${Buffer.from(`riot:${password}`).toString('base64')}`,
          Accept: 'application/json',
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      }, (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = text; }
          if (res.statusCode >= 400) reject(Object.assign(new Error(`LCU ${res.statusCode} ${endpoint}`), { status: res.statusCode, body: json }));
          else resolve(json);
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  get(endpoint) { return this.request('GET', endpoint); }
}

module.exports = { LcuClient };
