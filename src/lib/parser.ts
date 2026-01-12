// lib/parser.ts

import type { WorkoutInput } from '@/types/workout';

export function parseWorkoutText(text: string): WorkoutInput[] {
  const workouts: WorkoutInput[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  let currentDate = '';
  let currentExercice = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse date - formats acceptés:
    // "Séance 09/01" ou "09/01" ou "Séance 09/01/2025" ou "09/01/2025"
    const dateMatch = line.match(/(?:Séance\s+)?(\d{2})\/(\d{2})(?:\/(\d{4}))?/i);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      const year = dateMatch[3] || new Date().getFullYear().toString();
      currentDate = `${year}-${month}-${day}`;
      continue;
    }

    // Parse série - format: "1-24kg 6" ou "1-à vide 8" ou "1-X" etc.
    const serieMatch = line.match(/^(\d+)-(.+)/);
    if (serieMatch && currentExercice) {
      const serieNumber = parseInt(serieMatch[1]);
      const content = serieMatch[2].trim();

      let poids: number | null = null;
      let repetitions: number | null = null;
      let notes: string | null = null;

      // Cas 1: "à vide" ou "vide"
      if (content.match(/à\s*vide|^vide/i)) {
        poids = 0;
        notes = 'à vide';
        
        // Chercher les répétitions après "à vide"
        const repsMatch = content.match(/(\d+)/);
        if (repsMatch) {
          repetitions = parseInt(repsMatch[1]);
        }
      }
      // Cas 2: "X" ou "x" (série non réalisée)
      else if (content.trim().toUpperCase() === 'X') {
        poids = null;
        repetitions = null;
        notes = 'non réalisé';
      }
      // Cas 3: Format de temps uniquement (ex: "20s", "1min", "1min30")
      else if (content.match(/^\d+\s*(?:s|sec|secondes?)$/i) || 
               content.match(/^\d+\s*min(?:\s*\d+(?:s)?)?$/i)) {
        const timeMatch = content.match(/(\d+)\s*min(?:\s*(\d+))?|(\d+)\s*s(?:ec)?/i);
        if (timeMatch) {
          poids = null; // Pas de poids pour les exercices au temps
          repetitions = null; // Pas de répétitions
          
          // Normaliser le format du temps
          if (timeMatch[1]) {
            // Format: Xmin ou Xmin Ys
            const minutes = parseInt(timeMatch[1]);
            const seconds = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            if (seconds > 0) {
              notes = `${minutes}min${seconds}s`;
            } else {
              notes = `${minutes}min`;
            }
          } else if (timeMatch[3]) {
            // Format: Xs
            notes = `${timeMatch[3]}s`;
          }
        }
      }
      // Cas 4: Format normal "24kg 6" ou "24kg" ou juste "6"
      else {
        // D'abord vérifier si c'est un temps dans un format moins strict
        const timeMatch = content.match(/(\d+)\s*min(?:\s*(\d+))?|(\d+)\s*s(?:ec)?/i);
        if (timeMatch && !content.match(/kg/i)) {
          poids = null;
          repetitions = null;
          
          if (timeMatch[1]) {
            const minutes = parseInt(timeMatch[1]);
            const seconds = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            if (seconds > 0) {
              notes = `${minutes}min${seconds}s`;
            } else {
              notes = `${minutes}min`;
            }
          } else if (timeMatch[3]) {
            notes = `${timeMatch[3]}s`;
          }
        } else {
          // Extraire le poids
          const poidsMatch = content.match(/(\d+(?:\.\d+)?)\s*kg/i);
          if (poidsMatch) {
            poids = parseFloat(poidsMatch[1]);
          }

          // Extraire les répétitions (le nombre après le poids, ou n'importe quel nombre)
          const allNumbers = content.match(/\d+(?:\.\d+)?/g);
          if (allNumbers && allNumbers.length > 0) {
            // Si on a trouvé un poids, les reps sont le deuxième nombre
            if (poids !== null && allNumbers.length > 1) {
              repetitions = parseInt(allNumbers[1]);
            }
            // Sinon, c'est peut-être juste des reps sans poids
            else if (poids === null) {
              repetitions = parseInt(allNumbers[0]);
            }
          }

          // Extraire les notes (mots comme "douleur", "allongé", "normal", etc.)
          const notePatterns = [
            'douleur', 'allongé', 'normal', 'arrêté', 'difficile',
            'facile', 'échec', 'ras', 'pause', 'tempo'
          ];
          
          for (const pattern of notePatterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(content)) {
              notes = content.match(regex)![0];
              break;
            }
          }

          // Cas spécial: format "15/15" pour les exercices alternés
          const alternateMatch = content.match(/(\d+)\/(\d+)/);
          if (alternateMatch) {
            repetitions = parseInt(alternateMatch[1]);
            notes = `${alternateMatch[1]}/${alternateMatch[2]}`;
          }
        }
      }

      workouts.push({
        date: currentDate,
        exercice: currentExercice,
        serie: serieNumber,
        poids,
        repetitions,
        notes,
      });
    }
    // Sinon, c'est un nouveau nom d'exercice
    else if (!serieMatch && currentDate && line) {
      // Ignorer les lignes qui ressemblent à des notes globales
      if (!line.match(/^(total|volume|commentaire|note)/i)) {
        currentExercice = line;
      }
    }
  }

  return workouts;
}

