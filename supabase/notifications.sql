create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  type text not null check (type in ('expiry','low_stock','exchange_match','exchange_request','system')),
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
for select using (pharmacy_id = auth_pharmacy_id());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
for update using (pharmacy_id = auth_pharmacy_id())
with check (pharmacy_id = auth_pharmacy_id());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
for delete using (pharmacy_id = auth_pharmacy_id());

drop policy if exists notifications_insert_own on public.notifications;
create policy notifications_insert_own on public.notifications
for insert with check (pharmacy_id = auth_pharmacy_id());