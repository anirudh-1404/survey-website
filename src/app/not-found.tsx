import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-24 px-4 sm:px-6">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#10121a] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-950/40 border border-rose-900/30 text-rose-400">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
            Inquiry Not Found
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            The requested poll inquiry could not be located in our verified
            public archives, or may still be in private editorial review.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/#latest-polls"
              className="inline-flex justify-center items-center rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
            >
              Browse Active Polls
            </Link>
            <Link
              href="/"
              className="inline-flex justify-center items-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
