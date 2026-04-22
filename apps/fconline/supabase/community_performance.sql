alter table public.community_posts
  add column if not exists comment_count integer not null default 0;

update public.community_posts as posts
set comment_count = coalesce(comment_totals.total_count, 0)
from (
  select post_id, count(*)::integer as total_count
  from public.community_comments
  group by post_id
) as comment_totals
where posts.id = comment_totals.post_id;

update public.community_posts
set comment_count = 0
where comment_count is distinct from 0
  and not exists (
    select 1
    from public.community_comments
    where public.community_comments.post_id = public.community_posts.id
  );

create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

create index if not exists community_comments_post_id_created_at_idx
  on public.community_comments (post_id, created_at desc);
