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

## Features

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

### Project layout
| Path | Contents |
|---|---|
| `src/main/main.js` | Electron main process: window, `app://` protocol, IPC |
| `src/main/lcu/` | League client connection: credentials, REST + WebSocket, champion select, item sets |
| `src/main/data/` | Database builder (Data Dragon + Meraki), text parsing, data store |
| `src/main/engine/` | Counter scoring, item builds, role inference, curated `knowledge.js` |
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
   builds the installer and publishes a GitHub Release with the `.exe` attached.

## Legal

LoL Helper isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
officially involved in producing or managing League of Legends. League of Legends and Riot Games are
trademarks or registered trademarks of Riot Games, Inc.

Game data and images are downloaded from Riot's public Data Dragon service at build/run time and are not
stored in this repository. The source code is released under the [MIT License](LICENSE).
