import Link from 'next/link'

export const metadata = { title: 'Código no válido · Álbum de Sofi' }

export default function QrInvalidoPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="font-script text-5xl text-fucsia">Sofi</p>
      <h1 className="font-serif text-3xl leading-tight">Uy, este código no funciona</h1>
      <p className="text-base leading-relaxed opacity-80">Puede que la tarjeta esté dañada o que el código no sea de esta fiesta. Vuelve a escanear el QR de tu tarjeta.</p>
      <p className="text-sm leading-relaxed opacity-65">¿Perdiste tu tarjeta? Busca a los anfitriones en la mesa principal.</p>
      <Link href="/" className="mt-2 inline-flex min-h-11 items-center rounded-boton bg-fucsia px-6 font-semibold text-crema">
        Ver el álbum
      </Link>
      <p className="text-xs opacity-60">Sin el QR puedes ver y descargar, pero no subir ni comentar.</p>
    </main>
  )
}
