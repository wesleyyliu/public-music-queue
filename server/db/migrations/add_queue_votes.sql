-- Queue votes table (for upvoting/downvoting songs in the queue)
CREATE TABLE IF NOT EXISTS queue_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  room VARCHAR(100) NOT NULL,
  queue_item_id INTEGER NOT NULL REFERENCES queue_items(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  voted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, room, queue_item_id)
);

-- Index for faster vote lookups by room and queue item
CREATE INDEX IF NOT EXISTS idx_queue_votes_room_item ON queue_votes(room, queue_item_id);

-- Add position tracking to queue_items for billboard-style rankings
ALTER TABLE queue_items
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_position INTEGER DEFAULT 0;
