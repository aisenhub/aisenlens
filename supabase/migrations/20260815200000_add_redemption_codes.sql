create extension if not exists pgcrypto with schema extensions;

alter table public.user_entitlements
drop constraint if exists user_entitlements_source_check;

alter table public.user_entitlements
add constraint user_entitlements_source_check
check (source in ('signup', 'manual', 'payment', 'redemption'));

create table if not exists public.redemption_campaigns (
  id text primary key,
  name text not null,
  entitlement_kind text not null check (entitlement_kind = 'supporter'),
  max_redemptions integer not null check (max_redemptions > 0),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.redemption_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.redemption_campaigns(id),
  code_hash text not null unique,
  status text not null default 'issued' check (status in ('issued', 'redeemed', 'revoked')),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'redeemed') = (redeemed_by is not null and redeemed_at is not null))
);

create table if not exists public.redemption_claims (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.redemption_campaigns(id),
  code_id uuid not null unique references public.redemption_codes(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create index if not exists redemption_codes_campaign_status_idx
on public.redemption_codes (campaign_id, status);

create index if not exists redemption_claims_campaign_claimed_idx
on public.redemption_claims (campaign_id, claimed_at);

alter table public.redemption_campaigns enable row level security;
alter table public.redemption_codes enable row level security;
alter table public.redemption_claims enable row level security;

drop policy if exists "Users can view own redemption claims" on public.redemption_claims;
create policy "Users can view own redemption claims"
on public.redemption_claims for select
using (auth.uid() = user_id);

create or replace function public.apply_support_entitlement(
  p_user_id uuid,
  p_entitlement_kind text,
  p_source text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_entitlement_kind <> 'supporter' then
    raise exception 'Unsupported entitlement kind';
  end if;

  if p_source not in ('manual', 'payment', 'redemption') then
    raise exception 'Unsupported entitlement source';
  end if;

  insert into public.user_entitlements (user_id, role, source)
  values (p_user_id, 'supporter', p_source)
  on conflict (user_id) do update
  set role = 'supporter',
      source = case when public.user_entitlements.role = 'free' then p_source else public.user_entitlements.source end,
      updated_at = now();
end;
$$;

create or replace function public.generate_redemption_codes(
  p_campaign_id text,
  p_count integer
)
returns table (code text)
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  campaign public.redemption_campaigns%rowtype;
  plain_code text;
  created_count integer := 0;
  existing_count integer;
begin
  if p_count <= 0 then
    raise exception 'Code count must be positive';
  end if;

  select * into campaign
  from public.redemption_campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Redemption campaign was not found';
  end if;

  select count(*) into existing_count
  from public.redemption_codes
  where campaign_id = p_campaign_id;

  if existing_count + p_count > campaign.max_redemptions then
    raise exception 'Requested codes exceed the campaign limit';
  end if;

  while created_count < p_count loop
    plain_code := 'AL-' || upper(encode(extensions.gen_random_bytes(10), 'hex'));

    insert into public.redemption_codes (campaign_id, code_hash)
    values (p_campaign_id, encode(extensions.digest(plain_code, 'sha256'), 'hex'))
    on conflict (code_hash) do nothing;

    if found then
      code := plain_code;
      return next;
      created_count := created_count + 1;
    end if;
  end loop;
end;
$$;

create or replace function public.redeem_support_code(p_code text)
returns table (role text)
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  normalized_code text;
  code_record public.redemption_codes%rowtype;
  campaign public.redemption_campaigns%rowtype;
  current_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to redeem a code';
  end if;

  normalized_code := upper(trim(coalesce(p_code, '')));
  if normalized_code !~ '^AL-[0-9A-F]{20}$' then
    raise exception 'Invalid redemption code';
  end if;

  select * into code_record
  from public.redemption_codes
  where code_hash = encode(extensions.digest(normalized_code, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Invalid redemption code';
  end if;

  select * into campaign
  from public.redemption_campaigns
  where id = code_record.campaign_id
  for update;

  if not found then
    raise exception 'This redemption campaign is unavailable';
  end if;

  if code_record.status <> 'issued' then
    raise exception 'This redemption code is no longer available';
  end if;

  if not campaign.is_active or (campaign.starts_at is not null and campaign.starts_at > now()) or (campaign.ends_at is not null and campaign.ends_at <= now()) then
    raise exception 'This redemption campaign is unavailable';
  end if;

  if exists (
    select 1 from public.redemption_claims
    where campaign_id = campaign.id and user_id = auth.uid()
  ) then
    raise exception 'You have already redeemed this campaign';
  end if;

  if (select count(*) from public.redemption_claims where campaign_id = campaign.id) >= campaign.max_redemptions then
    raise exception 'This redemption campaign has reached its limit';
  end if;

  insert into public.redemption_claims (campaign_id, code_id, user_id)
  values (campaign.id, code_record.id, auth.uid());

  update public.redemption_codes
  set status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
  where id = code_record.id;

  perform public.apply_support_entitlement(auth.uid(), campaign.entitlement_kind, 'redemption');

  select user_entitlements.role
  into current_role
  from public.user_entitlements as user_entitlements
  where user_entitlements.user_id = auth.uid();

  role := current_role;
  return next;
end;
$$;

insert into public.redemption_campaigns (id, name, entitlement_kind, max_redemptions, is_active)
values ('supporter_2026', 'AisenLens 支持者兑换码', 'supporter', 500, true)
on conflict (id) do update
set name = excluded.name,
    entitlement_kind = excluded.entitlement_kind,
    max_redemptions = excluded.max_redemptions,
    is_active = true;

revoke all on function public.apply_support_entitlement(uuid, text, text) from public;
revoke all on function public.generate_redemption_codes(text, integer) from public;
revoke all on function public.redeem_support_code(text) from public;
grant execute on function public.redeem_support_code(text) to authenticated;
