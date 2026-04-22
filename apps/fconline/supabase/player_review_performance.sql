alter table public.player_review_posts
  add column if not exists comment_count integer not null default 0;

update public.player_review_posts as posts
set comment_count = coalesce(comment_totals.total_count, 0)
from (
  select review_post_id, count(*)::integer as total_count
  from public.player_review_comments
  group by review_post_id
) as comment_totals
where posts.id = comment_totals.review_post_id;

update public.player_review_posts
set comment_count = 0
where comment_count is distinct from 0
  and not exists (
    select 1
    from public.player_review_comments
    where public.player_review_comments.review_post_id = public.player_review_posts.id
  );

create index if not exists player_review_posts_player_id_created_at_idx
  on public.player_review_posts (player_id, created_at desc);

create index if not exists player_review_comments_review_post_id_created_at_idx
  on public.player_review_comments (review_post_id, created_at desc);
