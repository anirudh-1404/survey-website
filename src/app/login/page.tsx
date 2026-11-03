"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Shield,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { getSafeRedirectUrl } from "@/lib/url";
import { SayNowLogo } from "@/components/layout/SayNowLogo";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirectUrl(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please provide a valid email format.";
    }

    if (!password) {
      errs.password = "Password is required.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);
    setSuccessNotice(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || "Authentication failed. Please verify your credentials.";
        setServerError(errorMsg);
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      setSuccessNotice("Authentication successful. Redirecting to your workspace...");
      toast.success("Signed in successfully. Welcome back!");

      // Small delay for UI smoothness before redirect
      setTimeout(() => {
        router.push(redirectTarget);
        router.refresh();
      }, 500);
    } catch {
      const netError = "A network error occurred while communicating with the server.";
      setServerError(netError);
      toast.error(netError);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Card */}
      <div className="rounded-2xl border border-white/10 bg-[#10121a] p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-950/20 px-3 py-0.5 text-xs font-semibold text-rose-300">
            <Shield className="h-3 w-3 text-rose-400" />
            <span>Verified Citizen Access</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sign in to PULSE
          </h1>
          <p className="text-xs text-zinc-400">
            Access authenticated ballots, verify votes, and track your civic insights.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs leading-relaxed text-rose-300 flex items-start gap-2.5"
          >
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs leading-relaxed text-emerald-300 flex items-start gap-2.5"
          >
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email)
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="name@example.com"
              className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-1 ${
                fieldErrors.email
                  ? "border-rose-500 focus:ring-rose-500"
                  : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
              }`}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() =>
                  alert("Password recovery link has been queued for implementation.")
                }
                className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••••••"
                className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-1 ${
                  fieldErrors.password
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                }`}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-all focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>
        </form>

        {/* Bottom Registration Link */}
        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <p className="text-xs text-zinc-400">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-rose-400 hover:text-rose-300 transition-colors"
            >
              Create citizen account
            </Link>
          </p>
        </div>
      </div>

      <div className="text-center text-[11px] text-zinc-500">
        PULSE Secure Authentication • HttpOnly encrypted session cookie
      </div>
    </div>
  );
}

export default function LoginPage() {
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

      {/* Main Login Card wrapped in Suspense for useSearchParams compatibility */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8 text-zinc-400 text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Loading secure login portal...</span>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      {/* Mini footer */}
      <footer className="border-t border-white/10 py-4 text-center text-xs text-zinc-500">
        © 2026 PULSE Research Initiative. All rights reserved.
      </footer>
    </div>
  );
}
