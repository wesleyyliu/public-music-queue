-- Migration to add user_cooldowns table
-- Run this migration to add cooldown functionality to existing databases

CREATE TABLE IF NOT EXISTS user_cooldowns (
  user_id VARCHAR(255) NOT NULL,
  room VARCHAR(100) NOT NULL,
  last_add_time TIMESTAMP NOT NULL,
  PRIMARY KEY (user_id, room)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_cooldowns_lookup ON user_cooldowns(user_id, room);
