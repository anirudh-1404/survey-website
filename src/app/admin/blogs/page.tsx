"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  PlusCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import { BlogPost, BlogStatus } from "@/types/blog";

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({
    total: 0,
    published: 0,
    draft: 0,
  });

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await fetch(`/api/admin/blogs?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        setBlogs(data.data.blogs || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.totalCount || 0);
        if (data.data.counts) {
          setCounts(data.data.counts);
        }
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to load blogs.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error occurred while fetching blogs.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitial() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });
        if (statusFilter !== "all") {
          params.append("status", statusFilter);
        }
        if (searchQuery.trim()) {
          params.append("search", searchQuery.trim());
        }

        const res = await fetch(`/api/admin/blogs?${params.toString()}`);
        const data = await res.json();

        if (!isCancelled) {
          if (res.ok && data.success && data.data) {
            setBlogs(data.data.blogs || []);
            setTotalPages(data.data.totalPages || 1);
            setTotalCount(data.data.totalCount || 0);
            if (data.data.counts) {
              setCounts(data.data.counts);
            }
          } else {
            setFeedback({
              type: "error",
              message: data.error || "Failed to load blogs.",
            });
          }
        }
      } catch {
        if (!isCancelled) {
          setFeedback({
            type: "error",
            message: "Network error occurred while fetching blogs.",
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
  }, [page, statusFilter, searchQuery]);

  // Handle quick toggle between draft and published
  const handleToggleStatus = async (blog: BlogPost) => {
    const nextStatus: BlogStatus =
      blog.status === "published" ? "draft" : "published";
    setActionInProgress(blog.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/blogs/${blog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data?.blog) {
        setBlogs((prev) =>
          prev.map((b) => (b.id === blog.id ? data.data.blog : b))
        );
        setFeedback({
          type: "success",
          message: `Article status changed to ${nextStatus}.`,
        });
        fetchBlogs();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to update article status.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error while updating status.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle delete
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      return;
    }

    setActionInProgress(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBlogs((prev) => prev.filter((b) => b.id !== id));
        setFeedback({
          type: "success",
          message: "Article permanently deleted.",
        });
        fetchBlogs();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to delete article.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error while deleting article.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with Title and Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-950/60 border border-rose-900/40 text-rose-400">
              <FileText className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Editorial Blog & Article CMS
            </h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Publish research analyses, investigative features, and methodology breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchBlogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/blogs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-rose-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Write New Article</span>
          </Link>
        </div>
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

      {/* 3. Controls Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Filter:</span>
          </span>

          {[
            { key: "all", label: "All Articles", count: counts.total },
            { key: "published", label: "Published", count: counts.published },
            { key: "draft", label: "Drafts", count: counts.draft },
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
                    isActive ? "bg-white/20 text-white" : "bg-black/40 text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search articles, slugs..."
            className="w-full rounded-lg border border-white/10 bg-[#0d0f17] pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* 4. Articles Table */}
      <div className="rounded-xl border border-white/10 bg-[#0d0f17] overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 space-y-3">
            <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
            <p className="text-xs">Loading articles...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No articles found</h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              {searchQuery
                ? `No articles matched your query "${searchQuery}".`
                : statusFilter !== "all"
                ? `No articles currently saved as ${statusFilter}.`
                : "Create your first publication to begin building the PULSE blog."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Link
                href="/admin/blogs/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Write First Article</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121522] border-b border-white/10 text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Article Title & Details
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Dates
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {blogs.map((blog) => {
                  const isPublished = blog.status === "published";

                  return (
                    <tr
                      key={blog.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Title, Excerpt, Image thumbnail */}
                      <td className="px-5 py-4 max-w-md">
                        <div className="flex items-start gap-3">
                          {blog.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={blog.imageUrl}
                              alt={blog.imageAlt || blog.title}
                              className="h-12 w-16 object-cover rounded border border-white/10 shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="h-12 w-16 rounded border border-white/5 bg-white/[0.02] flex items-center justify-center text-zinc-600 shrink-0 mt-0.5">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}

                          <div className="space-y-0.5">
                            <Link
                              href={`/admin/blogs/${blog.id}/edit`}
                              className="font-bold text-white hover:text-rose-400 line-clamp-1 transition-colors"
                            >
                              {blog.title}
                            </Link>
                            <p className="text-[11px] text-zinc-400 line-clamp-1">
                              {blog.excerpt}
                            </p>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              /blogs/{blog.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="rounded bg-rose-950/40 px-2 py-0.5 text-[10px] font-semibold text-rose-300 uppercase tracking-wider border border-rose-900/40">
                          {blog.category}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isPublished
                              ? "border border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                              : "border border-zinc-700 bg-zinc-800/60 text-zinc-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPublished ? "bg-emerald-400" : "bg-zinc-500"
                            }`}
                          />
                          <span>{blog.status}</span>
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-400">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          <span>
                            {isPublished && blog.publishedAt
                              ? `Published ${new Date(
                                  blog.publishedAt
                                ).toLocaleDateString()}`
                              : `Created ${new Date(
                                  blog.createdAt
                                ).toLocaleDateString()}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          By {blog.author.name}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isPublished && (
                            <Link
                              href={`/blogs/${blog.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                              title="View Live Article"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}

                          <button
                            type="button"
                            disabled={actionInProgress === blog.id}
                            onClick={() => handleToggleStatus(blog)}
                            className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                              isPublished
                                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                : "bg-emerald-950/50 border border-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60"
                            }`}
                            title={isPublished ? "Unpublish to Draft" : "Publish Live"}
                          >
                            {isPublished ? (
                              <span className="flex items-center gap-1">
                                <EyeOff className="h-3 w-3" />
                                <span>Unpublish</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span>Publish</span>
                              </span>
                            )}
                          </button>

                          <Link
                            href={`/admin/blogs/${blog.id}/edit`}
                            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>

                          <button
                            type="button"
                            disabled={actionInProgress === blog.id}
                            onClick={() => handleDelete(blog.id, blog.title)}
                            className="rounded p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete Article"
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

        {/* 5. Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 bg-[#121522] px-5 py-3">
            <span className="text-xs text-zinc-400 font-mono">
              Showing page {page} of {totalPages} ({totalCount} articles)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
