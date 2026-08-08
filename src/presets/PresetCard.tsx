/**
 * Preset display card for field use
 *
 * Large text (≥18px), high contrast, readable in bright sunlight without gloves.
 * Five lines: label, mode/sensitivity, coil, sweep, dig rule, plus "why" explanation.
 *
 * Design constraints:
 * - Readable at arm's length in direct sunlight (strong contrast)
 * - No glossy surfaces (use matte materials in production)
 * - Glove-friendly touch targets if interactive
 * - Supports dark mode (terminal, night prospecting)
 */

import React, { CSSProperties } from 'react';
import type { DetectorPreset } from '../db/types';

export interface PresetCardProps {
  preset: DetectorPreset;
  modulation?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Render a human-readable mode string
 */
function formatMode(mode: string): string {
  const modeLabels: Record<string, string> = {
    all_metal: 'All-Metal',
    jewelry: 'Bijoux',
    custom: 'Perso',
    relics: 'Reliques',
    coins: 'Monnaies',
  };
  return modeLabels[mode] || mode;
}

/**
 * Render a human-readable coil string
 */
function formatCoil(coil: string): string {
  const coilLabels: Record<string, string> = {
    stock_6_5x9: 'Disque stock 6.5"×9"',
    sniper_4_5: 'Petit disque 4.5" (sniper)',
  };
  return coilLabels[coil] || coil;
}

/**
 * Render a human-readable sweep string
 */
function formatSweep(sweep: string): string {
  const sweepLabels: Record<string, string> = {
    tres_lent: 'Très lent',
    lent: 'Lent',
    normal: 'Normal',
  };
  return sweepLabels[sweep] || sweep;
}

/**
 * Format sensitivity range as readable string
 */
function formatSensitivity(range: [number, number]): string {
  if (range[0] === range[1]) {
    return `Sensibilité ${range[0]}`;
  }
  return `Sensibilité ${range[0]}–${range[1]}`;
}

export const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  modulation,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`preset-card ${className}`}
      style={{
        backgroundColor: '#1a1a1a', // matte dark background, high contrast
        color: '#ffffff',
        borderRadius: '0.5rem',
        padding: '1rem',
        fontFamily: '"Courier New", monospace', // monospace for technical readability
        border: '2px solid #ffcc00', // strong yellow accent
        fontSize: '18px', // minimum 18px for arm's-length readability
        lineHeight: '1.4',
        maxWidth: '360px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
        ...style,
      }}
    >
      {/* Header: preset label */}
      <div
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '0.75rem',
          color: '#ffcc00', // yellow for emphasis
        }}
      >
        {preset.label}
      </div>

      {/* Line 1: Mode + Sensitivity */}
      <div
        style={{
          marginBottom: '0.5rem',
          fontSize: '18px',
        }}
      >
        <strong>Mode :</strong> {formatMode(preset.mode)}{' '}
        <strong>Sens :</strong> {formatSensitivity(preset.sensitivity)}
      </div>

      {/* Line 2: Coil */}
      <div
        style={{
          marginBottom: '0.5rem',
          fontSize: '18px',
        }}
      >
        <strong>Disque :</strong> {formatCoil(preset.coil)}
      </div>

      {/* Line 3: Sweep */}
      <div
        style={{
          marginBottom: '0.5rem',
          fontSize: '18px',
        }}
      >
        <strong>Balayage :</strong> {formatSweep(preset.sweep)}
      </div>

      {/* Line 4: Dig rule (often longer, may wrap) */}
      <div
        style={{
          marginBottom: '0.75rem',
          fontSize: '18px',
          fontStyle: 'italic',
          backgroundColor: 'rgba(255, 204, 0, 0.1)',
          padding: '0.5rem',
          borderRadius: '0.25rem',
        }}
      >
        {preset.digRule}
      </div>

      {/* Line 5: Why (criterion explanation) */}
      <div
        style={{
          fontSize: '16px', // slightly smaller, secondary info
          color: '#cccccc',
          borderTop: '1px solid #444444',
          paddingTop: '0.5rem',
          marginBottom: modulation ? '0.5rem' : '0',
        }}
      >
        <strong>Pourquoi :</strong> {preset.why}
      </div>

      {/* Optional: modulation line (soil condition or land use adjustment) */}
      {modulation && (
        <div
          style={{
            fontSize: '14px',
            color: '#ffaa33', // orange for modulation note
            borderTop: '1px dotted #666666',
            paddingTop: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <strong>Ajustement :</strong> {modulation}
        </div>
      )}

      {/* Expected artifacts (tertiary info) */}
      {preset.expect && preset.expect.length > 0 && (
        <div
          style={{
            fontSize: '14px',
            color: '#999999',
            borderTop: '1px dotted #444444',
            paddingTop: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <strong>Attendu :</strong> {preset.expect.join(', ')}
        </div>
      )}
    </div>
  );
};

/**
 * Compact preset badge for inline display (e.g., in a list of holes).
 * Minimal space, still readable.
 */
export const PresetBadge: React.FC<{
  preset: DetectorPreset;
}> = ({ preset }) => {
  return (
    <div
      style={{
        display: 'inline-block',
        backgroundColor: '#ffcc00',
        color: '#1a1a1a',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '14px',
        fontWeight: 'bold',
        fontFamily: '"Courier New", monospace',
      }}
    >
      {preset.label} · {formatSensitivity(preset.sensitivity)}
    </div>
  );
};

export default PresetCard;
