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
const { exportRunePage, exportSummonerSpells, recommendedPages } = require('./lcu/perks');
const { closestPage } = require('./engine/loadout');
const { LiveClient } = require('./lcu/liveclient');
const { setupAppUpdater } = require('./app-updater');
const { Overlay } = require('./overlay');
const { History, MatchRecorder } = require('./history');
const demoMatch = require('./demo');
const { normalize } = require('./lcu/liveclient');
const { MatchStore, syncMatches, matchDetail, fetchPlayer } = require('./lcu/matches');
const { rankFrom } = require('./lcu/roster');
const { analyzeGames } = require('./engine/style');
const { learningHistory } = require('./engine/history');

// Development: LOLHELPER_USERDATA=<dir> keeps settings, history and data apart from the real ones.
if (process.env.LOLHELPER_USERDATA) app.setPath('userData', process.env.LOLHELPER_USERDATA);

const ROOT = path.join(__dirname, '..', '..');
const RENDERER_DIR = path.join(__dirname, '..', 'renderer');
const BUNDLED_DATA = app.isPackaged ? path.join(process.resourcesPath, 'data') : path.join(ROOT, 'resources', 'data');
const USER_DATA = path.join(app.getPath('userData'), 'data');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let win = null;
let db = null;
let settings = null;
const send = (channel, payload) => { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); };
let devRoster = null;
// Simulated match ({ startedAt }) while the player looks at the Match view without playing.
let demo = null;
const live = new LiveClient(() => db, () => (demo ? demoMatch.roster() : devRoster || watcher.roster));
const recorder = new MatchRecorder();
live.on('game', (game) => {
  // A simulated match is only shown: never recorded and never over the desktop as a widget.
  if (demo) { send('live:game', game && { ...game, demo: true }); return; }
  if (game && game.me) recorder.update(game, watcher.mode);
  send('live:game', game);
  if (overlay) {
    overlay.send('live:game', game);
    overlay.setGameActive(!!(game && game.me));
  }
});
// The Live Client API only exists while a match runs, so poll it during InProgress only,
// and only in supported modes (role-based Summoner's Rift queues).
const watcher = new LcuWatcher({
  getDb: () => db,
  send,
  onPhase: (phase) => {
    // A real match ends the simulation; otherwise the simulation keeps running whatever the client does.
    if (demo && phase === 'InProgress') stopDemo();
    if (demo) return;
    if (phase === 'EndOfGame' || (['None', 'Lobby'].includes(phase) && recorder.match)) finishMatch();
    if (process.env.LOLHELPER_LIVE) return; // development: polling is forced on, see below
    if (phase === 'InProgress' && watcher.supported) live.start();
    else live.stop();
  },
});
let updater = null;
let overlay = null;
let history = null;
const matches = new MatchStore();
// The League account logged in to the client (or the last one seen, while offline).
let profile = null;
let syncing = false;

// Everything the engine learns from: the app's own records plus the client's match history.
const learnFrom = () => (profile ? learningHistory(db, history.list(), matches.list(), profile.puuid) : history.list());

// Switches settings, history and the match cache to the account's own folder.
function activateProfile(account) {
  const dir = path.join(app.getPath('userData'), 'profiles', account.puuid.replace(/[^\w-]/g, ''));
  const changed = !profile || profile.puuid !== account.puuid;
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(path.join(dir, 'account.json'), 'utf8')); } catch { /* new account */ }
  profile = { ...saved, ...(changed ? {} : profile), ...account };
  if (changed) {
    settings.useProfile(dir);
    history.use(dir, app.getPath('userData'));
    matches.use(dir);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'account.json'), JSON.stringify(profile));
  const { puuid, gameName, tagLine } = profile;
  if (!settings.get('lastProfile') || settings.get('lastProfile').puuid !== puuid) settings.set({ lastProfile: { puuid, gameName, tagLine } });
  send('profile:changed', { profile, settings: settings.get(), history: history.list() });
}

// The logged-in account: name, level, icon and ranks; then its match history is refreshed.
async function loadAccount() {
  let me = null;
  try { me = await watcher.lcu.get('/lol-summoner/v1/current-summoner'); } catch { /* client still starting */ }
  if (!me || !me.puuid) { setTimeout(() => { if (watcher.status.connected) loadAccount(); }, 5000); return; }
  let ranked = null;
  try { ranked = await watcher.lcu.get('/lol-ranked/v1/current-ranked-stats'); } catch { /* unranked or unavailable */ }
  activateProfile({
    puuid: me.puuid, gameName: me.gameName || me.displayName || '', tagLine: me.tagLine || '',
    level: me.summonerLevel || null, icon: me.profileIconId || null,
    ranks: ranked ? { solo: rankFrom(ranked, 'RANKED_SOLO_5x5'), flex: rankFrom(ranked, 'RANKED_FLEX_SR') } : null,
  });
  refreshMatches();
}

