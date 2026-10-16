import type { ReactNode } from 'react'

// Encuadre de la foto de Sofi en la polaroid cuadrada: en la imagen (656 × 900) la cara está en x = 380 px,
// así que el marco muestra un cuadrado de 590 px centrado en ella, desde el pompón del gorro hasta el cuello
export const SOFI_FRAME = { width: 111.19, left: -14.41, top: 0 }

export function SofiPortrait({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-md bg-rosa ${className}`}>
      <img
        src="/assets/sofi.webp"
        alt="Sofi"
        width={656}
        height={900}
        className="absolute max-w-none"
        style={{ width: `${SOFI_FRAME.width}%`, left: `${SOFI_FRAME.left}%`, top: `${SOFI_FRAME.top}%` }}
      />
      {children}
    </div>
  )
}
