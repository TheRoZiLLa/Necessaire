-- Nécessaire - Supabase Database Schema
-- Run this script in the Supabase SQL Editor to set up the tables.

-- Enable pgcrypto / uuid-ossp for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Mocks Table
CREATE TABLE IF NOT EXISTS mocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id UUID NOT NULL REFERENCES mocks(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(8) UNIQUE NOT NULL,
  mock_id UUID NOT NULL REFERENCES mocks(id) ON DELETE CASCADE,
  host_id UUID,
  current_question INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'LOBBY' NOT NULL CHECK (status IN ('LOBBY', 'ANSWERING', 'DISCUSSION', 'CHANGING', 'REVEAL', 'FINISHED')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Players Table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_room_nickname UNIQUE(room_id, nickname)
);

-- 5. Answers Table
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  initial_answer VARCHAR(1) CHECK (initial_answer IN ('A', 'B', 'C', 'D')),
  final_answer VARCHAR(1) CHECK (final_answer IN ('A', 'B', 'C', 'D')),
  locked BOOLEAN DEFAULT false NOT NULL,
  final_locked BOOLEAN DEFAULT false NOT NULL,
  is_ready BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_room_question_player UNIQUE(room_id, question_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_questions_mock_id ON questions(mock_id);
CREATE INDEX IF NOT EXISTS idx_questions_number ON questions(mock_id, question_number);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_answers_room_q ON answers(room_id, question_id);
CREATE INDEX IF NOT EXISTS idx_answers_player ON answers(player_id);

-- Row Level Security (RLS)
ALTER TABLE mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Allow public read & write for MVP (No authentication requirement)
CREATE POLICY "Allow public read on mocks" ON mocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on mocks" ON mocks FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public read on questions" ON questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on questions" ON questions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public all on rooms" ON rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on players" ON players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on answers" ON answers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for rooms, players, and answers
ALTER PUBLICATION supabase_realtime ADD TABLE rooms, players, answers;
