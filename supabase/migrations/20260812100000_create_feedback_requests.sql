create table if not exists public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bug', 'feature', 'experience', 'other')),
  title text not null check (char_length(title) between 3 and 80),
  content text not null check (char_length(content) between 10 and 2000),
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'planned', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feedback_requests enable row level security;

create or replace function public.create_feedback_request(
  p_kind text,
  p_title text,
  p_content text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_feedback_id uuid;
  normalized_title text := trim(coalesce(p_title, ''));
  normalized_content text := trim(coalesce(p_content, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to submit feedback';
  end if;

  if p_kind not in ('bug', 'feature', 'experience', 'other') then
    raise exception 'Unsupported feedback kind';
  end if;

  if char_length(normalized_title) not between 3 and 80 then
    raise exception 'Feedback title must contain between 3 and 80 characters';
  end if;

  if char_length(normalized_content) not between 10 and 2000 then
    raise exception 'Feedback content must contain between 10 and 2000 characters';
  end if;

  insert into public.feedback_requests (user_id, kind, title, content)
  values (auth.uid(), p_kind, normalized_title, normalized_content)
  returning id into new_feedback_id;

  return new_feedback_id;
end;
$$;

revoke all on function public.create_feedback_request(text, text, text) from public;
grant execute on function public.create_feedback_request(text, text, text) to authenticated;
