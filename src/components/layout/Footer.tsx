import Link from "next/link";
import { Shield, FileText, Info, Scale } from "lucide-react";
import { SayNowLogo } from "@/components/layout/SayNowLogo";

export function Footer() {
  const currentYear = 2026;

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#07080c] text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand and Mission */}
          <div className="space-y-4 md:col-span-2">
            <SayNowLogo iconClassName="h-7 w-7" textClassName="text-xl" />
            <p className="max-w-md text-sm leading-relaxed text-zinc-400">
              An independent, non-partisan public opinion platform tracking civic
              sentiment on pivotal global developments, emerging technologies, and
              socioeconomic policy debates.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-rose-500" />
                Bot-resistant verification
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Scale className="h-3.5 w-3.5 text-zinc-400" />
                Unfiltered aggregation
              </span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-200 uppercase">
              Platform
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-white"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/polls"
                  className="transition-colors hover:text-white"
                >
                  Public Opinion Polls
                </Link>
              </li>
              <li>
                <Link
                  href="/blogs"
                  className="transition-colors hover:text-white"
                >
                  Editorial & Analyses
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-us"
                  className="transition-colors hover:text-white"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards & Governance */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-200 uppercase">
              Standards & Integrity
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/#how-it-works"
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                  Polling Methodology
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-us"
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-zinc-400" />
                  Editorial Inquiries
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-us"
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-zinc-400" />
                  Data Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-white/10 pt-6 text-xs text-zinc-400 sm:flex-row">
          <p>© {currentYear} SayNow. All rights reserved.</p>
          <p className="mt-2 text-zinc-400 sm:mt-0">
            Empirical Public Opinion Platform • Verified Civic Sentiment
          </p>
        </div>
      </div>
    </footer>
  );
}
