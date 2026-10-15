import type { StorageFolder, StorageProvider } from './types'

// Almacenamiento de desarrollo: no sube a ningún lado; permite correr la app sin credenciales de Google
export class DevStorage implements StorageProvider {
  private counter = 0

  async createUploadSession(_input: { name: string; size: number; mime: string; folder: StorageFolder; origin?: string }) {
    return { uploadUrl: `/api/dev-upload/${++this.counter}` }
  }
  async makePublic() {}
  downloadUrl(fileId: string) {
    return `/api/dev-upload/${fileId}`
  }
  streamUrl(fileId: string) {
    return `/api/dev-upload/${fileId}`
  }
  async remove() {}
  async quota() {
    return { usedBytes: 0, limitBytes: 15 * 1024 ** 3 }
  }
}
