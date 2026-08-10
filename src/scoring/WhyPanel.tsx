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
import { pickHypeLine } from '../app/hype';

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
      className="why-sheet"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--td-chrome)',
        borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        boxShadow: '0 -4px 0 oklch(100% 0 0 / 0.06) inset, var(--shadow-ambient-lg)',
        padding: 'var(--space-3) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom, 10px))',
        maxHeight: '50vh',
        overflowY: 'auto',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Handle */}
      <div
        style={{
          width: '36px',
          height: '4px',
          borderRadius: 'var(--radius-pill)',
          background: 'oklch(100% 0 0 / 0.22)',
          margin: '0 auto var(--space-3)',
        }}
      />

      {/* Header with score badge */}
      <div
        className="why-sheet-head"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <span
          className="score-badge"
          style={{
            width: '44px',
            height: '44px',
            flexShrink: 0,
            borderRadius: '42% 46% 40% 48% / 46% 40% 50% 42%',
            display: 'grid',
            placeItems: 'center',
            background: 'radial-gradient(120% 130% at 30% 24%, var(--cat-sortie-l), var(--cat-sortie-m) 52%, var(--cat-sortie-d) 100%)',
            boxShadow: 'var(--shadow-ambient-md), var(--inset-highlight)',
          }}
          aria-hidden="true"
        >
          <img
            src="/icons/fluent-3d/cible-score.png"
            alt=""
            style={{
              width: '28px',
              height: '28px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 3px 5px oklch(0% 0 0 / 0.5))',
            }}
          />
        </span>
        <div
          className="why-sheet-score"
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            className="score-value"
            style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontWeight: '800',
              fontSize: '1.5rem',
              lineHeight: 1,
              color: 'var(--td-chrome-ink)',
            }}
          >
            {cell.score.toFixed(0)}
            <span
              className="score-max"
              style={{
                fontSize: '0.92rem',
                fontWeight: '700',
                color: 'var(--td-chrome-ink-soft)',
                marginLeft: '2px',
              }}
            >
              /100
            </span>
          </span>
          <span
            className="score-cell"
            style={{
              display: 'block',
              marginTop: '2px',
              fontSize: '0.7rem',
              fontWeight: '600',
              color: 'var(--td-chrome-ink-soft)',
            }}
          >
            Cellule H3 · {cell.h3}
          </span>
          {cell.score >= 40 && (
            <span
              style={{
                display: 'block',
                marginTop: '4px',
                fontSize: '0.72rem',
                fontStyle: 'italic',
                fontWeight: '600',
                color: 'var(--cat-sortie-m)',
              }}
            >
              « {pickHypeLine(cell.h3)} »
            </span>
          )}
        </div>
        <button
          className="why-sheet-close"
          onClick={onClose}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: 'none',
            background: 'oklch(100% 0 0 / 0.1)',
            color: 'var(--td-chrome-ink)',
            fontSize: '0.95rem',
            lineHeight: 1,
            cursor: 'pointer',
            flexShrink: 0,
            fontWeight: '700',
          }}
        >
          ×
        </button>
      </div>

      {/* Contributions list */}
      {cell.contributions.length > 0 && (
        <div
          className="why-sheet-body"
          style={{
            position: 'relative',
            maxHeight: '96px',
            overflow: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {sorted.map((contrib, idx) => {
            const points = contrib.weight * contrib.value;
            return (
              <div
                key={idx}
                className="why-row"
                style={{
                  padding: 'var(--space-2) 0',
                  borderTop: idx === 0 ? 'none' : '1px solid oklch(100% 0 0 / 0.08)',
                }}
              >
                <div
                  className="why-row-main"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 'var(--space-2)',
                    marginBottom: '2px',
                  }}
                >
                  <strong
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: '800',
                      color: 'var(--td-chrome-ink)',
                    }}
                  >
                    {contrib.criterion}
                  </strong>
                  <span
                    className="why-row-pts"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      color: 'var(--cat-couches-m)',
                      flexShrink: 0,
                    }}
                  >
                    +{points.toFixed(1)} pts
                  </span>
                </div>
                <p
                  className="why-row-evidence"
                  style={{
                    margin: 0,
                    fontSize: '0.76rem',
                    lineHeight: '1.4',
                    color: 'var(--td-chrome-ink-soft)',
                  }}
                >
                  {contrib.evidence}
                  {contrib.source && ` — ${contrib.source}`}
                </p>
              </div>
            );
          })}
          <div
            style={{
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '34px',
              background: 'linear-gradient(180deg, transparent, var(--td-chrome))',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Restrictions/warnings */}
      {cell.flagged && (
        <div
          className="why-flag"
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            background: 'oklch(66% 0.2 27 / 0.18)',
            border: '1px solid oklch(66% 0.2 27 / 0.4)',
            color: 'oklch(94% 0.05 27)',
            fontSize: '0.76rem',
            fontWeight: '700',
            lineHeight: '1.4',
          }}
        >
          <strong>⚠ Restriction :</strong> {cell.flagged.reason}
          {cell.flagged.detail && ` — ${cell.flagged.detail}`}
        </div>
      )}
    </div>
  );
};

export default WhyPanel;
