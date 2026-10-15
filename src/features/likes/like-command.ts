export interface LikeState {
  liked: boolean
  count: number
}

export interface Command {
  execute(): Promise<void>
  undo(): Promise<void>
}

interface LikeStore {
  get(): LikeState
  set(state: LikeState): void
}

// Command: cambio optimista inmediato, confirmación del servidor y reversión si falla
export function createToggleLike(deps: { store: LikeStore; api: (liked: boolean) => Promise<LikeState> }): Command {
  let before: LikeState | null = null

  async function apply(target: boolean, fallback: LikeState) {
    const current = deps.store.get()
    deps.store.set({ liked: target, count: Math.max(0, current.count + (target === current.liked ? 0 : target ? 1 : -1)) })
    try {
      deps.store.set(await deps.api(target))
    } catch (err) {
      deps.store.set(fallback)
      throw err
    }
  }

  return {
    async execute() {
      before = deps.store.get()
      await apply(!before.liked, before)
    },
    async undo() {
      if (!before) return
      const snapshot = deps.store.get()
      await apply(before.liked, snapshot)
    },
  }
}
