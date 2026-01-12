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
import { getWorkouts, getUniqueExercises } from '@/lib/supabase/client';
import { groupWorkoutsByExercise, exportToCSV } from '@/lib/utils';
import type { Workout } from '@/types/workout';
import { User } from '@supabase/supabase-js';
import { onAuthStateChange } from '@/lib/supabase/auth';
import { AuthForm } from '@/components/auth-form';
import { UserMenu } from '@/components/user-menu';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // Listen to auth changes
    const subscription = onAuthStateChange((session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadData(session.user.id);
      } else {
        setWorkouts([]);
        setExercises([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const [workoutsData, exercisesData] = await Promise.all([
        getWorkouts(userId),
        getUniqueExercises(userId),
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

  // Show auth form if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AuthForm onSuccess={() => {}} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">💪 Workout Tracker</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">💪 Workout Tracker</h1>
          <UserMenu user={user} onSignOut={() => setUser(null)} />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
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
                loadData(user.id);
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
      </main>
    </div>
  );
}