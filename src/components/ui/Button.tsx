import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

export type ButtonVariant = 'primary' | 'secondary'

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const BASE =
  'cosido relative inline-flex min-h-11 items-center justify-center gap-2 rounded-boton px-5 py-3 text-sm font-semibold transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:scale-[1.03] active:translate-y-px active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'sombra-sticker bg-fucsia text-white hover:bg-rosa-vivo',
  secondary: 'border-[1.5px] border-fucsia bg-crema text-fucsia shadow-[0_3px_0_rgb(230_21_122/0.22)] [--costura:rgb(255_138_31/0.8)] hover:bg-rosa',
}

export function buttonClass(variant: ButtonVariant = 'primary', extra?: string) {
  return cn(BASE, VARIANTS[variant], extra)
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: IconName
}

export function Button({ variant = 'primary', icon, type = 'button', className, children, ...rest }: Props) {
  return (
    <button type={type} data-variant={variant} className={buttonClass(variant, className)} {...rest}>
      {icon && <Icon name={icon} size={18} strokeWidth={2} />}
      {children}
    </button>
  )
}
