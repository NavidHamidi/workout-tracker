export interface Workout {
  id: string;
  user_id: string;
  date: string; // ISO date string
  exercice: string;
  serie: number;
  poids: number | null;
  repetitions: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutInput {
  date: string;
  exercice: string;
  serie: number;
  poids: number | null;
  repetitions: number | null;
  notes: string | null;
}

export interface ParsedWorkout {
  date: string;
  exercises: ParsedExercise[];
}

export interface ParsedExercise {
  exercice: string;
  series: ParsedSerie[];
}

export interface ParsedSerie {
  serie: number;
  poids: number | null;
  repetitions: number | null;
  notes: string | null;
}

export interface WorkoutStats {
  exercice: string;
  sessions_count: number;
  max_poids: number;
  avg_poids: number;
  max_reps: number;
  first_session: string;
  last_session: string;
}

export interface ExerciseProgress {
  date: string;
  exercice: string;
  max_poids: number;
  total_reps: number;
  volume: number; // poids × reps
}

export interface DashboardData {
  totalWorkouts: number;
  totalExercises: number;
  currentStreak: number;
  recentWorkouts: Workout[];
  topExercises: {
    exercice: string;
    count: number;
  }[];
}