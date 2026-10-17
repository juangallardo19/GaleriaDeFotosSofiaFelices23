import type { MediaKind } from './media-kind'

// Imagen genérica cuando el navegador no pudo sacar la miniatura (por ejemplo, videos del iPhone)
export const PLACEHOLDERS: Record<MediaKind, string> = {
  photo: '/assets/placeholder-foto.webp',
  video: '/assets/placeholder-video.webp',
}
