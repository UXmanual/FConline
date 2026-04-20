alter table public.community_comments
  add column if not exists author_user_id uuid;

create index if not exists community_comments_author_user_id_idx
  on public.community_comments (author_user_id, created_at desc);
