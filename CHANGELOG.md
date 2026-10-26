# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). New entries go under **Unreleased**; `npm version`
moves them into a numbered section automatically (see README → Versioning).

## [Unreleased]

### Added
- **Fed enemies count more**: during a match each enemy is weighted by their score and the gold in their items,
  so boots, defensive and situational items follow who is actually dangerous (e.g. Mercury's Treads and Maw of
  Malmortius against a fed Akali). Fed enemies are listed as "Fed: <champion>" next to the threats.

## [0.7.0] - 2026-10-26

### Changed
- **Runes come from the client's own recommendations**: with the League client connected, the rune page is
  the one of Riot's recommended pages for the champion (the ones offered in champion select) that best fits
  the matchup, so "Set runes in client" sets a page you also see in the client.
- **Better core items**: each class has a list of proven core items (Trinity Force, Sundered Sky, Sterak's
  Gage for bruisers; Infinity Edge, Kraken Slayer for marksmen…), which stat values alone undervalued. At most
  one anti-heal item per build; crit items are not suggested to non-marksmen.
- Champion positions are ordered by play rate (Meraki Analytics), so the most played role comes first and
  enemy roles in draft are guessed better; an off-role guess (e.g. Teemo jungle while enemies are still
  picking) is not shown as your lane opponent. Database schema 3 — the bundled data is used until you update.

### Fixed
- Fighters tagged as tanks (Xin Zhao, Warwick, Garen, Sett, Hecarim, Volibear…) were built as tanks: tank
  items, Aftershock and the green jungle pet. They now get bruiser builds, Conqueror and Scorchclaw.

## [0.6.0] - 2026-10-26

### Added
- The widget pulses green when you can afford the next purchase.
- Match view: the skill order sits right below the build, with levels already taken dimmed and the next
  skill-up outlined.

### Changed
- Draft: "Your setup for this game" (runes, summoner spells, starting items) is always at the top once you
  hover or lock a champion, so it is visible without scrolling; the skill order moved to the Match view.
- Match view: runes and spells moved to the bottom (they cannot change during a match).
- Export buttons renamed to "Set runes in client" / "Set spells in client".

### Fixed
- The widget could disappear behind a Borderless game window after a moment; it now re-asserts its place
  on top every 1.5 s without taking focus from the game.

## [0.5.0] - 2026-10-26

### Added
- **Your setup in Draft**: once you hover or lock a champion, the Draft view shows the runes, summoner spells,
  skill order and starting items for it in your role and against the enemy team, with Export runes / Set spells.
- **Your current choice vs the recommendation**: the rune page selected in the client and your D/F spells are
  compared with the recommendation (matches / same keystone, other runes / differs) in Draft and in the Match view.
- **Starting items** in the Match view and the widget while you have not bought anything yet.
- Match view: every player's summoner spells (D/F) and keystone.
- Unranked players show their rank from the end of last season, when they had one.

### Fixed
- Client phases "Game starting", "Reconnecting", "Waiting for stats" and others were shown untranslated.

## [0.4.0] - 2026-10-26

### Added
- **Player ranks in the Match view**: tier, division, LP and season winrate of all 10 players (Flex rank in
  Flex games, Solo/Duo otherwise), read from the League client. The widget shows the lane opponent's rank.
- The Match view lists your team too, with each player's Riot ID.

### Changed
- Roles in a match come from the draft (League client), so the lane opponent is no longer guessed when the
  game does not report positions.
- Only role-based Summoner's Rift queues are supported (Ranked Solo/Duo and Flex, Normal Draft, Clash,
  Swiftplay, Quickplay). In ARAM, Blind Pick, rotating modes and custom games the app shows a notice instead
  of draft data, does not open the Draft or Match view and keeps the widget hidden.

## [0.3.1] - 2026-10-26

### Fixed
- App update installs silently and restarts the app; before, "Restart and install" opened the installer
  wizard and waited for clicks. (Updating from 0.3.0 still shows the wizard once — click through it.)

## [0.3.0] - 2026-10-26

### Added
- **In-game overlay widget** for single-monitor setups: a small transparent, always-on-top, click-through
  window over the game with the next item to buy (and the gold still missing), build progress with owned
  items ticked, the skill to level next and the lane opponent's items. Shows only during a match and never
  takes focus from the game. Requires Borderless or Windowed mode in League (Fullscreen covers all windows).
- Overlay hotkeys: `Ctrl+Shift+H` show/hide, `Ctrl+Shift+J` move mode (drag it anywhere; position is
  remembered). Settings → In-game widget: on/off, opacity, custom hotkeys and a preview to place it before a match.

### Changed
- The Match view and the widget share one in-game build helper.
- `LICENSE` contains only the standard MIT text, so GitHub recognises the license; the note about
  Riot Games data stays in README → Legal.

## [0.2.0] - 2026-10-25

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

[Unreleased]: https://github.com/Banzamel/LoLHelper/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/Banzamel/LoLHelper/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Banzamel/LoLHelper/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Banzamel/LoLHelper/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Banzamel/LoLHelper/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/Banzamel/LoLHelper/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Banzamel/LoLHelper/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Banzamel/LoLHelper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Banzamel/LoLHelper/releases/tag/v0.1.0
