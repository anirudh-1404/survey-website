"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Poll, PollOption } from "@/types/poll";
import { Clock, Check, ArrowRight, Loader2, CheckCircle2, AlertCircle, LogIn } from "lucide-react";
import { PollImage } from "@/components/polls/PollImage";

const MULTI_OPTION_THEMES = [
  { border: "border-rose-500/80", bg: "bg-rose-950/30", ring: "ring-rose-500/50", bar: "bg-rose-600", badgeBg: "border-rose-500 bg-rose-600 text-white" },
  { border: "border-blue-500/80", bg: "bg-blue-950/30", ring: "ring-blue-500/50", bar: "bg-blue-500", badgeBg: "border-blue-500 bg-blue-600 text-white" },
  { border: "border-emerald-500/80", bg: "bg-emerald-950/30", ring: "ring-emerald-500/50", bar: "bg-emerald-500", badgeBg: "border-emerald-500 bg-emerald-600 text-white" },
  { border: "border-amber-500/80", bg: "bg-amber-950/30", ring: "ring-amber-500/50", bar: "bg-amber-500", badgeBg: "border-amber-500 bg-amber-600 text-white" },
  { border: "border-purple-500/80", bg: "bg-purple-950/30", ring: "ring-purple-500/50", bar: "bg-purple-500", badgeBg: "border-purple-500 bg-purple-600 text-white" },
  { border: "border-cyan-500/80", bg: "bg-cyan-950/30", ring: "ring-cyan-500/50", bar: "bg-cyan-500", badgeBg: "border-cyan-500 bg-cyan-600 text-white" },
];

interface FeaturedPollProps {
  poll: Poll;
}