// Fonction de validation
export function validateWorkouts(workouts: WorkoutInput[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (workouts.length === 0) {
    errors.push('Aucune série détectée. Vérifiez le format de vos notes.');
    return { isValid: false, errors };
  }

  const uniqueDates = [...new Set(workouts.map(w => w.date))];
  if (uniqueDates.some(d => d.includes('NaN'))) {
    errors.push('Format de date invalide. Utilisez le format DD/MM ou DD/MM/YYYY.');
  }

  const uniqueExercices = [...new Set(workouts.map(w => w.exercice))];
  if (uniqueExercices.some(e => !e || e.trim() === '')) {
    errors.push('Nom d\'exercice manquant pour certaines séries.');
  }

  if (workouts.some(w => w.serie < 1 || w.serie > 20)) {
    errors.push('Numéro de série invalide (doit être entre 1 et 20).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Fonction pour formater l'aperçu
export function formatWorkoutPreview(workouts: WorkoutInput[]): string {
  const grouped = workouts.reduce((acc, w) => {
    if (!acc[w.exercice]) {
      acc[w.exercice] = [];
    }
    acc[w.exercice].push(w);
    return acc;
  }, {} as Record<string, WorkoutInput[]>);

  let preview = '';
  Object.entries(grouped).forEach(([exercice, series]) => {
    preview += `${exercice}\n`;
    series.forEach(s => {
      const poidsStr = s.poids !== null ? (s.poids === 0 ? 'Vide' : `${s.poids}kg`) : '-';
      const repsStr = s.repetitions !== null ? `× ${s.repetitions}` : '× -';
      const notesStr = s.notes ? ` (${s.notes})` : '';
      preview += `  Série ${s.serie}: ${poidsStr} ${repsStr}${notesStr}\n`;
    });
    preview += '\n';
  });

  return preview;
}

// Exemples de formats acceptés
export const SUPPORTED_FORMATS = `
Formats acceptés:

1. Format standard:
   Séance 09/01
   DC incliné
   1-24kg 6
   2-22kg 11
   3-20kg

2. Format avec année:
   Séance 09/01/2025
   
3. Exercices au poids du corps:
   Tractions
   1-à vide 8
   2-à vide 10

4. Exercices non réalisés:
   1-26kg X
   2-X

5. Exercices avec notes:
   1-40kg 10 douleur
   2-35kg allongé

6. Exercices alternés:
   Fentes sautées
   1-15/15
   2-15/15

7. Exercices de temps:
   Gainage
   1-3min
   2-1min30
   3-45s
   
   Squats sautées
   1-20s
   2-1min

8. Format avec tirets ou espaces:
   1 - 24kg 6
   1- 24kg 6
   1 -24kg 6
`;