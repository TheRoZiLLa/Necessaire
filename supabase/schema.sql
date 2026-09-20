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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_questions_mock_id ON questions(mock_id);
CREATE INDEX IF NOT EXISTS idx_questions_number ON questions(mock_id, question_number);

-- Row Level Security (RLS)
ALTER TABLE mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow public read & insert for MVP (No authentication requirement)
CREATE POLICY "Allow public read on mocks"
  ON mocks FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert on mocks"
  ON mocks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read on questions"
  ON questions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert on questions"
  ON questions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
