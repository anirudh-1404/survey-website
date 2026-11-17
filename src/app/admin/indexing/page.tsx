"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Send,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

interface IndexingStatus {
  googleConfigured: boolean;
  googleClientEmail?: string;
  indexNowConfigured: boolean;
  indexNowKey: string;
  siteUrl: string;
}

interface QuickLink {
  type: string;
  title: string;
  url: string;
  publishedAt?: string;
}

interface UrlSubmissionResult {
  url: string;
  google: {
    status: "success" | "skipped" | "error";
    message: string;
  };
  indexNow: {
    status: "success" | "skipped" | "error";
    message: string;
  };
}

export default function InstantIndexingPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [inputUrls, setInputUrls] = useState("");
  const [results, setResults] = useState<UrlSubmissionResult[]>([]);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/indexing");
      if (!res.ok) throw new Error("Failed to load status");
      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data.status);
        setQuickLinks(json.data.quickLinks || []);
      }
    } catch {
      toast.error("Failed to load search indexing configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSubmit = async (urlsToSubmit?: string[]) => {
    const targetUrls =
      urlsToSubmit ||
      inputUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

    if (targetUrls.length === 0) {
      toast.error("Please enter at least one URL to index");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: targetUrls }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Submission failed");
      }

      setResults(json.data.results || []);
      toast.success(
        `Submitted ${json.data.totalSubmitted} URL(s) to search engines!`
      );
      if (!urlsToSubmit) {
        setInputUrls("");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit URLs"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleIndexAllPolls = async () => {
    if (
      !confirm(
        "Are you sure you want to index all published polls and key directory pages?"
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "all_published_polls" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Batch submission failed");
      }

      setResults(json.data.results || []);
      toast.success(
        `Batch submitted ${json.data.totalSubmitted} public pages to search engines!`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Batch indexing failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyIndexNowKey = () => {
    if (!status?.indexNowKey) return;
    navigator.clipboard.writeText(status.indexNowKey);
    setCopiedKey(true);
    toast.success("IndexNow Key copied to clipboard");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 mb-2">
            <Zap className="h-3.5 w-3.5" />
            Instant Search Discovery
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Instant SEO & Search Indexer
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Submit newly published polls, blogs, and platform URLs directly to
            Google Indexing API & Bing IndexNow within minutes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleIndexAllPolls}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-rose-500 hover:to-rose-600 transition-all cursor-pointer disabled:opacity-50"
          >
            <Radio className="h-3.5 w-3.5" />
            Index All Published Polls
          </button>
        </div>
      </div>

      {/* Engine Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Google Indexing API */}
        <div className="rounded-xl border border-white/10 bg-[#11131c] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Google Indexing API</span>
            {status?.googleConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                <AlertCircle className="h-3 w-3" />
                Key Required
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white">
            {status?.googleConfigured
              ? status.googleClientEmail || "Service Account Connected"
              : "Google Cloud Service Account"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {status?.googleConfigured
              ? "Fast crawls enabled via Google Cloud Service Account."
              : "Add JSON key to enable direct Googlebot pings."}
          </p>
          {!status?.googleConfigured && (
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 underline"
            >
              <HelpCircle className="h-3 w-3" />
              {showSetupGuide ? "Hide Setup Guide" : "View 2-Min Setup Guide"}
            </button>
          )}
        </div>

        {/* Bing IndexNow */}
        <div className="rounded-xl border border-white/10 bg-[#11131c] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Bing IndexNow API</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Active & Verified
            </span>
          </div>
          <p className="text-sm font-semibold text-white">Bing, Yahoo, Yandex, Seznam</p>
          <p className="mt-1 text-xs text-zinc-400">
            Hosted key file active at{" "}
            <code className="text-rose-300 text-[10px]">/{status?.indexNowKey?.slice(0, 8)}...txt</code>
          </p>
          <button
            type="button"
            onClick={copyIndexNowKey}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white"
          >
            {copiedKey ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span>{copiedKey ? "Copied!" : "Copy IndexNow Key"}</span>
          </button>
        </div>

        {/* Auto-Trigger on Publish */}
        <div className="rounded-xl border border-white/10 bg-[#11131c] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Auto-Index on Publish</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Enabled
            </span>
          </div>
          <p className="text-sm font-semibold text-white">Background Automation</p>
          <p className="mt-1 text-xs text-zinc-400">
            Whenever a poll or blog is published or updated, it is submitted automatically.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Zero manual work needed
          </div>
        </div>
      </div>

      {/* Setup Guide Collapsible */}
      {showSetupGuide && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <h3 className="text-base font-bold text-white">
                How to Connect Google Indexing API in 3 Simple Steps
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowSetupGuide(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-300">
            <div className="rounded-lg bg-black/40 border border-white/10 p-4 space-y-2">
              <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Step 1: Google Cloud
              </span>
              <p className="font-semibold text-white">Enable Web Search Indexing</p>
              <p className="text-zinc-400 leading-relaxed">
                Open Google Cloud Console, create or select your project, go to APIs & Services, and
                enable <strong>Web Search Indexing API</strong>.
              </p>
            </div>

            <div className="rounded-lg bg-black/40 border border-white/10 p-4 space-y-2">
              <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Step 2: Service Account Key
              </span>
              <p className="font-semibold text-white">Create Key & Add to Server</p>
              <p className="text-zinc-400 leading-relaxed">
                Create a Service Account, generate a JSON Key, and save it as{" "}
                <code className="text-amber-300 font-mono">google-service-account.json</code> in the
                app root directory (or set <code className="text-amber-300 font-mono">GOOGLE_SERVICE_ACCOUNT_KEY</code> in environment).
              </p>
            </div>

            <div className="rounded-lg bg-black/40 border border-white/10 p-4 space-y-2">
              <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Step 3: Search Console
              </span>
              <p className="font-semibold text-white">Add Service Account as Owner</p>
              <p className="text-zinc-400 leading-relaxed">
                In Google Search Console, open property <code className="text-amber-300">https://saynow.in/</code>, go to
                Settings &gt; Users and Permissions, and add the Service Account email as an <strong>Owner</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Submission Form */}
      <div className="rounded-xl border border-white/10 bg-[#11131c] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="h-4 w-4 text-rose-500" />
              Manual URL Indexing Dispatcher
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Paste full URLs (e.g. <code>https://saynow.in/polls/xyz</code>) or relative paths (e.g. <code>/polls/xyz</code>), one per line.
            </p>
          </div>
        </div>

        <textarea
          rows={3}
          value={inputUrls}
          onChange={(e) => setInputUrls(e.target.value)}
          placeholder={`https://saynow.in/polls/which-party-or-alliance-will-form-the-next-government-in-punjab-in-2027\nhttps://saynow.in/blogs/my-editorial-slug`}
          className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Automatically converts to canonical <code>https://saynow.in</code> URLs.
          </p>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting || !inputUrls.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>{submitting ? "Submitting to Search Engines..." : "Dispatch to Google & Bing"}</span>
          </button>
        </div>
      </div>

      {/* Results View */}
      {results.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#11131c] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Submission Results ({results.length} URLs)
            </h3>
            <button
              type="button"
              onClick={() => setResults([])}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Clear Results
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-zinc-400">
                <tr>
                  <th className="pb-3 font-semibold">Target URL</th>
                  <th className="pb-3 font-semibold">Google Indexing API</th>
                  <th className="pb-3 font-semibold">Bing / IndexNow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {results.map((res, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-zinc-300 pr-4 break-all">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-rose-400 transition-colors"
                      >
                        {res.url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 pr-4">
                      {res.google.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          200 OK
                        </span>
                      ) : res.google.status === "skipped" ? (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <Clock className="h-3.5 w-3.5" />
                          Key Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400" title={res.google.message}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          Error
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {res.indexNow.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400" title={res.indexNow.message}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Select Recent Polls / Pages */}
      <div className="rounded-xl border border-white/10 bg-[#11131c] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-rose-400" />
              Quick-Select Recent Content
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click &quot;Index Now&quot; to push any specific published inquiry or platform page directly to search crawlers.
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {quickLinks.map((item, idx) => (
            <div
              key={idx}
              className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-rose-400 rounded bg-rose-500/10 px-1.5 py-0.5 border border-rose-500/20">
                    {item.type}
                  </span>
                  <p className="text-xs font-medium text-white truncate">
                    {item.title}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
                  {item.url}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1.5 text-zinc-400 hover:text-white transition-colors"
                  title="Open Page in New Tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => handleSubmit([item.url])}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Zap className="h-3 w-3 text-rose-400" />
                  Index Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
