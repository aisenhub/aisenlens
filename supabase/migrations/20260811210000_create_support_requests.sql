create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_channel text not null check (payment_channel in ('wechat', 'alipay')),
  status text not null default 'pending' check (status in ('pending', 'user_claimed_paid', 'cancelled', 'verified', 'rejected', 'expired')),
  payment_reference_last4 text check (payment_reference_last4 is null or payment_reference_last4 ~ '^[0-9]{4}$'),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('payment_opened', 'payment_cancelled', 'payment_claimed_paid', 'payment_expired')),
  created_at timestamptz not null default now()
);

alter table public.support_requests enable row level security;
alter table public.support_request_events enable row level security;

drop policy if exists "Users can view own support requests" on public.support_requests;
create policy "Users can view own support requests"
on public.support_requests for select
using (auth.uid() = user_id);

drop policy if exists "Users can view own support request events" on public.support_request_events;
create policy "Users can view own support request events"
on public.support_request_events for select
using (auth.uid() = user_id);

create or replace function public.create_support_request(
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

  insert into public.support_requests (user_id, payment_channel)
  values (auth.uid(), p_payment_channel)
  returning id into new_request_id;

  insert into public.support_request_events (request_id, user_id, event_type)
  values (new_request_id, auth.uid(), 'payment_opened');

  return new_request_id;
end;
$$;

create or replace function public.record_support_request_event(
  p_request_id uuid,
  p_event_type text,
  p_payment_reference_last4 text default null
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  request_record public.support_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record a support event';
  end if;

  if p_event_type not in ('payment_cancelled', 'payment_claimed_paid', 'payment_expired') then
    raise exception 'Unsupported support event';
  end if;

  select * into request_record
  from public.support_requests
  where id = p_request_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Support request was not found';
  end if;

  if request_record.status <> 'pending' then
    return request_record.status;
  end if;

  if p_event_type = 'payment_expired' and request_record.expires_at > now() then
    raise exception 'Payment time limit has not expired';
  end if;

  if request_record.expires_at <= now() then
    update public.support_requests
    set status = 'expired', updated_at = now()
    where id = p_request_id;

    insert into public.support_request_events (request_id, user_id, event_type)
    values (p_request_id, auth.uid(), 'payment_expired');

    return 'expired';
  end if;

  if p_event_type = 'payment_claimed_paid' then
    if p_payment_reference_last4 is null or p_payment_reference_last4 !~ '^[0-9]{4}$' then
      raise exception 'Payment order reference must contain exactly four digits';
    end if;

    update public.support_requests
    set status = 'user_claimed_paid', payment_reference_last4 = p_payment_reference_last4, updated_at = now()
    where id = p_request_id;

    insert into public.support_request_events (request_id, user_id, event_type)
    values (p_request_id, auth.uid(), p_event_type);

    return 'user_claimed_paid';
  end if;

  if p_event_type = 'payment_cancelled' then
    update public.support_requests
    set status = 'cancelled', updated_at = now()
    where id = p_request_id;

    insert into public.support_request_events (request_id, user_id, event_type)
    values (p_request_id, auth.uid(), p_event_type);

    return 'cancelled';
  end if;

  raise exception 'Unsupported support event';
end;
$$;

revoke all on function public.create_support_request(text) from public;
revoke all on function public.record_support_request_event(uuid, text, text) from public;
grant execute on function public.create_support_request(text) to authenticated;
grant execute on function public.record_support_request_event(uuid, text, text) to authenticated;
