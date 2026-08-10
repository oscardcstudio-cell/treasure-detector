/**
 * SurfaceObsForm: capture surface observations (tile, pottery, etc.) without digging.
 *
 * Fields:
 * - kind: tegulae, imbrex, ceramique_commune, sigillee, mortier, silex, scorie, pierre_taillee, os, autre
 * - density: isole, diffus, concentre, tres_dense
 * - collected: boolean (picked up or left in place)
 * - photos: list of photo keys
 * - note: free text
 */

import React, { useState } from 'react';
import { SurfaceObservation } from '../db/types';
import { PhotoKey } from '../platform/camera';

export interface SurfaceObsFormProps {
  sessionId: string;
  initialObs?: Omit<SurfaceObservation, 'id' | 'updatedAt' | 'syncedAt' | 'deviceId' | 'deleted'>;
  onSave: (obs: Omit<SurfaceObservation, 'id' | 'updatedAt' | 'syncedAt' | 'deviceId' | 'deleted'>) => void;
  onClose?: () => void;
  coord: [number, number];
  photos?: PhotoKey[];
}

const KINDS: Array<SurfaceObservation['kind']> = [
  'tegulae',
  'imbrex',
  'ceramique_commune',
  'sigillee',
  'mortier',
  'silex',
  'scorie',
  'pierre_taillee',
  'os',
  'autre',
];

const DENSITIES: Array<SurfaceObservation['density']> = ['isole', 'diffus', 'concentre', 'tres_dense'];

const labelFor = (str: string) =>
  str
    .charAt(0)
    .toUpperCase()
    .concat(
      str
        .slice(1)
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
    );

export const SurfaceObsForm: React.FC<SurfaceObsFormProps> = ({
  sessionId,
  initialObs,
  onSave,
  onClose,
  coord,
  photos = [],
}) => {
  const [form, setForm] = useState<Omit<SurfaceObservation, 'id' | 'updatedAt' | 'syncedAt' | 'deviceId' | 'deleted'>>({
    sessionId,
    at: initialObs?.at || new Date().toISOString(),
    coord,
    kind: initialObs?.kind || 'tegulae',
    density: initialObs?.density || 'isole',
    collected: initialObs?.collected ?? false,
    photos: initialObs?.photos || photos,
    note: initialObs?.note || '',
  });

  const handleChange = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--td-ink)', marginBottom: 'var(--space-4)' }}>Observation de Surface</h3>

      {/* Kind */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Type d'artefact</label>
        <select
          value={form.kind}
          onChange={(e) => handleChange('kind', e.target.value as SurfaceObservation['kind'])}
          className="clay-input"
        >
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {labelFor(kind)}
            </option>
          ))}
        </select>
      </div>

      {/* Density */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Densité</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
          {DENSITIES.map((density) => (
            <button
              key={density}
              onClick={() => handleChange('density', density)}
              className={`filter-chip ${form.density === density ? 'is-active' : ''}`}
            >
              {labelFor(density)}
            </button>
          ))}
        </div>
      </div>

      {/* Collected */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <input
          type="checkbox"
          id="collected"
          checked={form.collected}
          onChange={(e) => handleChange('collected', e.target.checked)}
          style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--cat-offline-m)' }}
        />
        <label htmlFor="collected" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', cursor: 'pointer' }}>
          Ramassé / prélevé
        </label>
      </div>

      {/* Photos display */}
      {form.photos.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Photos ({form.photos.length})</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {form.photos.map((photoKey) => (
              <div key={photoKey} style={{ padding: 'var(--space-2)', background: 'var(--td-bg-deep)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--td-ink-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{photoKey}</span>
                <button
                  onClick={() =>
                    handleChange(
                      'photos',
                      form.photos.filter((k) => k !== photoKey)
                    )
                  }
                  style={{ border: 'none', background: 'transparent', color: 'var(--td-ink-soft)', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Notes</label>
        <textarea
          value={form.note}
          onChange={(e) => handleChange('note', e.target.value)}
          className="clay-input"
          placeholder="Observations complémentaires"
          rows={2}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          onClick={handleSave}
          className="btn-pill btn-pill--sortie"
          style={{ flex: 1 }}
        >
          Enregistrer
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="filter-chip"
            style={{ flex: 1 }}
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
};

export default SurfaceObsForm;
