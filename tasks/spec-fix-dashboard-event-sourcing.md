---
title: 'Corriger les KPI du dashboard avec les événements réels'
type: 'bugfix'
created: '2026-08-14'
status: 'done'
baseline_commit: 'b09eff46e9a911dfc5a5f207fee77e0a02316c53'
review_loop_iteration: 0
context:
  - 'PROJECT.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le dashboard reçoit uniquement les snapshots `lead_created` depuis `get_lead_events`, alors que `client_robin_worms.fact_lead_events` contient aussi les événements `setting_updated` et `closing_updated`. Les pages utilisent ensuite les statuts des snapshots et mélangent les types d'événements, ce qui masque les mises à jour réelles ou gonfle les KPI.

**Approach:** Corriger la RPC SQL versionnée pour retourner tous les événements du tenant autorisé, puis centraliser côté client la séparation, l'enrichissement par `lead_id`, le filtrage temporel et la déduplication. Chaque page conservera son rendu actuel mais calculera ses métriques depuis le type d'événement qui lui appartient.

## Boundaries & Constraints

**Always:** Préserver la structure visuelle ; conserver les changements utilisateur existants ; utiliser `lead_created` uniquement comme source d'informations initiales et de KPI Leads ; utiliser `setting_updated` pour Setting et `closing_updated` pour Closing ; filtrer avec `event_at` du type concerné ; compter les `lead_id` distincts lorsqu'un KPI représente des leads ; conserver `spend_date` pour les dépenses ; enrichir les updates avec les dimensions du snapshot sans laisser les valeurs nulles écraser les données de base ; paginer avec un ordre stable.

**Ask First:** Toute modification de schéma autre que la fonction RPC ; toute suppression de code existant ; toute modification visuelle ; toute opération distante d'écriture sur Supabase.

**Never:** Compter les statuts présents dans `lead_created` comme événements Setting/Closing ; exposer un accès arbitraire aux schémas tenants depuis le navigateur ; écraser le diff non commité de `ClosingContent.js` ; modifier ou afficher des données personnelles.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Setting août | Snapshot avec statut + updates datés en août | Seuls les `setting_updated` d'août alimentent les KPI ; snapshot ignoré | Événements invalides ignorés sans casser le rendu |
| Closing août | Plusieurs statuts Closing pour un même lead | Statuts issus de `closing_updated`; KPI leads dédupliqués | Statut null exclu de Show/No-Show |
| Update incomplet | Update sans campagne/plateforme | Dimensions récupérées depuis `lead_created` par `lead_id` | Valeur `N/A` si aucun snapshot |
| Fin de journée | Événement à `23:59:59.500` | Inclus dans la date de fin choisie | Borne du lendemain exclusive |
| Doublon logique | Même lead/statut répété dans la période | Compté une fois dans un KPI de leads | Les graphes d'événements restent explicitement documentés |

</frozen-after-approval>

## Code Map

- `supabase/migrations/*_fix_get_lead_events.sql` -- RPC tenant-safe retournant tous les événements.
- `lib/supabase.js` -- pagination RPC avec ordre déterministe et schéma obligatoire.
- `lib/lead-events.js` -- helpers purs de séparation, jointure, dates et IDs distincts.
- `lib/lead-events.test.js` -- tests de régression avec `node:test`.
- `app/dashboard/leads/LeadsContent.js` -- cohorte `lead_created` uniquement.
- `app/dashboard/setting/SettingContent.js` -- KPI et dates `setting_updated`.
- `app/dashboard/closing/ClosingContent.js` -- KPI et dates `closing_updated`.
- `app/dashboard/costs/CostsContent.js` -- métriques séparées par type, dépenses sur `spend_date`.
- `app/dashboard/ads/AdsContent.js` -- funnel multi-type sans double comptage.

## Tasks & Acceptance

