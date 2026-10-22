"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  ExternalLink,
  Edit,
  AlertCircle,
  CheckCircle,
  Loader2,
  Globe,
  Archive,
  RefreshCw,
} from "lucide-react";

interface AdminPollItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  status: "draft" | "published" | "closed";
  featured: boolean;
  publishedAt: string | null;
  closesAt: string | null;
  createdAt: string;
  createdBy?: { name?: string } | null;
  imageUrl?: string;
  imageAlt?: string;
}

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<AdminPollItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchPolls = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/polls?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setPolls(data.data.polls || []);
      } else {
        setActionNotice({
          type: "error",
          message: data.error || "Failed to load polls from database.",
        });
      }
    } catch {
      setActionNotice({
        type: "error",
        message: "Network error occurred while fetching polls.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPolls();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPolls]);

  const handleStatusChange = async (
    pollId: string,
    targetStatus: "draft" | "published" | "closed",
    title: string
  ) => {
    try {
      const res = await fetch(`/api/admin/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice({
          type: "success",
          message: `Inquiry "${title.slice(0, 35)}..." status updated to ${targetStatus}.`,
        });
        fetchPolls();
      } else {
        setActionNotice({
          type: "error",
          message: data.error || "Failed to update poll status.",
        });
      }
    } catch {
      setActionNotice({
        type: "error",
        message: "Network error while updating poll status.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Poll & Survey Catalog
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage editorial inquiries, inspect live status, and configure publication workflows.
          </p>
        </div>

        <Link
          href="/admin/polls/new"
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Survey Draft</span>
        </Link>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-lg border p-3.5 text-xs ${
            actionNotice.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
              : "border-rose-500/30 bg-rose-950/20 text-rose-300"
          }`}
        >
          {actionNotice.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="rounded-xl border border-white/10 bg-[#10121a] p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Search */}
          <div className="relative md:col-span-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search polls by keywords or topic..."
              className="w-full rounded-lg border border-white/10 bg-[#151824] pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Technology & AI">Technology & AI</option>
              <option value="Global Economy">Global Economy</option>
              <option value="Climate & Energy">Climate & Energy</option>
              <option value="Society & Culture">Society & Culture</option>
              <option value="Geopolitics">Geopolitics</option>
              <option value="Health & Science">Health & Science</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="draft">Drafts Only</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500 border-t border-white/5">
          <span>
            {isLoading ? "Querying database..." : `Showing ${polls.length} poll records`}
          </span>
          <button
            type="button"
            onClick={() => fetchPolls()}
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Polls Table / Cards */}
      <div className="rounded-xl border border-white/10 bg-[#10121a] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 sm:px-6">Question / Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Published Date</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {isLoading && polls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-rose-500 mb-2" />
                    <span>Loading database records...</span>
                  </td>
                </tr>
              ) : polls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    No polls found matching the current criteria. Click &quot;New Survey Draft&quot; to formulate a question.
                  </td>
                </tr>
              ) : (
                polls.map((poll) => {
                  const isDraft = poll.status === "draft";
                  const isPublished = poll.status === "published";
                  const isClosed = poll.status === "closed";

                  return (
                    <tr key={poll.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4 sm:px-6 max-w-md">
                        <div className="flex items-start gap-3">
                          {poll.imageUrl && (
                            <div className="h-10 w-14 shrink-0 overflow-hidden rounded border border-white/10 bg-[#07080c]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={poll.imageUrl}
                                alt={poll.imageAlt || poll.title}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white leading-snug">
                                {poll.title}
                              </span>
                              {poll.featured && (
                                <span className="rounded bg-rose-950/60 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 border border-rose-800/40 uppercase">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1">
                              {poll.summary}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                              slug: {poll.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase">
                          {poll.category}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isPublished
                              ? "border border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                              : isDraft
                              ? "border border-amber-500/30 bg-amber-950/20 text-amber-300"
                              : "border border-zinc-700 bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPublished
                                ? "bg-emerald-400"
                                : isDraft
                                ? "bg-amber-400"
                                : "bg-zinc-500"
                            }`}
                          />
                          {poll.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px] whitespace-nowrap text-zinc-400">
                        {poll.publishedAt
                          ? new Date(poll.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Not Published"}
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Public View (only for published or closed) */}
                          {!isDraft && (
                            <Link
                              href={`/polls/${poll.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                              title="View on public site"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>View</span>
                            </Link>
                          )}

                          {/* Edit Link */}
                          <Link
                            href={`/admin/polls/${poll.id}/edit`}
                            className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit</span>
                          </Link>

                          {/* Quick Lifecycle Action Buttons */}
                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(poll.id, "published", poll.title)}
                              className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900/40 transition-colors cursor-pointer"
                              title="Publish poll live to public feed"
                            >
                              <Globe className="h-3 w-3" />
                              <span>Publish</span>
                            </button>
                          )}

                          {isPublished && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(poll.id, "closed", poll.title)}
                              className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Close voting on this poll"
                            >
                              <Archive className="h-3 w-3" />
                              <span>Close</span>
                            </button>
                          )}

                          {isClosed && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(poll.id, "published", poll.title)}
                              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-white/10 transition-colors cursor-pointer"
                              title="Reopen poll for public engagement"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Reopen</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
