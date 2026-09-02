# Restoring the Staging (Bulk Substitution) Flow

This covers one specific feature that existed in the earlier design/prototype work but is missing from the current Claude Code build: the **Staging flow** for bulk player substitutions on the Game Tracker screen. Give this doc to Claude Code so it can rebuild it consistently with how it worked before.

## Why This Exists

The Game Tracker supports two substitution modes:

1. **Direct click-to-swap** (already working) — tap "Sit" on one player, tap "Play" on another, one substitution happens immediately. Includes automatic position transfer: the incoming player inherits the position of whoever was just sat.
2. **Staging (bulk mode)** — for making several substitutions at once, e.g. swapping an entire line at halftime, instead of doing them one at a time. This is the piece that got lost.

## Footer Behavior (Game Tracker screen)

The footer area has **two mutually exclusive states**:

**State A — Default (no staged changes):**
- A single full-width "Stage" button (outlined blue, white background)
- Tapping it opens the Staging modal

**State B — Staged changes pending:**
- The "Stage" button is replaced by a **staged-changes card** showing:
  - Label: "Staged: N" (N = number of staged substitutions)
  - A "Clear" button — discards all staged changes, returns to State A
  - An "Execute" button — applies all staged substitutions at once, then returns to State A

Only one of these two states is ever visible at a time — never both.

## The Staging Modal

Opened by tapping "Stage" from State A. This is a full modal overlay (not the same as the End Half confirmation modal) that shows the **entire roster** — both on-field and bench players — so the coach can queue multiple changes before committing any of them.

For each player row in the modal:
- Player name
- Current position (with the same click-to-cycle / long-press-for-dropdown behavior as the main Game Tracker list, if the player is being staged in)
- A "Play" or "Sit" toggle button reflecting the player's *staged* status, not their current live status — i.e., tapping "Play" on a bench player marks them as staged-to-enter without actually substituting them yet

Closing/confirming the modal returns to the Game Tracker with the footer now in **State B**, showing the count of staged changes.

## Data Model Addition Needed

The current `Storage`/game state only tracks live player status (`playing: true/false`, `position`). Staging needs a separate, temporary layer that doesn't touch live state until executed:

```js
stagedChanges: [
  { playerId, action: 'in' | 'out', position /* if action is 'in' */ }
]
```

- Adding a staged change does **not** modify `players[].playing` or `players[].position` yet
- "Clear" simply empties `stagedChanges` with no other side effects
- "Execute" applies every staged change to the live player list in one pass, respecting the same rules already implemented for direct substitution:
  - The **field count limit** (default 7, configurable) must still be enforced — Execute should not be allowed to push the on-field count above the configured max. If the staged set would violate this, either block Execute with a message, or only allow staging a balanced set of in/out changes (this is a decision Claude Code should flag back to the user rather than guess silently).
  - Bench players who end up not playing after Execute must reset to position `—` and stint time `0:00` (same data-integrity rule as everywhere else in the app).
  - Positions staged for incoming players should be respected as entered/selected in the modal — this bulk path does **not** need the automatic single-swap position inheritance (that behavior is specific to the one-at-a-time direct mode), since in bulk mode the coach is explicitly choosing each incoming player's position in the modal.

## Visual Style

Match the existing Game Tracker design system exactly — same iOS-style colors (`#007AFF` blue accent, `#1a1f36` dark text, `#8e8e93` muted gray, `#f2f2f7` light background), same modal treatment as the End Half confirmation (rounded corners, overlay dim background), same list-row structure as the main player list (position button, name, action button).

## What to Tell Claude Code

Something like:

> "The Game Tracker footer needs a Staging flow that got dropped somewhere in the build. There are two footer states: a 'Stage' button by default, and a staged-changes card ('Staged: N' with Clear/Execute buttons) once changes are queued. Tapping 'Stage' opens a modal listing the full roster where I can mark multiple players in/out and set positions for incoming players, without committing anything live. 'Execute' applies all staged changes at once and must still respect the configured players-on-field limit and the bench-reset rule (position '—', stint '0:00' for anyone not playing). See STAGING_FLOW_CONTEXT.md for the full spec — please rebuild this to match."
