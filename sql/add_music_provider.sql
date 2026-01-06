-- Migration: Add music_provider column to songs table
-- This column tracks which music generation provider (suno, sunoapi, goapi_udio, etc.) created the song

-- Add the music_provider column
ALTER TABLE songs ADD COLUMN music_provider VARCHAR(50) NULL;

-- Add index for filtering by provider
CREATE INDEX ix_songs_music_provider ON songs(music_provider);

-- Rollback:
-- DROP INDEX ix_songs_music_provider ON songs;
-- ALTER TABLE songs DROP COLUMN music_provider;
