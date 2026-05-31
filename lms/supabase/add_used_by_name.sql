-- Migration: add used_by_name column to all code tables
-- Run this once in Supabase SQL Editor

ALTER TABLE teacher_invitation_codes  ADD COLUMN IF NOT EXISTS used_by_name text;
ALTER TABLE student_invitation_codes  ADD COLUMN IF NOT EXISTS used_by_name text;
ALTER TABLE assessment_codes          ADD COLUMN IF NOT EXISTS used_by_name text;
