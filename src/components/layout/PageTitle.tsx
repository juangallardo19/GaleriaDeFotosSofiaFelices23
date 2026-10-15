export function PageTitle({ title, accent, text }: { title: string; accent: string; text?: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 pb-6 pt-8 text-center">
      <h1 className="flex flex-col items-center">
        <span className="font-serif text-[26px] leading-tight md:text-4xl">{title}</span>
        <span className="font-script text-[54px] leading-[1.1] text-fucsia md:text-7xl">{accent}</span>
      </h1>
      {text && <p className="mt-2 text-sm leading-relaxed opacity-80">{text}</p>}
    </div>
  )
}
