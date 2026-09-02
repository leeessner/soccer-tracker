/**
 * Local Storage Management for Soccer Tracker
 * Handles saving and retrieving game data from browser local storage
 */

const Storage = {
  // Keys
  GAMES_KEY: 'soccer_tracker_games',
  CURRENT_GAME_KEY: 'soccer_tracker_current_game',
  TEAMS_KEY: 'soccer_tracker_teams',

  /**
   * Save a game to local storage
   * @param {Object} game - Game object with opponent, date, players, etc.
   */
  saveGame(game) {
    try {
      const games = this.getAllGames();
      game.id = game.id || Date.now().toString();
      game.savedAt = new Date().toISOString();

      const existingIndex = games.findIndex(g => g.id === game.id);
      if (existingIndex >= 0) {
        games[existingIndex] = game;
      } else {
        games.push(game);
      }

      localStorage.setItem(this.GAMES_KEY, JSON.stringify(games));
      return game;
    } catch (err) {
      console.error('Error saving game:', err);
      return null;
    }
  },

  /**
   * Get all saved games
   * @returns {Array} Array of game objects
   */
  getAllGames() {
    try {
      const games = localStorage.getItem(this.GAMES_KEY);
      return games ? JSON.parse(games) : [];
    } catch (err) {
      console.error('Error retrieving games:', err);
      return [];
    }
  },

  /**
   * Get a specific game by ID
   * @param {string} gameId - The game ID
   * @returns {Object|null} Game object or null
   */
  getGame(gameId) {
    try {
      const games = this.getAllGames();
      return games.find(g => g.id === gameId) || null;
    } catch (err) {
      console.error('Error retrieving game:', err);
      return null;
    }
  },

  /**
   * Delete a game
   * @param {string} gameId - The game ID to delete
   */
  deleteGame(gameId) {
    try {
      const games = this.getAllGames();
      const filtered = games.filter(g => g.id !== gameId);
      localStorage.setItem(this.GAMES_KEY, JSON.stringify(filtered));
      return true;
    } catch (err) {
      console.error('Error deleting game:', err);
      return false;
    }
  },

  /**
   * Save current game in progress
   * @param {Object} game - Current game object
   */
  setCurrentGame(game) {
    try {
      localStorage.setItem(this.CURRENT_GAME_KEY, JSON.stringify(game));
      return true;
    } catch (err) {
      console.error('Error saving current game:', err);
      return false;
    }
  },

  /**
   * Get current game in progress
   * @returns {Object|null} Current game object or null
   */
  getCurrentGame() {
    try {
      const game = localStorage.getItem(this.CURRENT_GAME_KEY);
      return game ? JSON.parse(game) : null;
    } catch (err) {
      console.error('Error retrieving current game:', err);
      return null;
    }
  },

  /**
   * Clear current game
   */
  clearCurrentGame() {
    try {
      localStorage.removeItem(this.CURRENT_GAME_KEY);
      return true;
    } catch (err) {
      console.error('Error clearing current game:', err);
      return false;
    }
  },

  /**
   * Get all teams (for saving team rosters)
   * @returns {Array} Array of team objects
   */
  getAllTeams() {
    try {
      const teams = localStorage.getItem(this.TEAMS_KEY);
      return teams ? JSON.parse(teams) : [];
    } catch (err) {
      console.error('Error retrieving teams:', err);
      return [];
    }
  },

  /**
   * Save a team roster
   * @param {Object} team - Team object with name and players
   */
  saveTeam(team) {
    try {
      const teams = this.getAllTeams();
      team.id = team.id || Date.now().toString();

      const existingIndex = teams.findIndex(t => t.id === team.id);
      if (existingIndex >= 0) {
        teams[existingIndex] = team;
      } else {
        teams.push(team);
      }

      localStorage.setItem(this.TEAMS_KEY, JSON.stringify(teams));
      return team;
    } catch (err) {
      console.error('Error saving team:', err);
      return null;
    }
  },

  /**
   * Delete all data (for testing/reset)
   */
  clearAllData() {
    try {
      localStorage.removeItem(this.GAMES_KEY);
      localStorage.removeItem(this.CURRENT_GAME_KEY);
      localStorage.removeItem(this.TEAMS_KEY);
      return true;
    } catch (err) {
      console.error('Error clearing data:', err);
      return false;
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
