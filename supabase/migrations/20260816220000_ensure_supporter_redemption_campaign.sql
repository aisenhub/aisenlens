insert into public.redemption_campaigns (
  id,
  name,
  entitlement_kind,
  max_redemptions,
  is_active
)
values (
  'supporter_2026',
  'AisenLens 支持者兑换码',
  'supporter',
  500,
  true
)
on conflict (id) do update
set name = excluded.name,
    entitlement_kind = excluded.entitlement_kind,
    max_redemptions = excluded.max_redemptions,
    is_active = true;
