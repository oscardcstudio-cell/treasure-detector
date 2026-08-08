/**
 * QuickActions: two large buttons for recording digs and finds in the field.
 *
 * DESIGN CONSTRAINT: Usable with gloves, reachable with one thumb, under 5 seconds per dig.
 * This is the bottleneck: if recording a dig is slow or fiddly, Oscar won't do it on the terrain.
 *
 * Props:
 * - currentPosition: current GPS position (lon, lat) and accuracy
 * - sessionId: current session ID
 * - onDigCreated: callback when a DigPoint is created
 * - lastSignalDefaults: default DetectorSignal values from previous dig in this session
 * - onShowSignalForm: open the detailed signal form
 */

import React, { useState } from 'react';
import { DigPoint, DetectorSignal, LonLat } from '../db/types';

export interface QuickActionsProps {
  currentPosition: { coord: LonLat; accuracyM: number } | null;
  sessionId: string;
  onDigCreated: (dig: Omit<DigPoint, 'id' | 'updatedAt' | 'deviceId'>) => void;
  lastSignalDefaults?: DetectorSignal;
  presetId?: string;
}

/**
 * QuickActions component: two big buttons for recording digs and finds.
 * Each button creates a DigPoint at the current GPS location immediately.
 * The user can then optionally add details (signal, find category, photo) in follow-up forms.
 */
export const QuickActions: React.FC<QuickActionsProps> = ({
  currentPosition,
  sessionId,
  onDigCreated,
  lastSignalDefaults,
  presetId,
}) => {
  const [isRecording, setIsRecording] = useState(false);

  const createDigPoint = (outcome: 'rien' | 'ferraille' | 'trouvaille') => {
    if (!currentPosition) {
      alert('GPS position not available');
      return;
    }

    setIsRecording(true);
    const now = new Date().toISOString();

    const dig: Omit<DigPoint, 'id' | 'updatedAt' | 'deviceId'> = {
      sessionId,
      at: now,
      coord: currentPosition.coord,
      accuracyM: currentPosition.accuracyM,
      outcome,
      signal: lastSignalDefaults, // inherit from last dig in session
      presetId, // inherit preset ID if in a scored zone
      // Other fields (depthCm, note, findId) are empty initially; filled via detail forms later
    };

    onDigCreated(dig);
    setIsRecording(false);

    // Visual feedback
    console.log(`Dig recorded: ${outcome} at ${currentPosition.coord}`);
  };

  const handleDugHere = () => createDigPoint('rien');
  const handleFind = () => createDigPoint('trouvaille');

  const buttonClass =
    'fixed bottom-4 left-4 right-4 px-6 py-4 text-white font-bold text-lg rounded-lg transition-all disabled:opacity-50';
  const primaryButton = `${buttonClass} bg-blue-600 hover:bg-blue-700 active:scale-95`;
  const secondaryButton = `${buttonClass} bg-green-600 hover:bg-green-700 active:scale-95`;

  return (
    <div className="fixed bottom-4 left-4 right-4 flex gap-2">
      <button
        onClick={handleDugHere}
        disabled={!currentPosition || isRecording}
        className={`flex-1 ${primaryButton}`}
        aria-label="Record dug here (no find)"
      >
        CREUSÉ ICI
      </button>
      <button
        onClick={handleFind}
        disabled={!currentPosition || isRecording}
        className={`flex-1 ${secondaryButton}`}
        aria-label="Record find"
      >
        TROUVAILLE
      </button>
    </div>
  );
};

export default QuickActions;
