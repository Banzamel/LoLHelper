# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). New entries go under **Unreleased**; `npm version`
moves them into a numbered section automatically (see README → Versioning).

## [Unreleased]

## [0.1.0] - 2026-10-25

First public release.

### Added
- Windows desktop app (Electron) with a Hextech-style frameless window and NSIS installer
  (defaults to `<drive>:\Riot Games\LoL Helper` when a Riot Games folder exists).
- Live connection to the League client (LCU API): lockfile / process detection, WebSocket events,
  champion select, game phase, champion mastery and pickable champions.
- Draft view: counter-pick recommendations for the player's role against the lane opponent, with
  enemy role inference, team composition, champion pool and mastery bonuses; manual mode without the client.
- Item build recommendations against the lane opponent and the enemy team (starting items, boots,
  core in buy order, situational, full build) with export to the in-game shop as an item set.
- Champion database (stats by level, abilities, traits, tips, matchups) and item database
  (stats, passives, build path) from Data Dragon, with local icons and an in-app updater.
- Polish and English UI (translation keys in `src/renderer/lang`), bilingual game data.
- Versioning: SemVer, changelog automation, version/tag check and a GitHub Actions workflow that
  tests every push and builds and publishes the installer for `v*` tags.

[Unreleased]: https://github.com/Banzamel/LoLHelper/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Banzamel/LoLHelper/releases/tag/v0.1.0
