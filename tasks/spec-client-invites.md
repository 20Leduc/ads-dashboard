---
title: 'Liens d’invitation par client, liés à un email'
type: 'feature'
created: '2026-10-28'
status: 'in-progress'
---

## Intent

**Problème :** pour donner accès au dashboard à un client (ex. Ludivine pour LEARNIM), il faut aujourd'hui qu'elle se connecte une première fois, puis exécuter à la main un INSERT dans `master.client_users`.

**Approche :** l'administrateur crée une invitation (client + email) dans le SQL Editor et obtient un lien `/invite/<code>`. La personne ouvre le lien, saisit son email et reçoit le lien de connexion habituel. À la connexion, le dashboard rattache le compte à tous les clients pour lesquels une invitation valide existe **pour cet email** : le lien seul ne donne aucun accès.

## Décisions

1. Invitation liée à un email (validé le 2026-10-28) : un lien transféré ne sert à rien à une autre adresse.
2. Le rattachement se fait à la connexion (`claim_client_invites`), pas en suivant le code d'une page à l'autre : fonctionne même si le lien magique est ouvert sur un autre appareil ou navigateur.
3. Expiration par défaut : 14 jours. Une invitation ne sert qu'une fois ; elle peut être révoquée.
4. Pas d'interface d'administration : création et révocation par SQL (`create_client_invite`, `update … set revoked_at`).
5. La page d'invitation est publique (hors `/dashboard`) et n'affiche que le nom du client et un email masqué.

## Modèle

- `master.client_invites (id, code unique, client_slug, email, created_at, expires_at, accepted_at, accepted_by, revoked_at)`, RLS activée, aucun droit pour anon / authenticated.
- `create_client_invite(slug, email, jours)` → code ; réservée à service_role / SQL Editor.
- `get_client_invite(code)` → nom du client, email masqué, statut (valid / expired / accepted / revoked) ; anon et authenticated.
- `claim_client_invites()` → rattache `auth.uid()` aux clients des invitations valides de son email ; authenticated.

## Edge cases

| Cas | Résultat |
|---|---|
| Lien ouvert par une autre adresse | connexion possible, aucun client rattaché |
| Invitation expirée / révoquée / déjà utilisée | la page l'indique, rien n'est rattaché |
| Code inconnu ou mal formé | « invitation introuvable » |
| Personne déjà rattachée au client | pas de doublon dans `client_users` |
| Fonctions pas encore créées en base | la connexion fonctionne comme avant |

## Success criteria

- Une invitation pour l'email X sur LEARNIM : X se connecte et voit uniquement LEARNIM, sans SQL supplémentaire.
- Une autre adresse avec le même lien ne voit aucun client.
- Tests `node:test` des helpers, lint et build OK.
