/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/claude.ts

import Anthropic from '@anthropic-ai/sdk';
import type { ParsedWorkout, WorkoutInput } from '@/types/workout';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function parseWorkoutText(text: string): Promise<WorkoutInput[]> {
  const prompt = `Tu es un expert en parsing de notes d'entraînement sportif. 
Analyse le texte suivant et extrait toutes les informations d'entraînement.

Format du texte:
- La première ligne contient la date (ex: "Séance 09/01" ou "09/01/2025")
- Ensuite, pour chaque exercice:
  * Nom de l'exercice
  * Série 1, 2, 3... avec format "1-Xkg Y" où X=poids, Y=répétitions
  * Parfois juste "1-Xkg" sans répétitions
  * Parfois "1-à vide X" pour poids de corps
  * Parfois des notes comme "douleur", "allongé", "normal", etc.

Tu dois retourner UNIQUEMENT un JSON valide (sans markdown, sans backticks) avec ce format exact:
{
  "date": "YYYY-MM-DD",
  "workouts": [
    {
      "exercice": "nom de l'exercice",
      "serie": 1,
      "poids": 24 ou null,
      "repetitions": 6 ou null,
      "notes": "texte" ou null
    }
  ]
}

Règles importantes:
1. Convertir les dates au format YYYY-MM-DD (assume 2025 si année non précisée)
2. "à vide" = poids: 0
3. Si pas de répétitions mentionnées = repetitions: null
4. Si "X" ou pas de données = poids: null, repetitions: null
5. Garder toutes les notes (ex: "douleur", "allongé", "15/15")
6. Normaliser les noms d'exercices (majuscules/minuscules)

Texte à parser:
${text}

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (remove any markdown formatting)
    let jsonText = content.text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Parse the JSON
    const parsed = JSON.parse(jsonText);

    if (!parsed.date || !Array.isArray(parsed.workouts)) {
      throw new Error('Invalid response format from Claude');
    }

    // Convert to WorkoutInput format
    const workouts: WorkoutInput[] = parsed.workouts.map((w: any) => ({
      date: parsed.date,
      exercice: w.exercice,
      serie: w.serie,
      poids: w.poids,
      repetitions: w.repetitions,
      notes: w.notes,
    }));

    return workouts;
  } catch (error) {
    console.error('Error parsing workout with Claude:', error);
    throw new Error('Failed to parse workout text');
  }
}

// Alternative: simpler regex-based parser (fallback if Claude API fails)
export function parseWorkoutTextSimple(text: string): WorkoutInput[] {
  const workouts: WorkoutInput[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  let currentDate = '';
  let currentExercice = '';
  let serieNumber = 1;

  for (const line of lines) {
    // Parse date
    const dateMatch = line.match(/(?:Séance\s+)?(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      const year = dateMatch[3] || '2025';
      currentDate = `${year}-${month}-${day}`;
      serieNumber = 1;
      continue;
    }

    // Parse serie
    const serieMatch = line.match(/^(\d+)-(.+)/);
    if (serieMatch) {
      const serie = parseInt(serieMatch[1]);
      const content = serieMatch[2].trim();

      let poids: number | null = null;
      let repetitions: number | null = null;
      let notes: string | null = null;

      // Parse "à vide"
      if (content.toLowerCase().includes('à vide') || content.toLowerCase().includes('vide')) {
        poids = 0;
        const repsMatch = content.match(/(\d+)/);
        repetitions = repsMatch ? parseInt(repsMatch[1]) : null;
        notes = 'à vide';
      }
      // Parse "Xkg Y"
      else {
        const poidsMatch = content.match(/(\d+(?:\.\d+)?)kg/i);
        if (poidsMatch) {
          poids = parseFloat(poidsMatch[1]);
        }

        const repsMatch = content.match(/kg\s+(\d+)/);
        if (repsMatch) {
          repetitions = parseInt(repsMatch[1]);
        }

        // Check for X (incomplete)
        if (content.includes('X') || content.includes('x')) {
          poids = null;
          repetitions = null;
        }

        // Extract notes
        const notePatterns = ['douleur', 'allongé', 'normal', 'arrêté'];
        for (const pattern of notePatterns) {
          if (content.toLowerCase().includes(pattern)) {
            notes = pattern;
            break;
          }
        }
      }

      workouts.push({
        date: currentDate,
        exercice: currentExercice,
        serie,
        poids,
        repetitions,
        notes,
      });

      serieNumber++;
    }
    // New exercise name
    else if (line && !line.match(/^\d/) && currentDate) {
      currentExercice = line;
      serieNumber = 1;
    }
  }

  return workouts;
}