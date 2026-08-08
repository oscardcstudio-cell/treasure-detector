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
    <div className="p-4 space-y-4 bg-white rounded-lg border border-gray-300">
      <h3 className="text-lg font-bold">Détails de la Trouvaille</h3>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold mb-2">Catégorie</label>
        <select
          value={form.category}
          onChange={(e) => handleChange('category', e.target.value as Find['category'])}
          className="w-full px-3 py-2 border rounded"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {labelFor(cat)}
            </option>
          ))}
        </select>
      </div>

      {/* Material */}
      <div>
        <label className="block text-sm font-semibold mb-2">Matière</label>
        <select
          value={form.material}
          onChange={(e) => handleChange('material', e.target.value as Find['material'])}
          className="w-full px-3 py-2 border rounded"
        >
          {MATERIALS.map((mat) => (
            <option key={mat} value={mat}>
              {labelFor(mat)}
            </option>
          ))}
        </select>
      </div>

      {/* Period */}
      <div>
        <label className="block text-sm font-semibold mb-2">Période</label>
        <select
          value={form.period || ''}
          onChange={(e) => {
            const val = e.target.value;
            handleChange('period', (val as Find['period']) || undefined);
          }}
          className="w-full px-3 py-2 border rounded"
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
      <div>
        <label className="block text-sm font-semibold mb-2">Profondeur (cm)</label>
        <input
          type="number"
          min="0"
          value={form.depthCm || ''}
          onChange={(e) => handleChange('depthCm', e.target.value ? Number(e.target.value) : undefined)}
          className="w-full px-3 py-2 border rounded"
          placeholder="Profondeur optionnelle"
        />
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

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold mb-2">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="Usure, traces, marques, etc."
          rows={3}
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

export default FindForm;
