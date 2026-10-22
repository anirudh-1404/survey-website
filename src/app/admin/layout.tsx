import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "PULSE Editorial Administration — Backoffice Shell",
  description:
    "Administrative dashboard for managing surveys, inquiries, and civic sentiment tracking.",
  robots: {
    index: false,
    follow: false,
  },
};

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication and authorization check
  const sessionWithUser = await getCurrentUser();

  // 1. Unauthenticated visitors are redirected to login with return path
  if (!sessionWithUser) {
    redirect("/login?redirect=/admin");
  }

  // 2. Authenticated non-admin users receive a strict 403 Forbidden state
  if (sessionWithUser.user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080c] p-4 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#10121a] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-950/60 border border-rose-700/50 text-rose-400">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <span className="mt-4 inline-block rounded bg-rose-950/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-300 border border-rose-900/40">
            HTTP 403 • Forbidden
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Administrative Access Denied
          </h1>

          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            You are signed in as{" "}
            <strong className="text-zinc-200">{sessionWithUser.user.email}</strong>,
            which holds a standard citizen role. This console requires verified
            administrator authorization.
          </p>

          <div className="mt-6 border-t border-white/10 pt-4 flex flex-col gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized Administrator: Render administration console
  return (
    <AdminLayoutClient user={sessionWithUser.user}>
      {children}
    </AdminLayoutClient>
  );
}
