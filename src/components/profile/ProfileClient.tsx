"use client";

import { useState } from "react";
import { UserSafeResponse } from "@/models/User";
import {
  Mail,
  Shield,
  Calendar,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";

interface ProfileClientProps {
  user: UserSafeResponse;
}

export function ProfileClient({ user: initialUser }: ProfileClientProps) {
  const [user, setUser] = useState(initialUser);

  // Profile Info Editing State
  const [displayName, setDisplayName] = useState(initialUser.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    if (!cleanName || cleanName.length < 2) {
      setNameFeedback({
        type: "error",
        message: "Display name must be at least 2 characters long.",
      });
      return;
    }

    setIsSavingName(true);
    setNameFeedback(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNameFeedback({
          type: "error",
          message: data.error || "Failed to update display name.",
        });
        setIsSavingName(false);
        return;
      }

      setUser((prev) => ({ ...prev, name: data.data.user.name }));
      setIsEditingName(false);
      setNameFeedback({
        type: "success",
        message: "Your display name has been updated.",
      });
    } catch {
      setNameFeedback({
        type: "error",
        message: "A network error occurred while updating your display name.",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordFeedback(null);

    const errs: Record<string, string> = {};
    if (!currentPassword) {
      errs.currentPassword = "Enter your current password.";
    }
    if (!newPassword || newPassword.length < 8) {
      errs.newPassword = "New password must be at least 8 characters.";
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = "New password and confirmation do not match.";
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          setPasswordErrors(data.errors);
        }
        setPasswordFeedback({
          type: "error",
          message: data.error || "Failed to update password.",
        });
        setIsSavingPassword(false);
        return;
      }

      setPasswordFeedback({
        type: "success",
        message:
          "Your password has been successfully updated. All other active sessions have been invalidated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordFeedback({
        type: "error",
        message: "A network error occurred while updating your password.",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Verified Citizen";

  return (
    <div className="space-y-8">
      {/* Profile Overview Card */}
      <section className="rounded-xl border border-white/10 bg-[#10121a] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-950/80 text-rose-300 font-bold text-xl border border-rose-800/50 shadow-inner">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {user.name}
                </h2>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    user.role === "admin"
                      ? "bg-rose-600 text-white"
                      : "bg-white/10 text-zinc-300"
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{user.email}</p>
            </div>
          </div>

          {!isEditingName && (
            <button
              type="button"
              onClick={() => {
                setDisplayName(user.name);
                setIsEditingName(true);
                setNameFeedback(null);
              }}
              className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              Edit Display Name
            </button>
          )}
        </div>

        {/* Display Name Edit Form */}
        {isEditingName && (
          <form onSubmit={handleSaveDisplayName} className="mt-6 p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                className="w-full max-w-md rounded-lg border border-white/10 bg-[#141722] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSavingName}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSavingName ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Save Changes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingName(false);
                  setDisplayName(user.name);
                  setNameFeedback(null);
                }}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {nameFeedback && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs ${
              nameFeedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                : "border-rose-500/30 bg-rose-950/20 text-rose-300"
            }`}
          >
            {nameFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{nameFeedback.message}</span>
          </div>
        )}

        {/* Account Metadata Details */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2 text-xs">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Mail className="h-3.5 w-3.5 text-rose-400" />
              <span>Email Address</span>
            </div>
            <p className="font-medium text-zinc-200 truncate">{user.email}</p>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Managed via database authentication</span>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Shield className="h-3.5 w-3.5 text-rose-400" />
              <span>Civic Role</span>
            </div>
            <p className="font-medium text-zinc-200 capitalize">{user.role}</p>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">
              {user.role === "admin" ? "Administrative and moderation privileges" : "Verified Citizen voter and commenter"}
            </span>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Calendar className="h-3.5 w-3.5 text-rose-400" />
              <span>Member Since</span>
            </div>
            <p className="font-medium text-zinc-200">{memberSince}</p>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Account creation timestamp</span>
          </div>
        </div>
      </section>

      {/* Change Password Form */}
      <section className="rounded-xl border border-white/10 bg-[#10121a] p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-6">
          <KeyRound className="h-5 w-5 text-rose-400" />
          <h3 className="text-lg font-bold tracking-tight text-white">
            Change Password
          </h3>
        </div>

        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          {/* Current Password */}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors((prev) => ({ ...prev, currentPassword: "" }));
                  }
                }}
                className={`w-full rounded-lg border bg-[#141722] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 pr-10 ${
                  passwordErrors.currentPassword
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                }`}
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-xs text-rose-400">
                {passwordErrors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordErrors.newPassword) {
                    setPasswordErrors((prev) => ({ ...prev, newPassword: "" }));
                  }
                }}
                className={`w-full rounded-lg border bg-[#141722] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 pr-10 ${
                  passwordErrors.newPassword
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                }`}
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordErrors.newPassword && (
              <p className="mt-1 text-xs text-rose-400">
                {passwordErrors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }
                }}
                className={`w-full rounded-lg border bg-[#141722] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 pr-10 ${
                  passwordErrors.confirmPassword
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                }`}
                placeholder="Re-enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-400">
                {passwordErrors.confirmPassword}
              </p>
            )}
          </div>

          {passwordFeedback && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                passwordFeedback.type === "success"
                  ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                  : "border-rose-500/30 bg-rose-950/20 text-rose-300"
              }`}
            >
              {passwordFeedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span>{passwordFeedback.message}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSavingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
