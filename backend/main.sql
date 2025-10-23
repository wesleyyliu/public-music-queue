CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "display_name" varchar,
  "email" varchar UNIQUE,
  "spotify_user_id" varchar UNIQUE,
  "spotify_access_token" varchar,
  "spotify_refresh_token" varchar,
  "spotify_token_expires_at" timestamp,
  "longitude" varchar,
  "latitude" varchar,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "active_sessions" (
  "session_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "connected_at" timestamp DEFAULT (now()),
  "last_heartbeat" timestamp
);

CREATE TABLE "queue" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "song_id" varchar NOT NULL,
  "title" varchar,
  "artist" varchar,
  "album_art_url" varchar,
  "added_by" uuid,
  "status" varchar DEFAULT 'queued',
  "created_at" timestamp DEFAULT (now()),
  "play_order" integer
);

CREATE TABLE "votes_skip" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "current_track_id" varchar,
  "user_id" uuid NOT NULL,
  "vote" int,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "playback_state" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "current_track_id" varchar,
  "playback_started_at" timestamp,
  "progress_ms" integer,
  "song_id" varchar NOT NULL,
  "title" varchar,
  "artist" varchar,
  "album_art_url" varchar,
  "is_playing" boolean DEFAULT true,
  "last_updated" timestamp DEFAULT (now())
);

CREATE UNIQUE INDEX ON "votes_skip" ("current_track_id", "user_id");

ALTER TABLE "active_sessions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "queue" ADD FOREIGN KEY ("added_by") REFERENCES "users" ("id");

ALTER TABLE "votes_skip" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
