// In-game overlay widget: a small transparent, always-on-top, click-through window that
// shows the next item to buy and the next skill to level. It appears only while a match
// runs (or in preview/move mode) and never takes focus from the game. Works over the
// game in Borderless / Windowed mode; exclusive Fullscreen hides every other window.
const { BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');

const SIZE = { width: 340, height: 250 };
// A borderless game window can take the top of the z-order back; re-assert it this often.
const KEEP_ON_TOP_MS = 1500;

class Overlay {
  constructor({ settings, send }) {
    this.settings = settings;
    this.sendMain = send;
    this.win = null;
    this.gameActive = false;
    this.userHidden = false;
    this.moveMode = false;
    this.preview = false;
    this.saveTimer = null;
    this.topTimer = null;
  }

  config() { return this.settings.get('overlay'); }

  create() {
    if (this.win && !this.win.isDestroyed()) return this.win;
    const { bounds } = this.config();
    const area = screen.getPrimaryDisplay().workArea;
    const pos = bounds || { x: area.x + area.width - SIZE.width - 24, y: area.y + Math.round(area.height * 0.32) };
    this.win = new BrowserWindow({
      ...SIZE, x: pos.x, y: pos.y,
      frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false,
      resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
      skipTaskbar: true, focusable: false, show: false, alwaysOnTop: true,
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    this.win.setAlwaysOnTop(true, 'screen-saver');
    this.win.setVisibleOnAllWorkspaces(true);
    this.win.setIgnoreMouseEvents(true, { forward: true });
    this.win.on('moved', () => this.rememberBounds());
    this.win.on('closed', () => { this.win = null; });
    this.win.webContents.once('did-finish-load', () => this.pushState());
    this.win.loadURL('app://ui/overlay.html');
    return this.win;
  }

  rememberBounds() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      if (!this.win) return;
      const { x, y } = this.win.getBounds();
      this.settings.set({ overlay: { ...this.config(), bounds: { x, y } } });
    }, 400);
  }

  state() {
    return { gameActive: this.gameActive, moveMode: this.moveMode, preview: this.preview, userHidden: this.userHidden, opacity: this.config().opacity };
  }

  send(channel, payload) {
    if (this.win && !this.win.isDestroyed()) this.win.webContents.send(channel, payload);
  }

  pushState() {
    if (this.win && !this.win.isDestroyed()) this.win.webContents.send('overlay:state', this.state());
    this.sendMain('overlay:state', this.state());
  }

  update() {
    const { enabled } = this.config();
    const visible = enabled && !this.userHidden && (this.gameActive || this.moveMode || this.preview);
    if (visible) {
      const win = this.create();
      // Clicks pass through to the game, mouse moves still reach the widget (item name tooltips).
      win.setIgnoreMouseEvents(!this.moveMode, { forward: true });
      win.setFocusable(this.moveMode);
      if (!win.isVisible()) win.showInactive();
      win.setAlwaysOnTop(true, 'screen-saver');
      this.keepOnTop(true);
    } else {
      this.keepOnTop(false);
      if (this.win && this.win.isVisible()) this.win.hide();
    }
    this.pushState();
  }

  keepOnTop(on) {
    if (!on) { clearInterval(this.topTimer); this.topTimer = null; return; }
    if (this.topTimer) return;
    this.topTimer = setInterval(() => {
      if (!this.win || this.win.isDestroyed() || !this.win.isVisible()) return;
      this.win.setAlwaysOnTop(true, 'screen-saver');
      this.win.moveTop();
    }, KEEP_ON_TOP_MS);
  }

  setGameActive(active) {
    if (active === this.gameActive) return;
    this.gameActive = active;
    if (!active) this.userHidden = false;
    this.update();
  }

  resize(height) {
    if (!this.win || this.win.isDestroyed()) return;
    const h = Math.max(60, Math.min(420, Math.round(height)));
    this.win.setContentSize(SIZE.width, h);
  }

  reload() {
    if (this.win && !this.win.isDestroyed()) this.win.reload();
  }

  toggleVisible() { this.userHidden = !this.userHidden; this.update(); }

  toggleMove() {
    this.moveMode = !this.moveMode;
    if (this.moveMode) this.userHidden = false;
    this.update();
  }

  setPreview(on) {
    this.preview = !!on;
    this.moveMode = !!on;
    this.update();
  }

  registerShortcuts() {
    globalShortcut.unregisterAll();
    const { toggleKey, moveKey } = this.config();
    const failed = [];
    for (const [key, fn] of [[toggleKey, () => this.toggleVisible()], [moveKey, () => this.toggleMove()]]) {
      try { if (!key || !globalShortcut.register(key, fn)) failed.push(key); } catch { failed.push(key); }
    }
    return failed;
  }

  applySettings() {
    const failed = this.registerShortcuts();
    this.update();
    this.reload();
    return failed;
  }

  destroy() {
    this.keepOnTop(false);
    globalShortcut.unregisterAll();
    if (this.win && !this.win.isDestroyed()) this.win.destroy();
  }
}

module.exports = { Overlay };
