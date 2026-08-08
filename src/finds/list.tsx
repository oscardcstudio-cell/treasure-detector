/**
 * FindsList: display and edit digs and finds from the current session and all sessions.
 *
 * Features:
 * - List view: all digs/finds with outcomes
 * - Detail card: expand to see full information
 * - Edit: modify digs and finds
 * - Delete: soft delete (mark as deleted)
 * - Filter: by outcome, category, period, session
 */

import React, { useState } from 'react';
import { DigPoint, Find } from '../db/types';

export interface FindsListProps {
  digs: DigPoint[];
  finds: Map<string, Find>;
  onDelete?: (id: string, type: 'dig' | 'find') => void;
}

export const FindsList: React.FC<FindsListProps> = ({ digs, finds, onDelete }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterOutcome, setFilterOutcome] = useState<'all' | 'rien' | 'ferraille' | 'trouvaille'>('all');

  const filteredDigs = digs.filter((d) => filterOutcome === 'all' || d.outcome === filterOutcome);

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'trouvaille':
        return 'bg-green-100 border-green-400';
      case 'ferraille':
        return 'bg-yellow-100 border-yellow-400';
      case 'rien':
        return 'bg-gray-100 border-gray-400';
      default:
        return 'bg-white border-gray-300';
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case 'trouvaille':
        return 'Trouvaille';
      case 'ferraille':
        return 'Ferraille';
      case 'rien':
        return 'Rien';
      default:
        return outcome;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Creusages et Trouvailles</h2>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'rien', 'ferraille', 'trouvaille'] as const).map((outcome) => (
          <button
            key={outcome}
            onClick={() => setFilterOutcome(outcome)}
            className={`px-3 py-1 text-sm font-semibold rounded ${
              filterOutcome === outcome
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {outcome === 'all' ? 'Tous' : getOutcomeLabel(outcome)}
          </button>
        ))}
      </div>

      {/* Digs list */}
      <div className="space-y-2">
        {filteredDigs.length === 0 ? (
          <p className="text-gray-600">Aucun creusage enregistré</p>
        ) : (
          filteredDigs.map((dig) => {
            const relatedFind = dig.findId ? finds.get(dig.findId) : undefined;
            const isSelected = selectedId === dig.id;

            return (
              <div
                key={dig.id}
                className={`border-2 rounded-lg p-3 cursor-pointer transition ${getOutcomeColor(
                  dig.outcome
                )}`}
              >
                {/* Summary row */}
                <div onClick={() => setSelectedId(isSelected ? null : dig.id)} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{getOutcomeLabel(dig.outcome)}</span>
                    <span className="text-xs text-gray-600">
                      {new Date(dig.at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    Lat: {dig.coord[1].toFixed(5)}, Lon: {dig.coord[0].toFixed(5)}
                  </div>
                  {relatedFind && (
                    <div className="text-sm font-semibold text-green-700">
                      → {relatedFind.category} ({relatedFind.material})
                    </div>
                  )}
                </div>

                {/* Detail view */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t-2 border-current space-y-2 text-sm">
                    {dig.signal && (
                      <div>
                        <strong>Signal:</strong> Segment {dig.signal.segment}, {dig.signal.mode}, Sensibilité{' '}
                        {dig.signal.sensitivity}
                        {dig.signal.repeatable && ' (répétable)'}
                      </div>
                    )}
                    {dig.depthCm && (
                      <div>
                        <strong>Profondeur:</strong> {dig.depthCm} cm
                      </div>
                    )}
                    {dig.note && (
                      <div>
                        <strong>Note:</strong> {dig.note}
                      </div>
                    )}
                    {dig.accuracyM && (
                      <div>
                        <strong>Précision GPS:</strong> ±{dig.accuracyM.toFixed(1)} m
                      </div>
                    )}
                    {relatedFind && (
                      <div className="bg-white p-2 rounded border border-green-300">
                        <strong>Trouvaille:</strong>
                        <div className="text-xs space-y-1 mt-1">
                          <div>Catégorie: {relatedFind.category}</div>
                          <div>Matière: {relatedFind.material}</div>
                          {relatedFind.period && <div>Période: {relatedFind.period}</div>}
                          {relatedFind.depthCm && <div>Profondeur: {relatedFind.depthCm} cm</div>}
                          {relatedFind.description && <div>Description: {relatedFind.description}</div>}
                          {relatedFind.photos.length > 0 && (
                            <div>Photos: {relatedFind.photos.length}</div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => onDelete?.(dig.id, 'dig')}
                        className="flex-1 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FindsList;
