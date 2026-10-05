"use client";
import { useState } from "react";

export default function FaqAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="card divide-y divide-ink-700 overflow-hidden">
      {faqs.map((f, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-ink-800 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span className="text-sm font-medium text-cream-100">{f.question}</span>
            <svg
              className={`w-4 h-4 text-mist-400 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {open === i && <p className="px-5 pb-5 text-sm text-mist-400 leading-relaxed">{f.answer}</p>}
        </div>
      ))}
    </div>
  );
}
