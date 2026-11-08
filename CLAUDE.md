# lolhelper — part of LoL Helper

This is a code repository. Plans, decisions, specifications and session state live in the
knowledge repository: `../project` — start Claude sessions there.

- Stack conventions: Tauri 2 (Rust) + React 19 + TypeScript (Vite), tests on Vitest
- Universal rules: `../project/.claude/rules/core-*.md`
- Code changes only within an `active` item of `../project/MASTERPLAN.md`.

## Architecture

```
src/
  app/            main window shell: entries (main.tsx, overlay.tsx), service wiring (services.ts),
                  start-up (startApp.ts), title bar, sidebar, view switch, auto-navigation
  features/       one folder per feature; other features import only its index.ts
    account/        the League account the data belongs to (profile folders)
    appUpdate/      self-update (Tauri updater): service, banner, Settings section
    builds/         engine in the app's context, exports to the client, Build view, loadout panels
    champSelect/    Draft view: counter-picks, team notes, manual draft
    client/         League client state (LcuWatcher over the Rust connection)
    database/       champion/item database: loading, updating, UI model, icons, database views
    liveGame/       running match: polling, recording, simulation, Match view
    matchHistory/   recorded matches + client match history, History view, player sheet
    settings/       settings service and Settings view
    widget/         in-game widget: behaviour (OverlayService) and its window (WidgetApp)
  core/           pure logic, no React or Tauri imports; every module has tests in test/core
    data/ engine/ lcu/ live/ matches/ history/ settings/ profiles/ demo/ shared/
  platform/       the only place importing @tauri-apps/* (commands, events, storage, windows,
                  hotkeys, updater, database files)
  shared/         ui/ (components, charts, modal/tooltip/toast), hooks/, i18n/, lib/
  lang/           pl.json, en.json (translation keys)
  styles/         CSS, class names shared by all views
src-tauri/src/
  main.rs lib.rs setup.rs error.rs
  commands/       thin #[tauri::command] wrappers (client, files, downloads, widget, dev)
  lcu/            lockfile/process discovery, HTTPS + WebSocket with Riot's self-signed cert, live game
  storage/        data folder paths (no path may leave it), atomic writes, Electron data migration
  window/         widget window, Win32 calls (show without focus, topmost, cursor), tracker thread
src-tauri/windows/hooks.nsh   installer hooks (old Electron app uninstalled, data kept)
test/core/        tests mirroring src/core
scripts/          fetch-data.ts, version.cjs, release-manifests.js, docker-build.js, make-icon.ps1
docker/build.sh   Windows installer built in the tauri-build image (cargo-xwin + NSIS)
```

Data folder: `%APPDATA%\pl.banzamel.lolhelper` (settings.json, profiles/<puuid>/…, data/ = a
downloaded database). On first start the Electron app's `%APPDATA%\LoL Helper` is copied over
(src-tauri/src/storage/migrate.rs); the old folder is never deleted.

## Code structure

1. File size: aim ≤150 lines, hard limit 200 (lang/JSON/data files excepted). Split before reaching it.
2. One responsibility per file. One React component per file (tiny private helpers <30 lines ok).
   File named after its main export: PascalCase.tsx for components/classes, camelCase.ts for modules.
3. Feature folders: `src/app/`, `src/features/<feature>/` (components/, hooks/, views/, services or
   classes, types.ts, index.ts public API), `src/shared/{ui,hooks,i18n,lib}/`, `src/core/<domain>/`
   (pure logic, no React/Tauri imports), `src/platform/` (the ONLY place importing @tauri-apps/*),
   `src/lang/`, `src/styles/` (class names kept).
4. Classes for stateful services/stores (client facade, settings, database, updater…) with
   dependencies injected via the constructor; plain pure functions for calculations.
5. TypeScript strict; no `any` except at JSON/IPC boundaries (`RawJson` in core/shared/json.ts),
   wrapped by typed functions; types in each feature's or domain's types.ts.
6. React: function components + hooks; components mostly render, logic in hooks/services; global
   state in small stores owned by services (`Store`, read with `useStore`), no mutable module globals.
7. Features import each other only through index.ts (no deep imports across features).
8. Rust: main.rs only wiring (≤60 lines); one module folder per area (commands/, lcu/, storage/,
   window/…), small files, one error type implementing serde::Serialize, no unwrap/expect in
   command paths.
9. Tests mirror the src tree (test/core/...); every pure module has tests.
10. English code and comments; comments explain why, not what.

## Commands

- `npm test` — Vitest (needs `npm run fetch-data` once for resources/data)
- `npm run typecheck` — tsc for src and tests; `npm run build` — tsc + vite build
- `npm run dist` — the Windows installer through Docker (image `tauri-build`), into release/
- `npm start` — `tauri dev` (needs Rust + MSVC on Windows)
