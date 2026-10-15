import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp } from 'drizzle-orm/pg-core'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date', precision: 3 })

export const guests = pgTable('guests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  createdAt: ts('created_at').notNull().defaultNow(),
  lastSeenAt: ts('last_seen_at'),
})

export const media = pgTable(
  'media',
  {
    id: text('id').primaryKey(),
    guestId: text('guest_id').notNull(),
    kind: text('kind', { enum: ['photo', 'video'] }).notNull(),
    driveFileId: text('drive_file_id').notNull(),
    thumbUrl: text('thumb_url').notNull(),
    previewUrl: text('preview_url'),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    dominantColor: text('dominant_color').notNull(),
    durationSec: real('duration_sec'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    downloadsCount: integer('downloads_count').notNull().default(0),
    hidden: boolean('hidden').notNull().default(false),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [index('media_created_idx').on(t.createdAt, t.id), index('media_guest_idx').on(t.guestId)],
)

export const likes = pgTable(
  'likes',
  {
    guestId: text('guest_id').notNull(),
    mediaId: text('media_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.guestId, t.mediaId] }), index('likes_media_idx').on(t.mediaId)],
)

export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    mediaId: text('media_id').notNull(),
    guestId: text('guest_id').notNull(),
    body: text('body').notNull(),
    sticker: text('sticker'),
    createdAt: ts('created_at').notNull(),
    editedAt: ts('edited_at'),
  },
  (t) => [index('comments_media_idx').on(t.mediaId, t.createdAt)],
)

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
})

export const schema = { guests, media, likes, comments, settings }

// DDL idempotente: se ejecuta con `npm run db:setup` y en las pruebas con PGlite
export const DDL = [
  `CREATE TABLE IF NOT EXISTS guests (
    id text PRIMARY KEY,
    name text NOT NULL,
    token text NOT NULL UNIQUE,
    created_at timestamptz(3) NOT NULL DEFAULT now(),
    last_seen_at timestamptz(3)
  )`,
  `CREATE TABLE IF NOT EXISTS media (
    id text PRIMARY KEY,
    guest_id text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('photo', 'video')),
    drive_file_id text NOT NULL,
    thumb_url text NOT NULL,
    preview_url text,
    width integer NOT NULL,
    height integer NOT NULL,
    dominant_color text NOT NULL,
    duration_sec real,
    size_bytes bigint NOT NULL,
    likes_count integer NOT NULL DEFAULT 0,
    comments_count integer NOT NULL DEFAULT 0,
    downloads_count integer NOT NULL DEFAULT 0,
    hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz(3) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS media_created_idx ON media (created_at DESC, id DESC)`,
  `CREATE INDEX IF NOT EXISTS media_guest_idx ON media (guest_id)`,
  `CREATE TABLE IF NOT EXISTS likes (
    guest_id text NOT NULL,
    media_id text NOT NULL,
    PRIMARY KEY (guest_id, media_id)
  )`,
  `CREATE INDEX IF NOT EXISTS likes_media_idx ON likes (media_id)`,
  `CREATE TABLE IF NOT EXISTS comments (
    id text PRIMARY KEY,
    media_id text NOT NULL,
    guest_id text NOT NULL,
    body text NOT NULL,
    sticker text,
    created_at timestamptz(3) NOT NULL,
    edited_at timestamptz(3)
  )`,
  `CREATE INDEX IF NOT EXISTS comments_media_idx ON comments (media_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL
  )`,
]
