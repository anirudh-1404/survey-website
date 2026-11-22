"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Save,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Radio,
  Vote,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PollCategory, DEFAULT_POLL_CATEGORIES } from "@/types/poll";
import { PollImageUploader } from "@/components/admin/PollImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PollChat } from "@/components/chat/PollChat";
import { generateSlug } from "@/lib/blog-utils";
import { toast } from "sonner";

interface EditPollPageProps {
  params: Promise<{ id: string }>;
}

interface LiveStatsOption {
  key: string;
  label: string;
  votes: number;
  percentage: number;
}

interface LivePollStats {
  totalVotes: number;
  views: number;
  options: LiveStatsOption[];
  lastVoteAt: string | null;
  lastVoteOption: string | null;
}

function formatTimeAgo(date: Date) {
  const diffSecs = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSecs < 10) return "Just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export default function EditPollPage({ params }: EditPollPageProps) {
  const resolvedParams = use(params);
  const pollId = resolvedParams.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Live vote telemetry state
  const [liveStats, setLiveStats] = useState<LivePollStats | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [justIncremented, setJustIncremented] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(true);
  const [chatUser, setChatUser] = useState<{ id: string; name: string; role: "user" | "admin" }>({
    id: "admin",
    name: "Editorial Admin",
    role: "admin",
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryList, setCategoryList] = useState<string[]>([...DEFAULT_POLL_CATEGORIES]);
  const [category, setCategory] = useState<string>("Technology & AI");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [summary, setSummary] = useState("");
  const [context, setContext] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [editorialNote, setEditorialNote] = useState("");
  const [options, setOptions] = useState<Array<{ key: string; label: string }>>([
    { key: "yes", label: "Yes — In favor of the proposed measure" },
    { key: "no", label: "No — Opposed to the proposed measure" },
  ]);
  const [status, setStatus] = useState<"draft" | "published" | "closed">("draft");
  const [closesAt, setClosesAt] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddOption = () => {
    const nextIdx = options.length + 1;
    setOptions((prev) => [
      ...prev,
      { key: `option_${nextIdx}`, label: "" },
    ]);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length <= 2) {
      toast.error("A poll must have at least 2 options.");
      return;
    }
    setOptions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleOptionChange = (index: number, newLabel: string) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], label: newLabel };
      return copy;
    });
  };

  const handleSetBinaryPreset = () => {
    setOptions([
      { key: "yes", label: "Yes — In favor of the proposed measure" },
      { key: "no", label: "No — Opposed to the proposed measure" },
    ]);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadPoll() {
      try {
        const res = await fetch(`/api/admin/polls/${pollId}`);
        const data = await res.json();
        if (!res.ok) {
          if (isMounted) setLoadError(data.error || "Failed to load poll record.");
          return;
        }

        const p = data.data.poll;
        if (isMounted) {
          setTitle(p.title);
          setSlug(p.slug);
          if (p.category) {
            setCategory(p.category);
            setCategoryList((prev) => (prev.includes(p.category) ? prev : [...prev, p.category]));
          }
          setSummary(p.summary);
          setContext(p.context || "");
          setSourceReference(p.sourceReference || "");
          setEditorialNote(p.editorialNote || "");
          setStatus(p.status);
          setClosesAt(p.closesAt || "");
          setFeatured(p.featured || false);
          setImageUrl(p.imageUrl || "");
          setCloudinaryPublicId(p.cloudinaryPublicId || "");
          setImageAlt(p.imageAlt || "");
          setMetaTitle(p.metaTitle || "");
          setMetaDescription(p.metaDescription || "");
          setSeoKeywords(
            Array.isArray(p.seoKeywords) ? p.seoKeywords.join(", ") : ""
          );

          if (p.totalVotes !== undefined) {
            setLiveStats({
              totalVotes: p.totalVotes,
              views: p.views || 0,
              options: p.options || [],
              lastVoteAt: null,
              lastVoteOption: null,
            });
            setLastUpdated(new Date());
          }

          if (Array.isArray(p.options) && p.options.length >= 2) {
            setOptions(
              p.options.map((o: { key?: string; label?: string }, i: number) => ({
                key: o.key || (i === 0 ? "yes" : i === 1 ? "no" : `option_${i + 1}`),
                label: o.label || "",
              }))
            );
          } else {
            setOptions([
              { key: "yes", label: "Yes — In favor of the proposed measure" },
              { key: "no", label: "No — Opposed to the proposed measure" },
            ]);
          }
        }
      } catch {
        if (isMounted) setLoadError("A network error occurred while loading the poll.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadPoll();
    return () => {
      isMounted = false;
    };
  }, [pollId]);

  const fetchLiveStatsDirect = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/admin/polls/${pollId}/live-stats`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success) {
        setLiveStats({
          totalVotes: data.data.totalVotes,
          views: data.data.views || 0,
          options: data.data.options || [],
          lastVoteAt: data.data.lastVoteAt,
          lastVoteOption: data.data.lastVoteOption,
        });
        setLastUpdated(new Date());
      }
    } catch {
      // silent
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isLiveStreaming || !pollId) return;

    let isMounted = true;
    let prevVotes: number | null = null;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/polls/${pollId}/live-stats`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && isMounted) {
          const currentTotal = data.data.totalVotes;
          if (prevVotes !== null && currentTotal > prevVotes) {
            setJustIncremented(true);
            setTimeout(() => {
              if (isMounted) setJustIncremented(false);
            }, 2500);
          }
          prevVotes = currentTotal;

          setLiveStats({
            totalVotes: currentTotal,
            views: data.data.views || 0,
            options: data.data.options || [],
            lastVoteAt: data.data.lastVoteAt,
            lastVoteOption: data.data.lastVoteOption,
          });
          setLastUpdated(new Date());
        }
      } catch {
        // silent polling catch
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollId, isLiveStreaming]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.user) {
          setChatUser(data.data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-");
    setSlug(raw);
    if (errors.slug) setErrors((prev) => ({ ...prev, slug: "" }));
  };

  const handleSlugBlur = () => {
    setSlug((prev) => generateSlug(prev));
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) {
      toast.error("Please enter a category name");
      return;
    }
    if (!categoryList.includes(trimmed)) {
      setCategoryList((prev) => [...prev, trimmed]);
    }
    setCategory(trimmed);
    setCustomCategoryInput("");
    setIsCustomCategory(false);
    toast.success(`Category "${trimmed}" added and selected`);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 10) {
      errs.title = "Question/title must be at least 10 characters long.";
    }
    if (!summary.trim() || summary.trim().length < 20) {
      errs.summary = "Summary must be at least 20 characters long.";
    }
    if (!options || options.length < 2) {
      errs.options = "A poll must have at least 2 options.";
    } else {
      let emptyCount = 0;
      options.forEach((opt, idx) => {
        if (!opt.label.trim()) {
          errs[`option_${idx}`] = `Option ${idx + 1} description cannot be empty.`;
          emptyCount++;
        }
      });
      if (emptyCount > 0) {
        errs.options = "All options must have a description.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const seenOptionKeys = new Set<string>();
      const formattedOptions = options.map((opt, i) => {
        const label = opt.label.trim();
        let baseKey = opt.key?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (!baseKey) {
          baseKey = i === 0 ? "yes" : i === 1 ? "no" : `option_${i + 1}`;
        }
        let key = baseKey;
        let counter = 1;
        while (seenOptionKeys.has(key)) {
          key = `${baseKey}_${counter}`;
          counter++;
        }
        seenOptionKeys.add(key);
        return { key, label };
      });

      let formattedClosesAt: string | null = null;
      if (closesAt && closesAt.trim()) {
        const d = new Date(closesAt.trim());
        if (!isNaN(d.getTime())) {
          formattedClosesAt = d.toISOString();
        }
      }

      const res = await fetch(`/api/admin/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() ? generateSlug(slug) : undefined,
          category,
          summary: summary.trim(),
          context: context.trim() || undefined,
          sourceReference: sourceReference.trim() || undefined,
          editorialNote: editorialNote.trim() || undefined,
          status,
          closesAt: formattedClosesAt,
          featured,
          options: formattedOptions,
          imageUrl: imageUrl.trim() || "",
          cloudinaryPublicId: cloudinaryPublicId.trim() || "",
          imageAlt: imageAlt.trim() || "",
          metaTitle: metaTitle.trim() || "",
          metaDescription: metaDescription.trim() || "",
          seoKeywords: seoKeywords.trim() || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const updateErr = data.error || "Failed to persist poll updates.";
        setFeedback({ type: "error", message: updateErr });
        if (updateErr.toLowerCase().includes("slug")) {
          setErrors((prev) => ({ ...prev, slug: updateErr }));
        }
        toast.error(updateErr);
        setIsSubmitting(false);
        return;
      }

      if (data?.data?.poll?.slug) {
        setSlug(data.data.poll.slug);
      }

      const updateMsg = "Inquiry successfully updated and saved to MongoDB.";
      setFeedback({ type: "success", message: updateMsg });
      toast.success(updateMsg);
      setIsSubmitting(false);
      router.refresh();
    } catch {
      const netUpdateErr = "Network error occurred while communicating with server.";
      setFeedback({ type: "error", message: netUpdateErr });
      toast.error(netUpdateErr);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
        <span className="ml-2 text-xs text-zinc-400">Loading poll record...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
        <h2 className="mt-3 text-lg font-bold text-white">Record Not Found</h2>
        <p className="mt-1 text-xs text-zinc-400">{loadError}</p>
        <Link
          href="/admin/polls"
          className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Poll Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/polls"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Survey Catalog</span>
        </Link>

        {status === "published" && (
          <Link
            href={`/polls/${slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
          >
            <span>Preview Public View</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Edit Editorial Inquiry
          </h2>
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
            <span>Public URL:</span>
            <code className="text-zinc-300 font-mono">/polls/{slug}</code>
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${
            status === "published"
              ? "bg-emerald-950/50 text-emerald-300 border border-emerald-900/40"
              : status === "closed"
              ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
              : "bg-amber-950/50 text-amber-300 border border-amber-900/40"
          }`}
        >
          Status: {status}
        </span>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-xs leading-relaxed flex items-start gap-3 shadow-lg ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
              : "border-rose-500/30 bg-rose-950/20 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{feedback.type === "success" ? "Updated" : "Error"}</p>
            <p className="mt-0.5">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* LIVE BALLOT TELEMETRY & REAL-TIME VOTE COUNT */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-b from-[#151828] to-[#0c0d14] p-5 shadow-2xl">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

        {/* Telemetry Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {isLiveStreaming ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-500"></span>
              )}
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>Live Citizen Ballot Telemetry</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Live Count Active
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isLiveStreaming
                  ? "Streaming verified votes in real-time • Auto-sync every 3s"
                  : "Live streaming paused"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLiveStreaming((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                isLiveStreaming
                  ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
                  : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLiveStreaming ? "bg-emerald-400" : "bg-zinc-500"}`} />
              <span>{isLiveStreaming ? "Stream Active" : "Stream Paused"}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLiveStatsDirect()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Manual Instant Sync"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Total Votes */}
          <div
            className={`p-4 rounded-xl border transition-all duration-500 ${
              justIncremented
                ? "bg-emerald-950/50 border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-[1.02]"
                : "bg-[#0c0d16] border-rose-500/20"
            }`}
          >
            <span className="text-[11px] font-semibold text-rose-300/80 uppercase tracking-wider block">
              Total Verified Ballots
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span
                className={`text-3xl font-extrabold font-mono tracking-tight transition-colors ${
                  justIncremented ? "text-emerald-300 animate-pulse" : "text-white"
                }`}
              >
                {(liveStats?.totalVotes ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-zinc-400">votes</span>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              {justIncremented ? "🟢 New incoming ballot recorded!" : "Live tally for this poll"}
            </span>
          </div>

          {/* Page Views */}
          <div className="p-4 rounded-xl border border-white/5 bg-[#0c0d16]">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Page Impressions
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
                {(liveStats?.views ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-zinc-400">views</span>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Total citizen inquiry visits
            </span>
          </div>

          {/* Voter Turnout Rate */}
          <div className="p-4 rounded-xl border border-white/5 bg-[#0c0d16]">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Turnout Rate
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-emerald-400">
                {liveStats && liveStats.views > 0
                  ? `${Math.min(100, Math.round(((liveStats.totalVotes || 0) / liveStats.views) * 100))}%`
                  : "0%"}
              </span>
              <span className="text-xs text-zinc-400">conversion</span>
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Ballots cast vs readers
            </span>
          </div>

          {/* Last Ballot Received */}
          <div className="p-4 rounded-xl border border-white/5 bg-[#0c0d16]">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Last Ballot Activity
            </span>
            <div className="mt-1.5">
              <span className="text-sm font-semibold text-zinc-200 line-clamp-1">
                {liveStats?.lastVoteAt
                  ? formatTimeAgo(new Date(liveStats.lastVoteAt))
                  : "No votes recorded yet"}
              </span>
              {liveStats?.lastVoteOption && (
                <span className="text-[10px] text-rose-400 font-mono block mt-0.5">
                  Option: &quot;{liveStats.lastVoteOption}&quot;
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              {lastUpdated ? `Telemetry synced at ${lastUpdated.toLocaleTimeString()}` : "Initializing stream..."}
            </span>
          </div>
        </div>

        {/* Live Option Breakdown with Progress Bars */}
        {liveStats && liveStats.options && liveStats.options.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Vote className="h-3.5 w-3.5 text-rose-400" />
                <span>Live Option Vote Distribution</span>
              </span>
              <span className="font-mono text-[11px] text-zinc-400">
                {liveStats.totalVotes} total verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {liveStats.options.map((opt, idx) => {
                const colorGradients = [
                  "from-rose-500 to-rose-600 bg-rose-500",
                  "from-emerald-500 to-emerald-600 bg-emerald-500",
                  "from-sky-500 to-sky-600 bg-sky-500",
                  "from-amber-500 to-amber-600 bg-amber-500",
                  "from-purple-500 to-purple-600 bg-purple-500",
                ];
                const grad = colorGradients[idx % colorGradients.length];

                return (
                  <div
                    key={opt.key || idx}
                    className="rounded-xl bg-white/[0.02] border border-white/5 p-3.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-mono font-bold text-zinc-400 uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                          {opt.key}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="font-bold text-white">{opt.votes} votes</span>
                          <span className="text-zinc-400">({opt.percentage}%)</span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-200 font-medium line-clamp-2">
                        {opt.label || `Option ${idx + 1}`}
                      </p>
                    </div>

                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all duration-700`}
                          style={{ width: `${opt.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* LIVE POLL CHAT & CITIZEN DISCOURSE MONITOR */}
      <div className="rounded-2xl border border-white/10 bg-[#10121a] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Citizen Live Chat & Discourse Monitor</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Stream Active
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Real-time user debates for this inquiry • View incoming messages and moderate instantly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/admin/chats?pollId=${pollId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>Full Screen Hub</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <button
              type="button"
              onClick={() => setShowLiveChat((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {showLiveChat ? (
                <>
                  <span>Collapse</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>Expand Chat</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {showLiveChat && (
          <div className="h-[520px]">
            <PollChat pollId={pollId} currentUser={chatUser} />
          </div>
        )}
      </div>

      <form onSubmit={handleUpdate} className="space-y-6" noValidate>
        {/* Card 1: Question, Category, & Status */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            1. Core Inquiry & Status
          </h3>

          <div>
            <label
              htmlFor="edit-title"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Question / Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 ${
                errors.title
                  ? "border-rose-500 focus:ring-rose-500"
                  : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-400">{errors.title}</p>
            )}
          </div>

          {/* Editable URL Slug */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-slug"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Inquiry URL Slug (Editable)
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                /polls/{slug || "slug"}
              </span>
            </div>
            <input
              id="edit-slug"
              type="text"
              value={slug}
              onChange={handleSlugChange}
              onBlur={handleSlugBlur}
              placeholder="e.g. artificial-intelligence-safety"
              className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 ${
                errors.slug
                  ? "border-rose-500 focus:ring-rose-500"
                  : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
              }`}
            />
            {errors.slug ? (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.slug}</span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-zinc-500">
                You can edit this slug to customize the inquiry URL (/polls/{slug}).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="edit-category"
                  className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                >
                  Inquiry Category
                </label>
                {!isCustomCategory && (
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(true)}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    + Add New Category
                  </button>
                )}
              </div>

              {isCustomCategory ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomCategory();
                        }
                      }}
                      placeholder="e.g. Entertainment & Cinema, Mythology"
                      className="w-full rounded-lg border border-rose-500/50 bg-[#151824] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors shrink-0 cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(false)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Type a new category name and click Add (or press Enter).
                  </p>
                </div>
              ) : (
                <select
                  id="edit-category"
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomCategory(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  {categoryList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__" className="text-rose-400 font-semibold">
                    + Add Custom Category...
                  </option>
                </select>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-status"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Lifecycle Status
              </label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published" | "closed")}
                className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="draft">Draft (Private)</option>
                <option value="published">Published (Public)</option>
                <option value="closed">Closed (Voting Ended)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="edit-closing"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Closing Date (Optional)
              </label>
              <input
                id="edit-closing"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="edit-featured"
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="edit-featured" className="text-xs text-zinc-300 cursor-pointer">
              Feature this poll on the homepage
            </label>
          </div>
        </div>

        {/* Card: Featured Image */}
        <PollImageUploader
          imageUrl={imageUrl}
          cloudinaryPublicId={cloudinaryPublicId}
          imageAlt={imageAlt}
          onChange={(img) => {
            setImageUrl(img.imageUrl);
            setCloudinaryPublicId(img.cloudinaryPublicId);
            setImageAlt(img.imageAlt);
          }}
          disabled={isSubmitting}
        />

        {/* Card 2: Editorial Context */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            2. Editorial Context & Background
          </h3>

          <div>
            <label
              htmlFor="edit-summary"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Short Editorial Summary <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="edit-summary"
              rows={2}
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (errors.summary) setErrors((prev) => ({ ...prev, summary: "" }));
              }}
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 resize-none"
            />
            {errors.summary && (
              <p className="mt-1 text-xs text-rose-400">{errors.summary}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit-context"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Detailed Background & Editorial Context (Rich Text)
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">
                Supports Bold, Italic, Headings, Lists, Quotes & Links
              </span>
            </div>
            <RichTextEditor
              value={context}
              onChange={setContext}
              placeholder="Outline the main perspectives, counterarguments, statistical citations, and potential societal impacts..."
              minHeight="220px"
            />
          </div>

          <div>
            <label
              htmlFor="edit-source"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Authoritative Reference / Citation
            </label>
            <input
              id="edit-source"
              type="text"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label
              htmlFor="edit-editorial-note"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Editorial Note / Deliberation Framing (Optional)
            </label>
            <input
              id="edit-editorial-note"
              type="text"
              value={editorialNote}
              onChange={(e) => setEditorialNote(e.target.value)}
              placeholder="e.g. Focus on economic and civil liberties trade-offs"
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Card 3: Options */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>3. Balloting Options</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                  {options.length} {options.length === 1 ? "choice" : "choices"}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Configure answer choices. You can add multiple choices beyond standard Yes/No.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetBinaryPreset}
                className="text-[11px] font-medium text-zinc-400 hover:text-white px-2.5 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                title="Reset to standard Yes/No"
              >
                Reset to Yes/No
              </button>
              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Option</span>
              </button>
            </div>
          </div>

          {errors.options && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-950/40 border border-rose-500/30 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errors.options}</span>
            </div>
          )}

          <div className="space-y-3">
            {options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isError = Boolean(errors[`option_${idx}`]);
              const canDelete = options.length > 2;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 bg-[#151824] p-3 transition-colors hover:border-white/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-zinc-200">
                      {letter}
                    </span>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${letter} Description (e.g. Strongly Agree, Neutral, Opposed...)`}
                        className={`w-full rounded-md border ${
                          isError
                            ? "border-rose-500 bg-rose-950/20 text-rose-100"
                            : "border-white/10 bg-[#10121a] text-zinc-100"
                        } px-3.5 py-2 text-xs focus:outline-none focus:border-rose-500`}
                      />
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                        title="Remove option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {isError && (
                    <p className="text-[11px] text-rose-400 mt-1.5 pl-9">
                      {errors[`option_${idx}`]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddOption}
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3.5 py-2 transition-all cursor-pointer w-full justify-center"
            >
              <Plus className="h-4 w-4 text-rose-400" />
              <span>Add Another Option</span>
            </button>
          </div>
        </div>

        {/* Card 4: Search Engine Optimization & Viral Discovery */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>4. SEO & Social Discovery (Optional)</span>
                <span className="rounded-full bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                  Hidden From Public UI
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Keywords and custom meta tags injected into search engine headers and WhatsApp share previews.
              </p>
            </div>
          </div>

          {/* Meta Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-meta-title"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Custom Meta Title (Google Search &amp; Social Previews)
              </label>
              <span className="text-[11px] text-zinc-500">
                {metaTitle.length}/200 chars • Optional
              </span>
            </div>
            <input
              id="edit-meta-title"
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Leave empty to use main question title automatically"
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Overrides the page &lt;title&gt; tag shown in Google search results and WhatsApp link cards.
            </p>
          </div>

          {/* Meta Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-meta-description"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
              >
                Custom Meta Description (Search Snippet)
              </label>
              <span className="text-[11px] text-zinc-500">
                {metaDescription.length}/500 chars • Optional
              </span>
            </div>
            <textarea
              id="edit-meta-description"
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Leave empty to use editorial summary automatically"
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              The 1-2 sentence description Google and social apps display under the poll title.
            </p>
          </div>

          {/* SEO Keywords & Hashtags */}
          <div>
            <label
              htmlFor="edit-seo-keywords"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              SEO Keywords &amp; Hashtags (Comma Separated)
            </label>
            <input
              id="edit-seo-keywords"
              type="text"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="e.g. #PunjabElections2027, Bhagwant Mann, AAP Candidate List, Vidhan Sabha, Amritsar"
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
            <div className="mt-2 rounded-lg bg-white/[0.02] border border-white/5 p-3 text-[11px] text-zinc-400 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Invisible to Visitors:</strong> These keywords will NOT be displayed on the public poll card or page UI. They are strictly embedded in page &lt;meta&gt; tags and Schema.org JSON-LD to optimize Google rankings, Discover feed, and viral algorithms.
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/polls"
            className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-all focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Persisting Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
