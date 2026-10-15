import type { StorageProvider, StorageFolder } from '@/server/storage/types'
import type { Mailer } from '@/server/mail/types'
import type { ThumbStore, ThumbVariant } from '@/server/storage/thumbs'

export class FakeStorage implements StorageProvider {
  sessions: { name: string; size: number; mime: string; folder: StorageFolder }[] = []
  publicIds = new Set<string>()
  removed: string[] = []
  usedBytes = 0
  limitBytes = 15 * 1024 ** 3

  async createUploadSession(input: { name: string; size: number; mime: string; folder: StorageFolder; origin?: string }) {
    this.sessions.push(input)
    return { uploadUrl: `https://upload.fake/${this.sessions.length}` }
  }
  async makePublic(fileId: string) {
    this.publicIds.add(fileId)
  }
  downloadUrl(fileId: string) {
    return `https://drive.fake/download/${fileId}`
  }
  streamUrl(fileId: string) {
    return `https://drive.fake/stream/${fileId}`
  }
  async remove(fileId: string) {
    this.removed.push(fileId)
  }
  async quota() {
    return { usedBytes: this.usedBytes, limitBytes: this.limitBytes }
  }
}

export class FakeThumbStore implements ThumbStore {
  saved: { contentType: string; size: number; variant: ThumbVariant }[] = []
  async put(input: { data: ArrayBuffer; contentType: string; variant: ThumbVariant }) {
    this.saved.push({ contentType: input.contentType, size: input.data.byteLength, variant: input.variant })
    return `https://thumbs.fake/${input.variant}-${this.saved.length}.webp`
  }
}

export class FakeMailer implements Mailer {
  sent: { to: string; subject: string; text: string }[] = []
  async send(msg: { to: string; subject: string; text: string }) {
    this.sent.push(msg)
  }
}

export function clock(start = '2026-10-16T20:00:00Z') {
  let t = new Date(start).getTime()
  return {
    now: () => new Date(t),
    advance: (ms: number) => void (t += ms),
  }
}

export function sequentialIds(prefix = 'id') {
  let n = 0
  return () => `${prefix}${++n}`
}