export function FeaturedPoll({ poll }: FeaturedPollProps) {
  const [optionsState, setOptionsState] = useState<PollOption[]>(poll.options);
  const [totalVotes, setTotalVotes] = useState(poll.totalVotes);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Check auth and current vote status on mount
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const [meRes, voteRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/polls/${poll.id}/vote`),
        ]);

        if (!isMounted) return;

        if (meRes.ok) {
          const meData = await meRes.json();
          setIsAuthenticated(Boolean(meData.success && meData.data?.user));
        } else {
          setIsAuthenticated(false);
        }

        if (voteRes.ok) {
          const voteData = await voteRes.json();
          if (voteData.success && voteData.data) {
            if (voteData.data.hasVoted) {
              setHasVoted(true);
              const votedOptKey = voteData.data.userVote;
              if (votedOptKey) {
                const optMatch = poll.options.find(
                  (o) => o.id === `opt-${votedOptKey}` || o.id === votedOptKey
                );
                if (optMatch) setSelectedOption(optMatch.id);
              }
            }
            if (voteData.data.results) {
              setTotalVotes(voteData.data.results.total);
              if (voteData.data.results.byOption) {
                setOptionsState((prev) =>
                  prev.map((opt) => {
                    const key = opt.id.replace(/^opt-/, "").toLowerCase();
                    const stat = voteData.data.results.byOption[key];
                    if (stat) {
                      return {
                        ...opt,
                        votes: stat.count,
                        percentage: stat.percentage,
                      };
                    }
                    return opt;
                  })
                );
              }
            }
          }
        }
      } catch {
        // Fallback to initial poll props
      }
    }
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [poll.id, poll.options]);

  const handleVote = async (optionId: string) => {
    if (isAuthenticated === false) {
      setFeedback({
        type: "info",
        message: "Please sign in to verify your identity and cast your ballot.",
      });
      return;
    }

    if (hasVoted) {
      setFeedback({
        type: "info",
        message: "You have already cast your ballot on this inquiry.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    const optionKey = optionId.replace(/^opt-/, "").toLowerCase();

    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option: optionKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Failed to record your vote.",
        });
        setIsSubmitting(false);
        return;
      }

      setHasVoted(true);
      setSelectedOption(optionId);
      setFeedback({
        type: "success",
        message: "Your ballot has been securely registered and tallied.",
      });

      if (data.data?.results) {
        setTotalVotes(data.data.results.total);
        if (data.data.results.byOption) {
          setOptionsState((prev) =>
            prev.map((opt) => {
              const k = opt.id.replace(/^opt-/, "").toLowerCase();
              const stat = data.data.results.byOption[k];
              if (stat) {
                return {
                  ...opt,
                  votes: stat.count,
                  percentage: stat.percentage,
                };
              }
              return opt;
            })
          );
        }
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error occurred while submitting your vote.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClosed = poll.status === "Closed" || poll.status === "Draft";

  return (
    <section id="featured-poll" className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header banner */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <h2 className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
              Featured Editorial Poll
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {poll.closesAt && (
              <>
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                <span>
                  Closes {new Date(poll.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span>•</span>
              </>
            )}
            <span className="inline-flex items-center rounded-sm bg-rose-950/40 px-2 py-0.5 font-medium text-rose-300 border border-rose-900/30">
              {poll.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Featured Card */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#10121a] p-6 sm:p-8 lg:p-10 shadow-2xl">
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500" />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left: Question and Context */}
            <div className="space-y-4 lg:col-span-7">
              <div className="flex items-center gap-2">
                <span className="rounded bg-white/5 px-2.5 py-1 text-xs font-semibold tracking-wider text-rose-300 uppercase border border-white/5">
                  {poll.category}
                </span>
                {poll.editorialNote && (
                  <>
                    <span className="text-xs text-zinc-400">•</span>
                    <span className="text-xs text-zinc-400">{poll.editorialNote}</span>
                  </>
                )}
              </div>

              {/* Poll Lead Image with fallback */}
              <div className="rounded-lg overflow-hidden border border-white/10">
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

              <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl leading-snug">
                {poll.title}
              </h3>

              <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">
                {poll.summary}
              </p>

              <div className="pt-2 text-xs text-zinc-400">
                <Link
                  href={`/polls/${poll.id}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <span>Full Poll & Live Citizen Chat</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right: Real Balloting UI & Persisted Sentiment */}
            <div className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#141722] p-6 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Public Sentiment Snapshot
                  </span>
                  <span className="text-xs font-mono font-medium text-zinc-300">
                    {totalVotes.toLocaleString()} votes cast
                  </span>
                </div>

                {/* Voting Options */}
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    {hasVoted ? "Your Ballot & Results" : "Cast Your Ballot"}
                  </p>

                  {optionsState.map((opt, idx) => {
                    const isSelected = selectedOption === opt.id;
                    const optKey = opt.id.replace(/^opt-/, "").toLowerCase();
                    const isBinary =
                      optionsState.length === 2 &&
                      (optKey === "yes" || optKey === "no" || optionsState[0]?.id?.includes("yes"));
                    const isYes = optKey === "yes" || (isBinary && idx === 0);
                    const theme = MULTI_OPTION_THEMES[idx % MULTI_OPTION_THEMES.length];
                    const letterBadge = isBinary ? (isYes ? "Y" : "N") : String.fromCharCode(65 + idx);

                    const borderBgClasses = isSelected
                      ? isBinary
                        ? isYes
                          ? "border-rose-500/80 bg-rose-950/30 text-white"
                          : "border-zinc-400 bg-white/10 text-white"
                        : `${theme.border} ${theme.bg} text-white ring-1 ${theme.ring}`
                      : "border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]";

                    const badgeClasses = isSelected
                      ? isBinary
                        ? isYes
                          ? "border-rose-500 bg-rose-600 text-white"
                          : "border-zinc-300 bg-zinc-200 text-zinc-950"
                        : theme.badgeBg
                      : "border-zinc-600 text-zinc-400 group-hover:border-zinc-400";

                    const barColor = isBinary
                      ? isYes
                        ? "bg-rose-600"
                        : "bg-zinc-400"
                      : theme.bar;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isSubmitting || hasVoted || isClosed}
                        onClick={() => handleVote(opt.id)}
                        className={`group w-full rounded-lg border p-4 text-left transition-all ${
                          hasVoted || isClosed ? "cursor-default" : "cursor-pointer"
                        } focus-visible:ring-2 focus-visible:ring-rose-500 ${borderBgClasses}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${badgeClasses}`}
                            >
                              {isSelected ? (
                                <Check className="h-3 w-3 stroke-[3]" />
                              ) : (
                                letterBadge
                              )}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {opt.label.split("—")[0].trim()}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-zinc-300">
                            {opt.percentage}%
                          </span>
                        </div>

                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${opt.percentage}%` }}
                          />
                        </div>

                        {opt.label.includes("—") && (
                          <p className="mt-2 text-xs text-zinc-400 line-clamp-1">
                            {opt.label.split("—").slice(1).join("—").trim()}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Banner and Unauthenticated Prompt */}
              <div className="mt-6 border-t border-white/10 pt-4 space-y-3">
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

                {isAuthenticated === false && !hasVoted && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
                    <span className="text-zinc-400">Sign in to participate:</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/login?redirect=${encodeURIComponent("/")}`}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-500 transition-colors"
                      >
                        <LogIn className="h-3 w-3 shrink-0" />
                        <span className="whitespace-nowrap">Log In</span>
                      </Link>
                      <Link
                        href="/register"
                        className="whitespace-nowrap rounded border border-white/15 px-3 py-1.5 font-medium text-zinc-300 hover:text-white transition-colors"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                )}

                {isSubmitting && (
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                    <span>Recording verified ballot...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
