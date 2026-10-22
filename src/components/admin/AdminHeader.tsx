"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ArrowUpRight, Bell, Shield, LogOut } from "lucide-react";
import { UserSafeResponse } from "@/models/User";

interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
  title?: string;
  user?: UserSafeResponse;
}

export function AdminHeader({
  onOpenMobileMenu,
  title = "PULSE Editorial Administration",
  user,
}: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090a0f]/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile trigger & Page title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Open administration navigation drawer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Right: Authenticated user status and actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>Admin Clearance</span>
          </div>

          <button
            type="button"
            onClick={() =>
              alert("Audit logs and automated system alerts will be enabled in Day 4.")
            }
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span>Public Site</span>
            <ArrowUpRight className="h-3 w-3 text-zinc-400" />
          </Link>

          {/* Admin Avatar chip & Logout */}
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-900/60 font-mono text-xs font-bold text-rose-300 border border-rose-700/50">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-zinc-200">
                {user?.name || "Administrator"}
              </p>
              <p className="text-[10px] text-zinc-500">
                {user?.email || "admin@pulse.org"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 inline-flex items-center gap-1 rounded-md p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign out of administration"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
