export type StorageFolder = 'fotos' | 'videos'

// Adapter/Strategy: la app habla con esta interfaz; Drive, un doble de pruebas u otro proveedor la implementan
export interface StorageProvider {
  createUploadSession(input: { name: string; size: number; mime: string; folder: StorageFolder; origin?: string }): Promise<{ uploadUrl: string }>
  makePublic(fileId: string): Promise<void>
  downloadUrl(fileId: string): string
  streamUrl(fileId: string): string
  remove(fileId: string): Promise<void>
  quota(): Promise<{ usedBytes: number; limitBytes: number }>
  folderLinks?(): Promise<FolderLinks>
  // Miniatura que genera el proveedor para un video; null si todavía lo está procesando
  videoThumbnail?(fileId: string): Promise<VideoThumbnail | null>
}

export interface VideoThumbnail {
  image: Uint8Array
  contentType: string
  durationSec: number | null
}

export interface FolderLinks {
  all: string
  photos: string
  videos: string
}
