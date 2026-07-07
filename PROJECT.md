# Ads Performance Dashboard — Contexte Projet

## Vision
Dashboard multi-tenant pour tracker les performances des campagnes ads par client.
Chaque client a son propre espace isolé avec ses données.

## Stack
- Frontend : Next.js 16, shadcn/ui (preset Luma), Recharts, Tailwind CSS
- Base de données : Supabase (PostgreSQL), architecture schema-per-tenant
- Auth : Supabase Auth magic link
- Sync data : n8n (Airtable → Supabase)
- Hébergement : VPS Hostinger

## Charte visuelle
- Fond : #0a0a0a / #111111
- Texte : #ffffff
- Accent : #00D18B (vert)
- Style : dark, épuré, premium

## Architecture base de données
- Schema master : table clients (id, slug, name, supabase_user_id, schema_name)
- Schema par client : client_test (premier client de test)
- Table principale : fact_lead_events (event sourcing — tous les events leads)
- Table dépenses : fact_daily_spend
- Table campagnes : dim_campaigns

## Colonnes fact_lead_events
lead_id, event_type, event_at, campaign_id, adset_id, ad_id,
platform, social_network, campaign_name, adset_name, ad_name,
firstname, lastname, email, phone, placement, device,
date_setting, date_closing, show_no_show, type_projet, type_achat,
age_range, job_situation, salary_range, setting_status, closing_status,
form_answers_json, raw_data_json

## Pages du dashboard
1. Leads Tracking — quantité leads, évolution dans le temps, par source
2. Setting Tracking — même chose filtré par setting_status
3. Closing Tracking — deals, taux show/no show, par source
4. Ads Performance — perf par réseau social et plateforme
5. Cost Tracking — dépenses, CPL, CPQL, coût par deal

## Composants déjà créés
- components/layout/Sidebar.jsx
- components/layout/Header.jsx
- app/dashboard/layout.jsx
- lib/supabase.js

## Supabase
- URL : https://cjeueuzqsibhymbwyfyy.supabase.co
- Schema client test : client_test
- Les requêtes utilisent la fonction RPC get_test_leads() pour accéder au schema client_test
