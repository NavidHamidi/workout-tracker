'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Workout } from '@/types/workout';
import { formatShortDate, formatSet, groupWorkoutsByDate } from '@/lib/utils';

interface ExerciseTableProps {
  exercice: string;
  workouts: Workout[];
}

export function ExerciseTable({ exercice, workouts }: ExerciseTableProps) {
  const sessionData = useMemo(() => {
    const grouped = groupWorkoutsByDate(workouts);
    const sessions: {
      date: string;
      series: Map<number, Workout>;
    }[] = [];

    grouped.forEach((dayWorkouts, date) => {
      const seriesMap = new Map<number, Workout>();
      dayWorkouts.forEach(w => {
        seriesMap.set(w.serie, w);
      });
      sessions.push({ date, series: seriesMap });
    });

    return sessions.sort((a, b) => b.date.localeCompare(a.date));
  }, [workouts]);

  const maxSeries = useMemo(() => {
    return Math.max(...workouts.map(w => w.serie));
  }, [workouts]);

  const progressIndicator = useMemo(() => {
    if (sessionData.length < 2) return null;

    const firstSession = sessionData[sessionData.length - 1];
    const lastSession = sessionData[0];

    const firstMaxWeight = Math.max(
      ...Array.from(firstSession.series.values())
        .map(w => w.poids || 0)
        .filter(p => p > 0)
    );

    const lastMaxWeight = Math.max(
      ...Array.from(lastSession.series.values())
        .map(w => w.poids || 0)
        .filter(p => p > 0)
    );

    if (lastMaxWeight > firstMaxWeight) {
      return { icon: TrendingUp, color: 'text-green-600', diff: lastMaxWeight - firstMaxWeight };
    } else if (lastMaxWeight < firstMaxWeight) {
      return { icon: TrendingDown, color: 'text-red-600', diff: firstMaxWeight - lastMaxWeight };
    }
    return { icon: Minus, color: 'text-gray-600', diff: 0 };
  }, [sessionData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{exercice}</CardTitle>
          {progressIndicator && (
            <div className={`flex items-center gap-1 ${progressIndicator.color}`}>
              <progressIndicator.icon className="h-4 w-4" />
              {progressIndicator.diff > 0 && (
                <span className="text-sm font-medium">+{progressIndicator.diff}kg</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Date</TableHead>
                {Array.from({ length: maxSeries }, (_, i) => (
                  <TableHead key={i}>Série {i + 1}</TableHead>
                ))}
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionData.map((session, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    {formatShortDate(session.date)}
                  </TableCell>
                  {Array.from({ length: maxSeries }, (_, i) => {
                    const serie = session.series.get(i + 1);
                    return (
                      <TableCell key={i}>
                        {serie ? formatSet(serie.poids, serie.repetitions) : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-sm text-muted-foreground">
                    {Array.from(session.series.values())
                      .map(s => s.notes)
                      .filter(Boolean)
                      .join(', ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}