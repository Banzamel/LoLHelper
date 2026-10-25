# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). New entries go under **Unreleased**; `npm version`
moves them into a numbered section automatically (see README → Versioning).

## [Unreleased]

### Added
- **Runes, summoner spells and skill order** in the Build view: a full rune page (keystone, primary and
  secondary runes, stat shards) chosen by champion class, role and enemy threats; summoner spells by role;
  ability max order with a level 1–18 table.
- **Export runes and spells to the client**: the rune page is saved and selected (reusing the LoL Helper
  page, or overwriting the current page after confirmation when no slot is free); summoner spells are set
  during champion select (Flash on D or F, configurable).
- **Live match view** (Live Client Data API): real positions, enemy levels, KDA, CS and items; the build adapts
  to what enemies actually bought, owned items stay in the build and the next item to buy is shown with the
  gold still missing. Opens automatically when the game starts.
- **App self-update** from GitHub Releases: checks on start, shows a banner, downloads on request and installs
  on restart; manual check in Settings → About.
- Database: rune trees, stat shards and summoner spells (with icons, both languages); ability level tips.

### Fixed
- Closing the champion picker with the Close button or Escape now always finishes the pick.

### Changed
- Releases use the matching CHANGELOG section as release notes and ship `latest.yml` for updates.

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
