"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Inbox,
  Mail,
  MailOpen,
  CheckCircle2,
  Clock,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Loader2,
  Filter,
} from "lucide-react";
import { ContactSubmission, ContactSubmissionStatus } from "@/types/contact";
import { toast } from "sonner";

export default function AdminContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({
    total: 0,
    unread: 0,
    read: 0,
    resolved: 0,
  });

  const [selectedSubmission, setSelectedSubmission] =
    useState<ContactSubmission | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch submissions from API
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const res = await fetch(`/api/admin/contact-submissions?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        setSubmissions(data.data.submissions || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.totalCount || 0);
        if (data.data.counts) {
          setCounts(data.data.counts);
        }
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to load contact submissions.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error occurred while fetching contact submissions.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitial() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "15",
        });
        if (statusFilter !== "all") {
          params.append("status", statusFilter);
        }

        const res = await fetch(`/api/admin/contact-submissions?${params.toString()}`);
        const data = await res.json();

        if (!isCancelled) {
          if (res.ok && data.success && data.data) {
            setSubmissions(data.data.submissions || []);
            setTotalPages(data.data.totalPages || 1);
            setTotalCount(data.data.totalCount || 0);
            if (data.data.counts) {
              setCounts(data.data.counts);
            }
          } else {
            setFeedback({
              type: "error",
              message: data.error || "Failed to load contact submissions.",
            });
          }
        }
      } catch {
        if (!isCancelled) {
          setFeedback({
            type: "error",
            message: "Network error occurred while fetching contact submissions.",
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      isCancelled = true;
    };
  }, [page, statusFilter]);

  // Handle status update (e.g. read, resolved, unread)
  const handleUpdateStatus = async (
    id: string,
    newStatus: ContactSubmissionStatus
  ) => {
    setActionInProgress(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/contact-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data?.submission) {
        const updated: ContactSubmission = data.data.submission;
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? updated : s))
        );
        if (selectedSubmission?.id === id) {
          setSelectedSubmission(updated);
        }
        const statusMsg = `Submission marked as ${newStatus}.`;
        setFeedback({
          type: "success",
          message: statusMsg,
        });
        toast.success(statusMsg);
        // Refresh counts
        fetchSubmissions();
      } else {
        const statusErr = data.error || "Failed to update submission status.";
        setFeedback({
          type: "error",
          message: statusErr,
        });
        toast.error(statusErr);
      }
    } catch {
      const netSubErr = "Network error while updating submission.";
      setFeedback({
        type: "error",
        message: netSubErr,
      });
      toast.error(netSubErr);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle deletion
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this submission?")) {
      return;
    }

    setActionInProgress(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/contact-submissions/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (selectedSubmission?.id === id) {
          setSelectedSubmission(null);
        }
        setFeedback({
          type: "success",
          message: "Submission permanently removed from queue.",
        });
        fetchSubmissions();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to delete submission.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error while deleting submission.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Open submission detail modal and auto-mark as read if unread
  const handleOpenDetail = (sub: ContactSubmission) => {
    setSelectedSubmission(sub);
    if (sub.status === "unread") {
      handleUpdateStatus(sub.id, "read");
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-950/60 border border-rose-900/40 text-rose-400">
              <Inbox className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Contact Submissions Inbox
            </h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Review public inquiries, research leads, and editorial correspondence.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchSubmissions()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg border p-3.5 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/30 bg-rose-950/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* 3. Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-2 flex items-center gap-1">
          <Filter className="h-3 w-3" />
          <span>Filter:</span>
        </span>

        {[
          { key: "all", label: "All Inquiries", count: counts.total },
          { key: "unread", label: "Unread", count: counts.unread },
          { key: "read", label: "Read", count: counts.read },
          { key: "resolved", label: "Resolved", count: counts.resolved },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-black/40 text-zinc-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Submissions Table / List */}
      <div className="rounded-xl border border-white/10 bg-[#0d0f17] overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 space-y-3">
            <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
            <p className="text-xs">Loading contact submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 mb-3">
              <MailOpen className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No submissions found</h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              {statusFilter !== "all"
                ? `There are no submissions currently categorized as ${statusFilter}.`
                : "The editorial contact inbox is currently clear."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121522] border-b border-white/10 text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Sender
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Subject Line
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Received
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submissions.map((sub) => {
                  const isUnread = sub.status === "unread";
                  const isResolved = sub.status === "resolved";

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isUnread ? "bg-rose-950/10" : ""
                      }`}
                    >
                      {/* Status Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isUnread
                              ? "border border-amber-500/40 bg-amber-950/40 text-amber-300"
                              : isResolved
                              ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                              : "border border-zinc-700 bg-zinc-800/60 text-zinc-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isUnread
                                ? "bg-amber-400 animate-pulse"
                                : isResolved
                                ? "bg-emerald-400"
                                : "bg-zinc-500"
                            }`}
                          />
                          <span>{sub.status}</span>
                        </span>
                      </td>

                      {/* Sender Details */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">
                          {sub.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {sub.email}
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="px-5 py-4 max-w-xs sm:max-w-md">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(sub)}
                          className="font-medium text-zinc-200 hover:text-rose-400 text-left line-clamp-1 transition-colors cursor-pointer"
                        >
                          {sub.subject}
                        </button>
                        <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                          {sub.message}
                        </p>
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-400">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          <span>
                            {new Date(sub.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {new Date(sub.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(sub)}
                            className="rounded bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          >
                            Open
                          </button>

                          {sub.status !== "resolved" ? (
                            <button
                              type="button"
                              disabled={actionInProgress === sub.id}
                              onClick={() => handleUpdateStatus(sub.id, "resolved")}
                              className="rounded bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition-colors cursor-pointer"
                              title="Mark as Resolved"
                            >
                              Resolve
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionInProgress === sub.id}
                              onClick={() => handleUpdateStatus(sub.id, "unread")}
                              className="rounded bg-amber-950/40 hover:bg-amber-900/50 border border-amber-900/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition-colors cursor-pointer"
                              title="Mark as Unread"
                            >
                              Reopen
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={actionInProgress === sub.id}
                            onClick={() => handleDelete(sub.id)}
                            className="rounded p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 bg-[#121522] px-5 py-3">
            <span className="text-xs text-zinc-400 font-mono">
              Showing page {page} of {totalPages} ({totalCount} total)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Full Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f121d] p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      selectedSubmission.status === "unread"
                        ? "border border-amber-500/40 bg-amber-950/40 text-amber-300"
                        : selectedSubmission.status === "resolved"
                        ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                        : "border border-zinc-700 bg-zinc-800/60 text-zinc-400"
                    }`}
                  >
                    {selectedSubmission.status}
                  </span>
                  <span className="text-xs text-zinc-500">•</span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-2">
                  {selectedSubmission.subject}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sender Metadata Box */}
            <div className="rounded-xl border border-white/5 bg-[#141724] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Correspondent
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {selectedSubmission.name}
                </p>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {selectedSubmission.email}
                </p>
              </div>

              <a
                href={`mailto:${selectedSubmission.email}?subject=${encodeURIComponent(
                  `Re: ${selectedSubmission.subject} — PULSE Research`
                )}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition-colors self-start sm:self-auto shrink-0"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Reply via Email</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </div>

            {/* Message Body Content */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Full Transmission
              </p>
              <div className="rounded-xl border border-white/5 bg-[#141724] p-5 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap font-sans">
                {selectedSubmission.message}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionInProgress === selectedSubmission.id}
                  onClick={() =>
                    handleUpdateStatus(
                      selectedSubmission.id,
                      selectedSubmission.status === "resolved" ? "read" : "resolved"
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    selectedSubmission.status === "resolved"
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {selectedSubmission.status === "resolved"
                      ? "Mark as Unresolved"
                      : "Mark as Resolved"}
                  </span>
                </button>

                {selectedSubmission.status !== "unread" && (
                  <button
                    type="button"
                    disabled={actionInProgress === selectedSubmission.id}
                    onClick={() =>
                      handleUpdateStatus(selectedSubmission.id, "unread")
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Mark as Unread</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={actionInProgress === selectedSubmission.id}
                onClick={() => handleDelete(selectedSubmission.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-950/40 border border-rose-900/40 text-rose-300 hover:bg-rose-900/60 hover:text-white px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
