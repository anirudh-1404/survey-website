"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { SayNowLogo } from "@/components/layout/SayNowLogo";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#090a0f] text-zinc-100">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#090a0f]/90 py-4 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="SayNow Homepage"
          >
            <SayNowLogo iconClassName="h-6 w-6" textClassName="text-lg" />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </header>

      {/* Main Notice Card */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#10121a] p-8 shadow-2xl text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-300">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
              <span>Public Platform Notice</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Registration Paused
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You do not need to create an account to participate! All polls, voting, and live discourse are now open to everyone without registration.
            </p>

            <div className="pt-4 flex flex-col gap-2.5">
              <Link
                href="/polls"
                className="w-full rounded-xl bg-rose-600 py-3 text-center text-xs font-semibold text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/25"
              >
                Browse & Vote on Polls
              </Link>
              <Link
                href="/"
                className="w-full rounded-xl border border-white/10 py-3 text-center text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors"
              >
                Return to Homepage
              </Link>
            </div>

            <div className="pt-4 border-t border-white/10 text-xs text-zinc-400">
              Already have an admin or existing account?{" "}
              <Link href="/login" className="text-rose-400 hover:text-rose-300 font-semibold underline">
                Log In here
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Mini footer */}
      <footer className="border-t border-white/10 py-4 text-center text-xs text-zinc-500">
        © 2026 SayNow Initiative. All rights reserved.
      </footer>
    </div>
  );
}
