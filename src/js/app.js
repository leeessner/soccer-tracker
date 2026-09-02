/**
 * Soccer Tracker - Main App Logic
 * Progressive Web App for tracking youth soccer player playing time
 */

const App = {
  // State
  currentGame: null,
  currentScreen: 'home',

  // Positions a player can hold, in cycle order. 'None' ('—') covers players
  // who aren't assigned a specific position, or whose position isn't known
  // in the moment — it must never block tracking.
  POSITIONS: ['Forward', 'Midfield', 'Defense', 'Goalie', 'None'],

  /**
   * Initialize the app
   */
  init() {
    console.log('Soccer Tracker initializing...');

    // Load current game if exists. This must happen synchronously and first:
    // other pages' own DOMContentLoaded listeners read App.currentGame right
    // after this one runs, and an awaited service worker registration here
    // would let them run first and see it as still null.
    this.currentGame = Storage.getCurrentGame();

    // Register service worker for offline support (fire-and-forget)
    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('/soccer-tracker/service-worker.js')
          .then(() => console.log('Service Worker registered'))
          .catch(err => console.log('Service Worker registration failed:', err));
      } catch (err) {
        console.log('Service Worker registration failed:', err);
      }
    }

    // Initialize app based on state
    if (this.currentGame) {
      // Resume current game
      this.showGameTracker();
    } else {
      // Show home screen
      this.showHomeScreen();
    }

    // Listen for online/offline events
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
  },

  /**
   * Show home screen
   */
  showHomeScreen() {
    this.currentScreen = 'home';
    console.log('Showing home screen');
    // TODO: Navigate to index.html or load home screen component
  },

  /**
   * Show game setup screen
   */
  showGameSetup() {
    this.currentScreen = 'setup';
    console.log('Showing game setup');
    // TODO: Navigate to game-setup.html or load setup component
  },

  /**
   * Start a new game
   * @param {Object} gameConfig - Game configuration (opponent, date, playersOnField, etc.)
   */
  startNewGame(gameConfig) {
    this.currentGame = {
      id: Date.now().toString(),
      opponent: gameConfig.opponent,
      dateTime: gameConfig.dateTime,
      location: gameConfig.location || '',
      playersOnField: gameConfig.playersOnField || 7,
      startedAt: new Date().toISOString(),
      players: gameConfig.players || [],
      events: [], // Track substitutions, time changes, etc.
      pendingPosition: null, // position vacated by the last sub-out, auto-assigned to the next sub-in
      stagedChanges: [], // queued bulk substitutions: { playerId, action: 'in'|'out', position? } — not applied until executeStaged()
      clock: {
        isPaused: true,
        runStartedAt: null, // epoch ms when the clock was last resumed; null while paused
        accumulatedSeconds: 0, // seconds elapsed before the current run
        currentHalf: 1,
        half1EndSeconds: null
      }
    };

    Storage.setCurrentGame(this.currentGame);
    this.showGameTracker();
  },

  /**
   * Seconds elapsed on the game clock right now (pause-aware, drift-resistant)
   * @returns {number}
   */
  getClockElapsedSeconds() {
    if (!this.currentGame) return 0;
    const clock = this.currentGame.clock;
    const running = !clock.isPaused && clock.runStartedAt
      ? (Date.now() - clock.runStartedAt) / 1000
      : 0;
    return (clock.accumulatedSeconds || 0) + running;
  },

  /**
   * Pause or resume the game clock
   * @returns {boolean} true if the clock is now running
   */
  toggleClockPause() {
    if (!this.currentGame) return false;
    const clock = this.currentGame.clock;

    if (clock.isPaused) {
      clock.runStartedAt = Date.now();
      clock.isPaused = false;
    } else {
      clock.accumulatedSeconds = this.getClockElapsedSeconds();
      clock.runStartedAt = null;
      clock.isPaused = true;
    }

    Storage.setCurrentGame(this.currentGame);
    return !clock.isPaused;
  },

  /**
   * Add elapsed stint time to a player's running totals (overall + per half)
   * @param {Object} player
   * @param {number} elapsedNow - current clock reading in seconds
   */
  _accruePlayerTime(player, elapsedNow) {
    if (player.stintStartSeconds == null) return;
    const delta = Math.max(0, elapsedNow - player.stintStartSeconds);
    player.totalSeconds = (player.totalSeconds || 0) + delta;

    if (this.currentGame.clock.currentHalf === 1) {
      player.half1Seconds = (player.half1Seconds || 0) + delta;
    } else {
      player.half2Seconds = (player.half2Seconds || 0) + delta;
    }
  },

  /**
   * Add a player to the bench (e.g. a late arrival)
   * @param {string} name
   * @returns {Object|null} the created player
   */
  addPlayer(name) {
    if (!this.currentGame || !name || !name.trim()) return null;

    const player = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      status: 'bench',
      position: 'None', // bench players don't have a position
      totalSeconds: 0,
      half1Seconds: 0,
      half2Seconds: 0,
      stintStartSeconds: null,
      benchStintStartSeconds: this.getClockElapsedSeconds()
    };

    this.currentGame.players.push(player);
    Storage.setCurrentGame(this.currentGame);
    return player;
  },

  /**
   * How long a bench player has been off the field in their CURRENT bench
   * stint (resets each time they're subbed back in). 0 for anyone not
   * currently benched.
   * @param {Object} player
   * @returns {number}
   */
  getBenchStintSeconds(player) {
    if (player.benchStintStartSeconds == null) return 0;
    return Math.max(0, this.getClockElapsedSeconds() - player.benchStintStartSeconds);
  },

  /**
   * Core "take off the field" transition, shared by direct and bulk-staged
   * substitution. Accrues stint time, clears it, and starts the bench-time
   * clock. Bench players don't have a position, so it's reset to 'None'.
   * @param {Object} player
   * @param {number} elapsedNow
   */
  _liveSubstituteOut(player, elapsedNow) {
    this._accruePlayerTime(player, elapsedNow);
    player.stintStartSeconds = null;
    player.status = 'bench';
    player.position = 'None';
    player.benchStintStartSeconds = elapsedNow;
  },

  /**
   * Core "put on the field" transition, shared by direct and bulk-staged
   * substitution. Starts a fresh stint at the given position and stops the
   * bench-time clock.
   * @param {Object} player
   * @param {number} elapsedNow
   * @param {string} position
   */
  _liveSubstituteIn(player, elapsedNow, position) {
    if (position) player.position = position;
    player.status = 'field';
    player.stintStartSeconds = elapsedNow;
    player.benchStintStartSeconds = null;
  },

  /**
   * Bench a player currently on the field
   * @param {string} playerId
   */
  substituteOut(playerId) {
    if (!this.currentGame) return false;
    const player = this.currentGame.players.find(p => p.id === playerId);
    if (!player || player.status !== 'field') return false;

    const vacatedPosition = player.position;
    this._liveSubstituteOut(player, this.getClockElapsedSeconds());
    this.currentGame.pendingPosition = vacatedPosition;

    this.recordSubstitution(playerId, null, vacatedPosition);
    Storage.setCurrentGame(this.currentGame);
    return true;
  },

  /**
   * Bring a benched player onto the field. Inherits the most recently
   * vacated position, if any, otherwise keeps their last known position.
   * @param {string} playerId
   */
  substituteIn(playerId) {
    if (!this.currentGame) return false;
    const player = this.currentGame.players.find(p => p.id === playerId);
    if (!player || player.status !== 'bench') return false;

    let position = player.position;
    if (this.currentGame.pendingPosition) {
      position = this.currentGame.pendingPosition;
      this.currentGame.pendingPosition = null;
    }
    this._liveSubstituteIn(player, this.getClockElapsedSeconds(), position);

    this.recordSubstitution(null, playerId, position);
    Storage.setCurrentGame(this.currentGame);
    return true;
  },

  /**
   * Cycle a player's position forward through POSITIONS. Only on-field
   * players have a position — bench players don't (they're always 'None').
   * @param {string} playerId
   * @returns {string|false} the new position
   */
  cyclePosition(playerId) {
    if (!this.currentGame) return false;
    const player = this.currentGame.players.find(p => p.id === playerId);
    if (!player || player.status !== 'field') return false;

    const idx = this.POSITIONS.indexOf(player.position);
    const next = this.POSITIONS[(idx + 1) % this.POSITIONS.length];
    player.position = next;

    this.updatePlayerPosition(playerId, next);
    Storage.setCurrentGame(this.currentGame);
    return next;
  },

  /**
   * Explicitly set a player's position (e.g. from a long-press menu)
   * @param {string} playerId
   * @param {string} position
   */
  setPlayerPosition(playerId, position) {
    if (!this.currentGame || !this.POSITIONS.includes(position)) return false;
    const player = this.currentGame.players.find(p => p.id === playerId);
    if (!player || player.status !== 'field') return false;

    player.position = position;
    this.updatePlayerPosition(playerId, position);
    Storage.setCurrentGame(this.currentGame);
    return true;
  },

  /**
   * End the current half. Flushes on-field stint time into the half that's
   * ending, then either advances to the second half or signals the game is over.
   * @returns {'half2'|'final'|'none'}
   */
  endHalf() {
    if (!this.currentGame) return 'none';
    const clock = this.currentGame.clock;
    const elapsed = this.getClockElapsedSeconds();

    this.currentGame.players.forEach(player => {
      if (player.status === 'field') {
        this._accruePlayerTime(player, elapsed);
        player.stintStartSeconds = elapsed;
      }
    });

    clock.accumulatedSeconds = elapsed;
    clock.runStartedAt = null;
    clock.isPaused = true;

    if (clock.currentHalf === 1) {
      clock.half1EndSeconds = elapsed;
      clock.currentHalf = 2;
      Storage.setCurrentGame(this.currentGame);
      return 'half2';
    }

    Storage.setCurrentGame(this.currentGame);
    return 'final';
  },

  /**
   * Toggle a player's staged status for bulk substitution. If a staged
   * change already exists for them, it's removed (reverting to their live
   * status). Otherwise a change is queued that flips their live status.
   * Live player state is untouched until executeStaged() runs.
   * @param {string} playerId
   */
  stageToggle(playerId) {
    if (!this.currentGame) return false;
    const player = this.currentGame.players.find(p => p.id === playerId);
    if (!player) return false;

    const existing = this.currentGame.stagedChanges.find(c => c.playerId === playerId);
    if (existing) {
      this.currentGame.stagedChanges = this.currentGame.stagedChanges.filter(c => c.playerId !== playerId);
    } else if (player.status === 'field') {
      this.currentGame.stagedChanges.push({ playerId, action: 'out' });
    } else {
      this.currentGame.stagedChanges.push({ playerId, action: 'in', position: player.position });
    }

    Storage.setCurrentGame(this.currentGame);
    return true;
  },

  /**
   * Set a player's position while staging. Only meaningful for players who
   * are effectively on the field (staged in, or live on the field and
   * untouched) — bench players don't have a position, so this is a no-op
   * for anyone effectively benched (staged out, or live bench untouched).
   * @param {string} playerId
   * @param {string} position
   */
  setStagedPosition(playerId, position) {
    if (!this.currentGame || !this.POSITIONS.includes(position)) return false;
    const player = this.currentGame.players.find(p => p.id === playerId);
    if (!player) return false;

    const entry = this.currentGame.stagedChanges.find(c => c.playerId === playerId);
    if (entry && entry.action === 'in') {
      entry.position = position;
    } else if (!entry && player.status === 'field') {
      this.currentGame.stagedChanges.push({ playerId, action: 'in', position });
    } else {
      return false;
    }

    Storage.setCurrentGame(this.currentGame);
    return true;
  },

  /**
   * Discard all staged changes without applying anything.
   */
  clearStaged() {
    if (!this.currentGame) return false;
    this.currentGame.stagedChanges = [];
    Storage.setCurrentGame(this.currentGame);
    return true;
  },

  /**
   * What the on-field count would be if staged changes were executed now.
   * @returns {number}
   */
  getStagedFieldCount() {
    if (!this.currentGame) return 0;
    let count = this.currentGame.players.filter(p => p.status === 'field').length;

    this.currentGame.stagedChanges.forEach(change => {
      const player = this.currentGame.players.find(p => p.id === change.playerId);
      if (!player) return;
      if (change.action === 'in' && player.status !== 'field') count += 1;
      if (change.action === 'out' && player.status === 'field') count -= 1;
    });

    return count;
  },

  /**
   * Apply every staged change to live player state in one pass. Refuses to
   * run unless the result is EXACTLY the configured field size — the Stage
   * workflow is how the coach commits to a specific lineup, not just a cap.
   * Does not use the single-swap position auto-inheritance (pendingPosition)
   * — positions for incoming players come from what was chosen while staging.
   * @returns {{ok: true} | {ok: false, reason: string, resultingCount?: number}}
   */
  executeStaged() {
    if (!this.currentGame) return { ok: false, reason: 'no-game' };

    const resultingCount = this.getStagedFieldCount();
    if (resultingCount !== this.currentGame.playersOnField) {
      return { ok: false, reason: 'incorrect-count', resultingCount };
    }

    const elapsed = this.getClockElapsedSeconds();
    this.currentGame.stagedChanges.forEach(change => {
      const player = this.currentGame.players.find(p => p.id === change.playerId);
      if (!player) return;

      if (change.action === 'in') {
        if (player.status === 'field') {
          // already playing — this was just a position edit, don't disturb their stint
          player.position = change.position;
          this.updatePlayerPosition(player.id, change.position);
        } else {
          this._liveSubstituteIn(player, elapsed, change.position);
          this.recordSubstitution(null, player.id, change.position);
        }
      } else if (change.action === 'out' && player.status === 'field') {
        this._liveSubstituteOut(player, elapsed);
        this.recordSubstitution(player.id, null, player.position);
      }
    });

    this.currentGame.stagedChanges = [];
    Storage.setCurrentGame(this.currentGame);
    return { ok: true };
  },

  /**
   * Show game tracker screen
   */
  showGameTracker() {
    this.currentScreen = 'tracker';
    console.log('Showing game tracker');
    // TODO: Navigate to game-tracker.html or load tracker component
  },

  /**
   * Record a player substitution
   * @param {string} playerOut - Player ID leaving the field
   * @param {string} playerIn - Player ID entering the field
   * @param {string} position - Position for incoming player
   */
  recordSubstitution(playerOut, playerIn, position) {
    if (!this.currentGame) return false;

    this.currentGame.events.push({
      type: 'substitution',
      timestamp: new Date().toISOString(),
      playerOut,
      playerIn,
      position,
      clock: this.currentGame.clock.totalSeconds
    });

    Storage.setCurrentGame(this.currentGame);
    return true;
  },

  /**
   * Update player position during game
   * @param {string} playerId - Player ID
   * @param {string} newPosition - New position
   */
  updatePlayerPosition(playerId, newPosition) {
    if (!this.currentGame) return false;

    this.currentGame.events.push({
      type: 'position_change',
      timestamp: new Date().toISOString(),
      playerId,
      newPosition,
      clock: this.currentGame.clock.totalSeconds
    });

    Storage.setCurrentGame(this.currentGame);
    return true;
  },

  /**
   * End the current game
   */
  endGame() {
    if (!this.currentGame) return false;

    const completedGame = {
      ...this.currentGame,
      clock: {
        ...this.currentGame.clock,
        totalSeconds: Math.round(this.getClockElapsedSeconds())
      },
      endedAt: new Date().toISOString(),
      status: 'completed'
    };

    Storage.saveGame(completedGame);
    Storage.clearCurrentGame();
    this.currentGame = null;
    this.showAnalytics();
    return true;
  },

  /**
   * Show post-game analytics
   */
  showAnalytics() {
    this.currentScreen = 'analytics';
    console.log('Showing analytics');
    // TODO: Navigate to analytics.html or load analytics component
  },

  /**
   * Handle coming back online
   */
  onOnline() {
    console.log('App is online');
    // TODO: Trigger sync of local data to server
    console.log('TODO: Sync local data to cloud');
  },

  /**
   * Handle going offline
   */
  onOffline() {
    console.log('App is offline - using cached data');
  },

  /**
   * Get all completed games
   * @returns {Array} Array of completed games
   */
  getCompletedGames() {
    return Storage.getAllGames();
  },

  /**
   * Get game analytics
   * @param {string} gameId - Game ID
   * @returns {Object} Analytics data
   */
  getGameAnalytics(gameId) {
    const game = Storage.getGame(gameId);
    if (!game) return null;

    // Calculate player stats from events
    const playerStats = {};

    game.players.forEach(player => {
      playerStats[player.id] = {
        name: player.name,
        position: player.position,
        totalSeconds: 0,
        events: []
      };
    });

    // Process events to calculate times
    game.events.forEach(event => {
      if (event.type === 'substitution') {
        if (playerStats[event.playerOut]) {
          playerStats[event.playerOut].events.push({
            type: 'out',
            clock: event.clock
          });
        }
        if (playerStats[event.playerIn]) {
          playerStats[event.playerIn].events.push({
            type: 'in',
            clock: event.clock,
            position: event.position
          });
        }
      }
    });

    return {
      gameId,
      opponent: game.opponent,
      dateTime: game.dateTime,
      totalDuration: game.clock.totalSeconds,
      playerStats
    };
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
