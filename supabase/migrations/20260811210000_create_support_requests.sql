create table if not exists public.support_tiers (
  id text primary key,
  amount_cents integer not null check (amount_cents > 0),
  is_active boolean not null default true
);

insert into public.support_tiers (id, amount_cents)
values
  ('flower', 990),
  ('burger', 1990),
  ('coffee', 2990),
  ('movie', 4990),
  ('meal', 9900),
  ('patron', 19900)
on conflict (id) do update
set amount_cents = excluded.amount_cents,
    is_active = true;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier_id text not null references public.support_tiers(id),
  payment_channel text not null check (payment_channel in ('wechat', 'alipay')),
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'user_claimed_paid', 'cancelled', 'verified', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('payment_opened', 'payment_cancelled', 'payment_claimed_paid')),
  created_at timestamptz not null default now()
);

alter table public.support_tiers enable row level security;
alter table public.support_requests enable row level security;
alter table public.support_request_events enable row level security;

drop policy if exists "Authenticated users can view active support tiers" on public.support_tiers;
create policy "Authenticated users can view active support tiers"
on public.support_tiers for select to authenticated
using (is_active);

drop policy if exists "Users can view own support requests" on public.support_requests;
create policy "Users can view own support requests"
on public.support_requests for select
using (auth.uid() = user_id);

drop policy if exists "Users can view own support request events" on public.support_request_events;
create policy "Users can view own support request events"
on public.support_request_events for select
using (auth.uid() = user_id);

create or replace function public.create_support_request(
  p_tier_id text,
  p_message text,
  p_payment_channel text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create a support request';
  end if;

  if p_payment_channel not in ('wechat', 'alipay') then
    raise exception 'Unsupported payment channel';
  end if;

  if char_length(coalesce(p_message, '')) > 500 then
    raise exception 'Message is too long';
  end if;

  if not exists (
    select 1
    from public.support_tiers
    where id = p_tier_id and is_active
  ) then
    raise exception 'Support tier is unavailable';
  end if;

  insert into public.support_requests (user_id, tier_id, payment_channel, message)
  values (auth.uid(), p_tier_id, p_payment_channel, trim(coalesce(p_message, '')))
  returning id into new_request_id;

  insert into public.support_request_events (request_id, user_id, event_type)
  values (new_request_id, auth.uid(), 'payment_opened');

  return new_request_id;
end;
$$;

create or replace function public.record_support_request_event(
  p_request_id uuid,
  p_event_type text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record a support event';
  end if;

  if p_event_type not in ('payment_cancelled', 'payment_claimed_paid') then
    raise exception 'Unsupported support event';
  end if;

  if not exists (
    select 1
    from public.support_requests
    where id = p_request_id and user_id = auth.uid()
  ) then
    raise exception 'Support request was not found';
  end if;

  insert into public.support_request_events (request_id, user_id, event_type)
  values (p_request_id, auth.uid(), p_event_type);

  if p_event_type = 'payment_claimed_paid' then
    update public.support_requests
    set status = 'user_claimed_paid', updated_at = now()
    where id = p_request_id and status = 'pending';
  else
    update public.support_requests
    set status = 'cancelled', updated_at = now()
    where id = p_request_id and status = 'pending';
  end if;
end;
$$;

revoke all on function public.create_support_request(text, text, text) from public;
revoke all on function public.record_support_request_event(uuid, text) from public;
grant execute on function public.create_support_request(text, text, text) to authenticated;
grant execute on function public.record_support_request_event(uuid, text) to authenticated;
