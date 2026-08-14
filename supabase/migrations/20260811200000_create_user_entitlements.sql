create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'free' check (role in ('free', 'supporter', 'patron')),
  source text not null default 'signup' check (source in ('signup', 'manual', 'payment')),
  updated_at timestamptz not null default now()
);

alter table public.user_entitlements enable row level security;

drop policy if exists "Users can view own entitlement" on public.user_entitlements;
create policy "Users can view own entitlement"
on public.user_entitlements for select
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;

  insert into public.user_entitlements (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

insert into public.user_entitlements (user_id)
select id
from auth.users
on conflict (user_id) do nothing;
