/**
 * Soccer Tracker - Main App Logic
 * Progressive Web App for tracking youth soccer player playing time
 */

const App = {
  // State
  currentGame: null,
  currentScreen: 'home',

  /**
   * Initialize the app
   */
  async init() {
    console.log('Soccer Tracker initializing...');

    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/soccer-tracker/service-worker.js');
        console.log('Service Worker registered');
      } catch (err) {
        console.log('Service Worker registration failed:', err);
      }
    }

    // Load current game if exists
    this.currentGame = Storage.getCurrentGame();

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
      playersOnField: gameConfig.playersOnField || 7,
      startedAt: new Date().toISOString(),
      players: gameConfig.players || [],
      events: [], // Track substitutions, time changes, etc.
      clock: {
        totalSeconds: 0,
        isPaused: true,
        currentHalf: 1
      }
    };

    Storage.setCurrentGame(this.currentGame);
    this.showGameTracker();
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
