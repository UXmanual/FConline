alter table public.player_review_comments
  add column if not exists author_user_id uuid;

create index if not exists player_review_comments_author_user_id_idx
  on public.player_review_comments (author_user_id, created_at desc);
