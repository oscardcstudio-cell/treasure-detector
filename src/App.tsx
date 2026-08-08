import { useState } from 'react';
import MapView from './map/MapView';
import Curtain from './map/Curtain';
import { HistoricLayerId } from './map/layers';

type ViewMode = 'standard' | 'curtain';

/**
 * App — Point d'entrée principal
 * Bascule entre deux modes de visualisation :
 * 1. MapView — Carte standard avec sélection de fond et superposition
 * 2. Curtain — Rideau de comparaison entre deux couches historiques
 */
export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [curtainLeft, setCurtainLeft] = useState<HistoricLayerId>('etat-major');
  const [curtainRight, setCurtainRight] = useState<HistoricLayerId>('cassini');

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toggle view mode */}
      <div
        style={{
          padding: '8px 12px',
          background: '#f5f5f5',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: '8px',
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setViewMode('standard')}
          style={{
            padding: '6px 12px',
            background: viewMode === 'standard' ? '#0066cc' : '#ccc',
            color: viewMode === 'standard' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: viewMode === 'standard' ? 'bold' : 'normal',
          }}
        >
          Vue standard
        </button>
        <button
          onClick={() => setViewMode('curtain')}
          style={{
            padding: '6px 12px',
            background: viewMode === 'curtain' ? '#0066cc' : '#ccc',
            color: viewMode === 'curtain' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: viewMode === 'curtain' ? 'bold' : 'normal',
          }}
        >
          Rideau
        </button>

        {viewMode === 'curtain' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
            <label>
              Gauche:
              <select
                value={curtainLeft}
                onChange={(e) => setCurtainLeft(e.target.value as HistoricLayerId)}
                style={{ marginLeft: '4px', fontSize: '12px', padding: '4px' }}
              >
                <option value="cassini">Cassini</option>
                <option value="etat-major">État-major</option>
                <option value="ortho-1950-65">Ortho 1950–65</option>
                <option value="ortho-irc">IRC</option>
              </select>
            </label>
            <label>
              Droite:
              <select
                value={curtainRight}
                onChange={(e) => setCurtainRight(e.target.value as HistoricLayerId)}
                style={{ marginLeft: '4px', fontSize: '12px', padding: '4px' }}
              >
                <option value="cassini">Cassini</option>
                <option value="etat-major">État-major</option>
                <option value="ortho-1950-65">Ortho 1950–65</option>
                <option value="ortho-irc">IRC</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Vue */}
      <div style={{ flex: 1, position: 'relative' }}>
        {viewMode === 'standard' && <MapView />}
        {viewMode === 'curtain' && <Curtain layerLeft={curtainLeft} layerRight={curtainRight} />}
      </div>
    </div>
  );
}
