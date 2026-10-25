// LoL Helper — Electron main process: window, app:// protocol, database and IPC.
const { app, BrowserWindow, ipcMain, protocol, net, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { Settings } = require('./settings');
const { DATA_LOCALES } = require('./i18n');
const { resolveDataDir, loadDatabase, compareVersions } = require('./data/store');
const { buildDatabase, latestVersion } = require('./data/updater');
const { suggestCounters, championMatchups } = require('./engine/counters');
const { recommendBuild } = require('./engine/builds');
const { inferRoles } = require('./engine/roles');
const { LcuWatcher } = require('./lcu/watcher');
const { exportItemSet } = require('./lcu/itemsets');

const ROOT = path.join(__dirname, '..', '..');
const RENDERER_DIR = path.join(__dirname, '..', 'renderer');
const BUNDLED_DATA = app.isPackaged ? path.join(process.resourcesPath, 'data') : path.join(ROOT, 'resources', 'data');
const USER_DATA = path.join(app.getPath('userData'), 'data');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let win = null;
let db = null;
let settings = null;
const send = (channel, payload) => { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); };
const watcher = new LcuWatcher({ getDb: () => db, send });

function loadDb() {
  const dir = resolveDataDir(USER_DATA, BUNDLED_DATA);
  db = dir ? loadDatabase(dir) : null;
}

function readTexts(lang) {
  const file = path.join(db.dir, 'texts', `${lang}.json`);
  const fallback = path.join(db.dir, 'texts', 'en.json');
  return JSON.parse(fs.readFileSync(fs.existsSync(file) ? file : fallback, 'utf8'));
}

function serveFile(base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(path.normalize(base))) return new Response('Forbidden', { status: 403 });
  return net.fetch(pathToFileURL(file).toString());
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1100, minHeight: 700,
    frame: false, backgroundColor: '#010a13', show: false,
    icon: path.join(ROOT, 'build', 'icon.png'),
    alwaysOnTop: settings.get('alwaysOnTop'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) console.error(`[renderer] ${message} (${source}:${line})`);
  });
  if (process.env.LOLHELPER_CAPTURE) require('./dev-capture')(win, app, process.env.LOLHELPER_CAPTURE, process.env.LOLHELPER_CAPTURE_PREPARE);
  win.loadURL('app://ui/index.html');
}

function registerIpc() {
  ipcMain.handle('app:init', () => ({
    settings: settings.get(),
    languages: Object.keys(DATA_LOCALES),
    version: app.getVersion(),
    hasDatabase: !!db,
    ...watcher.snapshot(),
  }));

  ipcMain.handle('db:get', (_e, lang) => (db ? { meta: db.meta, champions: db.champions, items: db.items, texts: readTexts(lang) } : null));

  ipcMain.handle('db:checkUpdate', async () => {
    const latest = await latestVersion();
    const current = db && db.meta ? db.meta.version : null;
    return { current, latest, outdated: !current || compareVersions(latest, current) > 0 };
  });

  ipcMain.handle('db:update', async () => {
    const tmp = `${USER_DATA}-tmp`;
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const meta = await buildDatabase({ outDir: tmp, onProgress: (p) => send('db:progress', p) });
    if (db && db.dir === USER_DATA) db = null;
    fs.rmSync(USER_DATA, { recursive: true, force: true });
    fs.renameSync(tmp, USER_DATA);
    loadDb();
    return meta;
  });

  ipcMain.handle('engine:counters', (_e, opts) => suggestCounters(db, {
    ...opts,
    pool: settings.get('pool'),
    overrides: settings.get('counterOverrides'),
    mastery: watcher.mastery,
    pickableIds: opts.useClient ? watcher.pickable : null,
  }));
  ipcMain.handle('engine:build', (_e, opts) => recommendBuild(db, opts));
  ipcMain.handle('engine:matchups', (_e, id) => championMatchups(db, id, settings.get('counterOverrides')));
  ipcMain.handle('engine:inferRoles', (_e, picks) => inferRoles(db, picks));

  ipcMain.handle('lcu:export', async (_e, { build, title, blockNames }) => {
    const champ = db.byId[build.championId];
    return exportItemSet(watcher.lcu, build, champ.key, title, blockNames);
  });

  ipcMain.handle('settings:set', (_e, patch) => {
    const next = settings.set(patch);
    if ('alwaysOnTop' in patch && win) win.setAlwaysOnTop(!!patch.alwaysOnTop);
    if ('leagueDir' in patch) watcher.start(patch.leagueDir);
    return next;
  });

  ipcMain.handle('win:action', (_e, action) => {
    if (!win) return;
    if (action === 'minimize') win.minimize();
    if (action === 'maximize') (win.isMaximized() ? win.unmaximize() : win.maximize());
    if (action === 'close') win.close();
  });

  ipcMain.handle('app:openExternal', (_e, url) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  settings = new Settings(app.getPath('userData'));
  loadDb();
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (url.host === 'ui') return serveFile(RENDERER_DIR, rel);
    if (url.host === 'data' && db) return serveFile(db.dir, rel);
    return new Response('Not found', { status: 404 });
  });
  registerIpc();
  createWindow();
  watcher.start(settings.get('leagueDir'));
});

app.on('window-all-closed', () => app.quit());
