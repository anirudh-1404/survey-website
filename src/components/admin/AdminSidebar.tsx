"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Inbox,
  FileText,
  Megaphone,
  X,
} from "lucide-react";
import { SayNowLogo } from "@/components/layout/SayNowLogo";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  mobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Poll Management",
      href: "/admin/polls",
      icon: Layers,
      exact: true,
    },
    {
      label: "Create New Poll",
      href: "/admin/polls/new",
      icon: PlusCircle,
      exact: false,
    },
    {
      label: "Discourse Moderation",
      href: "/admin/moderation",
      icon: ShieldAlert,
      exact: true,
    },
    {
      label: "Contact Inbox",
      href: "/admin/contact-submissions",
      icon: Inbox,
      exact: true,
    },
    {
      label: "Blog CMS",
      href: "/admin/blogs",
      icon: FileText,
      exact: false,
    },
    {
      label: "Ad Campaigns",
      href: "/admin/ads",
      icon: Megaphone,
      exact: false,
    },
  ];

  const content = (
    <div className="flex h-full flex-col justify-between bg-[#0b0d14] border-r border-white/10 p-4 lg:p-6">
      {/* Brand & Workspace */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2"
          >
            <SayNowLogo iconClassName="h-6 w-6" textClassName="text-lg" />
            <span className="rounded bg-rose-950/40 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 uppercase tracking-widest border border-rose-900/40">
              Admin
            </span>
          </Link>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden text-zinc-400 hover:text-white p-1"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Prototype Environment Notice */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200">
          <span className="font-semibold block text-amber-300">
            Visual Prototype Shell
          </span>
          Administrative CRUD and live auth guards will be activated in upcoming phases.
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5 pt-2" aria-label="Admin Navigation">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 pb-1">
            Backoffice Menu
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Back to Public Site */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <Link
          href="/"
          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            <span>Public Website</span>
          </span>
          <span className="text-[10px] text-zinc-500">Live View</span>
        </Link>

        <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
          <span>Editorial Console v0.2.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 z-50">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
