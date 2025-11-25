-- Users table (original style)
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

-- Songs table (original style)
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

-- Queue items table (original style)
CREATE TABLE IF NOT EXISTS queue_items (
  id SERIAL PRIMARY KEY,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  added_by VARCHAR(255),
  added_at TIMESTAMP DEFAULT NOW()
);

-- Index (original)
CREATE INDEX IF NOT EXISTS idx_queue_items_added_at ON queue_items(added_at);

-- Voting table added in same style
CREATE TABLE IF NOT EXISTS vote_skip (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, song_id)
);

-- Indexes for faster queries on vote_skip
CREATE INDEX IF NOT EXISTS idx_vote_skip_user ON vote_skip(user_id);
CREATE INDEX IF NOT EXISTS idx_vote_skip_song ON vote_skip(song_id);
