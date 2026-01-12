// app/api/parse-workout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { parseWorkoutText, validateWorkouts } from '@/lib/parser';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: text is required' },
        { status: 400 }
      );
    }

    const workouts = await parseWorkoutText(text);
    const validation = validateWorkouts(workouts);

    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Parsing errors',
          details: validation.errors.join(', '),
          workouts: [] // Retourner quand même ce qui a été parsé
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      workouts,
      count: workouts.length 
    });
  } catch (error) {
    console.error('Error parsing workout:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to parse workout text',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}