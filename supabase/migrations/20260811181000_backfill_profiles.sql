insert into public.profiles (id, display_name)
select id, raw_user_meta_data ->> 'display_name'
from auth.users
on conflict (id) do nothing;