async function refreshMatches({ deep = false } = {}) {
  if (!profile || !db || syncing || !watcher.status.connected) return;
  syncing = true;
  send('matches:sync', { syncing: true });
  try { await syncMatches(watcher.lcu, db, matches, profile.puuid, { deep }); } catch (e) { console.error('[matches]', e.message); }
  syncing = false;
  send('matches:sync', { syncing: false, lastSync: matches.lastSync });
  send('matches:updated');
}

const matchesPayload = () => ({
  games: matches.list(),
  analysis: profile ? analyzeGames(matches.list(), profile.puuid) : null,
  lastSync: matches.lastSync,
  syncing,
});

const demoTime = () => Math.min(demoMatch.END, demoMatch.START + ((Date.now() - demo.startedAt) / 1000) * demoMatch.SPEED);

// Starts the simulated match (refused while a real one runs). The first minutes are filled
// in at once, so the charts have a history from the start.
function startDemo() {
  if (!db || (!demo && live.game && live.game.me)) return false;
  demo = { startedAt: Date.now() };
  live.simulate(() => demoMatch.snapshot(db, demoTime()));
  for (let t = 30; t < demoMatch.START; t += 20) live.track(normalize(demoMatch.snapshot(db, t), db, demoMatch.roster()));
  live.start();
  send('demo:state', true);
  return true;
}

function stopDemo() {
  if (!demo) return;
  demo = null;
  live.simulate(null);
  send('demo:state', false);
  if (process.env.LOLHELPER_LIVE || (watcher.phase === 'InProgress' && watcher.supported)) live.start();
}

// Saves the finished match with its result (end-of-game stats, else the live GameEnd event).
async function finishMatch() {
  if (!recorder.match || !db) return;
  const last = recorder.match.last;
  let eog = null;
  try { eog = await watcher.lcu.get('/lol-end-of-game/v1/eog-stats-block'); } catch { /* not available */ }
  const me = last && last.me;
  const role = (me && me.position) || (me && db.byId[me.championId] ? db.byId[me.championId].positions[0] : null);
  const entry = recorder.finish(db, eog, role);
  if (entry && history.add(entry)) send('history:updated', history.list());
  // The client lists the game in its match history a moment after it ends.
  setTimeout(() => refreshMatches(), 15000);
}

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
  // The overlay is a second window; closing the main window ends the app.
  win.on('closed', () => { overlay.destroy(); app.quit(); });
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) console.error(`[renderer] ${message} (${source}:${line})`);
  });
  if (process.env.LOLHELPER_CAPTURE) require('./dev-capture')(win, app, process.env.LOLHELPER_CAPTURE, process.env.LOLHELPER_CAPTURE_PREPARE, overlay);
  win.loadURL('app://ui/index.html');
}

// With the client connected, the rune page is picked from the pages the client recommends
// for the champion, so it is one the player is also offered in champion select.
const pageCache = new Map();
async function withClientRunes(build) {
  if (!watcher.status.connected || !build.runes) return build;
  const champ = db.byId[build.championId];
  const key = `${champ.key}:${build.role}`;
  try {
    if (!pageCache.has(key)) pageCache.set(key, await recommendedPages(watcher.lcu, champ.key, build.role));
  } catch { return build; }
  const page = closestPage(pageCache.get(key), build.runes);
  if (!page) return build;
  const { spells, ...runes } = page;
  return { ...build, runes: { ...runes, reasons: ['loadout.riotPage'] } };
}

