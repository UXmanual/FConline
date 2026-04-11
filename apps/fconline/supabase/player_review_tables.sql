create extension if not exists pgcrypto;

create table if not exists public.player_review_posts (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  player_name text not null,
  nickname text not null,
  password_hash text not null,
  title text not null,
  content text not null,
  ip_prefix text,
  created_at timestamptz not null default now()
);

create index if not exists player_review_posts_player_id_idx
  on public.player_review_posts (player_id, created_at desc);

create table if not exists public.player_review_comments (
  id uuid primary key default gen_random_uuid(),
  review_post_id uuid not null references public.player_review_posts(id) on delete cascade,
  nickname text not null,
  content text not null,
  ip_prefix text,
  created_at timestamptz not null default now()
);

create index if not exists player_review_comments_review_post_id_idx
  on public.player_review_comments (review_post_id, created_at desc);
