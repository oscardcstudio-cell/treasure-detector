import type { FoncierGeoJSON, VoiesGeoJSON } from './types';

const FONCIER_GEOJSON_URL = '/data/derived/foncier.geojson';
const VOIES_GEOJSON_URL = '/data/derived/voies.geojson';

/**
 * Charge la couche foncier (parcelles cadastrales classifiées).
 *
 * Tolère l'absence du fichier : retourne une FeatureCollection vide avec log
 * discret. Cas d'usage : `tools/prep/foncier.py` pas encore exécuté.
 */
export async function loadFoncier(): Promise<FoncierGeoJSON> {
  try {
    const response = await fetch(FONCIER_GEOJSON_URL);

    if (response.status === 404) {
      console.info('Foncier non disponible (fichier absent). Lancer tools/prep/foncier.py');
      return { type: 'FeatureCollection', features: [] };
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Fallback SPA : fichier absent → index.html (200, HTML) au lieu de 404
    const contentType = response.headers?.get?.('content-type') ?? '';
    if (contentType.includes('text/html')) {
      console.info('Foncier non disponible (fichier absent). Lancer tools/prep/foncier.py');
      return { type: 'FeatureCollection', features: [] };
    }

    const data = await response.json();
    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Structure GeoJSON invalide : FeatureCollection attendue');
    }
    return data as FoncierGeoJSON;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.warn(`Foncier indisponible (${message}) — couche vide.`);
    return { type: 'FeatureCollection', features: [] };
  }
}

/** Charge les tronçons de voie (chemins, routes) — même tolérance d'absence que loadFoncier. */
export async function loadVoies(): Promise<VoiesGeoJSON> {
  try {
    const response = await fetch(VOIES_GEOJSON_URL);

    if (response.status === 404) {
      console.info('Voies non disponibles (fichier absent). Lancer tools/prep/foncier.py');
      return { type: 'FeatureCollection', features: [] };
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Fallback SPA : fichier absent → index.html (200, HTML) au lieu de 404
    const contentType = response.headers?.get?.('content-type') ?? '';
    if (contentType.includes('text/html')) {
      console.info('Voies non disponibles (fichier absent). Lancer tools/prep/foncier.py');
      return { type: 'FeatureCollection', features: [] };
    }

    const data = await response.json();
    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Structure GeoJSON invalide : FeatureCollection attendue');
    }
    return data as VoiesGeoJSON;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.warn(`Voies indisponibles (${message}) — couche vide.`);
    return { type: 'FeatureCollection', features: [] };
  }
}
