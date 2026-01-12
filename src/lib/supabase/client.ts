import { Workout, WorkoutInput } from '@/types/workout';
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anonKey)

const workoutTable = 'wt_workouts';

export async function getWorkouts(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from(workoutTable)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('exercice', { ascending: true })
    .order('serie', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getWorkoutsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from(workoutTable)
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('exercice', { ascending: true })
    .order('serie', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getWorkoutsByExercise(
  userId: string,
  exercice: string
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from(workoutTable)
    .select('*')
    .eq('user_id', userId)
    .eq('exercice', exercice)
    .order('date', { ascending: false })
    .order('serie', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createWorkout(
  userId: string,
  workout: WorkoutInput
): Promise<Workout> {
  const { data, error } = await supabase
    .from(workoutTable)
    .insert({
      user_id: userId,
      ...workout,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createWorkouts(
  userId: string,
  workouts: WorkoutInput[]
): Promise<Workout[]> {
  const workoutsWithUserId = workouts.map(w => ({
    user_id: userId,
    ...w,
  }));

  const { data, error } = await supabase
    .from(workoutTable)
    .insert(workoutsWithUserId)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateWorkout(
  id: string,
  updates: Partial<WorkoutInput>
): Promise<Workout> {
  const { data, error } = await supabase
    .from(workoutTable)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase
    .from(workoutTable)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteWorkoutsByDate(
  userId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from(workoutTable)
    .delete()
    .eq('user_id', userId)
    .eq('date', date);

  if (error) throw error;
}

// Statistics queries

export async function getUniqueExercises(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(workoutTable)
    .select('exercice')
    .eq('user_id', userId);

  if (error) throw error;
  
  const unique = [...new Set(data?.map(d => d.exercice) || [])];
  return unique.sort();
}

export async function getWorkoutDates(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(workoutTable)
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  
  const unique = [...new Set(data?.map(d => d.date) || [])];
  return unique;
}

export async function getExerciseStats(userId: string, exercice: string) {
  const { data, error } = await supabase
    .from(workoutTable)
    .select('date, poids, repetitions')
    .eq('user_id', userId)
    .eq('exercice', exercice)
    .not('poids', 'is', null)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

