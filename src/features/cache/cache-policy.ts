export type CacheStrategy = 'cache-first' | 'stale-while-revalidate' | 'network-first' | 'network-only'

export function cacheStrategyFor(url: URL, method: string): CacheStrategy {
  if (method.toUpperCase() !== 'GET') return 'network-only'
  // Los videos completos no se guardan en el celular para no llenarle la memoria a nadie
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('drive.google.com')) return 'network-only'
  if (url.hostname.endsWith('.blob.vercel-storage.com')) return 'cache-first'
  const path = url.pathname
  if (path.startsWith('/_next/static/') || path.startsWith('/assets/') || path.startsWith('/stickers/') || path.startsWith('/api/miniaturas/')) return 'cache-first'
  if (path.startsWith('/i/') || path.startsWith('/api/uploads') || path.startsWith('/api/admin') || path.startsWith('/admin')) return 'network-only'
  if (path === '/api/media' || (path.startsWith('/api/media/') && path.endsWith('/comments'))) return 'stale-while-revalidate'
  if (path.startsWith('/api/')) return 'network-only'
  return 'network-first'
}
