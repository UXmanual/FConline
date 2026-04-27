create extension if not exists pgcrypto;

create table if not exists public.user_level_profiles (
  user_id uuid primary key,
  xp_total integer not null default 0,
  level integer not null default 1,
  last_login_reward_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_level_profiles_level_idx
  on public.user_level_profiles (level desc, xp_total desc);

create table if not exists public.user_xp_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action_type text not null,
  xp_amount integer not null,
  reference_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_xp_history_user_action_reference_uidx
  on public.user_xp_history (user_id, action_type, reference_id);

create index if not exists user_xp_history_user_created_at_idx
  on public.user_xp_history (user_id, created_at desc);

create or replace function public.get_level_for_xp(p_xp_total integer)
returns integer
language plpgsql
as $$
declare
  safe_xp integer := greatest(coalesce(p_xp_total, 0), 0);
  total_required_xp integer := 0;
  xp_gain integer := 0;
  resolved_level integer := 1;
  current_level integer := 2;
begin
  while current_level <= 99 loop
    if current_level between 2 and 10 then
      xp_gain := 20 + ((current_level - 2) * 5);
    elsif current_level between 11 and 20 then
      xp_gain := 70 + ((current_level - 11) * 10);
    elsif current_level between 21 and 30 then
      xp_gain := 175 + ((current_level - 21) * 15);
    elsif current_level between 31 and 40 then
      xp_gain := 330 + ((current_level - 31) * 20);
    elsif current_level between 41 and 50 then
      xp_gain := 535 + ((current_level - 41) * 25);
    elsif current_level between 51 and 60 then
      xp_gain := 790 + ((current_level - 51) * 30);
    elsif current_level between 61 and 70 then
      xp_gain := 1095 + ((current_level - 61) * 35);
    elsif current_level between 71 and 80 then
      xp_gain := 1450 + ((current_level - 71) * 40);
    elsif current_level between 81 and 90 then
      xp_gain := 1855 + ((current_level - 81) * 45);
    else
      xp_gain := 2310 + ((current_level - 91) * 50);
    end if;

    total_required_xp := total_required_xp + xp_gain;

    if safe_xp < total_required_xp then
      return resolved_level;
    end if;

    resolved_level := current_level;
    current_level := current_level + 1;
  end loop;

  if resolved_level > 99 then
    resolved_level := 99;
  end if;

  return resolved_level;
end;
$$;

create or replace function public.record_user_xp_event(
  p_user_id uuid,
  p_action_type text,
  p_xp_amount integer,
  p_reference_id text,
  p_reward_date date default null
)
returns table (
  awarded boolean,
  xp_total integer,
  level integer,
  last_login_reward_date date
)
language plpgsql
as $$
declare
  inserted_rows integer := 0;
begin
  insert into public.user_level_profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.user_xp_history (user_id, action_type, xp_amount, reference_id)
  values (p_user_id, p_action_type, greatest(coalesce(p_xp_amount, 0), 0), coalesce(p_reference_id, ''))
  on conflict (user_id, action_type, reference_id) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows = 0 then
    return query
      select
        false as awarded,
        profiles.xp_total,
        profiles.level,
        profiles.last_login_reward_date
      from public.user_level_profiles as profiles
      where profiles.user_id = p_user_id;
    return;
  end if;

  update public.user_level_profiles as profiles
  set
    xp_total = profiles.xp_total + greatest(coalesce(p_xp_amount, 0), 0),
    level = public.get_level_for_xp(profiles.xp_total + greatest(coalesce(p_xp_amount, 0), 0)),
    last_login_reward_date = coalesce(p_reward_date, profiles.last_login_reward_date),
    updated_at = now()
  where profiles.user_id = p_user_id;

  return query
    select
      true as awarded,
      profiles.xp_total,
      profiles.level,
      profiles.last_login_reward_date
    from public.user_level_profiles as profiles
    where profiles.user_id = p_user_id;
end;
$$;
