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
    <div>
      {/* Le titre de page est rendu par AppShell (header .app-header-icon) */}

      {/* Filter row */}
      <div className="filter-row">
        {(['all', 'rien', 'ferraille', 'trouvaille'] as const).map((outcome) => (
          <button
            key={outcome}
            onClick={() => setFilterOutcome(outcome)}
            className={`filter-chip ${filterOutcome === outcome ? 'is-active' : ''}`}
          >
            {outcome === 'all' ? 'Tous' : getOutcomeLabel(outcome)}
          </button>
        ))}
      </div>

      {/* Digs list */}
      {filteredDigs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--td-ink-soft)', margin: 0 }}>Aucun creusage enregistré</p>
        </div>
      ) : (
        <div className="find-list">
          {filteredDigs.map((dig) => {
            const relatedFind = dig.findId ? finds.get(dig.findId) : undefined;
            const isSelected = selectedId === dig.id;

            // Map outcome to status pill class
            const getStatusClass = (outcome: string) => {
              switch (outcome) {
                case 'rien':
                  return 'status-pill--rien';
                case 'ferraille':
                  return 'status-pill--faux-positif';
                case 'trouvaille':
                  return relatedFind ? 'status-pill--identifie' : 'status-pill--a-identifier';
                default:
                  return 'status-pill--rien';
              }
            };

            return (
              <div
                key={dig.id}
                className={`find-card ${isSelected ? '' : ''}`}
                onClick={() => setSelectedId(isSelected ? null : dig.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="find-card-main">
                  {/* Top row: status pill + date */}
                  <div className="find-card-top">
                    <span className={`status-pill ${getStatusClass(dig.outcome)}`}>
                      {getOutcomeLabel(dig.outcome)}
                    </span>
                    <span className="find-date">
                      {new Date(dig.at).toLocaleDateString()} {new Date(dig.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Coordinates */}
                  <div className="find-coord">
                    {dig.coord[1].toFixed(5)} N, {Math.abs(dig.coord[0]).toFixed(5)} E
                    {dig.accuracyM && (
                      <span className="find-accuracy">(±{dig.accuracyM.toFixed(0)}m)</span>
                    )}
                  </div>

                  {/* Signal chips */}
                  {dig.signal && (
                    <div className="chip-row">
                      <span className="signal-chip">
                        Seg. {dig.signal.segment}
                      </span>
                      <span className="signal-chip">
                        {dig.signal.mode === 'all_metal' ? 'All-Metal' : dig.signal.mode}
                      </span>
                      <span className="signal-chip">
                        Sens. {dig.signal.sensitivity}/8
                      </span>
                      {dig.signal.repeatable && (
                        <span className="signal-chip signal-chip--repeatable">
                          Répétable
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta chips: depth */}
                  {dig.depthCm && (
                    <div className="chip-row">
                      <span className="meta-chip">
                        {dig.depthCm} cm
                      </span>
                    </div>
                  )}

                  {/* Related find */}
                  {relatedFind && (
                    <div className="chip-row" style={{ marginTop: 'var(--space-2)' }}>
                      <span className="meta-chip meta-chip--material">
                        {relatedFind.category}
                      </span>
                      <span className="meta-chip meta-chip--period">
                        {relatedFind.material}
                      </span>
                    </div>
                  )}

                  {/* Expanded detail view */}
                  {isSelected && (
                    <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--td-ink-faint)', fontSize: '0.8rem', color: 'var(--td-ink-soft)' }}>
                      {dig.note && (
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                          <strong>Note:</strong> {dig.note}
                        </div>
                      )}
                      {relatedFind?.description && (
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                          <strong>Description:</strong> {relatedFind.description}
                        </div>
                      )}
                      {relatedFind && relatedFind.photos.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                          <strong>{relatedFind.photos.length} photo(s)</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(dig.id, 'dig');
                          }}
                          className="filter-chip"
                          style={{ flex: 1, color: 'var(--td-ink-soft)', background: 'var(--td-surface)', boxShadow: 'var(--shadow-ambient-sm)' }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FindsList;