function registerIpc() {
  ipcMain.handle('app:init', () => ({
    settings: settings.get(),
    languages: Object.keys(DATA_LOCALES),
    version: app.getVersion(),
    hasDatabase: !!db,
    game: live.game && demo ? { ...live.game, demo: true } : live.game,
    demo: !!demo,
    profile,
    update: updater.status(),
    ...watcher.snapshot(),
  }));

  ipcMain.handle('db:get', (_e, lang) => (db ? {
    meta: db.meta, champions: db.champions, items: db.items, runes: db.runes, summoners: db.summoners, texts: readTexts(lang),
  } : null));

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
    history: learnFrom(),
    pickableIds: opts.useClient ? watcher.pickable : null,
  }));
  ipcMain.handle('engine:build', async (_e, opts) => withClientRunes(recommendBuild(db, { ...opts, history: learnFrom() })));
  ipcMain.handle('engine:matchups', (_e, id) => championMatchups(db, id, settings.get('counterOverrides')));
  ipcMain.handle('engine:inferRoles', (_e, picks) => inferRoles(db, picks));

  ipcMain.handle('lcu:export', async (_e, { build, title, blockNames }) => {
    const champ = db.byId[build.championId];
    return exportItemSet(watcher.lcu, build, champ.key, title, blockNames);
  });
  ipcMain.handle('lcu:exportRunes', (_e, { runes, name, overwriteCurrent }) => exportRunePage(watcher.lcu, runes, name, { overwriteCurrent }));
  ipcMain.handle('lcu:exportSpells', (_e, ids) => exportSummonerSpells(watcher.lcu, ids, { flashOnD: settings.get('flashOnD') }));

  ipcMain.handle('overlay:state', () => overlay.state());
  ipcMain.handle('overlay:preview', (_e, on) => { overlay.setPreview(on); return overlay.state(); });
  ipcMain.handle('overlay:toggleMove', () => { overlay.toggleMove(); return overlay.state(); });
  ipcMain.handle('overlay:apply', () => overlay.applySettings());
  ipcMain.handle('overlay:resize', (_e, height) => overlay.resize(height));

  ipcMain.handle('history:list', () => history.list());
  ipcMain.handle('history:remove', (_e, id) => { history.remove(id); return history.list(); });
  ipcMain.handle('history:clear', () => { history.clear(); return history.list(); });

  ipcMain.handle('matches:list', () => matchesPayload());
  ipcMain.handle('matches:sync', async () => { await refreshMatches({ deep: true }); return matchesPayload(); });
  ipcMain.handle('matches:detail', (_e, id) => matchDetail(watcher.status.connected ? watcher.lcu : null, db, matches, id));
  ipcMain.handle('demo:start', () => startDemo());
  ipcMain.handle('demo:stop', () => { stopDemo(); return false; });
  ipcMain.handle('player:get', async (_e, puuid) => {
    if (String(puuid).startsWith('demo-')) {
      const data = demoMatch.player(db, puuid);
      return { ...data, analysis: analyzeGames(data.games, puuid) };
    }
    if (!watcher.status.connected) throw new Error('LCU not connected');
    const data = await fetchPlayer(watcher.lcu, db, puuid);
    return { ...data, analysis: analyzeGames(data.games, puuid) };
  });

  ipcMain.handle('update:check', () => updater.check());
  ipcMain.handle('update:download', () => updater.download());
  ipcMain.handle('update:install', () => updater.install());

  ipcMain.handle('settings:set', (_e, patch) => {
    const next = settings.set(patch);
    if ('alwaysOnTop' in patch && win) win.setAlwaysOnTop(!!patch.alwaysOnTop);
    if ('leagueDir' in patch) watcher.start(patch.leagueDir);
    if ('language' in patch) overlay.reload();
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
  history = new History(app.getPath('userData'));
  loadDb();
  // Offline, the last account seen in the client is shown until the client says otherwise.
  if (settings.get('lastProfile')) activateProfile(settings.get('lastProfile'));
  watcher.lcu.on('status', (s) => { if (s.connected) loadAccount(); });
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (url.host === 'ui') return serveFile(RENDERER_DIR, rel);
    if (url.host === 'data' && db) return serveFile(db.dir, rel);
    return new Response('Not found', { status: 404 });
  });
  updater = setupAppUpdater(send);
  overlay = new Overlay({ settings, send });
  overlay.registerShortcuts();
  registerIpc();
  createWindow();
  watcher.start(settings.get('leagueDir'));
  // Development: LOLHELPER_LIVE=1 polls the Live Client API without waiting for a game phase.
  if (process.env.LOLHELPER_LIVE) live.start();
  // Development: LOLHELPER_ROSTER=<file.json> supplies the match roster (roles, ranks) without a client.
  if (process.env.LOLHELPER_ROSTER) devRoster = JSON.parse(fs.readFileSync(process.env.LOLHELPER_ROSTER, 'utf8'));
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { if (overlay) overlay.destroy(); });
