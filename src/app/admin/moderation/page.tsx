"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  EyeOff,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface ModerationItem {
  commentId: string;
  pollId: string;
  pollTitle: string;
  pollSlug: string;
  content: string;
  status: "visible" | "hidden" | "removed";
  authorName?: string;
  createdAt: string;
  reportCount: number;
  pendingCount: number;
  reasons: string[];
  latestReportAt: string;
  moderationReason?: string;
}

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/admin/moderation"
          : `/api/admin/moderation?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.data.queue || []);
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to load moderation queue.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to connect to moderation service.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const url =
      statusFilter === "all"
        ? "/api/admin/moderation"
        : `/api/admin/moderation?status=${statusFilter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data.success) {
            setItems(data.data.queue || []);
          } else {
            setFeedback({
              type: "error",
              message: data.error || "Failed to load moderation queue.",
            });
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setFeedback({
            type: "error",
            message: "Failed to connect to moderation service.",
          });
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  const handleAction = async (
    commentId: string,
    action: "hide" | "restore" | "remove"
  ) => {
    setActionInProgress(commentId);
    setFeedback(null);

    const reasonPrompt =
      action === "hide" || action === "remove"
        ? prompt("Enter optional moderation reason for audit log:")
        : undefined;

    try {
      const res = await fetch(`/api/admin/moderation/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          reason: reasonPrompt || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const msg = data.data.message || `Comment successfully ${action}d.`;
        setFeedback({
          type: "success",
          message: msg,
        });
        toast.success(msg);
        // Update local items state
        setItems((prev) =>
          prev.map((item) =>
            item.commentId === commentId
              ? { ...item, status: data.data.status }
              : item
          )
        );
      } else {
        const errMsg = data.error || "Failed to update comment status.";
        setFeedback({
          type: "error",
          message: errMsg,
        });
        toast.error(errMsg);
      }
    } catch {
      const netErr = "Network error occurred while applying moderation.";
      setFeedback({
        type: "error",
        message: netErr,
      });
      toast.error(netErr);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-rose-500" />
            <span>Discourse Moderation & Report Queue</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Review citizen reports, enforce civil debate rules, and moderate inappropriate perspectives.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Feedback Toast */}
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
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { label: "All Flagged", value: "all" },
          { label: "Visible", value: "visible" },
          { label: "Hidden", value: "hidden" },
          { label: "Removed", value: "removed" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? "bg-rose-600 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue Listing */}
      {loading ? (
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-12 text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-zinc-500 mb-2" />
          <p className="text-xs text-zinc-400">Loading moderation queue...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/60 mb-3" />
          <h2 className="text-sm font-bold text-white">No Flagged Perspectives in Queue</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {statusFilter === "all"
              ? "All submitted reports have been reviewed. Civic discourse meets quality standards."
              : `No comments with status '${statusFilter}'.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.commentId}
              className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-4"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.status === "visible"
                        ? "border border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                        : item.status === "hidden"
                        ? "border border-amber-500/30 bg-amber-950/30 text-amber-300"
                        : "border border-rose-500/30 bg-rose-950/30 text-rose-300"
                    }`}
                  >
                    Status: {item.status}
                  </span>

                  <span className="rounded bg-rose-950/50 border border-rose-900/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    {item.reportCount} {item.reportCount === 1 ? "report" : "reports"}
                  </span>

                  {item.reasons && item.reasons.length > 0 && (
                    <div className="flex items-center gap-1">
                      {item.reasons.map((r) => (
                        <span
                          key={r}
                          className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300 uppercase"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Link
                    href={`/polls/${item.pollSlug || item.pollId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-zinc-300 hover:text-white transition-colors"
                  >
                    <span className="font-semibold">{item.pollTitle}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Comment Content */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                  <span className="font-semibold text-zinc-300">
                    Author: {item.authorName || "Anonymous Citizen"}
                  </span>
                  <span>Submitted {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-[#151824] p-4 text-xs text-zinc-200 leading-relaxed font-mono">
                  {item.content}
                </div>
                {item.moderationReason && (
                  <p className="mt-1.5 text-[11px] text-amber-300 italic">
                    Moderator Note: {item.moderationReason}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                {item.status === "visible" && (
                  <>
                    <button
                      type="button"
                      disabled={actionInProgress === item.commentId}
                      onClick={() => handleAction(item.commentId, "hide")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition-colors cursor-pointer"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Hide from Discussion</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionInProgress === item.commentId}
                      onClick={() => handleAction(item.commentId, "remove")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Permanently Remove</span>
                    </button>
                  </>
                )}

                {item.status === "hidden" && (
                  <>
                    <button
                      type="button"
                      disabled={actionInProgress === item.commentId}
                      onClick={() => handleAction(item.commentId, "restore")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Restore to Discussion</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionInProgress === item.commentId}
                      onClick={() => handleAction(item.commentId, "remove")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </>
                )}

                {item.status === "removed" && (
                  <button
                    type="button"
                    disabled={actionInProgress === item.commentId}
                    onClick={() => handleAction(item.commentId, "restore")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Restore Perspective</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
