import { useState } from 'react';

/**
 * Bandeau légal — affiché quand la couche foncier est active.
 * Texte : agent meta-redacteur (2026-08-10), art. L531-14 code du
 * patrimoine vérifié Légifrance le même jour.
 */
export const LegalBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        padding: '10px 12px',
        background: '#fff8e1',
        borderBottom: '1px solid #ffca28',
        fontSize: '13px',
        color: '#3e2723',
      }}
    >
      <p style={{ margin: 0 }}>
        Cette couche montre le foncier, elle n'autorise rien. Sur parcelle privée (orange), il faut l'accord écrit
        du propriétaire. Toute découverte archéologique se déclare, même sur son terrain.{' '}
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: '#5d4037',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '12px',
            padding: 0,
          }}
        >
          {expanded ? 'moins' : 'en savoir plus'}
        </button>
      </p>
      {expanded && (
        <p style={{ margin: '8px 0 0' }}>
          Cette couche indique le type de foncier — communal, forêt gérée, privé —, pas un droit d'accès. Aucune
          source publique ne donne l'identité du propriétaire : l'app ne dit jamais à qui demander. Sur parcelle
          privée, l'accord écrit du propriétaire est obligatoire avant toute prospection. Toute découverte relevant
          du patrimoine archéologique se déclare (art. L531-14 du code du patrimoine), même sur son propre terrain.
        </p>
      )}
    </div>
  );
};
