// Safe bridge between the renderer and the main process.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);
const on = (channel) => (fn) => {
  const handler = (_e, payload) => fn(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('api', {
  init: invoke('app:init'),
  getDatabase: invoke('db:get'),
  checkUpdate: invoke('db:checkUpdate'),
  updateDatabase: invoke('db:update'),
  counters: invoke('engine:counters'),
  build: invoke('engine:build'),
  matchups: invoke('engine:matchups'),
  inferRoles: invoke('engine:inferRoles'),
  exportBuild: invoke('lcu:export'),
  setSettings: invoke('settings:set'),
  window: invoke('win:action'),
  openExternal: invoke('app:openExternal'),
  onLcuStatus: on('lcu:status'),
  onDraft: on('lcu:draft'),
  onGamePhase: on('lcu:phase'),
  onUpdateProgress: on('db:progress'),
  onGame: on('live:game'),
  onAppUpdate: on('app:update'),
  exportRunes: invoke('lcu:exportRunes'),
  exportSpells: invoke('lcu:exportSpells'),
  checkAppUpdate: invoke('update:check'),
  downloadAppUpdate: invoke('update:download'),
  installAppUpdate: invoke('update:install'),
});
