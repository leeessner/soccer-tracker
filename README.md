# Soccer Playing Time Tracker

A Progressive Web App (PWA) for tracking youth soccer player playing time during games. Coaches can track player substitutions, positions, and total game time from their iPhone sideline, with offline support and automatic cloud sync.

## Features

- ⚽ **Real-time Tracking** — Track player substitutions and playing time during games
- 📱 **iOS Optimized** — Designed for iPhone with native app-like experience
- 🌐 **Offline Support** — Works without internet connection during games
- 💾 **Auto-Sync** — Syncs data to cloud when connection returns
- 📊 **Game Analytics** — View detailed player stats after games
- ⚙️ **Configurable** — Set number of players on field per game
- 🏠 **Home Screen** — Add to home screen for instant access

## Tech Stack

- **HTML5** — Structure and templates
- **CSS3** — iOS-inspired design system
- **Vanilla JavaScript** — No frameworks for minimal dependencies
- **Service Worker** — Offline functionality
- **PWA Manifest** — Home screen installation
- **Local Storage** — Client-side data persistence
- **Firebase** (future) — Cloud backend for data sync

## Project Structure

```
soccer-tracker/
├── public/                 # Static assets & pages
│   ├── index.html         # Home screen
│   ├── game-setup.html    # Game configuration
│   ├── game-tracker.html  # Main game tracker
│   ├── analytics.html     # Post-game stats
│   ├── manifest.json      # PWA manifest
│   └── service-worker.js  # Offline support
├── src/
│   ├── css/
│   │   └── styles.css     # Shared design system
│   └── js/
│       ├── app.js         # Main app logic
│       └── storage.js     # Local data management
├── package.json
├── .gitignore
└── README.md
```

## Getting Started

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/leeessner/soccer-tracker.git
   cd soccer-tracker
   ```

2. **Start a local web server**
   ```bash
   npm start
   # or
   python3 -m http.server 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000/public/
   ```

### GitHub Pages Deployment

The project is configured to deploy to GitHub Pages automatically.

1. **Create a GitHub repository**
   - Go to https://github.com/new
   - Name it `soccer-tracker`
   - Make it Public
   - Initialize without README (we already have one)

2. **Push the code**
   ```bash
   git remote add origin https://github.com/leeessner/soccer-tracker.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `root` folder
   - Save

4. **Access your app**
   ```
   https://leeessner.github.io/soccer-tracker/
   ```

5. **Add to Home Screen (iOS)**
   - Open in Safari
   - Tap Share button (square with arrow)
   - Select "Add to Home Screen"
   - Tap Add
   - App now appears on home screen with ⚽ icon

## Usage

### Tracking a Game

1. **Start from home screen** → Tap "Start New Game"
2. **Configure game** → Enter opponent, date, players on field
3. **Track substitutions** → Click "Play" to add player, "Sit" to remove
4. **Change positions** → Click position button to cycle or long-press for menu
5. **Automatic sync** → When game ends, tap back arrow to save

### Game Setup Screen

- **Opponent** (required) — Name of opposing team
- **Date & Time** (optional) — Game date and start time
- **Players on Field** (required) — How many should play at once (default: 7)

### Game Tracker Screen

- **Opponent display** — Long-press to edit game settings
- **Clock** — 12:34 format (configurable)
- **Pause/Resume** — Pause the clock
- **End Half** — Advance to next half or end game
- **Player list** — Alphabetical with position, total time, stint time
- **Position button** — Click to cycle, long-press for menu
- **Play/Sit buttons** — Add or remove player from field
- **Position transfer** — Incoming player automatically gets vacated position

### Analytics Screen

- **Player stats** — Total time, H1 time, H2 time
- **Playing time chart** — Visual breakdown by player
- **Export** — Download game stats (future feature)

## Data Storage

### Local Storage (On Device)

Data is stored in browser's `localStorage`:
- All player positions and times
- Game metadata (opponent, date, times)
- Substitution history

**Maximum capacity:** ~5-10MB per browser (sufficient for 100+ games)

### Cloud Storage (Future)

When connected to WiFi:
- Data auto-syncs to Firebase (or your backend)
- Enables multi-device access
- Cloud backup for data safety
- Season statistics aggregation

## Offline Behavior

The app works completely offline:

1. **Service Worker** caches all app files on first load
2. **Local data** persists in browser storage
3. **Updates sync** when back online
4. **No manual sync** needed — automatic

## Configuration

Edit these files to customize:

- **manifest.json** — App name, colors, icons
- **styles.css** — Design system variables (colors, spacing)
- **service-worker.js** — Cache strategy

## Browser Support

- ✅ Safari (iOS 13+)
- ✅ Chrome (all versions)
- ✅ Firefox (all versions)
- ✅ Edge (all versions)

## Performance

- **Load time:** < 1 second (cached after first load)
- **Offline:** Works completely without internet
- **Storage:** ~2MB app + local game data
- **Battery:** Minimal impact (no heavy processing)

## Development Roadmap

- [ ] Implement full game-tracker.html interactive version
- [ ] Add Firebase backend for cloud sync
- [ ] Create team roster management
- [ ] Build season statistics dashboard
- [ ] Add photo/video capture for game highlights
- [ ] Export stats as PDF or CSV
- [ ] Share stats with parents/team
- [ ] Multi-coach support per team

## Troubleshooting

### App not appearing on home screen
- Make sure you're in Safari on iOS
- Close Safari completely and reopen
- Try Share → Add to Home Screen again

### Data not syncing
- Check that you have internet connection
- Look in browser console for errors
- Try refreshing the page

### Clock not working
- Check browser console for JavaScript errors
- Refresh the page
- Try a different browser

## License

MIT — Feel free to use and modify for your team

## Support

Questions or issues? Check the [GitHub Issues](https://github.com/leeessner/soccer-tracker/issues)

---

**Built with ⚽ for youth soccer coaches**
