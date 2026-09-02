# Soccer Playing Time Tracker — Project Context

This document summarizes everything designed and decided so far, so a fresh Claude Code session has full context without needing to rediscover it. Read this first before making changes.

## What This App Does

A Progressive Web App (PWA) for a youth soccer coach to track player playing time during games, from their iPhone sideline. The coach marks players in/out in real time; the app calculates total time played and time by position. Data persists across games for season-long stats.

## Why PWA (not native app)

- No App Store needed — coach adds it to iPhone home screen via Safari
- Works offline during games (no reliable WiFi at fields)
- Free hosting via GitHub Pages
- Updates deploy automatically (service worker refreshes cache) — no re-adding to home screen
- Full-screen, app-like experience once added to home screen (vs. Safari tab with browser chrome)

## Hosting & Deployment

- **Repo:** `github.com/leeessner/soccer-tracker`
- **Hosting:** GitHub Pages, deployed from `main` branch
- **Live URL:** `https://leeessner.github.io/soccer-tracker/`
- **Data today:** Local storage only (per-device, per-browser)
- **Data tomorrow (not yet built):** Firebase or similar backend for auto-sync when WiFi returns. Sync should be automatic, not manual — when the app detects it's back online, it pushes local game data to the cloud without the coach doing anything.

## Design System

iOS-native aesthetic (Apple Human Interface Guidelines inspired):

- **Font:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Colors:**
  - Primary accent: `#007AFF` (iOS blue)
  - Primary text / on-field players: `#1a1f36` (near-black)
  - Secondary text / bench players: `#8e8e93` (muted gray, meets accessibility contrast)
  - Background: `#f2f2f7` (light gray)
  - Borders: `#e5e5ea`
- **Viewport target:** 390×844 (iPhone screen size)
- **Icon style:** Native-style SVG icons (not text characters or emoji) for chevrons/controls — e.g., back chevron is an inline SVG polyline, not a Unicode `‹` character

## Screens

### 1. Home Screen (`public/index.html`)
- Lists past games (opponent, date, player count, quick stats)
- "Start New Game" button → Game Setup
- Empty state when no games exist yet

