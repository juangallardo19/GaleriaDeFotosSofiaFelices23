import { z } from 'zod'
import { MAX_FILE_BYTES } from '@/features/media/media-kind'

const httpsOrLocal = z
  .string()
  .max(2000)
  .refine((v) => v.startsWith('https://') || v.startsWith('/assets/') || v.startsWith('data:image/'), 'URL inválida')

export const InitUploadBody = z.object({
  name: z.string().min(1).max(300),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
  type: z.string().max(100),
})

export const RegisterBody = z.object({
  driveFileId: z.string().min(1).max(200),
  kind: z.enum(['photo', 'video']),
  thumbUrl: httpsOrLocal,
  previewUrl: httpsOrLocal.nullable().optional(),
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(20_000),
  dominantColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  durationSec: z.number().nonnegative().max(24 * 3600).nullable(),
  sizeBytes: z.number().int().positive().max(MAX_FILE_BYTES),
})

export const CommentBody = z.object({
  text: z.string().max(4000).default(''),
  sticker: z.string().max(50).nullable().optional(),
})

export const EditCommentBody = z.object({ text: z.string().max(4000) })
export const HiddenBody = z.object({ hidden: z.boolean() })
export const GuestBody = z.object({ name: z.string().min(1).max(200) })
