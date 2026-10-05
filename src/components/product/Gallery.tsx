"use client";
import { useState } from "react";
import Image from "next/image";

export default function Gallery({ images, videos, name }: { images: { url: string; alt: string }[]; videos: { url: string; poster?: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const total = images.length;
  const img = images[active] ?? { url: "", alt: name };

  return (
    <div>
      <div className="relative aspect-square rounded-xl overflow-hidden border border-ink-700 bg-ink-800 group">
        {img.url ? (
          <Image src={img.url} alt={img.alt} fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-mist-500 text-sm">No image available</div>
        )}
        {total > 1 && (
          <>
            <button
              onClick={() => setActive((active - 1 + total) % total)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 border border-ink-600 p-2 text-cream-100 hover:bg-ink-900 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setActive((active + 1) % total)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 border border-ink-600 p-2 text-cream-100 hover:bg-ink-900 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((im, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative aspect-square rounded-lg overflow-hidden border transition-colors ${i === active ? "border-gold-500" : "border-ink-700 hover:border-ink-500"}`}
            >
              <Image src={im.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