**Execution:**
- [x] Ajouter des tests rouges couvrant snapshot ignoré, updates dédupliqués, jointure non destructive et borne de fin.
- [x] Implémenter les helpers event sourcing minimaux et rendre les tests verts.
- [x] Versionner une RPC sécurisée retournant les trois types avec validation du tenant et ordre stable.
- [x] Migrer Leads et Setting vers les collections typées et vérifier.
- [x] Migrer Closing en préservant le diff utilisateur, puis Costs et Ads, et vérifier chaque incrément.
- [x] Exécuter tests, lint et build ; réaliser une revue finale des calculs.

**Acceptance Criteria:**
- Given les événements Robin d'août 2026, when la page Setting filtre août, then elle utilise les 275 `setting_updated` et compte les leads distincts par statut sans lire le snapshot.
- Given les 12 `closing_updated` d'août, when Closing filtre août, then No-Show et Show reposent sur `closing_status` et `event_at` uniquement.
- Given un lead possédant `lead_created` et `setting_updated`, when un KPI Setting est calculé, then le snapshot n'ajoute aucun comptage.
- Given tous les types retournés par la RPC, when Leads est affichée, then seuls les `lead_created` alimentent ses totaux et graphiques.
- Given une période filtrée dans Costs ou Ads, when les KPI sont calculés, then chaque métrique utilise son événement propriétaire et aucun update ne gonfle le total Leads.

## Spec Change Log

## Design Notes

La correction SQL doit autoriser le schéma demandé uniquement s'il correspond à l'utilisateur authentifié dans la table master `clients`. Les identifiants dynamiques doivent être échappés avec `%I`, et une fonction `SECURITY DEFINER` doit fixer son `search_path`. Le frontend conserve la RPC plutôt qu'un accès direct au schéma tenant.

## Verification

**Commands:**
- `node --test lib/lead-events.test.js` -- tous les cas event sourcing passent.
- `npm run lint` -- aucune nouvelle erreur ESLint.
- `npm run build` -- build Next.js réussi.

Note de vérification : le lint ciblé de la logique modifiée passe. Le lint global conserve
des erreurs historiques `react-hooks/static-components` et `react/no-unescaped-entities`,
sans nouvelle erreur issue de cette correction.

**Manual checks:**
- Après application de la migration SQL, août 2026 affiche 16 Leads, les événements Setting attendus et les 12 événements Closing selon leurs statuts.

## Suggested Review Order

**Sécurité et source des événements**

- Autorise uniquement le tenant authentifié et retourne le flux complet dans un ordre stable.
  [`202608140001_fix_get_lead_events.sql:5`](../supabase/migrations/202608140001_fix_get_lead_events.sql#L5)

- Rend le schéma explicite et conserve la pagination côté client.
  [`supabase.js:14`](../lib/supabase.js#L14)

**Modèle event sourcing partagé**

- Sépare les trois types avant tout calcul de page.
  [`lead-events.js:34`](../lib/lead-events.js#L34)

- Enrichit seulement les dimensions sans hériter des statuts du snapshot.
  [`lead-events.js:50`](../lib/lead-events.js#L50)

- Rend Show et No-Show exclusifs via le dernier événement Closing.
  [`lead-events.js:130`](../lib/lead-events.js#L130)

**Consommateurs du dashboard**

- Limite Leads aux créations et rattache le funnel à sa cohorte.
  [`LeadsContent.js:77`](../app/dashboard/leads/LeadsContent.js#L77)

- Calcule Setting exclusivement depuis les mises à jour datées.
  [`SettingContent.js:83`](../app/dashboard/setting/SettingContent.js#L83)

- Classe Closing depuis le dernier statut réel de chaque lead.
  [`ClosingContent.js:127`](../app/dashboard/closing/ClosingContent.js#L127)

- Sépare dépenses, créations, Setting et Closing avant les coûts unitaires.
  [`CostsContent.js:265`](../app/dashboard/costs/CostsContent.js#L265)

- Agrège Ads sans double compter les transitions d'un même lead.
  [`AdsContent.js:192`](../app/dashboard/ads/AdsContent.js#L192)

**Preuves de régression**

- Couvre snapshots ignorés, dates, jointure et transitions Closing exclusives.
  [`lead-events.test.js:170`](../lib/lead-events.test.js#L170)
