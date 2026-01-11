// components/WorkoutForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createWorkouts, getCurrentUser } from '@/lib/supabase/client';
import type { WorkoutInput } from '@/types/workout';

interface WorkoutFormProps {
  onSuccess?: () => void;
}

export function WorkoutForm({ onSuccess }: WorkoutFormProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<WorkoutInput[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch('/api/parse-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse workout');
      }

      setPreview(data.workouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;

    setLoading(true);
    setError(null);

    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Vous devez être connecté');
      }

      await createWorkouts(user.id, preview);
      
      setSuccess(true);
      setText('');
      setPreview(null);
      
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter une séance</CardTitle>
        <CardDescription>
          Collez votre note de séance au format habituel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={`Séance 09/01

DC incliné
1-24kg 6
2-22kg 11
3-20kg

Curl biceps
1-12kg 8
2-12kg 8
3-12kg`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="font-mono text-sm"
        />

        <div className="flex gap-2">
          <Button
            onClick={handleParse}
            disabled={!text.trim() || loading}
            className="flex-1"
          >
            {loading && !preview ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              'Analyser'
            )}
          </Button>

          {preview && (
            <Button
              onClick={handleSave}
              disabled={loading}
              variant="default"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sauvegardé !
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm">Séance ajoutée avec succès !</p>
          </div>
        )}

        {preview && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Aperçu</CardTitle>
              <CardDescription>
                {preview.length} série{preview.length > 1 ? 's' : ''} détectée{preview.length > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.map((w, idx) => (
                  <div key={idx} className="text-sm p-2 bg-background rounded border">
                    <span className="font-medium">{w.exercice}</span> - Série {w.serie}
                    {w.poids !== null && (
                      <span className="ml-2">
                        {w.poids === 0 ? 'Vide' : `${w.poids}kg`}
                      </span>
                    )}
                    {w.repetitions !== null && (
                      <span className="ml-1">× {w.repetitions}</span>
                    )}
                    {w.notes && (
                      <span className="ml-2 text-muted-foreground">({w.notes})</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}