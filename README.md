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
to the game (`<drive>:\Riot Games\LoL Helper`) when a Riot Games folder exists.

The app is not code-signed, so Windows SmartScreen may warn on first launch — choose *More info → Run anyway*.
From version 0.2.0 the app **updates itself** from GitHub Releases (banner under the title bar).

## Features

Supported modes: role-based Summoner's Rift queues — Ranked Solo/Duo and Flex, Normal Draft, Clash,
Swiftplay and Quickplay. ARAM, Blind Pick, rotating modes and custom games are skipped (the app shows a notice).

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

### Build — items against your opponent
- Starting items, boots (with the tier-3 upgrade), 3 core items in buy order, situational items and a
  full six-slot build — each with reasons (anti-heal vs. healers, armor/MR vs. the enemy damage split,
  stasis vs. assassins, penetration vs. tanks, tenacity/cleanse vs. heavy CC…).
- **Export to game**: saves the build as an item set in the client, so it shows up in the in-game shop.

### Runes, spells and skill order
- Full rune page (keystone, primary/secondary runes, stat shards) by champion class, role and enemy threats,
  summoner spells by role and an ability max order with a level 1–18 table.
- **Export runes** (saved and selected in the client) and **set summoner spells** during champion select.

### Live match
- While the game runs, the app reads the Live Client Data API: both teams with Riot IDs, levels, KDA, CS and items.
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

Requirements: Windows, Node.js 22+.

```bash
npm install
npm run fetch-data   # downloads Data Dragon data + icons into resources/data
npm start            # run the app
npm test             # engine tests (node:test)
npm run dist         # build the installer -> dist/LoLHelper-Setup-<version>.exe
```

Development switches: `LOLHELPER_LIVE=1` polls the Live Client Data API without waiting for the client's
game phase (useful with a mock server on `https://127.0.0.1:2999`); `LOLHELPER_ROSTER=<file.json>` supplies
the match roster (roles, ranks) without a League client.

### Project layout
| Path | Contents |
|---|---|
| `src/main/main.js` | Electron main process: window, `app://` protocol, IPC |
| `src/main/lcu/` | League client connection: credentials, REST + WebSocket, champion select, item sets, rune pages and spells, Live Client Data API |
| `src/main/app-updater.js` | Self-update from GitHub Releases (electron-updater) |
| `src/main/overlay.js` | In-game overlay widget window, hotkeys and visibility |
| `src/main/data/` | Database builder (Data Dragon + Meraki), text parsing, data store |
| `src/main/engine/` | Counter scoring, item builds, runes/spells/skills (`loadout.js`), in-game adjustments (`live.js`), role inference, curated `knowledge.js` |
| `src/renderer/` | UI (vanilla JS modules + CSS), `lang/*.json` translations |
| `scripts/` | Data download, icon generation, versioning, installer hooks |
| `test/` | Engine tests |

### Conventions
- Code and comments in English; every user-facing text is a translation key in `src/renderer/lang`.
- New language: add `src/renderer/lang/<code>.json` and an entry in `src/main/i18n.js`
  (maps the app language to a Data Dragon locale).
- Matchup knowledge lives in `src/main/engine/knowledge.js` (enemy → champions that do well against it);
  ids are Data Dragon ids and are validated by the tests.

## Versioning

[Semantic Versioning](https://semver.org/); `package.json` is the single source of the version (shown in
*Settings → About*). Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

1. Describe your changes under `## [Unreleased]` in `CHANGELOG.md`.
2. Run `npm run release:patch` (or `release:minor` / `release:major`) — bumps the version, moves the
   changelog entries into a dated section, commits and creates the `v<version>` tag.
3. `git push --follow-tags` — GitHub Actions checks that the tag, `package.json` and the changelog agree,
   builds the installer and publishes a GitHub Release with the `.exe`, its `.blockmap` and `latest.yml`
   (used by the in-app updater); the release notes are the version's CHANGELOG section.

## Legal

LoL Helper isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
officially involved in producing or managing League of Legends. League of Legends and Riot Games are
trademarks or registered trademarks of Riot Games, Inc.

Game data and images are downloaded from Riot's public Data Dragon service at build/run time and are not
stored in this repository. The source code is released under the [MIT License](LICENSE).
