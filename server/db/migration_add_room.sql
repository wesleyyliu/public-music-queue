-- Migration to add room support to queue_items table
-- Run this if you have an existing database

-- Add room column to queue_items
ALTER TABLE queue_items
ADD COLUMN IF NOT EXISTS room VARCHAR(100) DEFAULT 'general' NOT NULL;

-- Create indexes for room-based queries
CREATE INDEX IF NOT EXISTS idx_queue_items_room ON queue_items(room);
CREATE INDEX IF NOT EXISTS idx_queue_items_room_added_at ON queue_items(room, added_at);

-- Update any existing queue items to be in 'general' room
UPDATE queue_items SET room = 'general' WHERE room IS NULL;
