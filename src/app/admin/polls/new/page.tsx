"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Send,
  Loader2,
  FileText,
} from "lucide-react";
import { PollCategory } from "@/types/poll";
import { PollImageUploader } from "@/components/admin/PollImageUploader";
import { toast } from "sonner";

export default function CreatePollPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PollCategory>("Technology & AI");
  const [summary, setSummary] = useState("");
  const [context, setContext] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [editorialNote, setEditorialNote] = useState("");
  const [yesLabel, setYesLabel] = useState(
    "Yes — In favor of the proposed measure"
  );
  const [noLabel, setNoLabel] = useState(
    "No — Opposed to the proposed measure"
  );
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [closesAt, setClosesAt] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = "Poll question/title is required.";
    } else if (title.trim().length < 10) {
      errs.title = "Question should be at least 10 characters long.";
    }

    if (!summary.trim()) {
      errs.summary = "A brief contextual summary is required.";
    } else if (summary.trim().length < 20) {
      errs.summary = "Summary should be at least 20 characters long.";
    }

    if (!yesLabel.trim()) {
      errs.yesLabel = "Yes option label cannot be empty.";
    }

    if (!noLabel.trim()) {
      errs.noLabel = "No option label cannot be empty.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (targetStatus: "draft" | "published") => {
    if (!validate()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          summary: summary.trim(),
          context: context.trim(),
          sourceReference: sourceReference.trim(),
          editorialNote: editorialNote.trim(),
          status: targetStatus,
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
          featured,
          options: [
            { key: "yes", label: yesLabel.trim() },
            { key: "no", label: noLabel.trim() },
          ],
          imageUrl: imageUrl.trim() || undefined,
          cloudinaryPublicId: cloudinaryPublicId.trim() || undefined,
          imageAlt: imageAlt.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        const pollErr = data.error || "Failed to save poll to database.";
        setFeedback({
          type: "error",
          message: pollErr,
        });
        toast.error(pollErr);
        setIsSubmitting(false);
        return;
      }

      const pollSuccessMsg =
        targetStatus === "published"
          ? "Poll inquiry successfully published to the live public feed!"
          : "Poll successfully saved as a draft in MongoDB.";

      setFeedback({
        type: "success",
        message: pollSuccessMsg,
      });
      toast.success(pollSuccessMsg);

      setTimeout(() => {
        router.push("/admin/polls");
        router.refresh();
      }, 700);
    } catch {
      const netPollErr = "A network error occurred while communicating with the server.";
      setFeedback({
        type: "error",
        message: netPollErr,
      });
      toast.error(netPollErr);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/polls"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Survey Catalog</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Draft New Editorial Inquiry
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Formulate a balanced, evidence-based question for civic public opinion tracking.
          </p>
        </div>
      </div>

      {/* Submission Feedback Alert */}
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
            <p className="font-semibold">
              {feedback.type === "success" ? "Saved Successfully" : "Submission Error"}
            </p>
            <p className="mt-1">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(status);
        }}
        className="space-y-6"
        noValidate
      >
        {/* Card 1: Question and Category */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>1. Core Inquiry & Topic</span>
          </h3>

          {/* Title */}
          <div>
            <label
              htmlFor="poll-title"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Question / Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="poll-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              placeholder="e.g. Should international agreements mandate external safety audits for frontier AI?"
              className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                errors.title
                  ? "border-rose-500 focus:ring-rose-500"
                  : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
              }`}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
            <div>
              <label
                htmlFor="poll-category"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Inquiry Category
              </label>
              <select
                id="poll-category"
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
                htmlFor="poll-status"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Initial Publication Status
              </label>
              <select
                id="poll-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="draft">Save as Draft (Private)</option>
                <option value="published">Publish Immediately (Public)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="poll-closing"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Closing Date (Optional)
              </label>
              <input
                id="poll-closing"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="poll-featured"
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="poll-featured" className="text-xs text-zinc-300 cursor-pointer">
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

        {/* Card 2: Editorial Context & Background */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>2. Editorial Context & Sourcing</span>
          </h3>

          <div>
            <label
              htmlFor="poll-summary"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Short Editorial Summary <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="poll-summary"
              rows={2}
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (errors.summary) setErrors((prev) => ({ ...prev, summary: "" }));
              }}
              placeholder="Provide a concise 1-2 sentence neutral overview of the policy debate..."
              className={`w-full rounded-lg border bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 resize-none ${
                errors.summary
                  ? "border-rose-500 focus:ring-rose-500"
                  : "border-white/10 focus:border-rose-500 focus:ring-rose-500"
              }`}
            />
            {errors.summary && (
              <p className="mt-1 text-xs text-rose-400">{errors.summary}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="poll-context"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Detailed Background & Argument Framing (Optional)
            </label>
            <textarea
              id="poll-context"
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Outline the main perspectives, counterarguments, and potential societal impacts..."
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="poll-source"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Authoritative Reference / Think Tank Source
            </label>
            <input
              id="poll-source"
              type="text"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              placeholder="e.g. United Nations AI Advisory Body, Oxford Labor Economics Report"
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label
              htmlFor="poll-editorial-note"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Editorial Note / Deliberation Framing (Optional)
            </label>
            <input
              id="poll-editorial-note"
              type="text"
              value={editorialNote}
              onChange={(e) => setEditorialNote(e.target.value)}
              placeholder="e.g. Focus on economic and civil liberties trade-offs"
              className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Card 3: Voting Options */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>3. Balloting Options</span>
            </h3>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" />
              Standard Binary Formulation
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="yes-label"
                className="block text-xs font-semibold text-zinc-300 mb-1"
              >
                Yes Option Description <span className="text-rose-500">*</span>
              </label>
              <input
                id="yes-label"
                type="text"
                value={yesLabel}
                onChange={(e) => setYesLabel(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#151824] px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label
                htmlFor="no-label"
                className="block text-xs font-semibold text-zinc-300 mb-1"
              >
                No Option Description <span className="text-rose-500">*</span>
              </label>
              <input
                id="no-label"
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
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit("draft")}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-zinc-400" />
            <span>Save as Draft</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit("published")}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-all focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Publish Poll Live</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
