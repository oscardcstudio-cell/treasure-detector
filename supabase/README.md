# Supabase — Sauvegarde en ligne de tes sorties

## État actuel (2026-08-08)

✅ Projet Supabase créé et configuré  
✅ 8 tables avec Row Level Security active  
✅ Clés branchées sur Railway (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)  
✅ RLS testée : écriture anonyme refusée (401), prête pour authentifiées  

## Ce qu'il te reste à faire

**Une seule action** : la première fois que tu ouvres l'app.

1. Ouvre l'app
2. Clique sur l'onglet **Menu**
3. Entre ton e-mail dans "Sauvegarde en ligne"
4. Clique **Recevoir le lien**
5. Ouvre le lien reçu par mail (il te connecte)
6. C'est prêt — tes sorties remontent maintenant en ligne

Les données sont sauvegardées d'abord localement sur le téléphone (tu peux prospecter hors ligne) et remontent à Supabase dès que tu es connecté et en ligne.

## Tester la RLS (optionnel)

La protection par Row Level Security est active. Sans authentification, toute tentative d'écriture est refusée (erreur `"new row violates row-level security policy"`). Après connexion via l'app, tu auras un JWT valide et les écritures seront acceptées.

```bash
# Voir les détails de test dans le ticket T1.7
# Commande pour tester avec un JWT après connexion :
curl -4 -X POST \
  "https://tpqwomoupjqwuqbwcwkc.supabase.co/rest/v1/sessions" \
  -H "Content-Type: application/json" \
  -H "apikey: VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
