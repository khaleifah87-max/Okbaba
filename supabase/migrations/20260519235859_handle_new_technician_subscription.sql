create or replace function public.handle_new_technician_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only create subscription for technicians
  if NEW.user_type = 'technician' then
    insert into public.subscriptions (technician_id, plan, status, trial_ends_at)
    values (NEW.id, 'trial', 'active', now() + interval '45 days');
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_technician_created on public.profiles;
create trigger on_technician_created
  after insert on public.profiles
  for each row execute function public.handle_new_technician_subscription();