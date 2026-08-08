/**
 * WhyPanel — Interactive explanation of a cell's score
 *
 * Shows:
 * - H3 cell index
 * - Total score (0–100)
 * - Sorted list of contributions (criterion, weight, value, evidence)
 * - Flags (ZPPA, MH, etc.) if present
 */

import React from 'react';
import { ScoreCell } from './types';

interface WhyPanelProps {
  cell?: ScoreCell;
  onClose: () => void;
}

export const WhyPanel: React.FC<WhyPanelProps> = ({ cell, onClose }) => {
  if (!cell) {
    return null;
  }

  // Sort contributions by weight * value (descending)
  const sorted = [...cell.contributions].sort(
    (a, b) => b.weight * b.value - a.weight * a.value
  );

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '2px solid #ccc',
        padding: '20px',
        maxHeight: '50vh',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>
          Pourquoi {cell.score.toFixed(1)}/100 ?
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
        Cellule H3 : {cell.h3}
      </div>

      {cell.contributions.length > 0 && (
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Contributeurs</h3>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {sorted.map((contrib, idx) => {
              const points = contrib.weight * contrib.value;
              return (
                <li key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>
                  <strong>{contrib.criterion}</strong>
                  {` (+${points.toFixed(1)} pts)`}
                  <br />
                  <em style={{ fontSize: '12px', color: '#555' }}>
                    {contrib.evidence}
                    {contrib.source && ` — ${contrib.source}`}
                  </em>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {cell.flagged && (
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
          <strong>⚠ Restriction :</strong> {cell.flagged.reason}
          {cell.flagged.detail && ` — ${cell.flagged.detail}`}
        </div>
      )}
    </div>
  );
};

export default WhyPanel;
