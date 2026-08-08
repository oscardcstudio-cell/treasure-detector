# Onboarding — treasure-detector

Bienvenue. Ce document te met au travail en dix minutes.

## 1. Lis le plan d'abord

**[`PLAN.md`](PLAN.md)** est le contrat d'exécution du projet. Il fait ~900 lignes ; les sections à lire avant de toucher au code :

| Section | Pourquoi |
|---|---|
| **§0** conventions | Les marqueurs `[FAIT]` / `[À VÉRIFIER]` / `[HYPOTHÈSE]` sont **contraignants** |
| **§5** architecture | Local-first, Supabase, les pièges déjà identifiés |
| **§6** contrat de données | **Tout le code s'écrit contre ce contrat.** À lire en entier |
| **§8** lots | Ton travail est là, avec ses critères d'acceptation |
| **§13** dépendances | Qui attend quoi, et ce qui définit la fin de la v1 |

## 2. La règle qui compte le plus

Le plan distingue trois statuts, et le mélange des trois est l'erreur qui coûte le plus cher ici :

- **[FAIT]** — sourcé, vérifié, utilisable tel quel.
- **[À VÉRIFIER]** — plausible mais non confirmé. **Vérifie avant de bâtir dessus**, et corrige le document si c'est faux.
- **[HYPOTHÈSE]** — une déduction, sans source. **Ne la transforme pas en contrainte.** Teste-la, ou pose la question.

Corollaire : n'annonce jamais « fait / ça marche / c'est vert » sans preuve produite dans le même tour — sortie brute de test, capture d'écran, déploiement confirmé. Si tu ne peux pas prouver, écris « fait, non vérifié ». Le plan a déjà dû être corrigé une fois pour cette raison (§2.1, l'hydrographie de la commune).

## 3. Contribuer

```bash
git clone https://github.com/oscardcstudio-cell/treasure-detector.git
cd treasure-detector
git checkout -b feat/<lot>-<description-courte>   # ex: feat/t1.1-superposition-cartes
```

Un lot = une branche = une PR. Le plan attribue à chaque lot des **fichiers en propriété exclusive** (§8) : n'écris pas dans les fichiers d'un autre lot, ça produit des conflits sur un projet où plusieurs agents travaillent en parallèle. Si tu as besoin d'un changement ailleurs, demande-le plutôt que de le faire.

Commits en français, une intention par commit. Sur un correctif de bug, ajouter une ligne `Root cause: <cause systémique>`.

## 4. Les deux vérifications qui débloquent le projet

Elles n'ont pas pu être faites depuis l'environnement d'origine : le proxy y bloque les domaines IGN. **Depuis un Mac, ça passe.** Si tu peux les faire, tu débloques deux lots d'un coup.

### A. Identifiant de la couche Cassini — bloque T1.1

```bash
curl -s "https://data.geopf.fr/annexes/ressources/wmts/cartes.xml" -o /tmp/cartes.xml

echo "=== IDENTIFIANTS ==="
grep -oE '<ows:Identifier>[^<]*(CASSINI|ETATMAJOR|PLANIGN|SCAN)[^<]*</ows:Identifier>' /tmp/cartes.xml \
  | sed 's/<[^>]*>//g' | sort -u

echo "=== BLOC CASSINI (format, TileMatrixSet, zooms) ==="
python3 -c "
import re
x = open('/tmp/cartes.xml').read()
for m in re.findall(r'<Layer>(?:(?!</Layer>).)*CASSINI(?:(?!</Layer>).)*</Layer>', x, re.S):
    print(m)
"
```

Ce qu'on cherche : l'identifiant exact (avec ou sans préfixe `BNF-IGNF_`), le `TileMatrixSet`, le format et les zooms min/max. **Attention** : pour les orthos, le TileMatrixSet n'est pas `PM` mais `PM_0_19` / `PM_6_19` / `PM_6_21` selon la couche — ne suppose pas, lis.

Cherche aussi les **orthophotos 1950-1965** : elles sont absentes de l'annexe `ortho.xml`, et on ne sait pas si elles sont servies en WMTS. Elles valent cher — c'est la vue d'avant le remembrement, avec les talus et chemins creux encore en place.

### B. Couverture LiDAR HD du Gers — bloque tout le rang C du scoring

Carte de suivi : <https://macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD>, zoomer sur Armous-et-Cau. La commune ressort **en bleu**, ce qui correspond très probablement à « déjà disponible » — mais la légende n'a pas encore été lue en entier. **Confirme le libellé exact du bleu.**

Si ce n'est pas disponible : repli sur le **RGE ALTI 1 m**, et écrire la limitation dans le README plutôt que de laisser croire à de la détection de microrelief à 0,5 m.

### Quand tu as les réponses
Mets à jour `docs/PLAN.md` : passe les `[À VÉRIFIER]` concernés en `[FAIT]` avec la valeur trouvée, et corrige le tableau des risques (§10, lignes 1, 2 et 2b).

## 5. Par où commencer

Rien n'existe encore. L'ordre le plus utile :

1. **T0.1** — scaffold du repo (Vite + React + TS + MapLibre + Dexie + PWA), CI, déploiement Railway.
2. **T0.2** — le contrat de données. **Barrière** : aucun lot de phase 1 ne démarre avant.
3. Puis phase 1 en parallèle (T1.1 à T1.7) et phase 2 en parallèle (documents seulement, aucun conflit de fichiers).

Le chemin le plus court vers un outil utilisable sur le terrain n'est pas la v1 complète : **T0.1 + T0.2 + T1.1 + T1.3 + T1.4 + T1.5** suffisent, avec `docs/zone/CIBLES.md` comme cerveau provisoire.

## 6. Ce qu'il ne faut pas faire

- **Copier du code de [`lidar2map`](https://github.com/nico579/lidar2map)** — GPL-3, ça contaminerait ce repo. Réimplémente SVF/LRM depuis les publications, ou consomme-le comme outil externe.
- **Committer des coordonnées de trouvailles** — `data/private/` est gitignoré, et c'est voulu.
- **Committer la clé `service_role` de Supabase.** La clé `anon` dans le bundle est normale et voulue ; `service_role` contourne la RLS et ouvre tout.
- **Coder la zone en dur.** Elle est un paramètre de `config/zone.json`.
- **Supposer qu'une couche IGN fonctionne** sans l'avoir affichée. La preuve d'acceptation de T1.1 est une capture d'écran.
