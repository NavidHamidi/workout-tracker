// lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Workout, ExerciseProgress } from '@/types/workout';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting
export function formatDate(date: string | Date, formatStr: string = 'PP'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: fr });
}

export function formatShortDate(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy');
}

export function formatLongDate(date: string | Date): string {
  return formatDate(date, 'EEEE dd MMMM yyyy');
}

// Group workouts by date
export function groupWorkoutsByDate(workouts: Workout[]): Map<string, Workout[]> {
  const grouped = new Map<string, Workout[]>();
  
  workouts.forEach(workout => {
    if (!grouped.has(workout.date)) {
      grouped.set(workout.date, []);
    }
    grouped.get(workout.date)!.push(workout);
  });
  
  return grouped;
}

// Group workouts by exercise
export function groupWorkoutsByExercise(workouts: Workout[]): Map<string, Workout[]> {
  const grouped = new Map<string, Workout[]>();
  
  workouts.forEach(workout => {
    if (!grouped.has(workout.exercice)) {
      grouped.set(workout.exercice, []);
    }
    grouped.get(workout.exercice)!.push(workout);
  });
  
  return grouped;
}

// Get unique workout dates
export function getWorkoutDates(workouts: Workout[]): string[] {
  const dates = [...new Set(workouts.map(w => w.date))];
  return dates.sort((a, b) => b.localeCompare(a)); // Most recent first
}

// Calculate exercise progress over time
export function calculateExerciseProgress(workouts: Workout[]): ExerciseProgress[] {
  const grouped = groupWorkoutsByDate(workouts);
  const progress: ExerciseProgress[] = [];
  
  grouped.forEach((dayWorkouts, date) => {
    const exerciceGroups = groupWorkoutsByExercise(dayWorkouts);
    
    exerciceGroups.forEach((exerciceWorkouts, exercice) => {
      const maxPoids = Math.max(...exerciceWorkouts
        .map(w => w.poids || 0)
        .filter(p => p > 0));
      
      const totalReps = exerciceWorkouts.reduce((sum, w) => 
        sum + (w.repetitions || 0), 0);
      
      const volume = exerciceWorkouts.reduce((sum, w) => 
        sum + ((w.poids || 0) * (w.repetitions || 0)), 0);
      
      progress.push({
        date,
        exercice,
        max_poids: maxPoids,
        total_reps: totalReps,
        volume,
      });
    });
  });
  
  return progress.sort((a, b) => a.date.localeCompare(b.date));
}

// Calculate workout streak
export function calculateWorkoutStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  const sortedDates = [...dates].sort((a, b) => b.localeCompare(a));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let currentDate = today;
  
  for (const dateStr of sortedDates) {
    const workoutDate = parseISO(dateStr);
    workoutDate.setHours(0, 0, 0, 0);
    
    const daysDiff = differenceInDays(currentDate, workoutDate);
    
    if (daysDiff === 0 || daysDiff === 1) {
      streak++;
      currentDate = workoutDate;
    } else {
      break;
    }
  }
  
  return streak;
}

// Calculate total volume for a workout
export function calculateWorkoutVolume(workouts: Workout[]): number {
  return workouts.reduce((total, w) => 
    total + ((w.poids || 0) * (w.repetitions || 0)), 0);
}

// Get personal records for an exercise
export function getPersonalRecords(workouts: Workout[]) {
  const maxWeight = Math.max(...workouts
    .map(w => w.poids || 0)
    .filter(p => p > 0));
  
  const maxReps = Math.max(...workouts
    .map(w => w.repetitions || 0));
  
  const maxVolume = Math.max(...workouts
    .map(w => (w.poids || 0) * (w.repetitions || 0)));
  
  return {
    maxWeight,
    maxReps,
    maxVolume,
  };
}

// Get exercise frequency (workouts per week)
export function getExerciseFrequency(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  
  const dates = [...new Set(workouts.map(w => w.date))];
  if (dates.length === 0) return 0;
  
  const sortedDates = dates.sort();
  const firstDate = parseISO(sortedDates[0]);
  const lastDate = parseISO(sortedDates[sortedDates.length - 1]);
  
  const daysDiff = differenceInDays(lastDate, firstDate);
  const weeks = daysDiff / 7;
  
  if (weeks === 0) return dates.length;
  
  return dates.length / weeks;
}

// Format weight display
export function formatWeight(weight: number | null): string {
  if (weight === null) return '-';
  if (weight === 0) return 'Vide';
  return `${weight}kg`;
}

// Format reps display
export function formatReps(reps: number | null): string {
  if (reps === null) return '-';
  return `${reps}`;
}

// Format set display (weight × reps)
export function formatSet(poids: number | null, reps: number | null): string {
  if (poids === null && reps === null) return '-';
  if (poids === 0) return `Vide × ${formatReps(reps)}`;
  return `${formatWeight(poids)} × ${formatReps(reps)}`;
}

// Export data to CSV
export function exportToCSV(workouts: Workout[], filename: string = 'workouts.csv'): void {
  const headers = ['Date', 'Exercice', 'Série', 'Poids (kg)', 'Répétitions', 'Notes'];
  
  const rows = workouts.map(w => [
    w.date,
    w.exercice,
    w.serie.toString(),
    w.poids !== null ? w.poids.toString() : '',
    w.repetitions !== null ? w.repetitions.toString() : '',
    w.notes || '',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}