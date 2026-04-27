-- Reports system
-- Run this in Supabase SQL Editor

create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in (
    'community_post',
    'community_comment',
    'player_review_post',
    'player_review_comment'
  )),
  target_id text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz default now()
);

-- Prevent duplicate reports from the same user on the same target
create unique index if not exists reports_unique_per_user
  on reports (reporter_id, target_type, target_id)
  where reporter_id is not null;

-- Index for admin queries
create index if not exists reports_status_created_at
  on reports (status, created_at desc);
