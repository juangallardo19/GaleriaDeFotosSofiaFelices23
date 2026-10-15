'use client'

import { useRouter } from 'next/navigation'
import { ApiError, postJson } from '@/lib/api'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

function Polaroid({ src, alt, className, caption }: { src: string; alt: string; className: string; caption?: string }) {
  return (
    <figure className={`absolute rounded-[10px] bg-[#FFFDF8] p-3 pb-2 shadow-[0_14px_26px_rgb(90_18_56/0.18)] ${className}`}>
      <div className="aspect-square overflow-hidden rounded-md bg-rosa">
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" />
      </div>
      {caption && <figcaption className="pt-1.5 text-center font-script text-2xl text-fucsia">{caption}</figcaption>}
    </figure>
  )
}

export default function AdminLoginPage() {
  const router = useRouter()

  async function login(password: string) {
    try {
      await postJson('/api/admin/login', { password })
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false
      throw err
    }
  }

  return (
    <main className="flex min-h-dvh flex-1">
      <div aria-hidden="true" className="relative hidden flex-1 overflow-hidden bg-rosa/45 lg:block">
        <img src="/assets/banderines.webp" alt="" className="absolute left-[6%] top-0 w-[88%]" />
        <Polaroid src="/assets/sofi.webp" alt="" caption="Sofi · 23" className="left-[34%] top-[28%] w-[240px] -rotate-[5deg]" />
        <img src="/assets/corazon.webp" alt="" className="absolute left-[64%] top-[23%] w-[70px] rotate-[14deg]" />
        <img src="/assets/estrella.webp" alt="" className="absolute left-[27%] top-[25%] w-[54px] -rotate-12" />
        <img src="/assets/globo-2.webp" alt="" className="absolute left-[14%] top-[55%] w-[150px] -rotate-[9deg]" />
        <img src="/assets/globo-3.webp" alt="" className="absolute left-[66%] top-[56%] w-[146px] rotate-[8deg]" />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-[440px] rounded-panel border border-linea bg-white/80 p-8 shadow-[0_20px_50px_rgb(90_18_56/0.12)] md:p-10">
          <p className="font-script text-6xl text-fucsia">Sofi</p>
          <h1 className="mt-1 font-serif text-3xl">Panel de anfitriones</h1>
          <p className="mb-6 mt-2 text-sm leading-relaxed opacity-75">Solo para quienes organizan la fiesta: invitados, QR y moderación del álbum.</p>
          <AdminLoginForm login={login} onSuccess={() => router.replace('/admin/invitados')} />
        </div>
      </div>
    </main>
  )
}
