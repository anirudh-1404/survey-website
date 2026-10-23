"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Check,
  CheckCircle,
} from "lucide-react";
import { PulseIcon } from "@/components/layout/PulseIcon";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const errs: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      errs.name = "Full name is required.";
    }

    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please provide a valid email format.";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        const errorMsg = data.error || "Registration could not be completed.";
        setServerError(errorMsg);
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      setSuccessNotice(
        "Account created successfully. Establishing authenticated session..."
      );
      toast.success("Account created successfully! Welcome to PULSE.");

      // Smooth redirection to homepage with session active
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 600);
    } catch {
      const netError = "A network error occurred while communicating with the server.";
      setServerError(netError);
      toast.error(netError);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#090a0f] text-zinc-100">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#090a0f]/90 py-4 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-wider text-white"
            aria-label="PULSE Homepage"
          >
            <PulseIcon className="h-6 w-6" />
            <span className="tracking-widest">PULSE</span>
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

      {/* Main Registration Card */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#10121a] p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-950/20 px-3 py-0.5 text-xs font-semibold text-rose-300">
                <ShieldCheck className="h-3 w-3 text-rose-400" />
                <span>Join PULSE Research Platform</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Create Citizen Account
              </h1>
              <p className="text-xs text-zinc-400">
                Participate in verified surveys, cast anonymous ballots, and analyze public sentiment.
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
              {/* Full Name */}
              <div>
                <label
                  htmlFor="full-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                >
                  Full Name / Affiliation
                </label>
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name)
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Dr. Jordan Hayes"
                  className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-1 ${
                    fieldErrors.name
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                  }`}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
                {fieldErrors.name && (
                  <p id="name-error" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{fieldErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="reg-email"
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
                  aria-describedby={fieldErrors.email ? "reg-email-error" : undefined}
                />
                {fieldErrors.email && (
                  <p id="reg-email-error" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                >
                  Password (min. 8 characters)
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
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
                    aria-describedby={fieldErrors.password ? "reg-password-error" : undefined}
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
                  <p id="reg-password-error" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                  }}
                  placeholder="••••••••••••"
                  className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-1 ${
                    fieldErrors.confirmPassword
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                  }`}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={
                    fieldErrors.confirmPassword
                      ? "confirm-password-error"
                      : undefined
                  }
                />
                {fieldErrors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{fieldErrors.confirmPassword}</span>
                  </p>
                )}
              </div>

              {/* Trust points */}
              <div className="space-y-1.5 pt-1 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>One-person one-vote anti-sybil verification</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>Strict non-commercial data privacy pledge</span>
                </div>
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register Account</span>
                  )}
                </button>
              </div>
            </form>

            {/* Bottom Login Link */}
            <div className="mt-6 border-t border-white/10 pt-4 text-center">
              <p className="text-xs text-zinc-400">
                Already registered?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  Sign in to your account
                </Link>
              </p>
            </div>
          </div>

          <div className="text-center text-[11px] text-zinc-500">
            PULSE Non-Partisan Research Initiative • Secure password hashing with bcrypt
          </div>
        </div>
      </main>

      {/* Mini footer */}
      <footer className="border-t border-white/10 py-4 text-center text-xs text-zinc-500">
        © 2026 PULSE Research Initiative. All rights reserved.
      </footer>
    </div>
  );
}
