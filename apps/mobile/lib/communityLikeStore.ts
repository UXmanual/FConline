const cache = new Map<string, { isLiked: boolean; likeCount: number }>()

export const likeStore = {
  get: (id: string) => cache.get(id),
  set: (id: string, isLiked: boolean, likeCount: number) => {
    cache.set(id, { isLiked, likeCount })
  },
}
