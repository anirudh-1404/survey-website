import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 pt-20 pb-20 lg:pt-28 lg:pb-28">
      {/* Editorial backdrop accents (restrained, no garish glows) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 10%, rgba(225, 29, 72, 0.08), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.02), transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Primary headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1]">
            Public opinion on the issues{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              shaping our world.
            </span>
          </h1>

          {/* Supporting description */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg sm:leading-8">
            Cast your vote on timely news-driven debates, explore verified
            community sentiment in real time, and join evidence-backed discussions
            on the global challenges of today.
          </p>

          {/* Call to actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/polls"
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-500 hover:shadow-rose-900/20 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Explore Polls
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white hover:border-white/25 focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              Editorial Analyses
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
