# Script de démo — 75 secondes, deux téléphones

> Concept en une phrase : **« Ta salle, en direct. »** Qui s'entraîne dans ta
> salle, maintenant — le chat ne s'ouvre que si l'envie est réciproque, et il
> débouche sur une séance planifiée.

## Checklist AVANT la démo (10 min avant, pas plus tôt)

1. **Relancer `supabase/seed/demo_live.sql`** (SQL Editor Supabase) — les
   minuteurs des check-ins se rafraîchissent (sinon ils expirent).
2. Téléphone A connecté en `test2@gmail.com` (**Omar**), téléphone B en
   `test3@gmail.com` (**Sami**) — les comptes sont déjà renommés et bio-és en
   base, rien à faire. Les deux sur la salle One Fitness.
3. ~~Configurer le webhook notify-message~~ **Plus nécessaire** : les push
   (messages, intents reçus, match) partent directement de la base (triggers
   pg_net). Vérifie juste que les notifications sont autorisées sur les deux
   téléphones.
4. App ouverte sur l'onglet **Ma salle** sur les deux appareils, Ne pas
   déranger désactivé.

## Le déroulé (chronométré)

| Temps | Téléphone | Action | Ce que le jury voit |
|---|---|---|---|
| 0 s | A | Montrer l'écran Ma salle | « EN CE MOMENT » : 7 membres en direct, focus du jour, « ici depuis 12 min » |
| 10 s | A | « Je suis à la salle » → Jambes · 2 h → « Je m'affiche » | Carte « Tu es visible » avec point ember pulsant |
| 15 s | B | (déjà sur Ma salle) | **La carte de A apparaît en direct, sans rafraîchir** — le moment clé |
| 25 s | A | Ouvrir le profil d'Emma (badge « Partant·e ») | CTA « Emma est partante — Accepter » |
| 35 s | A | Taper Accepter | **Confetti « Ça matche ! »** → chat, message 🤝 en pilule |
| 45 s | A | 📅 → demain · 18 h → « Proposer » | Carte de séance épinglée « En attente de confirmation » |
| 55 s | B | (si connecté en Emma) push reçu → Confirmer | Carte passe en « ✅ Séance confirmée · demain · 18 h » **en direct** sur A |
| 65 s | A | Retour sur Ma salle | Bannière « Séance avec Emma · demain · 18 h » en haut de l'écran |
| 75 s | — | Conclure | « Du live au match à la séance — sans un seul message non sollicité. » |

> Variante à 2 comptes seulement : B se connecte en `emma@demo.gympartner.app`
> (mot de passe `Demo1234!`) pour jouer Emma et confirmer la séance en direct.

## Les 3 phrases de pitch

1. « Toutes les apps de mise en relation montrent des profils. Nous, on montre
   **qui est dans ta salle, maintenant, et ce qu'il vient bosser**. »
2. « Le chat ne s'ouvre que si l'envie est **réciproque** — zéro message non
   sollicité, par construction (c'est verrouillé en base, pas en interface). »
3. « Et ça finit par une **séance planifiée**, pas par un chat mort : tu
   l'ouvres à chaque entraînement, c'est un rituel. »

## Si quelque chose casse

- Le Live paraît vide → le seed a expiré : relancer `demo_live.sql` (30 s).
- Pas de push → vérifier que l'app a la permission notifications (le pipeline
  serveur, lui, est automatique).
- Réseau de salle capricieux → partage de connexion du téléphone C.
