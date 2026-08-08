/**
 * PresetOverlay — Shows PresetCard when a cell is active
 *
 * Display modes:
 * - Manual: user taps a scored cell (from ScoringLayer)
 * - Automatic: GPS enters a scored cell during active session
 * - Closeable: card can be dismissed
 *
 * Integrates with setActivePresetId to mark DigPoints created afterward.
 */

import React, { useEffect, useState } from 'react';
import { setActivePresetId, PresetCard, resolvePreset, type ResolveContext } from './index';
import type { ScoreCell } from '../scoring/types';
import type { DetectorPreset } from '../db/types';

interface PresetOverlayProps {
  /**
   * Currently selected/active scored cell
   * If null, no card is shown
   */
  activeCell?: ScoreCell;

  /**
   * Optional context for preset resolution (soilCondition from session)
   */
  resolveContext?: ResolveContext;

  /**
   * Callback when user closes the card
   */
  onClose?: () => void;
}

export const PresetOverlay: React.FC<PresetOverlayProps> = ({
  activeCell,
  resolveContext,
  onClose,
}) => {
  const [preset, setPreset] = useState<DetectorPreset | null>(null);
  const [why, setWhy] = useState<string>('');

  // Resolve preset when cell changes
  useEffect(() => {
    if (!activeCell) {
      setPreset(null);
      setActivePresetId(null);
      return;
    }

    try {
      const resolution = resolvePreset(activeCell, resolveContext || {});
      if (resolution) {
        setPreset(resolution.preset);
        setWhy(resolution.why);
        setActivePresetId(resolution.preset.id);
      }
    } catch (error) {
      console.error('Failed to resolve preset:', error);
      setPreset(null);
      setActivePresetId(null);
    }
  }, [activeCell, resolveContext]);

  if (!preset || !activeCell) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2000,
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        padding: '20px',
        maxWidth: '420px',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      {/* Close button */}
      <button
        onClick={() => {
          setPreset(null);
          setActivePresetId(null);
          onClose?.();
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          color: '#666',
        }}
      >
        ×
      </button>

      {/* Why explanation */}
      {why && (
        <div
          style={{
            fontSize: '12px',
            color: '#0066cc',
            marginBottom: '16px',
            fontStyle: 'italic',
            paddingRight: '24px',
          }}
        >
          {why}
        </div>
      )}

      {/* Preset card */}
      <PresetCard preset={preset} />

      {/* Cell info footer */}
      <div
        style={{
          fontSize: '11px',
          color: '#999',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #eee',
          textAlign: 'center',
        }}
      >
        Cellule H3: {activeCell.h3}
        <br />
        Score: {activeCell.score.toFixed(1)}/100
      </div>
    </div>
  );
};
