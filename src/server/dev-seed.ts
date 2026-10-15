import type { Repos } from './container'
import type { Media } from './domain'

// Solo para desarrollo y E2E: recuerdos de ejemplo con las imágenes del propio sitio para ver el masonry lleno
const SAMPLES: [string, number, number, string, 'photo' | 'video'][] = [
  ['/assets/sofi.webp', 656, 900, '#e9b7c6', 'photo'],
  ['/assets/pastel.webp', 680, 633, '#f3d9c7', 'photo'],
  ['/assets/globo-2.webp', 360, 539, '#e8cf9a', 'video'],
  ['/assets/fondo/botellita-2.webp', 320, 477, '#c9b9ad', 'photo'],
  ['/assets/happy-birthday.webp', 900, 414, '#f6c7d6', 'photo'],
  ['/assets/fondo/botellita-5.webp', 320, 814, '#bfae9f', 'photo'],
  ['/assets/globo-3.webp', 360, 556, '#e8cf9a', 'photo'],
  ['/assets/fondo/botellita-4.webp', 320, 470, '#cdbdb0', 'video'],
  ['/assets/fondo/botellita-7.webp', 320, 300, '#d3c4b8', 'photo'],
  ['/assets/globo-naranja.webp', 400, 699, '#ffc08a', 'photo'],
  ['/assets/fondo/botellita-6.webp', 320, 366, '#c8b8ab', 'photo'],
  ['/assets/fondo/botellita-8.webp', 320, 478, '#cbbcaf', 'photo'],
]

export async function seedDemo(repos: Repos, guestId: string) {
  const other = await repos.guests.create({ name: 'Abuela Rosa', token: 'E2EABUELAROSA000000000' })
  const start = Date.now() - SAMPLES.length * 60_000
  for (const [i, [thumbUrl, width, height, dominantColor, kind]] of SAMPLES.entries()) {
    const media: Media = {
      id: `demo-${i + 1}`,
      guestId: i % 3 === 0 ? other.id : guestId,
      kind,
      driveFileId: `demo-${i + 1}`,
      thumbUrl,
      previewUrl: null,
      width,
      height,
      dominantColor,
      durationSec: kind === 'video' ? 42 + i : null,
      sizeBytes: 2_000_000 + i * 150_000,
      likesCount: (i * 7) % 13,
      commentsCount: 0,
      downloadsCount: (i * 3) % 7,
      hidden: false,
      createdAt: new Date(start + i * 60_000),
    }
    await repos.media.insert(media)
  }
}
