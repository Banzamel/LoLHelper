# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). New entries go under **Unreleased**; `npm version`
moves them into a numbered section automatically (see README → Versioning).

## [Unreleased]

### Added
- **Rune guide**: every keystone has a short tip on how to use it and what to watch out for when an enemy plays it,
  in Polish and English; the other runes show their short description in the rune panel. Draft shows the tip for
  the recommended keystone and the lane opponent's typical keystone (predicted from the champion, marked
  *typical*); the loading screen shows the lane opponent's typical keystone; in a match the Runes tab and every
  enemy card show the enemies' real keystones with what to watch out for.

## [0.11.0] - 2026-10-30

### Added
- **Champion briefs**: every champion in Draft and on the loading screen has a short description of what it
  does in a fight (its class and standout traits such as crowd control, mobility or long-range spells), in Polish
  and English. A few champions with unusual kits have hand-written briefs.
- **Playing with your team**: tips on how to play with each ally from your role and champion (stay close to an
  enchanter, follow up on a catcher's hooks, wait for the engage, gank lanes with crowd control…), in Draft and on
  the loading screen.
- **Team plan**: once three champions of a team are known, Draft and the loading screen name the composition
  (engage and teamfight, protect the carry, poke, pick-offs, split push or mixed), give 2–3 lines on how to play
  it and warn about its gaps (no frontline, almost only physical or magic damage, no engage, little crowd control),
  plus one line on what the enemy team wants to do, in Polish and English.
- **Last played account at launch**: the History view shows the account last played on this computer with its
  history and games right after the app starts, marked *Last played account* until the League client connects;
  then it switches to the account logged in to the client, as before.
- **Loading screen** in the Match view: once the game starts loading, both teams with roles, ranks and briefs,
  before the game reports any data.

## [0.10.1] - 2026-10-30

### Fixed
- In-game widget: hovering an item icon shows its name. The widget still lets clicks through to the game,
  it now only receives mouse movement.

## [0.10.0] - 2026-10-28

### Added
- **New Match view**, laid out like a phone app: a scoreboard (kills, item gold of both teams and the lead,
  dragons with their types, towers, grubs, heralds, barons) and tabs:
  - *Now*: next item with a progress bar and what to buy right now, ability levels with the next skill-up,
    your KDA/CS/gold/vision and the lane duel (gold, CS, level, kills against your lane opponent);
  - *Enemies*: every enemy in detail — items with names and prices, the stats their items give and what to do
    about it (armor → penetration, healing → anti-heal…), spells, keystone, rank and a comparison with you;
  - *Teams*: both teams as a table (rank, level, KDA, CS and CS/min, item gold, vision, items), sortable;
  - *Charts*: gold lead over time with dragons and barons marked, team gold, kills, item gold per player and
    a kill/objective feed.
- **Simulated match**: "Show a simulated match" in the Match view (and a switch in *Settings*) plays an invented
  5v5 game, 5× faster, so the Match view, charts and player profiles can be seen without playing; a banner with
  "Stop simulation" turns it off. Nothing is recorded, the widget stays hidden, and a real match ends it.
- **Player sheet**: click any player (in a match or in a past game) to see what they have and, from the client,
  their rank, recent results, win rate on the champion, main champions and roles, play style and last games.
- **Full match history from the League client** (every mode: ranked, normal, ARAM, Arena…), stored locally and
  downloaded only once per game. History view: account profile with ranks, overview with charts (win-rate
  trend, KDA per game, game types, roles), matches filtered by type and sorted (newest, KDA, length, by
  champion, grouped by game type) with both teams, team gold lead and you-vs-lane-opponent gold per game,
  per-champion results, and the matches recorded by the app (Learning).
- **Play-style analysis**: aggressive/passive, deaths, farming, kill participation, damage share, vision,
  one-trick or wide pool — each with a hint what to work on.
- **Per-account data**: every League account logged in on the computer has its own champion pool, counter
  overrides, Flash key, recorded matches and history cache (`profiles/<puuid>` in the user data folder).
  Existing settings and history move to the first account that logs in.

### Changed
- The build and counter-picks also learn from the client's match history (role-based Summoner's Rift games),
  not only from matches recorded by the app.
- Recorded matches keep the item gold of both teams per minute.

## [0.9.1] - 2026-10-26

### Fixed
- Buy order: every item is a column of the same width, so items and their parts line up instead of drifting
  apart (Match view, Build view); the hint above it no longer touches the numbers.
- Draft at small window sizes: no horizontal scrolling, the recommendation cards shrink and wrap their reasons,
  the hidden VS button no longer cuts enemy names short, roles do not break onto two lines.
- History: the per-champion card shows the games/win rate and the average KDA on separate lines.
- Runes: the "Second Wind against ranged poke" reason only appears when the page actually has Second Wind.

### Changed
- Development: the screenshot helper captures every view page by page, the overlay, a manual draft and a build,
  takes `LOLHELPER_CAPTURE_SIZE=<w>x<h>` and reports elements that overflow horizontally.

## [0.9.0] - 2026-10-26

### Added
- **Buy order with parts**: the Build view, the Match view and the widget list items in the order to buy them
  (first item, boots, then the rest), each with its parts underneath; owned items and parts are ticked.
- **"Buy now"**: in a match the next item shows the gold still needed (owned parts and rune boots count) and the
  biggest part you can afford right now, e.g. Pickaxe towards Black Cleaver.
- **Match history** (new History view): every finished match in a supported mode is saved with the result
  (from the client's end-of-game stats), champion, role, lane opponent, both teams, purchase timeline, KDA and CS.
  Per-champion summary, details per match, removing single matches or clearing the history.
- **Learning from your matches**: items you won with in similar matches (same champion; same lane opponent and
  shared enemies weigh more) gain value in the build, items from losses lose it ("You won with it in similar
  matches (2/3)"); counter-picks get a nudge from your results with the champion. Draft and Match show your record
  with the champion and against the lane opponent.

### Changed
- The whole build adapts during a match, not only boots: situational needs weigh more in the core items.
- Development: `LOLHELPER_USERDATA=<dir>` keeps settings and history apart from the real ones.

## [0.8.1] - 2026-10-26

### Fixed
- A fed enemy's damage items now also count for more when choosing boots and resistances (0.8.0 was tagged
  with a failing test for this and was never built).

## [0.8.0] - 2026-10-26

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

[Unreleased]: https://github.com/Banzamel/LoLHelper/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/Banzamel/LoLHelper/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/Banzamel/LoLHelper/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/Banzamel/LoLHelper/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/Banzamel/LoLHelper/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/Banzamel/LoLHelper/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/Banzamel/LoLHelper/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/Banzamel/LoLHelper/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/Banzamel/LoLHelper/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Banzamel/LoLHelper/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Banzamel/LoLHelper/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Banzamel/LoLHelper/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/Banzamel/LoLHelper/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Banzamel/LoLHelper/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Banzamel/LoLHelper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Banzamel/LoLHelper/releases/tag/v0.1.0
