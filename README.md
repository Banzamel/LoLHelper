# LoL Helper

[![Build & release](https://github.com/Banzamel/LoLHelper/actions/workflows/release.yml/badge.svg)](https://github.com/Banzamel/LoLHelper/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/Banzamel/LoLHelper)](https://github.com/Banzamel/LoLHelper/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A Windows desktop assistant for **League of Legends** (Summoner's Rift, 5v5 draft). It connects to the
running League client, watches champion select and tells you **what to pick against your lane opponent**
and **what to build against them** — with an offline champion and item database on the side.

UI languages: **Polish** (default) and **English**.

## Download

Get the installer from **[Releases](https://github.com/Banzamel/LoLHelper/releases/latest)**
(`LoLHelper-Setup-<version>.exe`). The installer lets you pick the folder; by default it installs next
to the game (`T:\Riot Games\LoL Helper` when that Riot Games folder exists, else `C:\Riot Games\LoL Helper`).
The app keeps everything — settings, history, the downloaded database, its browser cache — in the `data`
folder next to the program, nothing in AppData; uninstalling deletes it only when you tick *Delete the
application data*.

The app is not code-signed, so Windows SmartScreen may warn on first launch — choose *More info → Run anyway*.
From version 0.2.0 the app **updates itself** from GitHub Releases (banner under the title bar). Installs of the
Electron versions (up to 0.12.x) update into the current one and keep their settings, champion pools and history.

## Features

Supported modes: role-based Summoner's Rift queues — Ranked Solo/Duo and Flex, Normal Draft, Clash,
Swiftplay and Quickplay. Summoner's Rift **custom games** and the **Practice Tool** show the same Draft, loading
screen, Match view and widget: nobody has an assigned role there, so your role is the one you choose in Draft and
the other champions' roles are inferred; these games are not saved to the history and do not teach the build
recommendations. ARAM, Blind Pick, rotating modes and custom games on other maps are skipped (the app shows a notice).

### Draft — counter-picks
- Live data from champion select through the League Client API (LCU): both teams, hovers, bans,
  your assigned position, pickable champions and your champion mastery.
- Enemy positions are hidden in champion select, so they are **inferred** for the whole enemy team;
  you can mark any enemy as your lane opponent with one click.
- Recommendations for your role with a 0–100 score and the reasons behind it:
  curated matchup knowledge, archetype matchups (assassin vs. artillery mage, juggernaut vs. ranged…),
  ability traits read from ability texts (hard CC, dashes, healing, %HP and true damage, range),
  team composition (AD/AP balance, frontline, CC), your champion pool and mastery.
- No enemy laner yet? You get **safe blind picks**. Client not running? Use **manual mode**.
- Every champion has a short **brief** — what it does in a fight — and **Playing with your team** says how to
  play with each ally from your role and champion.
- From three picks on, a **team plan** names your composition (engage, protect the carry, poke, pick, split
  push), says in 2–3 lines how to play it and warns about its gaps (no frontline, one damage type, no engage,
  little crowd control); one line says what the enemy team wants to do.
- The **rune guide** in the rune panel says how to use the recommended keystone, shows a short description next to
  every other rune and what to watch out for in your lane opponent's typical keystone (marked *typical*).

### Build — items against your opponent
- Starting items, boots (with the tier-3 upgrade), 3 core items in buy order, situational items and a
  full six-slot build — each with reasons (anti-heal vs. healers, armor/MR vs. the enemy damage split,
  stasis vs. assassins, penetration vs. tanks, tenacity/cleanse vs. heavy CC…).
- **Export to game**: saves the build as an item set in the client, so it shows up in the in-game shop.

### Runes, spells and skill order
- Full rune page (keystone, primary/secondary runes, stat shards) by champion class, role and enemy threats,
  summoner spells by role and an ability max order with a level 1–18 table.
- **Export runes** (saved and selected in the client) and **set summoner spells** during champion select.

### Match history and play style
- The whole match history of the logged-in account is downloaded from the League client (every mode) and kept
  locally, so each game is fetched only once. Several accounts on one computer each have their own history,
  champion pool and settings. At launch, before the client connects, the History view shows the account last
  played on this computer.
- Overview with charts (win-rate trend, KDA, game types, roles), matches filtered by type and sorted, both teams
  and the gold lead of every game, results per champion, and a play-style analysis with hints.
- Every match the app follows is also recorded with its purchase timeline. The build learns from both: items you
  won with in similar matches gain value, items from losses lose it.

### Live match
- While the game runs, the app reads the Live Client Data API: both teams with Riot IDs, levels, KDA, CS and items,
  objectives and a kill feed. The Match view has a scoreboard and tabs: what to do now, every enemy in detail
  (items, stats, what to counter), both teams as a table, real-time charts (gold lead, team gold, kills) and runes.
- On the **loading screen**, before the game reports data, the Match view shows both teams with roles, ranks and
  champion briefs, plus the team plan and the tips for playing with your allies, and your lane opponent's typical
  keystone with what to watch out for.
- The Runes tab and every enemy card show the enemies' real keystones with what to watch out for.
- Click any player to open their profile: rank, recent results, champions, roles and play style.
- **Simulated match**: *Show a simulated match* (Match view, or the switch in *Settings*) plays an invented game so you
  can try all of this without playing; *Stop simulation* turns it off. Nothing from it is recorded.
- Roles picked in draft and every player's **rank** (tier, division, LP, season winrate — Flex in Flex games,
  Solo/Duo otherwise) come from the League client. Riot hides names in ranked champion select, so ranks appear
  once the game starts. The widget shows the lane opponent's rank.
- The build adapts to what the enemies actually bought, keeps the items you own and shows the **next item to buy**
  and how much gold you still need.

### In-game widget (one monitor)
- A small transparent widget over the game: next item to buy and the gold still missing, build progress,
  the skill to level next and your lane opponent's items. Click-through, never steals focus, shows only in a match.
- `Ctrl+Shift+H` shows/hides it, `Ctrl+Shift+J` switches to move mode (drag it anywhere). Opacity and hotkeys
  are configurable in *Settings → In-game widget*, with a preview to place it before a match.
- League must run in **Borderless** or **Windowed** mode (*Settings → Video → Window Mode*) — exclusive
  Fullscreen hides every other window, including the widget.

### Database
- **Champions**: stats by level (1–18), passive and Q/W/E/R with cooldowns, costs and ranges, profile
  ratings, detected ability traits, playing tips and matchups (strong / weak against).
- **Items**: icons, cost, stats, passives and actives, build path (builds from / into), filters by
  category and stat.
- Data comes from Riot's official **Data Dragon** (plus positions/archetypes from Meraki Analytics) and is
  stored locally with all icons. Update it in *Settings → Database* after a new patch.

## Development

Built with **Tauri 2** (Rust) and **React 19 + TypeScript** (Vite). The app logic and UI run in the
webview; Rust handles what the webview cannot: the League client connection (its HTTPS API and event
WebSocket use Riot's self-signed certificate), the game's Live Client Data API, the in-game widget window
(transparent, always on top, click-through) and file access limited to the app's data folder.

Requirements: Node.js 22+. To run the app from source (`npm start`) also Rust and MSVC on Windows; the
installer can be built without them through Docker.

```bash
npm install
npm run fetch-data   # downloads Data Dragon data + icons into resources/data
npm test             # Vitest (pure logic in src/core)
npm run typecheck    # tsc for the app and the tests
npm start            # tauri dev (needs Rust + MSVC)
npm run dist         # installer via Docker (image tauri-build) -> release/LoLHelper-Setup-<version>.exe
```

`npm run dist` runs `docker/build.sh` in the `tauri-build` image (Rust, cargo-xwin, NSIS, Node) with
named volumes for node_modules, the cargo registry, the MSVC SDK cache and the build target; the host needs
only Docker.

Development switches: `LOLHELPER_LIVE=1` polls the Live Client Data API without waiting for the client's
game phase (useful with a mock server on `https://127.0.0.1:2999`); `LOLHELPER_ROSTER=<file.json>` supplies
the match roster (roles, ranks) without a League client; `LOLHELPER_USERDATA=<dir>` keeps settings and match
history apart from the real ones; with it, `LOLHELPER_MIGRATE_FROM=<dir>` tries the one-time copy of the Electron
app's data from `<dir>\LoL Helper` (a copy of `%APPDATA%\LoL Helper`).

### Project layout
| Path | Contents |
|---|---|
| `src/core/` | Pure logic with tests in `test/core`: database builder and parsing, counter scoring, item builds, runes/spells/skills, in-game adjustments, learning from history, team notes, LCU and live-game parsing, match history, settings, simulated match |
| `src/features/` | One folder per feature (services, hooks, components, views; public API in `index.ts`) |
| `src/platform/` | The only code using the Tauri API: Rust commands, events, storage, windows, hotkeys, updater |
| `src/shared/` | UI building blocks (icons, charts, modal/tooltip/toast), hooks, i18n, small libraries |
| `src/app/` | Window entries, service wiring, start-up, title bar, navigation |
| `src/lang/`, `src/styles/` | Translations, CSS |
| `src-tauri/` | Rust: LCU connection, live game, widget window, file access, Electron data migration, installer hooks |
| `scripts/` | Data download, versioning, release manifests, Docker build, icon generation |

### Conventions
- Code and comments in English; every user-facing text is a translation key in `src/lang`.
- New language: add `src/lang/<code>.json`, register it in `src/shared/i18n/Translator.ts` and add an entry
  in `src/core/data/locales.ts` (maps the app language to a Data Dragon locale).
- Matchup knowledge lives in `src/core/engine/knowledge/counters.ts` (enemy → champions that do well against
  it); ids are Data Dragon ids and are validated by the tests.
- Code structure rules (file size, folders, typing): see [CLAUDE.md](CLAUDE.md).

## Versioning

[Semantic Versioning](https://semver.org/); `package.json` is the single source of the version (Tauri reads it,
shown in *Settings → About*). Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

1. Describe your changes under `## [Unreleased]` in `CHANGELOG.md`.
2. Run `npm run release:patch` (or `release:minor` / `release:major`) — bumps the version, moves the
   changelog entries into a dated section, commits and creates the `v<version>` tag.
3. `git push --follow-tags` — GitHub Actions checks that the tag, `package.json` and the changelog agree,
   builds the installer signed for the updater (secrets `TAURI_SIGNING_PRIVATE_KEY` and
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) and publishes a GitHub Release with the setup, its `.sig`,
   `latest.json` (Tauri updater) and `latest.yml` (lets Electron installs up to 0.12.x update into it); the
   release notes are the version's CHANGELOG section.

## Legal

LoL Helper isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
officially involved in producing or managing League of Legends. League of Legends and Riot Games are
trademarks or registered trademarks of Riot Games, Inc.

Game data and images are downloaded from Riot's public Data Dragon service at build/run time and are not
stored in this repository. The source code is released under the [MIT License](LICENSE).
