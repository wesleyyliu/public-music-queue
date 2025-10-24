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
  created_at TIMESTAMP DEFAULT NOW()
);

-- Queue items table
CREATE TABLE IF NOT EXISTS queue_items (
  id SERIAL PRIMARY KEY,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  added_by VARCHAR(255),
  added_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_queue_items_added_at ON queue_items(added_at);

