/**
 * SignalForm: capture DetectorSignal from the Garrett ACE 250.
 *
 * Design principle: the detector shows 12 segments on the Target ID scale, not numeric VDI.
 * This form mirrors that display exactly — no free-text field, no "enter a number".
 * All fields have defaults from the previous dig or the preset.
 *
 * Fields:
 * - segment: 1-12 visual selector
 * - mode: 5 buttons (all_metal, jewelry, custom, relics, coins)
 * - sensitivity: 1-8 stepper
 * - depthIndicatorIn: 0/2/4/6/8 inches (if shown on the detector)
 * - repeatable: yes/no checkbox
 * - tone: bas/moyen/haut selector
 */

import React, { useState } from 'react';
import { DetectorSignal } from '../db/types';

export interface SignalFormProps {
  initialSignal?: DetectorSignal;
  onSignalChange: (signal: DetectorSignal) => void;
  onClose?: () => void;
}

const MODES: Array<DetectorSignal['mode']> = ['all_metal', 'jewelry', 'custom', 'relics', 'coins'];
const TONES: Array<Exclude<DetectorSignal['tone'], undefined>> = ['bas', 'moyen', 'haut'];
const DEPTH_OPTIONS: Array<0 | 2 | 4 | 6 | 8> = [0, 2, 4, 6, 8];

const defaultSignal: DetectorSignal = {
  segment: 6, // middle of the scale
  mode: 'all_metal',
  sensitivity: 6,
  repeatable: false,
};

export const SignalForm: React.FC<SignalFormProps> = ({
  initialSignal = defaultSignal,
  onSignalChange,
  onClose,
}) => {
  const [signal, setSignal] = useState<DetectorSignal>(initialSignal);

  const handleSegmentChange = (seg: number) => {
    const updated = { ...signal, segment: seg };
    setSignal(updated);
    onSignalChange(updated);
  };

  const handleModeChange = (mode: DetectorSignal['mode']) => {
    const updated = { ...signal, mode };
    setSignal(updated);
    onSignalChange(updated);
  };

  const handleSensitivityChange = (sensitivity: number) => {
    const updated = { ...signal, sensitivity };
    setSignal(updated);
    onSignalChange(updated);
  };

  const handleDepthChange = (depth: 0 | 2 | 4 | 6 | 8 | undefined) => {
    const updated = { ...signal, depthIndicatorIn: depth };
    setSignal(updated);
    onSignalChange(updated);
  };

  const handleRepeatableChange = (repeatable: boolean) => {
    const updated = { ...signal, repeatable };
    setSignal(updated);
    onSignalChange(updated);
  };

  const handleToneChange = (tone: DetectorSignal['tone'] | undefined) => {
    const updated = { ...signal, tone };
    setSignal(updated);
    onSignalChange(updated);
  };

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--td-ink)', marginBottom: 'var(--space-4)' }}>Détecteur Signal</h3>

      {/* Segment selector: 12 visual boxes */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Target ID (1-12)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-2)' }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((seg) => (
            <button
              key={seg}
              onClick={() => handleSegmentChange(seg)}
              className={`filter-chip ${signal.segment === seg ? 'is-active' : ''}`}
              style={{ padding: 'var(--space-3)', minHeight: '44px', fontSize: '0.85rem' }}
            >
              {seg}
            </button>
          ))}
        </div>
      </div>

      {/* Mode selector: 5 buttons */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Mode</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
          {MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`filter-chip ${signal.mode === mode ? 'is-active' : ''}`}
            >
              {mode === 'all_metal' ? 'All-Metal' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sensitivity: stepper 1-8 */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Sensibilité: {signal.sensitivity}</label>
        <input
          type="range"
          min="1"
          max="8"
          value={signal.sensitivity}
          onChange={(e) => handleSensitivityChange(Number(e.target.value))}
          className="layer-slider"
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--td-ink-faint)', marginTop: 'var(--space-2)' }}>
          <span>1 (bas)</span>
          <span>8 (haut)</span>
        </div>
      </div>

      {/* Depth indicator: 0/2/4/6/8 inches */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Profondeur (pouces)</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {DEPTH_OPTIONS.map((depth) => (
            <button
              key={depth}
              onClick={() => handleDepthChange(depth)}
              className={`filter-chip ${signal.depthIndicatorIn === depth ? 'is-active' : ''}`}
            >
              {depth}″
            </button>
          ))}
          {signal.depthIndicatorIn !== undefined && (
            <button
              onClick={() => handleDepthChange(undefined)}
              className="filter-chip"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Repeatable: checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <input
          type="checkbox"
          id="repeatable"
          checked={signal.repeatable}
          onChange={(e) => handleRepeatableChange(e.target.checked)}
          style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--cat-offline-m)' }}
        />
        <label htmlFor="repeatable" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', cursor: 'pointer' }}>
          Répétable dans les deux sens
        </label>
      </div>

      {/* Tone: selector */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--td-ink)', marginBottom: 'var(--space-2)' }}>Tonalité</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {TONES.map((toneOption) => (
            <button
              key={toneOption}
              onClick={() => handleToneChange(toneOption)}
              className={`filter-chip ${signal.tone === toneOption ? 'is-active' : ''}`}
              style={{ flex: 1 }}
            >
              {toneOption.charAt(0).toUpperCase() + toneOption.slice(1)}
            </button>
          ))}
          {signal.tone !== undefined && (
            <button
              onClick={() => handleToneChange(undefined)}
              className="filter-chip"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="filter-chip"
          style={{ width: '100%' }}
        >
          Fermer
        </button>
      )}
    </div>
  );
};

export default SignalForm;
