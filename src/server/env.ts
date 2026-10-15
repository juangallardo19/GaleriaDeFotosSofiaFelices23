// Las variables se pegan a mano en Vercel: se toleran espacios y un par de comillas alrededor
export function envValue(name: string, env: Record<string, string | undefined> = process.env): string | undefined {
  const raw = env[name]?.trim()
  if (!raw) return undefined
  const quoted = raw.length >= 2 && (raw[0] === '"' || raw[0] === "'") && raw.at(-1) === raw[0]
  const value = quoted ? raw.slice(1, -1).trim() : raw
  return value || undefined
}
