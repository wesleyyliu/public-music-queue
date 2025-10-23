-- 1. Get the current queue (ordered by play order)
SELECT *
FROM queue
WHERE status = 'queued'
ORDER BY play_order ASC, created_at ASC;

-- 2. Add a new song to the queue
INSERT INTO queue (song_id, title, artist, album_art_url, added_by, play_order)
VALUES ('abc123', 'Imagine', 'John Lennon', 'https://img.com/beatles.jpg', NULL,
  (SELECT COALESCE(MAX(play_order), 0) + 1 FROM queue))
RETURNING *;

-- 3. Mark a song as currently playing
UPDATE queue
SET status = 'playing'
WHERE id = 'YOUR-SONG-ID-HERE'
RETURNING *;

-- 4. Remove a song from the queue
DELETE FROM queue
WHERE id = 'YOUR-SONG-ID-HERE'
RETURNING *;

-- 5. Get currently playing track
SELECT *
FROM queue
WHERE status = 'playing'
ORDER BY created_at DESC
LIMIT 1;
