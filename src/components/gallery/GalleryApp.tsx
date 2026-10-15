'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { appendPage, mediaQuery, patchItem, prependNew, removeItem } from '@/features/gallery/gallery-state'
import { LiveFeed } from '@/features/gallery/live-feed'
import type { SortKey } from '@/features/gallery/sort'
import type { GalleryFilter } from '@/features/gallery/types'
import { createToggleLike } from '@/features/likes/like-command'
import { HEARTBEAT_MS } from '@/features/presence/presence'
import type { PublicMedia } from '@/server/serialize'
import { api } from '@/lib/api'
import { NEEDS_QR } from '@/lib/messages'
import { useMe } from '@/hooks/useMe'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { CommentsPanel } from '@/components/comments/CommentsPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Reveal } from '@/components/ui/Reveal'
import { Icon } from '@/components/ui/Icon'
import { MasonryGrid } from './MasonryGrid'
import { MediaCard, type TapePosition } from './MediaCard'
import { MediaViewer } from './MediaViewer'
import { NewItemsPill } from './NewItemsPill'
import { PresenceBadge } from './PresenceBadge'
import { SkeletonCard } from './SkeletonCard'
import { SORT_LABELS, SortSheet } from './SortSheet'

export type GalleryMode = 'todo' | 'mios' | 'likes'

interface Props {
  mode: GalleryMode
  empty: { title: string; text: string; action?: { label: string; href: string } }
}

interface Page {
  items: PublicMedia[]
  nextCursor: string | null
}

// Cinta washi de vez en cuando: 1 de cada 3 cards, variando posición y color
const TAPES: { pos: TapePosition; color: string }[] = [
  { pos: 'top', color: '#F7B8CF' },
  { pos: 'tr', color: '#FFC08A' },
  { pos: 'tl', color: '#F6D98B' },
  { pos: 'top', color: '#FFC08A' },
]

const SKELETONS = [
  [600, 800],
  [600, 600],
  [600, 900],
  [600, 700],
  [600, 820],
  [600, 640],
]

interface LiveItem {
  id: string
  createdAt: Date
  media: PublicMedia
}

const toLive = (media: PublicMedia): LiveItem => ({ id: media.id, createdAt: new Date(media.createdAt), media })

const baseFilter = (mode: GalleryMode): GalleryFilter => (mode === 'mios' ? { mine: true } : mode === 'likes' ? { liked: true } : {})

