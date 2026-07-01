# Script de démo — 60 secondes, deux téléphones

> Concept en une phrase : **« Ta salle, en direct. »** Qui s'entraîne dans ta
> salle, maintenant — et le chat ne s'ouvre que si l'envie est réciproque.

## Checklist AVANT la démo (10 min avant, pas plus tôt)

1. **Relancer `supabase/seed/demo_live.sql`** (SQL Editor Supabase) — les
   minuteurs des check-ins se rafraîchissent (sinon ils expirent).
2. Téléphone A connecté en `test2@gmail.com`, téléphone B en `test3@gmail.com`
   (mot de passe habituel des comptes de test). Les deux sur la salle One
   Fitness. Renommer les pseudos si besoin depuis l'onglet Profil (éviter
   « Test »/« Test3 » à l'écran : mettre p. ex. « Omar » et « Sami »).
3. Webhook Supabase `notify-message` configuré (Database → Webhooks → INSERT
   sur `messages` → Edge Function notify-message) pour la notification de
   match. Sans lui, tout marche sauf le push.
4. Les deux téléphones : app ouverte sur l'onglet **Ma salle**, notifications
   autorisées, mode Ne pas déranger désactivé.

## Le déroulé (chronométré)

| Temps | Téléphone | Action | Ce que le jury voit |
|---|---|---|---|
| 0 s | A | Montrer l'écran Ma salle | « EN CE MOMENT » : 7 membres en direct, focus du jour, « ici depuis 12 min » |
| 10 s | A | Taper « Je suis à la salle » → Jambes · 2 h → « Je m'affiche » | Le panneau se replie, carte « Tu es visible » avec point pulsant |
| 15 s | B | (déjà sur Ma salle) | **La carte de A apparaît en direct, sans rafraîchir** — le moment clé |
| 25 s | A | Ouvrir le profil d'Emma (badge « Partant·e ») | CTA « Emma est partante — Accepter » |
| 35 s | A | Taper Accepter | **Confetti « Ça matche ! »** → bascule auto vers le chat, message 🤝 en pilule |
| 45 s | B | — | (Si B = compte matché) push reçu, tap → conversation |
| 50 s | B | Répondre « On se met au squat ? » | Le message arrive **en temps réel** sur A |
| 60 s | — | Conclure | « Le chat ne s'ouvre jamais sans consentement réciproque. » |

## Les 3 phrases de pitch

1. « Toutes les apps de mise en relation montrent des profils. Nous, on montre
   **qui est dans ta salle, maintenant, et ce qu'il vient bosser**. »
2. « Le chat ne s'ouvre que si l'envie est **réciproque** — zéro message non
   sollicité, par construction. »
3. « Tu l'ouvres à chaque séance, pas une fois : c'est un rituel, pas un
   annuaire. »

## Si quelque chose casse

- Le Live paraît vide → le seed a expiré : relancer `demo_live.sql` (30 s).
- Pas de push au match → webhook non configuré : ignorer, le reste fonctionne.
- Réseau de salle capricieux → partage de connexion du téléphone C.
