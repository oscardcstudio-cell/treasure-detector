import type { TargetsGeoJSON } from './types';

const TARGETS_GEOJSON_URL = '/data/derived/cibles.geojson';

/**
 * Charge les cibles archéologiques nommées (docs/zone/CIBLES.md) depuis le
 * GeoJSON versionné. Tolère l'absence du fichier — même contrat que
 * loadSignaledZones (src/zones/source.ts) : une couche informative ne doit
 * jamais faire échouer le montage de la carte.
 */
export async function loadTargets(): Promise<TargetsGeoJSON> {
  try {
    const response = await fetch(TARGETS_GEOJSON_URL);

    if (response.status === 404) {
      console.info('Cibles archéologiques non disponibles (fichier absent).');
      return { type: 'FeatureCollection', features: [] };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Fallback SPA : fichier absent → index.html (200, HTML) au lieu de 404
    const contentType = response.headers?.get?.('content-type') ?? '';
    if (contentType.includes('text/html')) {
      console.info('Cibles archéologiques non disponibles (fichier absent).');
      return { type: 'FeatureCollection', features: [] };
    }

    const data = await response.json();

    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Structure GeoJSON invalide : FeatureCollection attendue');
    }

    return data as TargetsGeoJSON;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.warn(`Cibles archéologiques indisponibles (${message}) — couche vide.`);
    return { type: 'FeatureCollection', features: [] };
  }
}
