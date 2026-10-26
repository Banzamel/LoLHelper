// App self-update from GitHub Releases (electron-updater). The installer published with each
// release carries latest.yml; the app checks it on start, asks before downloading, and
// installs on restart. Disabled in development (unpackaged) runs.
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

function setupAppUpdater(send) {
  let state = { state: app.isPackaged ? 'idle' : 'dev', current: app.getVersion() };
  const set = (patch) => { state = { ...state, ...patch }; send('app:update', state); };

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => set({ state: 'checking' }));
  autoUpdater.on('update-available', (info) => set({ state: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => set({ state: 'latest' }));
  autoUpdater.on('download-progress', (p) => set({ state: 'downloading', pct: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (info) => set({ state: 'downloaded', version: info.version }));
  autoUpdater.on('error', (err) => set({ state: 'error', error: err ? err.message : 'unknown' }));

  const check = async () => {
    if (!app.isPackaged) return state;
    try { await autoUpdater.checkForUpdates(); } catch { /* reported by the error event */ }
    return state;
  };
  if (app.isPackaged) setTimeout(check, 5000);

  return {
    status: () => state,
    check,
    download: () => autoUpdater.downloadUpdate(),
    // Silent install (no wizard), then start the updated app.
    install: () => autoUpdater.quitAndInstall(true, true),
  };
}

module.exports = { setupAppUpdater };
