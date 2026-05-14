let pending = false
export const markCommunityRefresh = () => { pending = true }
export const consumeCommunityRefresh = () => { const v = pending; pending = false; return v }
