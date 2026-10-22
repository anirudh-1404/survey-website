import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ContactForm } from "@/components/contact/ContactForm";
import { Shield, MessageSquareText } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us — PULSE",
  description:
    "Direct communication channel for editorial inquiries, empirical research feedback, and public survey proposals.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactUsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Section (Form Only - No phone, email, address, or external contact details) */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-300">
              <MessageSquareText className="h-3.5 w-3.5" />
              <span>Direct Editorial Dispatch</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Contact the Editorial Board
            </h1>

            <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-400">
              Submit research corrections, data references, investigative leads, or
              methodology queries directly to our research and moderation desk.
            </p>
          </div>

          {/* Contact Form Container */}
          <ContactForm />

          {/* Privacy & Governance Notice */}
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-xs text-zinc-500 flex items-start gap-3">
            <Shield className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-zinc-300">Data Confidentiality:</strong> All
              submissions are received directly into a restricted administrative queue.
              PULSE never shares, sells, or publicly disseminates correspondent contact
              details without explicit authorization.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
