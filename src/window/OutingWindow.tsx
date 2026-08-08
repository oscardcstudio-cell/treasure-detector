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
      <div
        style={{
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#666',
        }}
      >
        <strong>Fenêtre de sortie :</strong> Pas de position GPS
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#666',
        }}
      >
        <strong>Fenêtre de sortie :</strong> Calcul en cours...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '12px',
          background: '#fee',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#d32f2f',
        }}
      >
        <strong>Fenêtre de sortie :</strong> {error}
      </div>
    );
  }

  if (!recommendation) {
    return null;
  }

  const statusColors: Record<string, string> = {
    now: '#4CAF50', // green
    soon: '#FFA500', // orange
    out_of_season: '#f44336', // red
  };

  const statusLabels: Record<string, string> = {
    now: 'MAINTENANT',
    soon: 'BIENTÔT',
    out_of_season: 'HORS SAISON',
  };

  return (
    <div
      style={{
        background: statusColors[recommendation.status],
        color: '#fff',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '12px',
      }}
    >
      <div
        style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '4px',
        }}
      >
        {statusLabels[recommendation.status]}
      </div>

      <div
        style={{
          fontSize: '12px',
          marginBottom: '8px',
          lineHeight: '1.4',
        }}
      >
        {recommendation.reason}
      </div>

      {/* Detailed breakdown */}
      <details
        style={{
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        <summary style={{ fontWeight: 'bold' }}>Détails</summary>
        <div style={{ marginTop: '6px', paddingLeft: '12px' }}>
          <div>
            <strong>Météo :</strong> {recommendation.details.weather}
          </div>
          <div>
            <strong>Calendrier :</strong> {recommendation.details.calendar}
          </div>
          <div>
            <strong>Jour :</strong> {recommendation.details.daylight}
          </div>
        </div>
      </details>
    </div>
  );
};
