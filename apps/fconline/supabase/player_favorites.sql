create table if not exists public.player_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  player_id bigint not null,
  player_name text not null,
  season_name text,
  position text,
  level integer,
  created_at timestamptz not null default now()
);

create unique index if not exists player_favorites_user_player_unique_idx
  on public.player_favorites (user_id, player_id);

create index if not exists player_favorites_user_created_at_idx
  on public.player_favorites (user_id, created_at desc);
