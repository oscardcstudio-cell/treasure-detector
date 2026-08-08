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
    <div className="p-4 space-y-4 bg-white rounded-lg border border-gray-300">
      <h3 className="text-lg font-bold">Observation de Surface</h3>

      {/* Kind */}
      <div>
        <label className="block text-sm font-semibold mb-2">Type d'artefact</label>
        <select
          value={form.kind}
          onChange={(e) => handleChange('kind', e.target.value as SurfaceObservation['kind'])}
          className="w-full px-3 py-2 border rounded"
        >
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {labelFor(kind)}
            </option>
          ))}
        </select>
      </div>

      {/* Density */}
      <div>
        <label className="block text-sm font-semibold mb-2">Densité</label>
        <div className="grid grid-cols-2 gap-2">
          {DENSITIES.map((density) => (
            <button
              key={density}
              onClick={() => handleChange('density', density)}
              className={`px-3 py-2 text-sm font-semibold rounded ${
                form.density === density
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {labelFor(density)}
            </button>
          ))}
        </div>
      </div>

      {/* Collected */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="collected"
          checked={form.collected}
          onChange={(e) => handleChange('collected', e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="collected" className="text-sm font-semibold">
          Ramassé / prélevé
        </label>
      </div>

      {/* Photos display */}
      {form.photos.length > 0 && (
        <div>
          <label className="block text-sm font-semibold mb-2">Photos ({form.photos.length})</label>
          <div className="space-y-2">
            {form.photos.map((photoKey) => (
              <div key={photoKey} className="p-2 bg-gray-100 rounded text-sm text-gray-700">
                {photoKey}
                <button
                  onClick={() =>
                    handleChange(
                      'photos',
                      form.photos.filter((k) => k !== photoKey)
                    )
                  }
                  className="ml-2 text-red-600 hover:underline"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div>
        <label className="block text-sm font-semibold mb-2">Notes</label>
        <textarea
          value={form.note}
          onChange={(e) => handleChange('note', e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="Observations complémentaires"
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700"
        >
          Enregistrer
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white font-semibold rounded hover:bg-gray-700"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
};

export default SurfaceObsForm;
