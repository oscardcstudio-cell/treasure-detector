/**
 * FindForm: capture details of an artifact extracted from a DigPoint.
 *
 * Fields:
 * - category: monnaie, fibule, boucle, applique, plomb, bague, militaria, outil, ferrure, indetermine, autre
 * - material: or, argent, billon, bronze, cuivre, plomb, fer, etain, autre
 * - period: prehistoire, protohistoire, antique, medieval, moderne, contemporain, indetermine
 * - depthCm: numeric (depth of extraction)
 * - photos: list of photo keys from camera
 * - description: free text (wear, marks, etc.)
 *
 * Note: a Find is ALWAYS linked to a DigPoint via digPointId.
 * This form is only shown after a DigPoint exists.
 */

import React, { useState } from 'react';
import { Find } from '../db/types';
import { PhotoKey } from '../platform/camera';

export interface FindFormProps {
  digPointId: string;
  initialFind?: Omit<Find, 'id' | 'updatedAt' | 'syncedAt' | 'deviceId' | 'deleted'>;
  onFindSave: (find: Omit<Find, 'id' | 'updatedAt' | 'syncedAt' | 'deviceId' | 'deleted'>) => void;
  onClose?: () => void;
  photos?: PhotoKey[];
}

const CATEGORIES: Array<Find['category']> = [
  'monnaie',
  'fibule',
  'boucle',
  'applique',
  'plomb',
  'bague',
  'militaria',
  'outil',
  'ferrure',
  'indetermine',
  'autre',
];

const MATERIALS: Array<Find['material']> = [
  'or',
  'argent',
  'billon',
  'bronze',
  'cuivre',
  'plomb',
  'fer',
  'etain',
  'autre',
];

const PERIODS: Array<Exclude<Find['period'], undefined>> = [
  'prehistoire',
  'protohistoire',
  'antique',
  'medieval',
  'moderne',
  'contemporain',
  'indetermine',
];

const labelFor = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

export const FindForm: React.FC<FindFormProps> = ({
  digPointId,
  initialFind,
  onFindSave,
  onClose,
  photos = [],
}) => {
  const [form, setForm] = useState<Omit<Find, 'id' | 'updatedAt' | 'syncedAt' | 'deviceId' | 'deleted'>>({
    digPointId,
    at: initialFind?.at || new Date().toISOString(),
    category: initialFind?.category || 'indetermine',
    material: initialFind?.material || 'autre',
    period: initialFind?.period,
    depthCm: initialFind?.depthCm,
    photos: initialFind?.photos || photos,
    description: initialFind?.description || '',
  });

  const handleChange = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = () => {
    onFindSave(form);
  };

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--td-ink)', marginBottom: 'var(--space-4)' }}>Détails de la Trouvaille</h3>

      {/* Category */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Catégorie</label>
        <select
          value={form.category}
          onChange={(e) => handleChange('category', e.target.value as Find['category'])}
          className="clay-input"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {labelFor(cat)}
            </option>
          ))}
        </select>
      </div>

      {/* Material */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Matière</label>
        <select
          value={form.material}
          onChange={(e) => handleChange('material', e.target.value as Find['material'])}
          className="clay-input"
        >
          {MATERIALS.map((mat) => (
            <option key={mat} value={mat}>
              {labelFor(mat)}
            </option>
          ))}
        </select>
      </div>

      {/* Period */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Période</label>
        <select
          value={form.period || ''}
          onChange={(e) => {
            const val = e.target.value;
            handleChange('period', (val as Find['period']) || undefined);
          }}
          className="clay-input"
        >
          <option value="">Non déterminé</option>
          {PERIODS.map((per) => (
            <option key={per} value={per}>
              {labelFor(per)}
            </option>
          ))}
        </select>
      </div>

      {/* Depth */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Profondeur (cm)</label>
        <input
          type="number"
          min="0"
          value={form.depthCm || ''}
          onChange={(e) => handleChange('depthCm', e.target.value ? Number(e.target.value) : undefined)}
          className="clay-input"
          placeholder="Profondeur optionnelle"
        />
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

      {/* Description */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="clay-input"
          placeholder="Usure, traces, marques, etc."
          rows={3}
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

export default FindForm;
