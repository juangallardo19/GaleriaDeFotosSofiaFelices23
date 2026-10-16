'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buttonClass } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { UploadList } from './UploadList'
import { UploadPicker } from './UploadPicker'
import { useUploads } from './UploadProvider'

export function UploadScreen() {
  const { snapshot, add, retry, cancel } = useUploads()
  const [skipped, setSkipped] = useState(0)

  function select(files: File[]) {
    setSkipped(add(files))
  }

  const finished = snapshot.isIdle && snapshot.done > 0

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pb-16">
      <UploadPicker onSelect={select} />
      {skipped > 0 && (
        <p className="text-center text-xs opacity-70">{skipped === 1 ? 'Un archivo ya estaba en la lista.' : `${skipped} archivos ya estaban en la lista.`}</p>
      )}
      {snapshot.tasks.length === 0 && (
        <Reveal delay={240}>
          <ul className="tarjeta flex flex-col gap-2.5 p-5 text-sm">
            <li className="flex gap-2.5">
              <Icon name="check" size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-fucsia" />
              Puedes elegir hasta 30 fotos y videos a la vez, de hasta 1 GB cada uno.
            </li>
            <li className="flex gap-2.5">
              <Icon name="check" size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-fucsia" />
              Se suben en su calidad original. Si se cae el internet, sigue desde donde iba.
            </li>
            <li className="flex gap-2.5">
              <Icon name="check" size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-fucsia" />
              Mientras sube puedes seguir viendo el álbum; el avance queda en una barrita abajo.
            </li>
          </ul>
        </Reveal>
      )}
      <UploadList snapshot={snapshot} onRetry={retry} onCancel={cancel} />
      {finished && (
        <div className="tarjeta entrada flex flex-col items-center gap-3 bg-rosa/80 p-6 text-center [--animacion:entrar-pop]">
          <p className="font-script text-5xl text-fucsia">¡Gracias!</p>
          <p className="text-sm">
            {snapshot.done === 1 ? 'Tu recuerdo ya está en el álbum de Sofi.' : `Tus ${snapshot.done} recuerdos ya están en el álbum de Sofi.`}
          </p>
          <Link href="/" className={buttonClass('primary', 'mt-1')}>
            Ver el álbum
          </Link>
        </div>
      )}
    </div>
  )
}
