-- Real scheduled appointment (RDV) date/time for a closing_updated event, sourced
-- from GHL's calendar/appointment data rather than inferred from the status-change
-- timestamp. Lets the dashboard exclude future appointments from Show/No-Show tallies
-- until they've actually happened.
alter table client_robin_worms.fact_lead_events
  add column if not exists appointment_at timestamptz;

comment on column client_robin_worms.fact_lead_events.appointment_at is
  'Real scheduled RDV date/time from GHL calendar events, for closing_updated rows. Null when unknown.';

notify pgrst, 'reload schema';
