-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  email VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL,
  spotify_id VARCHAR(255),
  album VARCHAR(255),
  album_art TEXT,
  spotify_uri VARCHAR(255),
  preview_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Queue items table
CREATE TABLE IF NOT EXISTS queue_items (
  id SERIAL PRIMARY KEY,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  added_by VARCHAR(255),
  room VARCHAR(100) DEFAULT 'general' NOT NULL,
  added_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_queue_items_added_at ON queue_items(added_at);
CREATE INDEX IF NOT EXISTS idx_queue_items_room ON queue_items(room);
CREATE INDEX IF NOT EXISTS idx_queue_items_room_added_at ON queue_items(room, added_at);

-- User cooldowns table (for rate limiting song additions)
CREATE TABLE IF NOT EXISTS user_cooldowns (
  user_id VARCHAR(255) NOT NULL,
  room VARCHAR(100) NOT NULL,
  last_add_time TIMESTAMP NOT NULL,
  PRIMARY KEY (user_id, room)
);

-- Skip votes table (for voting to skip currently playing song)
CREATE TABLE IF NOT EXISTS skip_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  room VARCHAR(100) NOT NULL,
  song_spotify_id VARCHAR(255) NOT NULL,
  voted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, room, song_spotify_id)
);

-- Index for faster vote lookups by room and song
CREATE INDEX IF NOT EXISTS idx_skip_votes_room_song ON skip_votes(room, song_spotify_id);

