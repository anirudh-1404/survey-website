"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  X,
  ArrowUpRight,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import { UserSafeResponse } from "@/models/User";
import { SayNowLogo } from "@/components/layout/SayNowLogo";
import { toast } from "sonner";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Polls", href: "/polls" },
  { label: "Blogs", href: "/blogs" },
  { label: "Contact Us", href: "/contact-us" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserSafeResponse | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.data?.user) {
            setCurrentUser(data.data.user);
          }
        }
      } catch {
        // Fallback to unauthenticated on error
      } finally {
        if (isMounted) setIsAuthLoaded(true);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Handle outside click & Escape key for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserDropdownOpen(false);
      }
    }

    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userDropdownOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setCurrentUser(null);
      setUserDropdownOpen(false);
      setMobileMenuOpen(false);
      toast.success("Logged out successfully.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Logout encountered an issue, redirecting...");
      router.push("/");
    }
  };

  const isAdmin = currentUser?.role === "admin";

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#090a0f]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="transition-transform hover:scale-[1.02] active:scale-[0.98]"
            aria-label="SayNow Homepage"
          >
            <SayNowLogo iconClassName="h-8 w-8" textClassName="text-2xl" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex items-center gap-7 text-sm font-medium"
          aria-label="Main Navigation"
        >
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  active
                    ? "font-semibold text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthLoaded && currentUser ? (
            /* Authenticated Account Control Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="user-menu-button"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-1.5 px-3 text-xs text-zinc-200 hover:border-white/20 hover:bg-white/[0.06] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-950 font-bold text-[11px] text-rose-300 border border-rose-800/50">
                  {userInitials}
                </span>
                <span className="font-medium text-white max-w-[130px] truncate">
                  {currentUser.name}
                </span>
                {isAdmin && (
                  <span className="rounded bg-rose-600/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Admin
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Accessible Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-white/10 bg-[#12141e] p-1.5 shadow-2xl backdrop-blur-lg focus:outline-none animate-in fade-in zoom-in-95 duration-100 z-50"
                >
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-xs font-semibold text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {currentUser.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <UserIcon className="h-4 w-4 text-zinc-400" />
                      <span>My Profile</span>
                    </Link>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="h-4 w-4 text-rose-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated Visitor Actions */
            <>
              <Link
                href="/login"
                className="rounded-md px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-rose-500"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-white hover:shadow-sm focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Sign Up
                <ArrowUpRight className="h-3 w-3 text-zinc-600" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#0d0e15] px-4 pt-3 pb-6 md:hidden">
          <nav className="flex flex-col space-y-3" aria-label="Mobile Navigation">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-base font-medium transition-colors ${
                    active
                      ? "bg-white/10 font-semibold text-white"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2.5">
              {currentUser ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-xs text-zinc-300">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-950 font-bold text-xs text-rose-300 border border-rose-800/50">
                        {userInitials}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{currentUser.name}</p>
                        <p className="text-[10px] text-zinc-400">{currentUser.email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                        Admin
                      </span>
                    )}
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center gap-2 rounded-md border border-white/10 py-2.5 px-3 text-xs font-medium text-zinc-200 hover:bg-white/5"
                  >
                    <UserIcon className="h-4 w-4 text-zinc-400" />
                    <span>My Profile</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-1.5 rounded-md border border-white/10 py-2.5 text-center text-xs font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full rounded-md border border-white/10 py-2.5 text-center text-sm font-medium text-zinc-200 hover:bg-white/5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="w-full rounded-md bg-rose-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-rose-500"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