export function GalleryApp({ mode, empty }: Props) {
  const me = useMe()
  const reducedMotion = usePrefersReducedMotion()
  const readOnly = me?.role === 'visitor'
  const [items, setItems] = useState<PublicMedia[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('recientes')
  const [extra, setExtra] = useState<GalleryFilter>({})
  const [sheet, setSheet] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [online, setOnline] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloads, setReloads] = useState(0)
  const topRef = useRef<HTMLDivElement>(null)
  const stuckProbe = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)
  const request = useRef(0)
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const filter = useMemo(() => ({ ...baseFilter(mode), ...extra }), [mode, extra])

  // Cada consulta lleva un turno: si el usuario cambia el orden a mitad de camino, la respuesta vieja se descarta
  useEffect(() => {
    const ticket = ++request.current
    api<Page>(mediaQuery({ sort, filter })).then(
      (page) => {
        if (ticket !== request.current) return
        setItems(page.items)
        setCursor(page.nextCursor)
        setLoading(false)
      },
      (err) => {
        if (ticket !== request.current) return
        setError(err instanceof Error ? err.message : 'No se pudo cargar el álbum')
        setLoading(false)
      },
    )
  }, [sort, filter, reloads])

  const loadMore = useCallback(
    (from: string) => {
      const ticket = ++request.current
      setLoading(true)
      api<Page>(mediaQuery({ sort, filter, cursor: from })).then(
        (page) => {
          if (ticket !== request.current) return
          setItems((prev) => appendPage(prev, page.items))
          setCursor(page.nextCursor)
          setLoading(false)
        },
        (err) => {
          if (ticket !== request.current) return
          setError(err instanceof Error ? err.message : 'No se pudo cargar el álbum')
          setLoading(false)
        },
      )
    },
    [sort, filter],
  )

  function changeView(nextSort: SortKey, nextExtra: GalleryFilter) {
    setSort(nextSort)
    setExtra(nextExtra)
    setItems([])
    setCursor(null)
    setOpen(null)
    setError(null)
    setLoading(true)
  }

  function reload() {
    setError(null)
    setLoading(true)
    setReloads((n) => n + 1)
  }

  useEffect(() => {
    const el = sentinel.current
    if (!el || !cursor || loading) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore(cursor)
      },
      { rootMargin: '900px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [cursor, loading, loadMore])

  const live = useMemo(
    () =>
      new LiveFeed<LiveItem>({
        fetchNewer: async (since) => {
          const { items } = await api<{ items: PublicMedia[] }>(`/api/media/new?since=${encodeURIComponent(since.toISOString())}`)
          return items.map(toLive)
        },
      }),
    [],
  )
  const liveState = useSyncExternalStore(
    (cb) => live.subscribe(cb),
    live.getState,
    live.getState,
  )
  const liveEnabled = mode === 'todo' && sort === 'recientes' && !extra.kind && !extra.mine && !extra.liked

  useEffect(() => {
    if (!liveEnabled || loading) return
    const known = itemsRef.current.map(toLive)
    live.markSeen(known)
    live.start(known[0]?.createdAt ?? new Date())
    return () => live.stop()
  }, [live, liveEnabled, loading])

  function showNew() {
    const fresh = live.flush().map((l) => l.media)
    setItems((prev) => prependNew(prev, fresh))
    topRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (mode !== 'todo') return
    let alive = true
    const beat = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const r = await api<{ online: number }>('/api/presence', { method: 'POST' })
        if (alive) setOnline(r.online)
      } catch {
        // la presencia es decorativa: si falla, se intenta en el siguiente latido
      }
    }
    void beat()
    const t = setInterval(beat, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      alive = false
      clearInterval(t)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [mode])

  const toggleLike = useCallback(async (id: string) => {
    if (readOnly) {
      setNotice(NEEDS_QR)
      return
    }
    const command = createToggleLike({
      store: {
        get: () => {
          const m = itemsRef.current.find((i) => i.id === id)!
          return { liked: m.likedByViewer, count: m.likesCount }
        },
        set: (s) => setItems((prev) => patchItem(prev, id, { likedByViewer: s.liked, likesCount: s.count })),
      },
      api: () => api<{ liked: boolean; count: number }>(`/api/media/${id}/like`, { method: 'POST' }),
    })
    try {
      await command.execute()
      if (mode === 'likes') setItems((prev) => prev.filter((m) => m.id !== id || m.likedByViewer))
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo dar like')
    }
  }, [readOnly, mode])

  async function remove(id: string) {
    try {
      await api(`/api/media/${id}`, { method: 'DELETE' })
      setOpen(null)
      setItems((prev) => removeItem(prev, id))
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo borrar')
    }
  }

  // La barra de filtros solo lleva sombra cuando queda pegada arriba
  useEffect(() => {
    const el = stuckProbe.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 80), { rootMargin: '-67px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const current = open !== null ? items[open] : null
  const canDelete = (m: PublicMedia) => me?.role === 'admin' || (me?.role === 'guest' && me.id === m.author.id)

  function next() {
    if (open === null) return
    if (open + 1 < items.length) setOpen(open + 1)
    else if (cursor && !loading) loadMore(cursor)
  }

  const kindChip = (kind: 'photo' | 'video' | undefined, label: string) => {
    const active = extra.kind === kind
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => changeView(sort, { ...extra, kind })}
        className="opcion flex min-h-10 shrink-0 items-center gap-1.5 rounded-chip px-3.5 text-[12.5px] font-medium hover:-translate-y-0.5 active:scale-95"
      >
        {kind && <Icon name={kind === 'photo' ? 'image' : 'play'} size={14} filled={kind === 'video'} />}
        {label}
      </button>
    )
  }

  return (
    <section id="galeria" aria-label="Recuerdos" className="relative scroll-mt-20">
      <div ref={topRef} className="scroll-mt-24" />
      <div ref={stuckProbe} aria-hidden="true" className="h-px" />
      <Reveal
        className={`papel sticky top-[66px] z-30 -mx-4 mb-4 px-4 py-2.5 transition-shadow duration-300 md:-mx-8 md:px-8 ${stuck ? 'shadow-[0_8px_18px_-10px_rgb(90_18_56/0.35)]' : ''}`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center gap-2">
          <div className="sin-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {kindChip(undefined, 'Todo')}
            {kindChip('photo', 'Fotos')}
            {kindChip('video', 'Videos')}
          </div>
          <button
            type="button"
            aria-label={`Ordenar y filtrar: ${SORT_LABELS[sort]}`}
            onClick={() => setSheet(true)}
            className="opcion flex min-h-10 shrink-0 items-center gap-1.5 rounded-chip px-3 text-[12.5px] font-semibold hover:-translate-y-0.5 active:scale-95"
          >
            <Icon name="sort" size={16} strokeWidth={2} className="text-naranja" />
            <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
            <Icon name="chevronDown" size={14} strokeWidth={2} />
          </button>
        </div>
        {(liveState.pending > 0 || (mode === 'todo' && online > 0)) && (
          <div className="mx-auto mt-2 flex max-w-[1440px] flex-wrap items-center justify-center gap-2">
            {mode === 'todo' && <PresenceBadge count={online} />}
            {liveEnabled && <NewItemsPill count={liveState.pending} onShow={showNew} />}
          </div>
        )}
      </Reveal>

      {error && items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm">{error}</p>
          <button type="button" onClick={reload} className="mt-3 min-h-11 rounded-boton bg-rosa px-5 text-sm font-semibold text-fucsia">
            Reintentar
          </button>
        </div>
      ) : !loading && items.length === 0 ? (
        <EmptyState {...empty} />
      ) : (
        <MasonryGrid
          items={items.length > 0 ? items : []}
          reducedMotion={reducedMotion}
          renderItem={(m, i) => (
            <MediaCard
              media={m}
              readOnly={readOnly}
              onOpen={() => setOpen(i)}
              onToggleLike={toggleLike}
              tape={i % 3 === 0 ? TAPES[(i / 3) % TAPES.length].pos : undefined}
              tapeColor={TAPES[Math.floor(i / 3) % TAPES.length].color}
            />
          )}
          footer={
            <>
              {loading && (
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
                  {SKELETONS.map(([w, h], i) => (
                    <SkeletonCard key={i} width={w} height={h} />
                  ))}
                </div>
              )}
              <div ref={sentinel} className="h-px" />
              {!loading && !cursor && items.length > 6 && <p className="py-8 text-center font-script text-3xl text-fucsia">Eso es todo, por ahora</p>}
            </>
          }
        />
      )}

      {!readOnly && me && mode === 'todo' && (
        <Link
          href="/subir"
          aria-label="Subir recuerdos"
          className="cosido sombra-sticker entrada group fixed bottom-5 right-5 z-30 flex size-[60px] items-center justify-center rounded-[22px] bg-fucsia text-white transition-[transform,background-color] duration-300 [--animacion:entrar-pop] [--retraso:600ms] hover:scale-110 hover:bg-rosa-vivo active:scale-95 md:bottom-8 md:right-8"
        >
          <span className="transition-transform duration-300 group-hover:rotate-90">
            <Icon name="plus" size={26} />
          </span>
        </Link>
      )}

      {notice && (
        <p role="status" className="aparecer fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl bg-vino px-4 py-3 text-center text-sm text-crema shadow-xl">
          {notice}
        </p>
      )}

      {sheet && (
        <SortSheet
          open
          sort={sort}
          filter={extra}
          readOnly={readOnly || mode !== 'todo'}
          onClose={() => setSheet(false)}
          onApply={(s, f) => {
            changeView(s, f)
            setSheet(false)
          }}
        />
      )}

      {current && me && (
        <MediaViewer
          media={current}
          position={`${(open ?? 0) + 1} / ${items.length}${cursor ? '+' : ''}`}
          readOnly={readOnly}
          onClose={() => setOpen(null)}
          onPrev={() => setOpen((o) => (o !== null && o > 0 ? o - 1 : o))}
          onNext={next}
          onToggleLike={toggleLike}
          onDelete={canDelete(current) ? remove : undefined}
        >
          <CommentsPanel
            key={current.id}
            mediaId={current.id}
            viewer={{ id: me.id, role: me.role }}
            onCountChange={(id, count) => setItems((prev) => patchItem(prev, id, { commentsCount: count }))}
          />
        </MediaViewer>
      )}
    </section>
  )
}
