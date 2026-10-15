import { Reveal } from '@/components/ui/Reveal'

export function PageTitle({ title, accent, text }: { title: string; accent: string; text?: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 pb-6 pt-8 text-center">
      <h1 className="flex flex-col items-center">
        <Reveal as="span" className="font-serif text-[26px] leading-tight md:text-4xl">
          {title}
        </Reveal>
        <Reveal as="span" variant="zoom" delay={150} className="font-script text-[54px] leading-[1.1] text-fucsia md:text-7xl">
          {accent}
        </Reveal>
      </h1>
      {text && (
        <Reveal as="p" delay={280} className="mt-2 text-sm leading-relaxed opacity-80">
          {text}
        </Reveal>
      )}
    </div>
  )
}
