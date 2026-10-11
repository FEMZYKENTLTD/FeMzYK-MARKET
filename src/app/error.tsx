"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Never surface stack traces, IDs or configuration to customers.
  console.error("Unhandled client error:", error.digest ?? error.message);
  return (
    <div className="container-page py-24 text-center">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-400 uppercase">Something went wrong</p>
      <h1 className="font-display text-3xl text-cream-50 mt-3">We hit an unexpected bump.</h1>
      <p className="text-sm text-mist-400 mt-3 max-w-md mx-auto leading-relaxed">
        Your cart and account are safe. Please try again — if the problem continues, contact support and we'll help
        right away.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-gold btn-md">Try again</button>
        <a href="/contact" className="btn-outline btn-md">Contact support</a>
      </div>
    </div>
  );
}
