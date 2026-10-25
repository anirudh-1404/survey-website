"use client";

import { useState } from "react";
import Link from "next/link";
import { Poll, PollOption } from "@/types/poll";
import {
  Check,
  Info,
  BarChart3,
  MessageSquare,
  AlertCircle,
  Share2,
  Lock,
  Loader2,
  CheckCircle2,
  LogIn,
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  ExternalLink,
} from "lucide-react";
import { PollImage } from "@/components/polls/PollImage";
import { toast } from "sonner";
import { PollChat } from "@/components/chat/PollChat";

interface PollDetailInteractiveProps {
  poll: Poll;
  initialComments: PollComment[];
  isAuthenticated?: boolean;
  initialHasVoted?: boolean;
  initialUserVote?: string;
  isClosed?: boolean;
  currentUser?: {
    id: string;
    name: string;
    role: "user" | "admin";
  } | null;
}

export function PollDetailInteractive({
  poll,
  isAuthenticated = false,
  initialHasVoted = false,
  initialUserVote,
  isClosed = false,
  currentUser,
}: PollDetailInteractiveProps) {
  // --- Voting State ---
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [userVote, setUserVote] = useState<string | null>(initialUserVote || null);
  const [selectedOption, setSelectedOption] = useState<string | null>(initialUserVote || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [totalVotes, setTotalVotes] = useState(poll.totalVotes);
  const [optionsState, setOptionsState] = useState<PollOption[]>(poll.options);
  const [copiedLink, setCopiedLink] = useState(false);



  // --- Voting Handler ---
  const handleCastVote = async (optionKeyInput?: string) => {
    const targetKey = optionKeyInput || selectedOption;
    if (!targetKey) {
      const msg = "Please select an answer choice before casting your ballot.";
      setFeedback({ type: "error", message: msg });
      toast.error(msg);
      return;
    }

    if (!isAuthenticated) {
      const msg = "Authentication required: Please sign in to verify your identity and cast your ballot.";
      setFeedback({ type: "info", message: msg });
      toast.error(msg);
      return;
    }

    if (isClosed) {
      const msg = "This public inquiry is closed for balloting.";
      setFeedback({ type: "error", message: msg });
      toast.error(msg);
      return;
    }

    if (hasVoted) {
      const msg = "You have already cast your ballot on this inquiry.";
      setFeedback({ type: "info", message: msg });
      toast.info(msg);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    const cleanKey = targetKey.replace(/^opt-/, "").toLowerCase();

    try {
      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ option: cleanKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setHasVoted(true);
        setUserVote(cleanKey);
        setSelectedOption(cleanKey);

        if (data.data?.results) {
          const r = data.data.results;
          setTotalVotes(r.total);
          setOptionsState((prev) =>
            prev.map((opt) => {
              const key = opt.id.replace(/^opt-/, "").toLowerCase();
              const stat = r.byOption?.[key];
              const votes = stat ? stat.count : key === "yes" ? r.yes : r.no;
              const percentage = stat
                ? stat.percentage
                : key === "yes"
                ? r.yesPercent
                : r.noPercent;
              return { ...opt, votes, percentage };
            })
          );
        }

        const successMsg = data.data?.message || `Your ballot for ${cleanKey.toUpperCase()} has been securely registered!`;
        setFeedback({
          type: "success",
          message: successMsg,
        });
        toast.success(successMsg);
      } else if (response.status === 409) {
        setHasVoted(true);
        const conflictMsg = data.error || "You have already cast your ballot on this inquiry.";
        setFeedback({
          type: "error",
          message: conflictMsg,
        });
        toast.info(conflictMsg);
      } else if (response.status === 401) {
        const authMsg = "Your session has expired. Please log in again to vote.";
        setFeedback({
          type: "error",
          message: authMsg,
        });
        toast.error(authMsg);
      } else {
        const failMsg = data.error || "Unable to cast ballot. Please check your connection and try again.";
        setFeedback({
          type: "error",
          message: failMsg,
        });
        toast.error(failMsg);
      }
    } catch {
      setFeedback({
        type: "error",
        message:
          "A network error occurred while submitting your vote. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Poll link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const showResults = hasVoted || isClosed;
  const isOpen = !isClosed && (poll.status === "Open" || poll.status === "Live");

  return (
    <div className="space-y-16">
      {/* =========================================================================
          Two-Column Desktop Layout: Left = Poll Content, Right = Sticky Voting Panel
          Mobile Layout: Stacks Naturally in order
         ========================================================================= */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-start">
        {/* ==================== LEFT COLUMN: Poll Content ==================== */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Back to all polls */}
          <div>
            <Link
              href="/polls"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Back to all polls</span>
            </Link>
          </div>

          {/* Category, Status, Publication & Closing Dates */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded bg-rose-950/40 px-2.5 py-1 font-semibold tracking-wider text-rose-300 uppercase border border-rose-900/30">
              {poll.category}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                isOpen
                  ? "border border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                  : "border border-zinc-700 bg-zinc-800/50 text-zinc-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                }`}
              />
              {poll.status}
            </span>

            {poll.publishedAt && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                  Published {new Date(poll.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </>
            )}

            {poll.closesAt && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  Closes {new Date(poll.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </>
            )}
          </div>

          {/* Poll Title */}
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl leading-tight">
            {poll.title}
          </h1>

          {/* Featured Poll Image with graceful fallback */}
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-xl">
            <PollImage
              imageUrl={poll.imageUrl}
              imageAlt={poll.imageAlt}
              title={poll.title}
              category={poll.category}
              aspectRatio="21/9"
              priority={true}
              className="!border-0"
            />
          </div>

          {/* Poll Description / Short Summary */}
          <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-3">
            <h2 className="text-xs font-bold tracking-wider uppercase text-zinc-400">
              Overview & Background
            </h2>
            <p className="text-base leading-relaxed text-zinc-200 sm:text-lg">
              {poll.summary}
            </p>
          </div>

          {/* Supporting Information (Context & Sourcing) */}
          {poll.context && (
            <div className="rounded-xl border border-white/10 bg-[#12141e] p-6 text-sm leading-relaxed text-zinc-300 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-rose-400 uppercase">
                <Shield className="h-3.5 w-3.5" />
                <span>Editorial Context & Analytical Background</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">
                {poll.context}
              </p>
              {poll.sourceReference && (
                <div className="pt-3 text-xs text-zinc-400 flex items-center gap-1.5 border-t border-white/5">
                  <ExternalLink className="h-3 w-3 text-zinc-500" />
                  <span>
                    Reference:{" "}
                    <span className="text-zinc-200 font-medium">
                      {poll.sourceReference}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== RIGHT COLUMN: Voting Panel (Sticky Desktop) ==================== */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-4">
          <section
            aria-labelledby="ballot-panel-heading"
            className="rounded-xl border border-white/10 bg-[#10121a] p-6 sm:p-7 shadow-2xl space-y-5"
          >
            {/* Header: Status and closing info */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2
                  id="ballot-panel-heading"
                  className="text-sm font-bold uppercase tracking-wider text-white"
                >
                  Citizen Balloting
                </h2>
                <span className="text-xs font-mono text-zinc-400">
                  {totalVotes.toLocaleString()} votes verified
                </span>
              </div>

              <div>
                {isClosed ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
                    <Lock className="h-3 w-3 text-zinc-400" />
                    <span>Closed</span>
                  </span>
                ) : hasVoted ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Voted</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>Active</span>
                  </span>
                )}
              </div>
            </div>

            {/* Question / Options Heading */}
            <div>
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                {hasVoted ? "Your Ballot & Live Breakdown" : "Select Your Position"}
              </p>

              {/* Dynamic Answer Options */}
              <div className="space-y-3">
                {optionsState.map((opt, idx) => {
                  const optKey = opt.id.replace(/^opt-/, "").toLowerCase();
                  const isSelected =
                    selectedOption === opt.id ||
                    selectedOption === optKey ||
                    userVote === optKey;
                  const isYes = optKey === "yes" || idx === 0;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isSubmitting || hasVoted || isClosed}
                      onClick={() => setSelectedOption(opt.id)}
                      className={`group w-full rounded-lg border p-4 text-left transition-all ${
                        hasVoted || isClosed ? "cursor-default" : "cursor-pointer"
                      } focus-visible:ring-2 focus-visible:ring-rose-500 ${
                        isSelected
                          ? isYes
                            ? "border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/50"
                            : "border-zinc-300 bg-white/10 ring-1 ring-zinc-300/40"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                              isSelected
                                ? isYes
                                  ? "border-rose-500 bg-rose-600 text-white"
                                  : "border-zinc-300 bg-zinc-200 text-zinc-950"
                                : "border-zinc-600 text-zinc-400 group-hover:border-zinc-400"
                            }`}
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : isYes ? (
                              "Y"
                            ) : (
                              "N"
                            )}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {opt.label.split("—")[0].trim()}
                          </span>
                        </div>

                        {showResults && (
                          <span className="text-xs font-mono font-bold text-zinc-300">
                            {opt.percentage}%
                          </span>
                        )}
                      </div>

                      {/* Percentage progress bar (shown once voted or poll is closed) */}
                      {showResults && (
                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isYes ? "bg-rose-600" : "bg-zinc-400"
                            }`}
                            style={{ width: `${opt.percentage}%` }}
                          />
                        </div>
                      )}

                      {opt.label.includes("—") && (
                        <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
                          {opt.label.split("—").slice(1).join("—").trim()}
                        </p>
                      )}

                      {showResults && (
                        <div className="mt-2 text-[10px] text-zinc-500 font-mono">
                          {opt.votes.toLocaleString()} verified votes
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vote Action Button */}
            {!hasVoted && !isClosed && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSubmitting || !selectedOption}
                  onClick={() => handleCastVote()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Recording Ballot...</span>
                    </>
                  ) : (
                    <span>Cast Official Ballot</span>
                  )}
                </button>
              </div>
            )}

            {/* Feedback Banners */}
            {feedback && (
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed ${
                  feedback.type === "success"
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                    : feedback.type === "error"
                    ? "border-rose-500/30 bg-rose-950/20 text-rose-300"
                    : "border-blue-500/30 bg-blue-950/20 text-blue-300"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Unauthenticated Prompt */}
            {!isAuthenticated && !hasVoted && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <LogIn className="h-3.5 w-3.5 text-rose-400" />
                  <span>Citizen Authentication Required</span>
                </div>
                <p className="text-zinc-400">
                  Please sign in to ensure one non-duplicable ballot per citizen.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/polls/${poll.id}`)}`}
                    className="flex-1 text-center whitespace-nowrap rounded bg-rose-600 py-1.5 px-3 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href={`/register?redirect=${encodeURIComponent(`/polls/${poll.id}`)}`}
                    className="flex-1 text-center whitespace-nowrap rounded border border-white/15 py-1.5 px-3 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                  >
                    Register
                  </Link>
                </div>
              </div>
            )}

            {/* Integrity / Share Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1 text-[11px]">
                <BarChart3 className="h-3.5 w-3.5 text-rose-400" />
                <span>MongoDB Cryptographic Tally</span>
              </span>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <Share2 className="h-3 w-3" />
                <span>{copiedLink ? "Link Copied!" : "Share Poll"}</span>
              </button>
            </div>
          </section>

          {/* Methodology Card */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-zinc-400 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-zinc-300">Verified Database Tally:</strong> Ballots are
              hashed and tallied server-side directly in MongoDB. Unique compound indexing guarantees
              each citizen holds exactly one non-duplicable ballot per inquiry.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          Live Chat & Public Discourse Section (Replaces Comments)
         ========================================================================= */}
      <section
        id="discussion-section"
        aria-labelledby="discussion-heading"
        className="space-y-4 pt-4"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-rose-500" />
            <h2
              id="discussion-heading"
              className="text-lg font-bold tracking-tight text-white sm:text-xl"
            >
              Live Citizen Chat & Public Discourse
            </h2>
          </div>
        </div>

        <PollChat pollId={poll.id} currentUser={currentUser || null} />
      </section>
    </div>
  );
}
