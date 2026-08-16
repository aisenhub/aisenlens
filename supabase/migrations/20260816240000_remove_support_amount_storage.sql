alter table public.support_requests
drop column if exists tier_id;

drop table if exists public.support_tiers;

drop function if exists public.create_support_request(text, text);

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

revoke all on function public.create_support_request(text) from public;
grant execute on function public.create_support_request(text) to authenticated;
