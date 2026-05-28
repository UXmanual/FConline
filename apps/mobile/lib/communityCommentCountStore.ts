const cache = new Map<string, number>()

export const communityCommentCountStore = {
  get: (id: string) => cache.get(id),
  set: (id: string, count: number) => { cache.set(id, count) },
}
