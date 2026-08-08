/**
 * Intégration PMTiles dans MapLibre GL — protocole officiel `pmtiles`.
 *
 * Le protocole est GLOBAL à MapLibre (pas par carte) : une seule registration
 * au démarrage, avant la création de toute source `pmtiles://`.
 *
 * Usage source raster :
 *   map.addSource('lidar', {
 *     type: 'raster',
 *     url: 'pmtiles://https://…/hillshade.pmtiles',
 *     tileSize: 256,
 *   })
 * Le TileJSON (zooms, emprise) est lu dans le header du fichier par la lib.
 */

import { addProtocol, Map } from 'maplibre-gl';
import { Protocol } from 'pmtiles';

let pmtilesInitialized = false;

/**
 * Enregistrer le protocole pmtiles:// (une seule fois, idempotent).
 * Le paramètre carte est accepté pour compatibilité d'appel mais inutile :
 * l'enregistrement est global à maplibregl.
 */
export function initPMTilesProtocol(_mapInstance?: Map): void {
  if (pmtilesInitialized) return;
  const protocol = new Protocol();
  addProtocol('pmtiles', protocol.tile);
  pmtilesInitialized = true;
}

/**
 * Helper : source MapLibre raster pour un fichier PMTiles (local ou distant).
 */
export function createPMTilesSource(pmtilesUrl: string): {
  type: 'raster';
  url: string;
  tileSize: number;
} {
  return { type: 'raster', url: `pmtiles://${pmtilesUrl}`, tileSize: 256 };
}

/**
 * Vérifier qu'un PMTiles est accessible (HEAD, sans télécharger le fichier).
 */
export async function checkPMTilesAvailable(pmtilesUrl: string): Promise<boolean> {
  try {
    const response = await fetch(pmtilesUrl.startsWith('http') ? pmtilesUrl : `./${pmtilesUrl}`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
}
