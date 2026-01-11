// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';
import { WorkoutForm } from '@/components/workout-form';
import { ExerciseTable } from '@/components/exercice-table';
import { ProgressChart } from '@/components/progress-chart';
import { StatsCards } from '@/components/stats-cards';
import { getWorkouts, getUniqueExercises, getCurrentUser } from '@/lib/supabase/client';
import { groupWorkoutsByExercise, exportToCSV } from '@/lib/utils';
import type { Workout } from '@/types/workout';

export default function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('Not authenticated');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [workoutsData, exercisesData] = await Promise.all([
        getWorkouts(user.id),
        getUniqueExercises(user.id),
      ]);

      setWorkouts(workoutsData);
      setExercises(exercisesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportToCSV(workouts, `workouts_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exerciseGroups = groupWorkoutsByExercise(workouts);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Bienvenue sur Workout Tracker</h2>
          <p className="text-muted-foreground">Veuillez vous connecter pour continuer</p>
          {/* Add authentication UI here */}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={workouts.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Masquer' : 'Ajouter une séance'}
          </Button>
        </div>
      </div>

      {showForm && (
        <WorkoutForm
          onSuccess={() => {
            setShowForm(false);
            loadData();
          }}
        />
      )}

      <StatsCards workouts={workouts} />

      <Tabs defaultValue="tables" className="w-full">
        <TabsList>
          <TabsTrigger value="tables">Tableaux</TabsTrigger>
          <TabsTrigger value="charts">Graphiques</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-6 mt-6">
          {exercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune séance enregistrée</p>
              <p className="text-sm text-muted-foreground mt-2">
                Cliquez sur &quot;Ajouter une séance&quot; pour commencer
              </p>
            </div>
          ) : (
            exercises.map(exercice => {
              const exerciceWorkouts = exerciseGroups.get(exercice) || [];
              return (
                <ExerciseTable
                  key={exercice}
                  exercice={exercice}
                  workouts={exerciceWorkouts}
                />
              );
            })
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-6 mt-6">
          {exercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune donnée à afficher</p>
            </div>
          ) : (
            exercises.map(exercice => {
              const exerciceWorkouts = exerciseGroups.get(exercice) || [];
              if (exerciceWorkouts.length < 2) return null;
              return (
                <ProgressChart
                  key={exercice}
                  exercice={exercice}
                  workouts={exerciceWorkouts}
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}