### 2. Game Setup (`public/game-setup.html`)
- Opens either from Home ("Start New Game") OR via **long-press on the opponent name/date area** in the Game Tracker header (to edit an in-progress game's settings)
- Fields:
  - **Opponent** (required)
  - **Date & Time** (optional)
  - **Players on Field** (required, default **7**, range 1–20) — this is the max number of players allowed on the field simultaneously
- Only Opponent and Players on Field are required; everything else is optional

### 3. Game Tracker (`public/game-tracker.html`) — the core screen, most fully designed
This is what the coach uses live, from the sideline, during the game.

**Header:**
- Back chevron (top left) — native SVG chevron icon, no background container, 36×36px square (same height as Play/Sit buttons). Tapping it confirms before leaving ("Leave game? Any unsaved changes will be lost.")
- Opponent name + date/time — long-press (500ms) opens the Game Setup modal to edit these values and the Players on Field count
- Clock display (e.g. "12:34") — kept small (28px) so it doesn't force text to overflow/wrap
- Pause/Resume button (⏸/▶) — 36×36px square, light gray background
- End Half/Game button — **icon only, no text**: a stop icon (⏹), 36×36px square, blue background. Tapping opens a confirmation modal — text says "End Half?" (or "End Game?" if already in the second half) with Cancel/Confirm buttons. The button itself never shows text, just the icon.
- All three header buttons (back chevron, pause, stop) are the same 36×36px size, matching the height of the Play/Sit action buttons in the roster below, for visual consistency
- Header padding was tuned so vertical spacing above and below the opponent/clock row is even (not lopsided)

**Player list:**
- Column headers: Pos | Name | Total | Stint | Action
- Always sorted **alphabetically** (not grouped by on-field/bench) — this is a deliberate choice so the coach can find a player quickly by name rather than scanning two groups. A future toggle between alphabetical/status view is possible but out of scope for now.
- On-field players: dark text (`#1a1f36`), real position, live stint timer
- Bench players: muted gray text (`#8e8e93`), position always shows `—`, stint time always `0:00` — **this is a data integrity rule**: a bench player can never have a real position or a nonzero stint time
- **Position button** (per player):
  - **Click:** cycles through positions in order **F → M → D → G → —** (loops back to F)
  - **Long-press (500ms):** opens a dropdown menu listing all five options (Forward, Midfield, Defense, Goalie, —); current position shown highlighted in blue; tapping an option selects it and closes the dropdown
- **Action button** (Play/Sit) per player:
  - Bench player shows "Play" (blue), on-field player shows "Sit" (light gray/blue text)
  - **Field count enforcement:** the "Play" button is disabled if the field is already at the configured max (default 7). A player can always be sat, but can't be added beyond the limit.
  - **Automatic position transfer on substitution:** when a player is sat, their position is remembered (`lastVacatedPosition`). When the very next "Play" action brings in a bench player, that player automatically inherits the vacated position. Example: Casey (Midfield) is sat → Kelly is played next → Kelly is automatically assigned Midfield. This only applies to the immediate next substitution; the tracked position clears after being used once.

**Footer:**
- "Stage" button for bulk multi-player substitution mode (opens a staging modal — lets the coach queue several swaps at once, then execute them together, vs. one-at-a-time direct clicking)
- When staging is active, footer shows a staged-changes card instead (count of staged changes, Clear/Execute buttons)

### 4. Analytics (`public/analytics.html`)
- Post-game summary: opponent, date, total duration
- Per-player stats table: name, started indicator, H1 time, H2 time, total time
- Bar chart of playing time distribution (not yet built — placeholder currently)

## Two Substitution Modes (by design)

1. **Direct click-to-swap:** click Sit on one player, click Play on another — immediate, one at a time. This is what's implemented so far, including the automatic position transfer described above.
2. **Bulk staging:** tap "Stage" to enter a mode where multiple swaps are queued, then executed together with one tap. Useful for whole-line changes at halftime. UI designed (`Staging.dc.html` reference) but not yet wired into the interactive build.

## Data Model (conceptual, current local-storage implementation in `src/js/storage.js`)

```
Game {
  id, opponent, dateTime, playersOnField (default 7),
  startedAt, endedAt, status,
  players: [{ id, name, position, playing, totalTime, stintTime }],
  events: [{ type: 'substitution' | 'position_change', timestamp, ... }],
  clock: { totalSeconds, isPaused, currentHalf }
}
```

- `Storage.saveGame()` / `getAllGames()` / `getGame(id)` / `deleteGame(id)` — completed games
- `Storage.setCurrentGame()` / `getCurrentGame()` / `clearCurrentGame()` — in-progress game (so the app can resume if closed mid-game)
- `Storage.saveTeam()` / `getAllTeams()` — roster management (future use)

## What's Built vs. Not Yet Built

**Built:**
- Full project scaffold: `public/`, `src/css/styles.css`, `src/js/app.js`, `src/js/storage.js`, `manifest.json`, `service-worker.js`
- Static HTML templates for all 4 screens (index, game-setup, game-tracker, analytics) — currently placeholders/non-interactive in the committed project files
- A fully interactive standalone prototype of the Game Tracker (built and iterated on as a Claude artifact, not yet merged into `public/game-tracker.html`) with working:
  - Position click-to-cycle and long-press dropdown
  - Field count validation (disables Play button at max)
  - Automatic position transfer on substitution
  - Long-press on opponent header to open Game Setup modal (inline modal version)
  - Back chevron with confirm-before-leave
  - Small clock text, icon-only stop button, matched button sizing

**Not yet built:**
- Wiring the interactive prototype's JS logic into the actual `public/game-tracker.html` file in the repo (currently that file has a mostly static/placeholder player list — the interactive version lives outside the committed project)
- Home screen game list is functional (reads from Storage) but needs the "view completed game" flow wired to Analytics
- Staging (bulk substitution) modal — designed conceptually, not implemented in code
- Analytics chart — placeholder only, no real chart yet
- Clock logic — pause/resume/increment timer functionality not yet implemented (currently static display)
- Half/game-end flow — advancing from Half 1 → Half 2 → Game End, and the "End Game?" vs "End Half?" text swap based on which half you're in
- Firebase/cloud sync — not started; local storage only right now
- Team roster setup/import flow — no UI yet for entering the full team roster before a season starts

## Immediate Next Step

The most direct next task: take the interactive prototype's behavior (position cycling/dropdown, field count enforcement, auto position transfer, header button styling) and implement it in `public/game-tracker.html` + `src/js/app.js`, replacing the static placeholder, so the committed project in the repo actually works end-to-end rather than living only in a separate prototype.
