# public-music-queue

Music discovery today happens in algorithmic bubbles or private friend groups. This project creates one completely open music queue where anyone can contribute songs and discover music together.

## Features

- **Multiple Genre Rooms** - Join different rooms based on music preferences (Rock, Pop, Hip-Hop, Electronic, Jazz, Classical, Country, or General)
- **Real-time Synchronization** - Queue updates and playback state sync across all users in the same room via WebSockets
- **Spotify Integration** - Search Spotify's catalog and add songs to your room's queue
- **Independent Playback** - Each room has its own queue and playback state
- **Auto-progression** - Songs automatically advance when they finish
- **Collaborative Queueing** - Multiple users can add songs to the same room's queue

📖 **[Learn more about the Rooms feature →](ROOMS_FEATURE.md)**

## Structure

```
public-music-queue/
├── server/
│   ├── db/
│   │   └── schema.sql              # Database schema
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js         # PostgreSQL connection pool
│   │   ├── models/
│   │   │   ├── Song.js             # Song model (with Spotify metadata)
│   │   │   ├── QueueItem.js        # Queue model
│   │   │   └── User.js             # User model
│   │   ├── services/
│   │   │   ├── queueService.js           # Queue business logic
│   │   │   ├── spotifyService.js         # Spotify API integration
│   │   │   └── playbackStateManager.js   # Playback state management
│   │   ├── controllers/
│   │   │   ├── authController.js   # Spotify OAuth handlers
│   │   │   └── userController.js   # User-related handlers
│   │   ├── routes/
│   │   │   ├── auth.js             # Auth endpoints
│   │   │   ├── spotify.js          # Spotify search endpoint
│   │   │   ├── queue.js            # Queue REST API
│   │   │   ├── users.js            # User endpoints
│   │   │   └── index.js            # Route registration
│   │   ├── websocket/
│   │   │   └── index.js            # Socket.io real-time handlers
│   │   └── app.js                  # Express app setup
│   ├── server.js                   # Entry point
│   └── DATABASE_SETUP.md           # Database setup guide
│
├── client/
│   └── src/
│       ├── App.jsx                 # Main component with queue display
│       ├── SearchSongs.jsx         # Search UI component
│       ├── MusicPlayer.jsx         # Spotify web player
│       ├── Scene.jsx               # Three.js 3D Main Scene
│       ├── UIOverlay.jsx           # 2D UI Elements
│       └── Toast.jsx               # Toast notification component
│
└── shared/
    └── constants/
        └── events.js               # WebSocket event names
```

## Setup

### 1. Backend Dependencies

```bash
cd server
npm init -y
npm install express socket.io dotenv cors pg express-session
npm install --save-dev nodemon
```

### 2. Frontend Dependencies

```bash
cd client
npm create vite@latest . -- --template react
npm install socket.io-client
# Optional for 3D features later:
# npm install three @react-three/fiber @react-three/drei
```

### 3. Database Setup

**Create PostgreSQL database:**

```bash
psql postgres
```

```sql
CREATE DATABASE musicqueue;
\q
```

**Run migrations:**

```bash
cd server
psql -d musicqueue -f db/schema.sql
```

**Verify tables:**

```bash
psql -d musicqueue -c "\dt"
```

You should see: `users`, `songs`, `queue_items`

### 4. Environment Variables

Create `server/.env`:

```bash
PORT=3001
DATABASE_URL=postgresql://your_username@localhost:5432/musicqueue
CLIENT_URL=http://localhost:5173

# Spotify OAuth (get from https://developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/auth/callback

# Session Secret (generate with command below)
SESSION_SECRET=your_generated_secret_here
```

**Generate a secure session secret:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Replace `your_username` with your PostgreSQL username. If you have a password:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/musicqueue
```

### 5. Run the Application

**Terminal 1 - Start backend:**

```bash
cd server
node server.js
```

**Terminal 2 - Start frontend:**

```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

**Test it:** Open multiple browser tabs to see real-time synchronization!

## Tech Stack

**Backend:** Node.js, Express, Socket.io, PostgreSQL, express-session  
**Frontend:** React, Vite  
**Real-time:** WebSockets (Socket.io)  
**Auth:** Spotify OAuth 2.0, session-based authentication
