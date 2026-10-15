export const ONLINE_WINDOW_MS = 60_000
export const HEARTBEAT_MS = 25_000

export function isOnline(lastSeenAt: Date | null, now: Date): boolean {
  return lastSeenAt !== null && now.getTime() - lastSeenAt.getTime() <= ONLINE_WINDOW_MS
}

export function countOnline(lastSeen: (Date | null)[], now: Date): number {
  return lastSeen.filter((d) => isOnline(d, now)).length
}

export function presenceLabel(count: number): string | null {
  if (count <= 0) return null
  return count === 1 ? '1 persona viendo el álbum' : `${count} personas viendo el álbum`
}
