-- Shared Ops drafts. Existing membership helpers resolve access against auth.uid().
create table if not exists public.ops_work_orders (
  id text primary key,
  site_id uuid not null references public.sites(id),
  dedupe_key text not null,
  title text not null,
  priority text not null check (priority in ('low','normal','high','urgent')),
  department text not null,
  location text not null default '',
  description text not null default '',
  notification_subject text not null default '',
  review_state text not null default 'needs_review' check (review_state in ('needs_review','claimed','done')),
  proposed_assignee text not null default '',
  resolution_evidence text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id,dedupe_key),
  constraint ops_evidence_before_done check (review_state <> 'done' or length(trim(resolution_evidence)) > 0)
);

create index if not exists ops_work_orders_site_queue on public.ops_work_orders (site_id,created_at desc);
alter table public.ops_work_orders enable row level security;
revoke all on public.ops_work_orders from anon, authenticated;
grant select, insert, update on public.ops_work_orders to authenticated;

create policy ops_work_orders_read on public.ops_work_orders for select to authenticated
  using (private.ops_can_access_site(site_id));
create policy ops_work_orders_create on public.ops_work_orders for insert to authenticated
  with check (private.ops_can_access_site(site_id) and review_state = 'needs_review' and proposed_assignee = '' and resolution_evidence = '');
create policy ops_work_orders_manage on public.ops_work_orders for update to authenticated
  using (private.ops_can_manage_site(site_id))
  with check (private.ops_can_manage_site(site_id));
