'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Workout } from '@/types/workout';
import { formatShortDate, groupWorkoutsByDate } from '@/lib/utils';

interface ProgressChartProps {
  exercice: string;
  workouts: Workout[];
}

export function ProgressChart({ exercice, workouts }: ProgressChartProps) {
  const chartData = useMemo(() => {
    const grouped = groupWorkoutsByDate(workouts);
    const data: {
      date: string;
      dateFormatted: string;
      maxPoids: number;
      avgPoids: number;
      totalVolume: number;
    }[] = [];

    grouped.forEach((dayWorkouts, date) => {
      const validPoids = dayWorkouts
        .map(w => w.poids)
        .filter((p): p is number => p !== null && p > 0);

      const maxPoids = validPoids.length > 0 ? Math.max(...validPoids) : 0;
      const avgPoids = validPoids.length > 0 
        ? validPoids.reduce((sum, p) => sum + p, 0) / validPoids.length 
        : 0;

      const totalVolume = dayWorkouts.reduce((sum, w) => 
        sum + ((w.poids || 0) * (w.repetitions || 0)), 0
      );

      data.push({
        date,
        dateFormatted: formatShortDate(date),
        maxPoids: Math.round(maxPoids * 10) / 10,
        avgPoids: Math.round(avgPoids * 10) / 10,
        totalVolume,
      });
    });

    return data.sort((a, b) => a.date.localeCompare(b.date));
  }, [workouts]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progression - {exercice}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Pas assez de données pour afficher un graphique</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression - {exercice}</CardTitle>
        <CardDescription>
          Évolution du poids maximum et du volume total
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="dateFormatted" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12 }}
              label={{ value: 'Poids (kg)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              label={{ value: 'Volume (kg)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="maxPoids" 
              stroke="#2563eb" 
              strokeWidth={2}
              name="Poids max"
              dot={{ r: 4 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="totalVolume" 
              stroke="#16a34a" 
              strokeWidth={2}
              name="Volume total"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}