- source_spec: `tasks/spec-fix-dashboard-event-sourcing.md`
  summary: Révoquer l'accès direct anon aux tables des schémas tenants et vérifier tous les grants/RLS.
  evidence: Une lecture directe de `client_robin_worms.fact_lead_events` avec la clé anon a réussi pendant le diagnostic ; la RPC corrigée protège son propre accès mais ne retire pas ce grant préexistant, et la spec exige une approbation avant toute autre modification de schéma.

- source_spec: `tasks/spec-fix-dashboard-event-sourcing.md`
  summary: Remplacer la pagination RPC par offset par une pagination curseur sur une clé immuable.
  evidence: L'ordre SQL est maintenant stable jusqu'à `id`, mais des insertions concurrentes pendant plusieurs appels `.range()` peuvent encore déplacer les offsets et provoquer doublons ou omissions.

- source_spec: `tasks/spec-fix-dashboard-event-sourcing.md`
  summary: Résorber la dette ESLint historique des composants dashboard déclarés pendant le rendu.
  evidence: Le lint ciblé de la nouvelle logique passe, mais `npm run lint` global conserve 29 erreurs préexistantes, principalement `react-hooks/static-components`, ainsi que 22 warnings.
