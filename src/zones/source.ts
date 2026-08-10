import type { SignaledZonesGeoJSON } from './types';

const ZONES_GEOJSON_URL = '/data/derived/zones_signalees.geojson';

/**
 * Charge les zones signalées depuis le GeoJSON versionné.
 *
 * Tolère l'absence du fichier : retourne une FeatureCollection vide avec log discret.
 * Cas d'usage : pipeline d'export manuel pas encore exécuté.
 */
export async function loadSignaledZones(): Promise<SignaledZonesGeoJSON> {
  try {
    const response = await fetch(ZONES_GEOJSON_URL);

    if (response.status === 404) {
      console.info('Zones signalées non disponibles (fichier absent). Voir src/zones/README.md');
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Le serveur SPA renvoie index.html (200) pour un fichier absent :
    // sans ce garde, response.json() jette et on logge une fausse erreur.
    const contentType = response.headers?.get?.('content-type') ?? '';
    if (contentType.includes('text/html')) {
      console.info('Zones signalées non disponibles (fichier absent). Voir src/zones/README.md');
      return { type: 'FeatureCollection', features: [] };
    }

    const data = await response.json();

    // Valider la structure GeoJSON
    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Structure GeoJSON invalide : FeatureCollection attendue');
    }

    return data as SignaledZonesGeoJSON;
  } catch (error) {
    // Couche INFORMATIVE et optionnelle : son absence ne doit jamais casser l'app.
    // Relancer l'erreur faisait planter le montage de la carte en boucle.
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.warn(`Zones signalées indisponibles (${message}) — couche vide.`);
    return { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Filtre les zones par type (kind).
 * Utilisé pour extraire les sites de validation du scoring.
 */
export function filterZonesByKind(
  geojson: SignaledZonesGeoJSON,
  kind: string | string[],
): SignaledZonesGeoJSON {
  const kinds = Array.isArray(kind) ? kind : [kind];
  return {
    type: 'FeatureCollection',
    features: geojson.features.filter((f) => kinds.includes(f.properties.kind)),
  };
}

/**
 * Extrait les sites connus pour la validation du scoring.
 *
 * Retourne les monuments historiques et sites classés (pas les ZPPA)
 * pour servir de jeu de référence positif pendant la saison terrain.
 */
export async function knownSitesForValidation(): Promise<
  Array<{ name: string; coord: [number, number]; kind: string }>
> {
  const geojson = await loadSignaledZones();
  const knownKinds = ['MH', 'site_classe'];

  return geojson.features
    .filter((f) => knownKinds.includes(f.properties.kind))
    .map((f) => {
      let coord: [number, number];
      if (f.geometry.type === 'Point') {
        coord = f.geometry.coordinates as [number, number];
      } else if (f.geometry.type === 'Polygon') {
        // Utiliser le centroïde approximatif du premier anneau
        const ring = (f.geometry as any).coordinates[0];
        const lngs = ring.map((c: [number, number]) => c[0]);
        const lats = ring.map((c: [number, number]) => c[1]);
        coord = [
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2,
        ];
      } else {
        return null;
      }

      return {
        name: f.properties.name,
        coord,
        kind: f.properties.kind,
      };
    })
    .filter((s) => s !== null) as Array<{ name: string; coord: [number, number]; kind: string }>;
}
