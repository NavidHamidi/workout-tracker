// components/StatsCards.tsx
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, TrendingUp, Calendar, Trophy } from 'lucide-react';
import type { Workout } from '@/types/workout';
import { calculateWorkoutStreak, getWorkoutDates } from '@/lib/utils';

interface StatsCardsProps {
  workouts: Workout[];
}

export function StatsCards({ workouts }: StatsCardsProps) {
  const stats = useMemo(() => {
    const dates = getWorkoutDates(workouts);
    const uniqueExercises = [...new Set(workouts.map(w => w.exercice))];
    const totalSessions = dates.length;
    const streak = calculateWorkoutStreak(dates);

    const totalVolume = workouts.reduce((sum, w) => 
      sum + ((w.poids || 0) * (w.repetitions || 0)), 0
    );

    const topExercise = workouts.reduce((acc, w) => {
      acc[w.exercice] = (acc[w.exercice] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostFrequent = Object.entries(topExercise)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalSessions,
      uniqueExercises: uniqueExercises.length,
      streak,
      totalVolume: Math.round(totalVolume),
      topExercise: mostFrequent ? mostFrequent[0] : 'N/A',
    };
  }, [workouts]);

  const cards = [
    {
      title: 'Total séances',
      value: stats.totalSessions,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Exercices différents',
      value: stats.uniqueExercises,
      icon: Dumbbell,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Série actuelle',
      value: `${stats.streak} jour${stats.streak > 1 ? 's' : ''}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Volume total',
      value: `${stats.totalVolume.toLocaleString()} kg`,
      icon: Trophy,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => (
        <Card key={idx}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}