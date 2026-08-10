/**
 * OutingWindow — displays "WHEN to go prospecting" recommendation
 *
 * Shows:
 * - Status: "MAINTENANT" / "BIENTÔT" / "HORS SAISON"
 * - One-sentence reason
 * - Detailed breakdown (weather, calendar, daylight)
 *
 * Updates when position changes or user manually refreshes.
 */

import React, { useState, useEffect } from 'react';
import { assessOutingWindow, type OutingRecommendation } from './index';
import type { CropType } from './calendar';

interface OutingWindowProps {
  /**
   * Current position [longitude, latitude] from GPS.
   * If null, shows placeholder.
   */
  position?: [number, number];
  /**
   * Crop type for calendar assessment.
   * Defaults to 'inconnu'.
   */
  cropType?: CropType;
}

export const OutingWindow: React.FC<OutingWindowProps> = ({
  position,
  cropType = 'inconnu',
}) => {
  const [recommendation, setRecommendation] = useState<OutingRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendation when position changes
  useEffect(() => {
    if (!position) {
      setRecommendation(null);
      return;
    }

    setLoading(true);
    setError(null);

    assessOutingWindow(position[1], position[0], cropType)
      .then((rec) => {
        setRecommendation(rec);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(msg);
        setLoading(false);
      });
  }, [position, cropType]);

  if (!position) {
    return (
      <p className="card-body" style={{ margin: 'var(--space-2) 0' }}>
        Pas de position GPS
      </p>
    );
  }

  if (loading) {
    return (
      <p className="card-body" style={{ margin: 'var(--space-2) 0' }}>
        Calcul en cours...
      </p>
    );
  }

  if (error) {
    return (
      <p className="card-body" style={{ margin: 'var(--space-2) 0', color: 'var(--cat-compte-d)' }}>
        {error}
      </p>
    );
  }

  if (!recommendation) {
    return null;
  }

  const statusColors = {
    now: { bg: 'oklch(90% 0.08 150 / 0.3)', border: 'var(--cat-couches-d)' },
    soon: { bg: 'oklch(90% 0.09 55 / 0.3)', border: 'var(--cat-sortie-d)' },
    out_of_season: { bg: 'oklch(66% 0.2 27 / 0.12)', border: 'var(--cat-compte-d)' },
  } as const;

  const statusLabels = {
    now: 'MAINTENANT',
    soon: 'BIENTÔT',
    out_of_season: 'HORS SAISON',
  } as const;

  const status = recommendation.status as keyof typeof statusColors;
  const colors = statusColors[status] ?? statusColors.out_of_season;
  const label = statusLabels[status];

  return (
    <>
      <div style={{ marginTop: 'var(--space-3)' }}>
        <p
          style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: colors.border,
            margin: '0 0 var(--space-2)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {label}
        </p>

        <p className="card-body" style={{ marginBottom: 'var(--space-2)' }}>
          {recommendation.reason}
        </p>

        <details style={{ cursor: 'pointer' }}>
          <summary style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--td-ink-faint)' }}>
            Détails
          </summary>
          <div style={{ marginTop: 'var(--space-2)', fontSize: '0.72rem', color: 'var(--td-ink-faint)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
              <span>Météo</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--td-ink-soft)' }}>
                {recommendation.details.weather}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
              <span>Calendrier</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--td-ink-soft)' }}>
                {recommendation.details.calendar}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <span>Lumière</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--td-ink-soft)' }}>
                {recommendation.details.daylight}
              </span>
            </div>
          </div>
        </details>
      </div>
    </>
  );
};
