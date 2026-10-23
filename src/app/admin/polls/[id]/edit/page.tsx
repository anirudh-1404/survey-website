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
} from "lucide-react";
import { PollCategory } from "@/types/poll";
import { PollImageUploader } from "@/components/admin/PollImageUploader";
import { toast } from "sonner";

interface EditPollPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPollPage({ params }: EditPollPageProps) {
  const resolvedParams = use(params);
  const pollId = resolvedParams.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<PollCategory>("Technology & AI");
  const [summary, setSummary] = useState("");
  const [context, setContext] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [editorialNote, setEditorialNote] = useState("");
  const [yesLabel, setYesLabel] = useState("");
  const [noLabel, setNoLabel] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "closed">("draft");
  const [closesAt, setClosesAt] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
          setCategory(p.category);
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

          const yesOpt = p.options?.find((o: { key: string }) => o.key === "yes") || p.options?.[0];
          const noOpt = p.options?.find((o: { key: string }) => o.key === "no") || p.options?.[1];
          setYesLabel(yesOpt?.label || "Yes — In favor of the proposed measure");
          setNoLabel(noOpt?.label || "No — Opposed to the proposed measure");
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

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 10) {
      errs.title = "Question/title must be at least 10 characters long.";
    }
    if (!summary.trim() || summary.trim().length < 20) {
      errs.summary = "Summary must be at least 20 characters long.";
    }
    if (!yesLabel.trim()) {
      errs.yesLabel = "Yes option label is required.";
    }
    if (!noLabel.trim()) {
      errs.noLabel = "No option label is required.";
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
      const res = await fetch(`/api/admin/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          summary: summary.trim(),
          context: context.trim(),
          sourceReference: sourceReference.trim(),
          editorialNote: editorialNote.trim(),
          status,
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
          featured,
          options: [
            { key: "yes", label: yesLabel.trim() },
            { key: "no", label: noLabel.trim() },
          ],
          imageUrl: imageUrl.trim() || "",
          cloudinaryPublicId: cloudinaryPublicId.trim() || "",
          imageAlt: imageAlt.trim() || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const updateErr = data.error || "Failed to persist poll updates.";
        setFeedback({ type: "error", message: updateErr });
        toast.error(updateErr);
        setIsSubmitting(false);
        return;
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
          <p className="text-xs text-zinc-400 mt-1">
            Permanent Slug: <code className="text-zinc-300 font-mono">{slug}</code>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
            <div>
              <label
                htmlFor="edit-category"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Inquiry Category
              </label>
              <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PollCategory)}
                className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="Technology & AI">Technology & AI</option>
                <option value="Global Economy">Global Economy</option>
                <option value="Climate & Energy">Climate & Energy</option>
                <option value="Society & Culture">Society & Culture</option>
                <option value="Geopolitics">Geopolitics</option>
                <option value="Health & Science">Health & Science</option>
              </select>
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

          <div>
            <label
              htmlFor="edit-context"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Detailed Policy Background
            </label>
            <textarea
              id="edit-context"
              rows={4}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 resize-none"
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              3. Balloting Options
            </h3>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" />
              Binary Choices
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="edit-yes"
                className="block text-xs font-semibold text-zinc-300 mb-1"
              >
                Yes Option Description <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-yes"
                type="text"
                value={yesLabel}
                onChange={(e) => setYesLabel(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label
                htmlFor="edit-no"
                className="block text-xs font-semibold text-zinc-300 mb-1"
              >
                No Option Description <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-no"
                type="text"
                value={noLabel}
                onChange={(e) => setNoLabel(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
              />
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
