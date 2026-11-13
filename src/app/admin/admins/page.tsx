"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  KeyRound,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin";
  status: "active" | "suspended";
  createdAt: string;
  isCurrent: boolean;
  isDefault: boolean;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create Admin Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Reset Password Modal State
  const [resetModalAdmin, setResetModalAdmin] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Delete Confirmation State
  const [deleteModalAdmin, setDeleteModalAdmin] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Action in progress (e.g. status toggle)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setAdmins(data.data.admins || []);
        setCurrentUserId(data.data.currentUserId || null);
      } else {
        toast.error(data.error || "Failed to load administrator accounts");
      }
    } catch {
      toast.error("Network error while loading administrators");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Handle Create Admin
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!createForm.name.trim() || createForm.name.trim().length < 2) {
      errs.name = "Full name must be at least 2 characters long.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!createForm.email.trim() || !emailRegex.test(createForm.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    if (!createForm.password || createForm.password.length < 8) {
      errs.password = "Password must be at least 8 characters long.";
    } else if (createForm.password !== createForm.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.data?.message || "Administrator account created successfully!");
        setShowCreateModal(false);
        setCreateForm({ name: "", email: "", password: "", confirmPassword: "" });
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to create administrator");
        if (data.details) {
          setCreateErrors(data.details);
        }
      }
    } catch {
      toast.error("Network error occurred during creation");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Status Toggle (Suspend / Activate)
  const handleToggleStatus = async (admin: AdminUser) => {
    if (admin.isCurrent) {
      toast.error("You cannot suspend your own active administrator account.");
      return;
    }

    const newStatus = admin.status === "active" ? "suspended" : "active";
    setActionInProgress(admin.id);

    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          `Administrator ${admin.name} is now ${newStatus === "active" ? "Activated" : "Suspended"}.`
        );
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error while updating status");
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalAdmin) return;

    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`/api/admin/admins/${resetModalAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Password updated for ${resetModalAdmin.name}.`);
        setResetModalAdmin(null);
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch {
      toast.error("Network error during password reset");
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Delete Admin Submit
  const handleDeleteSubmit = async () => {
    if (!deleteModalAdmin) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/admins/${deleteModalAdmin.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Administrator ${deleteModalAdmin.name} removed successfully.`);
        setDeleteModalAdmin(null);
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to delete administrator");
      }
    } catch {
      toast.error("Network error during deletion");
    } finally {
      setDeleteLoading(false);
    }
  };

  const currentAdmin = admins.find((a) => a.isCurrent);
  const activeCount = admins.filter((a) => a.status === "active").length;
  const suspendedCount = admins.filter((a) => a.status === "suspended").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Administrator Operations & Access Control
            </h2>
            <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/30 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
              <Shield className="h-3 w-3" />
              Privileged
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage system administrators, provision new editorial accounts, and review executive authorization credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAdmins()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-rose-400" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setCreateForm({ name: "", email: "", password: "", confirmPassword: "" });
              setCreateErrors({});
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create New Admin</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Admins */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Total Administrators</span>
            <ShieldCheck className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {admins.length}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Privileged accounts</span>
            <span className="text-[10px] text-rose-400 font-medium">System Team</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Active Clearance</span>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {activeCount}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Full editorial access</span>
            <span className="text-[10px] text-emerald-400 font-medium">Ready</span>
          </div>
        </div>

        {/* Suspended Accounts */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Suspended Accounts</span>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {suspendedCount}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Access blocked</span>
            <span className="text-[10px] text-amber-400 font-medium">Inactive</span>
          </div>
        </div>

        {/* Current Active Session */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Your Session</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-sm font-bold tracking-tight text-white truncate font-sans">
            {currentAdmin ? currentAdmin.name : "Signed In Admin"}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5 truncate font-mono">
            <span className="truncate">{currentAdmin?.email}</span>
            <span className="text-[10px] text-emerald-400 shrink-0 font-sans font-medium ml-1">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Administrators Listing Table */}
      <div className="rounded-xl border border-white/10 bg-[#10121a] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Administrator Directory ({admins.length} accounts)
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500">
            Default and provisioned administrators with executive console rights
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-rose-400" />
            <span>Loading administrative records...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            No administrators found. Use &quot;Create New Admin&quot; to provision an administrator.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider font-semibold bg-white/[0.02]">
                  <th className="py-3.5 px-4">Administrator Name & Identity</th>
                  <th className="py-3.5 px-4">Official Email</th>
                  <th className="py-3.5 px-4">Role Clearance</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {admins.map((admin) => {
                  const isActive = admin.status === "active";
                  const isCurrent = admin.isCurrent;

                  return (
                    <tr
                      key={admin.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isCurrent ? "bg-rose-950/[0.07]" : ""
                      }`}
                    >
                      {/* Name & Identity */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300 font-bold text-xs shrink-0">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-[13px]">
                                {admin.name}
                              </span>
                              {isCurrent && (
                                <span className="rounded-full bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.2 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                                  You (Active)
                                </span>
                              )}
                              {admin.isDefault && (
                                <span className="rounded-full bg-purple-950/70 border border-purple-500/40 px-2 py-0.2 text-[9px] font-semibold text-purple-300 uppercase tracking-wider">
                                  Default Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              ID: {admin.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-zinc-300 text-xs">
                        {admin.email}
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded bg-rose-950/40 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                          <ShieldCheck className="h-3 w-3" />
                          ADMIN
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isActive
                              ? "border border-emerald-500/30 bg-emerald-950/30 text-emerald-400"
                              : "border border-amber-500/30 bg-amber-950/30 text-amber-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          {admin.status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-zinc-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          <span>
                            {new Date(admin.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetModalAdmin(admin);
                              setNewPassword("");
                              setConfirmNewPassword("");
                            }}
                            className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="h-3 w-3 text-zinc-400" />
                            <span>Reset Key</span>
                          </button>

                          {/* Suspend / Activate */}
                          {!isCurrent ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(admin)}
                              disabled={actionInProgress === admin.id}
                              className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                                isActive
                                  ? "border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40"
                                  : "border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40"
                              }`}
                            >
                              {actionInProgress === admin.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : null}
                              <span>{isActive ? "Suspend" : "Activate"}</span>
                            </button>
                          ) : null}

                          {/* Delete */}
                          {!isCurrent ? (
                            <button
                              type="button"
                              onClick={() => setDeleteModalAdmin(admin)}
                              className="inline-flex items-center gap-1 rounded border border-rose-500/20 bg-rose-950/20 px-2 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-900/40 hover:text-rose-200 transition-colors cursor-pointer"
                              title="Delete Administrator"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create New Admin */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10121a] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-400">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Provision New Administrator
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Grant administrative clearance to a new team member.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Vikram Malhotra"
                  className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                    createErrors.name
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                  }`}
                  autoFocus
                />
                {createErrors.name && (
                  <p className="mt-1 text-[11px] text-rose-400">{createErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="e.g. vikram@saynow.in"
                  className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                    createErrors.email
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                  }`}
                />
                {createErrors.email && (
                  <p className="mt-1 text-[11px] text-rose-400">{createErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Minimum 8 characters"
                    className={`w-full rounded-lg border bg-[#151824] pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                      createErrors.password
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {createErrors.password && (
                  <p className="mt-1 text-[11px] text-rose-400">{createErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={createForm.confirmPassword}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Repeat the password"
                  className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                    createErrors.confirmPassword
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
                  }`}
                />
                {createErrors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-rose-400">
                    {createErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-rose-950/30 border border-rose-500/20 p-3 text-[11px] text-zinc-300 leading-relaxed">
                <span className="font-semibold text-rose-300">Privilege Warning:</span> This
                account will possess full administrative control, including creating & deleting
                polls, moderating discourse, and managing advertisements.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {createLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  <span>Create Administrator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10121a] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-400">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Reset Admin Credentials
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Assign a new security password for {resetModalAdmin.name}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalAdmin(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-lg border border-white/10 bg-[#151824] pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showResetPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showResetPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setResetModalAdmin(null)}
                  disabled={resetLoading}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#10121a] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Remove Administrator?
              </h3>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to remove{" "}
                <strong className="text-white">{deleteModalAdmin.name}</strong> (
                {deleteModalAdmin.email})? This action will revoke all console access immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteModalAdmin(null)}
                disabled={deleteLoading}
                className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
