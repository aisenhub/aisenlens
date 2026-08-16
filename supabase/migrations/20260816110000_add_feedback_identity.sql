alter table public.feedback_requests
add column if not exists submitter_identity text not null default 'free';

alter table public.feedback_requests
drop constraint if exists feedback_requests_submitter_identity_check;

alter table public.feedback_requests
add constraint feedback_requests_submitter_identity_check
check (submitter_identity in ('free', 'supporter'));

alter table public.feedback_requests
add column if not exists submission_source text not null default 'general';

alter table public.feedback_requests
drop constraint if exists feedback_requests_submission_source_check;

alter table public.feedback_requests
add constraint feedback_requests_submission_source_check
check (submission_source in ('general', 'supporter'));

update public.feedback_requests as feedback
set submitter_identity = case
  when entitlement.role = 'supporter' then 'supporter'
  else 'free'
end
from public.user_entitlements as entitlement
where entitlement.user_id = feedback.user_id;

create or replace function public.create_feedback_request(
  p_kind text,
  p_title text,
  p_content text,
  p_source text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_feedback_id uuid;
  normalized_title text := trim(coalesce(p_title, ''));
  normalized_content text := trim(coalesce(p_content, ''));
  current_role text;
  feedback_identity text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to submit feedback';
  end if;

  if p_kind not in ('bug', 'feature', 'experience', 'other') then
    raise exception 'Unsupported feedback kind';
  end if;

  if p_source not in ('general', 'supporter') then
    raise exception 'Unsupported feedback source';
  end if;

  if char_length(normalized_title) not between 3 and 80 then
    raise exception 'Feedback title must contain between 3 and 80 characters';
  end if;

  if char_length(normalized_content) not between 10 and 2000 then
    raise exception 'Feedback content must contain between 10 and 2000 characters';
  end if;

  select role into current_role
  from public.user_entitlements
  where user_id = auth.uid();

  feedback_identity := case when current_role = 'supporter' then 'supporter' else 'free' end;

  if p_source = 'supporter' and feedback_identity <> 'supporter' then
    raise exception 'Supporter identity is required to use this feedback channel';
  end if;

  insert into public.feedback_requests (user_id, kind, title, content, submitter_identity, submission_source)
  values (auth.uid(), p_kind, normalized_title, normalized_content, feedback_identity, p_source)
  returning id into new_feedback_id;

  return new_feedback_id;
end;
$$;

create or replace function public.can_access_supporter_feedback()
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to check supporter feedback access';
  end if;

  return exists (
    select 1
    from public.user_entitlements
    where user_id = auth.uid() and role = 'supporter'
  );
end;
$$;

revoke all on function public.can_access_supporter_feedback() from public;
revoke all on function public.create_feedback_request(text, text, text, text) from public;
grant execute on function public.can_access_supporter_feedback() to authenticated;
grant execute on function public.create_feedback_request(text, text, text, text) to authenticated;
