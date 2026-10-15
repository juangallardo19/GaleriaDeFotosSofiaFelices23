export function SkeletonCard({ width, height }: { width: number; height: number }) {
  return (
    <div aria-hidden="true" className="rounded-card border border-linea/70 bg-[#FFFDFB]/90 p-[7px] pb-3">
      <div data-testid="skeleton" aria-hidden="true" className="shimmer rounded-2xl" style={{ aspectRatio: `${width} / ${Math.round(Math.min(height, width * 1.6))}` }} />
      <div className="mt-2.5 flex items-center gap-[7px] px-1">
        <span className="shimmer size-[22px] rounded-full" />
        <span className="shimmer h-2.5 w-2/5 rounded-full" />
      </div>
      <div className="mt-2.5 flex gap-2.5 px-1">
        <span className="shimmer h-2.5 w-[30px] rounded-full" />
        <span className="shimmer h-2.5 w-[30px] rounded-full" />
        <span className="shimmer h-2.5 w-[30px] rounded-full" />
      </div>
    </div>
  )
}
