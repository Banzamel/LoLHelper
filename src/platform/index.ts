// The native side of the app. Only this folder imports @tauri-apps/*; features use these
// adapters (injected into their services) and never the Tauri API directly.
export { commands, errorMessage, type DataFolders, type DevOptions } from './commands.ts';
export { nativeEvents, windowMessages, type Unlisten } from './events.ts';
export { TauriStorage } from './TauriStorage.ts';
export { TauriLcuConnection } from './TauriLcuConnection.ts';
export { assetUrl, builderIo, commitDatabase, databaseReader, dataFolders, fetchJson, startDatabaseBuild, type DatabaseSource } from './databaseFiles.ts';
export { mainWindow, widgetWindow, openExternal, type WindowAction } from './windows.ts';
export { registerHotkeys } from './shortcuts.ts';
export { UpdaterAdapter, type UpdateInfo } from './updater.ts';
export { devOptions, insideTauri, isPackaged, liveGameData } from './environment.ts';
