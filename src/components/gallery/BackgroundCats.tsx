// Botellita de fondo: pocas, difuminadas y al 15 %, nunca pegadas a los bordes
const CATS = [
  { n: 1, top: 4, left: 30, w: 150, rot: -14 },
  { n: 2, top: 15, left: 64, w: 130, rot: 18 },
  { n: 3, top: 29, left: 22, w: 170, rot: 9 },
  { n: 4, top: 44, left: 58, w: 140, rot: -20 },
  { n: 6, top: 58, left: 34, w: 150, rot: 12 },
  { n: 7, top: 72, left: 62, w: 150, rot: -8 },
  { n: 8, top: 87, left: 26, w: 135, rot: 16 },
]

export function BackgroundCats() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {CATS.map((c) => (
        <img
          key={c.n}
          src={`/assets/fondo/botellita-${c.n}.webp`}
          alt=""
          width={320}
          height={320}
          loading="lazy"
          className="absolute opacity-15 blur-[2px]"
          style={{ top: `${c.top}%`, left: `${c.left}%`, width: c.w, rotate: `${c.rot}deg` }}
        />
      ))}
    </div>
  )
}
