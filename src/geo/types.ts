/**
 * Types pour le système de téléchargement et de cache des tuiles
 */

export interface TileDownloadConfig {
  /** Niveau de zoom minimum */
  minZoom: number;
  /** Niveau de zoom maximum */
  maxZoom: number;
  /** Bbox en format [minLon, minLat, maxLon, maxLat] WGS84 */
  bbox: [number, number, number, number];
}

export interface TileDownloadOptions extends TileDownloadConfig {
  /** Couches WMTS à télécharger (IDs depuis src/map/layers.ts) */
  layerIds: string[];
  /** Callback de progression : (downloaded, total) */
  onProgress?: (downloaded: number, total: number) => void;
  /** Signal d'annulation */
  signal?: AbortSignal;
}

export interface TileEstimate {
  /** Nombre total de tuiles dans la pyramide */
  totalTiles: number;
  /** Estimation de la taille en Mo */
  estimatedSizeMb: number;
  /** Taille moyenne par tuile en Ko (heuristique) */
  avgSizeKb: number;
}

export interface DownloadProgress {
  /** Nombre de tuiles téléchargées */
  downloaded: number;
  /** Nombre total de tuiles */
  total: number;
  /** Progression en % (0-100) */
  percent: number;
  /** Taille téléchargée en octets */
  bytesDownloaded: number;
  /** Taille estimée totale en octets */
  bytesEstimated: number;
}

export interface CacheQuotaInfo {
  /** Quota disponible en octets */
  quota: number;
  /** Quota utilisé en octets */
  usage: number;
  /** Quota restant en octets */
  available: number;
  /** Pourcentage d'utilisation (0-100) */
  percentUsed: number;
}
