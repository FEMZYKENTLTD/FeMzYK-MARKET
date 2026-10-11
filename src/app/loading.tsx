export default function Loading() {
  return (
    <div className="container-page py-12" aria-busy="true" aria-label="Loading content">
      <div className="h-8 w-56 rounded-lg bg-ink-700/60 animate-pulse mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[4/3] bg-ink-700/50 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-ink-700/60 animate-pulse" />
              <div className="h-3.5 w-1/3 rounded bg-ink-700/60 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
