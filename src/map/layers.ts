/**
 * Registre déclaratif des couches WMTS IGN
 * Chaque couche est définie avec son URL template, format, zoom min/max
 * Sources confirmées par spike 2026-08-08 (FINDINGS.md)
 */

export interface LayerDef {
  id: string;                           // Identifiant unique
  label: string;                        // Libellé français pour l'UI
  url: string;                          // Template WMTS avec {z}, {x}, {y}
  format: 'image/png' | 'image/jpeg';   // Format livré par IGN
  minZoom: number;
  maxNativeZoom: number;                // Au-delà, MapLibre interpole
  attribution: string;                  // Crédit IGN
  category: 'basemap' | 'historic' | 'derived';
}

// Base : https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0
// &LAYER={id}&STYLE=normal&TILEMATRIXSET=PM&FORMAT={fmt}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}
const WMTS_BASE = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM';

function wmtsUrl(layerId: string, format: 'image/png' | 'image/jpeg'): string {
  return `${WMTS_BASE}&LAYER=${layerId}&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;
}

export const LAYERS: Record<string, LayerDef> = {
  // ═══════════════════════════════════════════════════════════════════════
  // PLANS ET BASES ACTUELS
  // ═══════════════════════════════════════════════════════════════════════

  'plan-ignv2': {
    id: 'plan-ignv2',
    label: 'Plan IGN v2',
    url: wmtsUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png'),
    format: 'image/png',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'basemap',
  },

  'ortho-current': {
    id: 'ortho-current',
    label: 'Ortho actuelle',
    url: wmtsUrl('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg'),
    format: 'image/jpeg',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'basemap',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CARTES HISTORIQUES
  // ═══════════════════════════════════════════════════════════════════════

  'cassini': {
    id: 'cassini',
    label: 'Cassini (XVIIIe s.)',
    url: wmtsUrl('BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI', 'image/png'),
    format: 'image/png',
    minZoom: 6,
    maxNativeZoom: 14,  // Cassini plafonne à z14 (spike confirmé)
    attribution: '© BnF-IGN',
    category: 'historic',
  },

  'etat-major': {
    id: 'etat-major',
    label: 'État-major 1820–1866',
    url: wmtsUrl('GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40', 'image/jpeg'),
    format: 'image/jpeg',
    minZoom: 6,
    maxNativeZoom: 15,
    attribution: '© IGN',
    category: 'historic',
  },

  'ortho-1950-65': {
    id: 'ortho-1950-65',
    label: 'Ortho 1950–1965',
    url: wmtsUrl('ORTHOIMAGERY.ORTHOPHOTOS.1950-1965', 'image/png'),
    format: 'image/png',  // OBLIGATOIRE : jpeg renvoie 400 (spike confirmé)
    minZoom: 0,
    maxNativeZoom: 18,
    attribution: '© IGN',
    category: 'historic',
  },

  'ortho-irc': {
    id: 'ortho-irc',
    label: 'Ortho IRC (canal proche-IR)',
    url: wmtsUrl('ORTHOIMAGERY.ORTHOPHOTOS.IRC', 'image/jpeg'),
    format: 'image/jpeg',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'historic',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MILLÉSIMES EXPRESS (Orthos récentes à très haute fréquence)
  // ═══════════════════════════════════════════════════════════════════════

  'ortho-irc-2024': {
    id: 'ortho-irc-2024',
    label: 'Ortho IRC 2024',
    url: wmtsUrl('ORTHOIMAGERY.ORTHOPHOTOS.IRC.EXPRESS.2024', 'image/jpeg'),
    format: 'image/jpeg',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'historic',
  },

  'ortho-irc-2025': {
    id: 'ortho-irc-2025',
    label: 'Ortho IRC 2025',
    url: wmtsUrl('ORTHOIMAGERY.ORTHOPHOTOS.IRC.EXPRESS.2025', 'image/jpeg'),
    format: 'image/jpeg',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'historic',
  },

  'ortho-irc-2026': {
    id: 'ortho-irc-2026',
    label: 'Ortho IRC 2026',
    url: wmtsUrl('ORTHOIMAGERY.ORTHOPHOTOS.IRC.EXPRESS.2026', 'image/jpeg'),
    format: 'image/jpeg',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'historic',
  },

  'ortho-rvb-2025': {
    id: 'ortho-rvb-2025',
    label: 'Ortho RVB 2025',
    url: wmtsUrl('ORTHOIMAGERY.ORTHOPHOTOS.RVB.EXPRESS.2025', 'image/jpeg'),
    format: 'image/jpeg',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'historic',
  },

  'ortho-rvb-2026': {
    id: 'ortho-rvb-2026',
    label: 'Ortho RVB 2026',
    url: wmtsUrl('ORTHOIMAGERY.ORTHOPHOTOS.RVB.EXPRESS.2026', 'image/jpeg'),
    format: 'image/jpeg',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'historic',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DONNÉES CADASTRALES
  // ═══════════════════════════════════════════════════════════════════════

  'cadastre': {
    id: 'cadastre',
    label: 'Cadastre',
    url: wmtsUrl('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'image/png'),
    format: 'image/png',
    minZoom: 0,
    maxNativeZoom: 19,
    attribution: '© IGN',
    category: 'derived',
  },
};

/**
 * Couches de base recommandées pour sélection
 * (Ne pas utiliser toutes simultanément : trop verbeux)
 */
export const BASEMAP_DEFAULTS = {
  default: 'plan-ignv2' as const,
  options: ['plan-ignv2', 'ortho-current'] as const,
};

/**
 * Couches historiques pour superposition
 * Utilisées comme couches sélectionnables au-dessus de la base
 */
export const HISTORIC_LAYERS = ['cassini', 'etat-major', 'ortho-1950-65', 'ortho-irc'] as const;
export type HistoricLayerId = typeof HISTORIC_LAYERS[number];

/**
 * Couches dérivées (LiDAR, scoring, etc.)
 * Chargées depuis data/derived/ (PMTiles ou GeoJSON)
 */
export const DERIVED_LAYERS = ['cadastre'] as const;
export type DerivedLayerId = typeof DERIVED_LAYERS[number];

// ═══════════════════════════════════════════════════════════════════════
// RELIEF LiDAR HD (dérivés T3.1, PMTiles hébergés en GitHub Release)
// ═══════════════════════════════════════════════════════════════════════

export interface LidarLayerDef {
  id: string;
  label: string;
  /** URL https du fichier .pmtiles (préfixée pmtiles:// par createPMTilesSource) */
  pmtilesUrl: string;
  attribution: string;
}

const LIDAR_RELEASE_BASE =
  'https://github.com/oscardcstudio-cell/treasure-detector/releases/download/lidar-v1';

/**
 * Couverture : `lidarBbox` de config/zone.json (commune + 2 km), z11–17.
 * Régénération : tools/prep (download_mnt.py → derive.py → to_pmtiles.py).
 */
export const LIDAR_LAYERS: Record<string, LidarLayerDef> = {
  'lidar-hillshade': {
    id: 'lidar-hillshade',
    label: 'Relief LiDAR (ombrage)',
    pmtilesUrl: `${LIDAR_RELEASE_BASE}/hillshade.pmtiles`,
    attribution: '© IGN LiDAR HD',
  },
  'lidar-svf': {
    id: 'lidar-svf',
    label: 'Relief LiDAR (SVF — creux/buttes)',
    pmtilesUrl: `${LIDAR_RELEASE_BASE}/svf.pmtiles`,
    attribution: '© IGN LiDAR HD',
  },
  'lidar-lrm': {
    id: 'lidar-lrm',
    label: 'Relief LiDAR (micro-reliefs)',
    pmtilesUrl: `${LIDAR_RELEASE_BASE}/lrm.pmtiles`,
    attribution: '© IGN LiDAR HD',
  },
  'lidar-openness': {
    id: 'lidar-openness',
    label: 'Relief LiDAR (openness — crêtes/fossés)',
    pmtilesUrl: `${LIDAR_RELEASE_BASE}/openness.pmtiles`,
    attribution: '© IGN LiDAR HD',
  },
};

export const LIDAR_LAYER_IDS = Object.keys(LIDAR_LAYERS) as (keyof typeof LIDAR_LAYERS)[];
export type LidarLayerId = keyof typeof LIDAR_LAYERS;
