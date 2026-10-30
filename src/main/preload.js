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
  team: invoke('engine:team'),
  runes: invoke('engine:runes'),
  exportBuild: invoke('lcu:export'),
  setSettings: invoke('settings:set'),
  window: invoke('win:action'),
  openExternal: invoke('app:openExternal'),
  onLcuStatus: on('lcu:status'),
  onDraft: on('lcu:draft'),
  onGamePhase: on('lcu:phase'),
  onGameMode: on('lcu:mode'),
  onRoster: on('lcu:roster'),
  listHistory: invoke('history:list'),
  removeHistory: invoke('history:remove'),
  clearHistory: invoke('history:clear'),
  onHistory: on('history:updated'),
  listMatches: invoke('matches:list'),
  syncMatches: invoke('matches:sync'),
  matchDetail: invoke('matches:detail'),
  getPlayer: invoke('player:get'),
  onMatches: on('matches:updated'),
  onMatchSync: on('matches:sync'),
  onProfile: on('profile:changed'),
  startDemo: invoke('demo:start'),
  stopDemo: invoke('demo:stop'),
  onDemo: on('demo:state'),
  onUpdateProgress: on('db:progress'),
  onGame: on('live:game'),
  onAppUpdate: on('app:update'),
  exportRunes: invoke('lcu:exportRunes'),
  exportSpells: invoke('lcu:exportSpells'),
  checkAppUpdate: invoke('update:check'),
  downloadAppUpdate: invoke('update:download'),
  installAppUpdate: invoke('update:install'),
  overlayState: invoke('overlay:state'),
  overlayPreview: invoke('overlay:preview'),
  overlayToggleMove: invoke('overlay:toggleMove'),
  overlayApply: invoke('overlay:apply'),
  overlayResize: invoke('overlay:resize'),
  onOverlayState: on('overlay:state'),
});
