-- Supabase Migration: Initial Schema
-- File: supabase/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    exercice TEXT NOT NULL,
    serie INTEGER NOT NULL,
    poids NUMERIC,
    repetitions INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_date ON workouts(date DESC);
CREATE INDEX idx_workouts_exercice ON workouts(exercice);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date DESC);
CREATE INDEX idx_workouts_user_exercice ON workouts(user_id, exercice);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_workouts_updated_at 
    BEFORE UPDATE ON workouts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view their own workouts
CREATE POLICY "Users can view own workouts"
    ON workouts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own workouts
CREATE POLICY "Users can insert own workouts"
    ON workouts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workouts
CREATE POLICY "Users can update own workouts"
    ON workouts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workouts
CREATE POLICY "Users can delete own workouts"
    ON workouts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create view for workout statistics
CREATE OR REPLACE VIEW workout_stats AS
SELECT 
    user_id,
    exercice,
    COUNT(DISTINCT date) as sessions_count,
    MAX(poids) as max_poids,
    AVG(poids) as avg_poids,
    MAX(repetitions) as max_reps,
    MIN(date) as first_session,
    MAX(date) as last_session
FROM workouts
WHERE poids IS NOT NULL
GROUP BY user_id, exercice;

-- Create view for recent workouts
CREATE OR REPLACE VIEW recent_workouts AS
SELECT DISTINCT ON (user_id, date)
    user_id,
    date,
    COUNT(*) OVER (PARTITION BY user_id, date) as exercises_count
FROM workouts
ORDER BY user_id, date DESC;

-- Grant access to views
GRANT SELECT ON workout_stats TO authenticated;
GRANT SELECT ON recent_workouts TO authenticated;

-- Insert sample data for testing (optional - remove in production)
-- Note: This will only work after you have a user_id from auth.users
/*
INSERT INTO workouts (user_id, date, exercice, serie, poids, repetitions, notes) VALUES
    ('YOUR_USER_ID_HERE', '2025-01-09', 'DC incliné', 1, 24, 6, NULL),
    ('YOUR_USER_ID_HERE', '2025-01-09', 'DC incliné', 2, 22, 11, NULL),
    ('YOUR_USER_ID_HERE', '2025-01-09', 'DC incliné', 3, 20, NULL, NULL),
    ('YOUR_USER_ID_HERE', '2025-01-09', 'Curl biceps', 1, 12, 8, NULL),
    ('YOUR_USER_ID_HERE', '2025-01-09', 'Curl biceps', 2, 12, 8, NULL),
    ('YOUR_USER_ID_HERE', '2025-01-09', 'Curl biceps', 3, 12, NULL, NULL);
*/

-- Comments for documentation
COMMENT ON TABLE workouts IS 'Stores individual workout exercise sets';
COMMENT ON COLUMN workouts.user_id IS 'Reference to auth.users - owner of the workout';
COMMENT ON COLUMN workouts.date IS 'Date of the workout session';
COMMENT ON COLUMN workouts.exercice IS 'Name of the exercise';
COMMENT ON COLUMN workouts.serie IS 'Set number (1, 2, 3, etc.)';
COMMENT ON COLUMN workouts.poids IS 'Weight in kg (nullable for bodyweight exercises)';
COMMENT ON COLUMN workouts.repetitions IS 'Number of repetitions (nullable if not completed)';
COMMENT ON COLUMN workouts.notes IS 'Additional notes (e.g., "à vide", "douleur", etc.)';