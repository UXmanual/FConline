alter table public.community_posts
  add column if not exists author_user_id uuid;

create index if not exists community_posts_author_user_id_idx
  on public.community_posts (author_user_id, created_at desc);
