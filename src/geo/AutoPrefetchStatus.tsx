/**
 * Ligne d'état du pré-chargement « autour de moi » (affichée dans le Menu).
 * Discrète : une phrase, pas de bouton — le pré-chargement est automatique.
 */

import { useEffect, useState } from 'react';
import {
  getAutoPrefetchState,
  subscribeAutoPrefetch,
  type AutoPrefetchState,
} from './autoPrefetch';

export function AutoPrefetchStatus() {
  const [state, setState] = useState<AutoPrefetchState>(getAutoPrefetchState());

  useEffect(() => subscribeAutoPrefetch(setState), []);

  const origin = state.centerSource === 'gps' ? 'ta position' : 'la maison';

  let text: string;
  switch (state.phase) {
    case 'running':
      text =
        state.total > 0
          ? `Cartes autour de ${origin} : téléchargement ${Math.round((state.downloaded / state.total) * 100)} % (${state.downloaded}/${state.total} tuiles)`
          : `Cartes autour de ${origin} : préparation…`;
      break;
    case 'done':
      text = `Cartes autour de ${origin} prêtes pour le hors-ligne (rayon ~1 h de marche).`;
      break;
    case 'skipped':
      text = 'Cartes autour de toi : déjà à jour.';
      break;
    case 'error':
      text = 'Téléchargement des cartes interrompu — reprendra au prochain lancement.';
      break;
    default:
      return null;
  }

  return (
    <p style={{ fontSize: '14px', color: '#444', margin: '8px 0' }}>
      {text}
    </p>
  );
}
