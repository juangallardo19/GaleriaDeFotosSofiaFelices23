import { scriptCase } from '@/lib/format'
import { SofiPortrait } from '@/components/ui/SofiPortrait'

export function WelcomeScreen({ guestName, progress }: { guestName: string; progress: number }) {
  const p = Math.max(0, Math.min(1, progress))
  const percent = Math.round(p * 100)
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-gradient-to-b from-rosa/0 to-rosa/90 px-6 pb-10 text-center">
      <img src="/assets/banderines.webp" alt="" width={900} height={224} className="pointer-events-none mt-3 w-[118%] max-w-[1000px] shrink-0" />
      <img src="/assets/globo-rosa.webp" alt="" width={356} height={900} className="flotar pointer-events-none absolute -left-6 top-[62%] w-[92px] rotate-[10deg] md:left-[12%] md:w-[140px]" />
      <img src="/assets/globo-naranja.webp" alt="" width={400} height={699} className="flotar pointer-events-none absolute -right-2 top-[58%] w-[110px] -rotate-[8deg] [animation-delay:1.2s] md:right-[12%] md:w-[190px]" />

      <div className="relative mt-14 md:mt-16">
        <img src="/assets/corazon.webp" alt="" width={180} height={170} className="absolute -top-11 left-[calc(50%-50px)] w-11 -rotate-[10deg]" />
        <img src="/assets/estrella.webp" alt="" width={160} height={155} className="absolute -top-[52px] left-[calc(50%+4px)] w-9 rotate-12" />
        <p className="text-[15px] font-medium opacity-80 md:text-lg">Te damos la bienvenida a</p>
        <p className="font-serif text-[34px] leading-tight md:text-[50px]">la fiesta del siglo</p>
        <h1 className="font-script text-[64px] leading-[1.1] text-fucsia md:text-[96px]">{scriptCase(guestName)}</h1>
      </div>

      <div className="relative mt-6">
        <span aria-hidden="true" className="absolute -top-3 left-1/2 z-10 h-[22px] w-[68px] -translate-x-1/2 rotate-[4deg] bg-[#F7B8CF]/85" />
        <figure className="w-[196px] -rotate-[4deg] rounded-[10px] bg-[#FFFDF8] p-3 pb-2 shadow-[0_14px_26px_rgb(90_18_56/0.18),0_2px_4px_rgb(90_18_56/0.1)] md:w-[230px]">
          <SofiPortrait>
            <div className="absolute inset-0 bg-gradient-to-br from-[#3A0B24] to-[#7A4A2A] transition-opacity duration-500" style={{ opacity: Math.max(0, 1 - p * 1.05) }} />
          </SofiPortrait>
          <figcaption className="pt-2 font-script text-[26px] text-fucsia">Sofi · 23</figcaption>
        </figure>
      </div>

      <div className="mt-10 w-[210px] md:w-[260px]">
        <div role="progressbar" aria-label="Cargando el álbum" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="relative h-3 rounded-full bg-fucsia/12">
          <div className="h-full rounded-full bg-gradient-to-r from-fucsia to-naranja transition-[width] duration-300" style={{ width: `${Math.max(7, percent)}%` }} />
          <span aria-hidden="true" className="absolute inset-0.5 rounded-full border border-dashed border-fucsia/35" />
          <img src="/assets/corazon.webp" alt="" width={180} height={170} className="absolute -top-[5px] w-[22px] -translate-x-1/2 transition-[left] duration-300" style={{ left: `${Math.max(7, percent)}%` }} />
        </div>
        <p className="mt-4 text-[12.5px] font-medium opacity-80">{p >= 1 ? '¡Listo! Entrando al álbum…' : `Revelando tus recuerdos… ${percent} %`}</p>
      </div>
    </main>
  )
}
