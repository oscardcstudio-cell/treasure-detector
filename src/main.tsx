import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Doit précéder tout import qui crée une carte : câble le worker MapLibre.
import './map/maplibreWorker';
import App from './App';
import './index.css';

// Register service worker for PWA
registerSW({
  onNeedRefresh() {
    console.warn('PWA update available');
  },
  onOfflineReady() {
    console.warn('PWA ready for offline');
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
