# public-music-queue

Music discovery today happens in algorithmic bubbles or private friend groups. This project creates one completely open music queue where anyone can contribute songs and discover music together.

## Structure

```
public-music-queue/
├── server/              # Express + Socket.io backend
│   ├── src/
│   │   ├── config/      # Database config
│   │   ├── controllers/ # HTTP handlers
│   │   ├── models/      # Database models
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── websocket/   # Socket.io handlers
│   └── server.js
│
├── client/              # React + Three.js frontend
│   └── src/
│       ├── components/  # React components
│       └── hooks/       # Custom hooks
│
└── shared/              # Shared constants
    └── constants/
```

## Setup

### Backend
```bash
cd server
npm init -y
npm install express socket.io dotenv cors pg
npm install --save-dev nodemon
```

### Frontend
```bash
cd client
npm create vite@latest . -- --template react
npm install socket.io-client three @react-three/fiber @react-three/drei
```

### Environment
```bash
# Create server/.env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/musicqueue
CLIENT_URL=http://localhost:5173
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

## Tech Stack

**Backend:** Node.js, Express, Socket.io, PostgreSQL  
**Frontend:** React, Three.js
