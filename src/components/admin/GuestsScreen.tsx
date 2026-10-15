'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api, postJson } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { Button, buttonClass } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { AdminShell } from './AdminShell'
import { GuestTable, type GuestRow } from './GuestTable'
import { GuestQr, NewGuestDialog, type CreatedGuest } from './NewGuestDialog'
import { StorageBar } from './StorageBar'

interface Stats {
  guests: number
  online: number
  media: { count: number; photos: number; videos: number; bytes: number }
  storage: { usedBytes: number; limitBytes: number } | null
}

function StatCard({ icon, value, label, children }: { icon: IconName; value: string; label: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-linea bg-white/72 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-[14px] bg-rosa text-fucsia">
          <Icon name={icon} size={20} strokeWidth={2} />
        </span>
        <span className="text-[26px] font-semibold leading-none md:text-[30px]">{value}</span>
      </div>
      <p className="text-[13px] opacity-70">{label}</p>
      {children}
    </div>
  )
}

function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#3A0B24]/45" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={label} className="aparecer relative w-full max-w-md rounded-panel bg-crema bg-[url('/assets/papel.jpg')] bg-[length:512px] p-6 shadow-2xl">
        <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-[15px]">
          <Icon name="close" size={20} strokeWidth={2} />
        </button>
        {children}
      </div>
    </div>
  )
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const r = await api<{ created: number; skipped: string[] }>('/api/admin/guests/import', { method: 'POST', headers: { 'content-type': 'text/csv' }, body: text })
      setResult(`${r.created === 1 ? 'Se creó 1 invitado' : `Se crearon ${r.created} invitados`}${r.skipped.length ? `. Ya existían: ${r.skipped.join(', ')}` : ''}.`)
      setText('')
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal label="Importar lista de invitados" onClose={onClose}>
      <h2 className="font-serif text-2xl">Importar lista</h2>
      <p className="mt-2 text-sm leading-relaxed opacity-75">Copia la columna de nombres desde Excel y pégala aquí, un nombre por línea. También sirve un archivo .csv.</p>
      <textarea
        aria-label="Nombres de los invitados"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={'Tía Marta\nPrimo Andrés\nAbuela Rosa'}
        className="mt-4 w-full rounded-2xl border border-linea bg-white p-3 text-sm outline-fucsia"
      />
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-fucsia">
        <Icon name="folder" size={18} strokeWidth={2} />
        Elegir archivo .csv
        <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={async (e) => setText(await (e.target.files?.[0]?.text() ?? Promise.resolve('')))} />
      </label>
      {result && <p className="mt-3 rounded-xl bg-[#e3f5ea] p-3 text-sm text-[#23784a]">{result}</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-fucsia">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button className="flex-1" icon="upload" disabled={!text.trim() || saving} onClick={submit}>
          {saving ? 'Importando…' : 'Importar'}
        </Button>
      </div>
    </Modal>
  )
}

export function GuestsScreen() {
  const [rows, setRows] = useState<GuestRow[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [qr, setQr] = useState<CreatedGuest | null>(null)

  const refresh = useCallback(() => {
    Promise.all([api<{ items: GuestRow[] }>('/api/admin/guests'), api<Stats>('/api/admin/stats')]).then(
      ([g, s]) => {
        setRows(g.items)
        setStats(s)
        setError(null)
      },
      (err) => setError(err instanceof Error ? err.message : 'No se pudo cargar'),
    )
  }, [])

  useEffect(() => {
    const t = setTimeout(refresh, 0)
    const every = setInterval(refresh, 30_000)
    return () => {
      clearTimeout(t)
      clearInterval(every)
    }
  }, [refresh])

  async function create(name: string): Promise<CreatedGuest> {
    const r = await postJson<{ guest: { name: string }; url: string; qr: string }>('/api/admin/guests', { name })
    refresh()
    return { name: r.guest.name, url: r.url, qr: r.qr }
  }

  async function showQr(id: string) {
    const r = await api<{ guest: { name: string }; url: string; qr: string }>(`/api/admin/guests/${id}`)
    setQr({ name: r.guest.name, url: r.url, qr: r.qr })
  }

  async function remove(id: string) {
    await api(`/api/admin/guests/${id}`, { method: 'DELETE' })
    refresh()
  }

  const entered = rows?.filter((r) => r.entered).length ?? 0
  const total = rows?.length ?? 0

  return (
    <AdminShell
      title="Invitados"
      subtitle={rows ? `${total} invitados · ${entered} ya entraron al álbum` : 'Cargando…'}
      actions={
        <>
          <Button variant="secondary" icon="upload" onClick={() => setImporting(true)}>
            Importar lista
          </Button>
          <Link href="/admin/tarjetas" className={buttonClass('secondary')}>
            <Icon name="printer" size={18} strokeWidth={2} />
            Imprimir tarjetas
          </Link>
          <Button icon="plus" onClick={() => setCreating(true)}>
            Nuevo invitado
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-rosa p-3 text-sm font-semibold text-fucsia">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard icon="users" value={String(total)} label={stats ? `Invitados · ${stats.online} en línea` : 'Invitados'} />
        <StatCard icon="check" value={String(entered)} label={`Ya entraron${total ? ` · ${Math.round((entered / total) * 100)} %` : ''}`} />
        <StatCard icon="image" value={String(stats?.media.count ?? 0)} label={`Recuerdos · ${stats?.media.videos ?? 0} videos`} />
        <StatCard icon="folder" value={stats?.storage ? formatBytes(stats.storage.usedBytes) : '—'} label="Espacio en Drive">
          {stats?.storage && <StorageBar usedBytes={stats.storage.usedBytes} limitBytes={stats.storage.limitBytes} />}
        </StatCard>
      </div>
      <div className="mt-7">{rows ? <GuestTable rows={rows} onShowQr={showQr} onDelete={remove} /> : <div className="shimmer h-64 rounded-card" aria-hidden="true" />}</div>

      <NewGuestDialog open={creating} create={create} onClose={() => setCreating(false)} />
      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={refresh} />}
      {qr && (
        <Modal label={`QR de ${qr.name}`} onClose={() => setQr(null)}>
          <div className="pt-6">
            <GuestQr guest={qr} />
          </div>
        </Modal>
      )}
    </AdminShell>
  )
}
