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
    <div className="p-4 space-y-4 bg-white rounded-lg border border-gray-300">
      <h3 className="text-lg font-bold">Détecteur Signal</h3>

      {/* Segment selector: 12 visual boxes */}
      <div>
        <label className="block text-sm font-semibold mb-2">Target ID (1-12)</label>
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((seg) => (
            <button
              key={seg}
              onClick={() => handleSegmentChange(seg)}
              className={`p-2 text-xs font-bold rounded ${
                signal.segment === seg
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {seg}
            </button>
          ))}
        </div>
      </div>

      {/* Mode selector: 5 buttons */}
      <div>
        <label className="block text-sm font-semibold mb-2">Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`px-3 py-2 text-sm font-semibold rounded ${
                signal.mode === mode
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {mode === 'all_metal' ? 'All-Metal' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sensitivity: stepper 1-8 */}
      <div>
        <label className="block text-sm font-semibold mb-2">Sensibilité: {signal.sensitivity}</label>
        <input
          type="range"
          min="1"
          max="8"
          value={signal.sensitivity}
          onChange={(e) => handleSensitivityChange(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>1 (bas)</span>
          <span>8 (haut)</span>
        </div>
      </div>

      {/* Depth indicator: 0/2/4/6/8 inches */}
      <div>
        <label className="block text-sm font-semibold mb-2">Profondeur (pouces)</label>
        <div className="flex gap-2">
          {DEPTH_OPTIONS.map((depth) => (
            <button
              key={depth}
              onClick={() => handleDepthChange(depth)}
              className={`px-3 py-2 text-sm font-semibold rounded ${
                signal.depthIndicatorIn === depth
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {depth}″
            </button>
          ))}
          {signal.depthIndicatorIn !== undefined && (
            <button
              onClick={() => handleDepthChange(undefined)}
              className="px-3 py-2 text-sm font-semibold bg-gray-400 text-white rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Repeatable: checkbox */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="repeatable"
          checked={signal.repeatable}
          onChange={(e) => handleRepeatableChange(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="repeatable" className="text-sm font-semibold">
          Répétable dans les deux sens
        </label>
      </div>

      {/* Tone: selector */}
      <div>
        <label className="block text-sm font-semibold mb-2">Tonalité</label>
        <div className="flex gap-2">
          {TONES.map((toneOption) => (
            <button
              key={toneOption}
              onClick={() => handleToneChange(toneOption)}
              className={`flex-1 px-3 py-2 text-sm font-semibold rounded ${
                signal.tone === toneOption
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {toneOption.charAt(0).toUpperCase() + toneOption.slice(1)}
            </button>
          ))}
          {signal.tone !== undefined && (
            <button
              onClick={() => handleToneChange(undefined)}
              className="px-3 py-2 text-sm font-semibold bg-gray-400 text-white rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded hover:bg-gray-700"
        >
          Fermer
        </button>
      )}
    </div>
  );
};

export default SignalForm;
