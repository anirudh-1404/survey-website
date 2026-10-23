"use client";

import { useState } from "react";
import Link from "next/link";
import { Poll, PollComment, PollOption, CommentReply } from "@/types/poll";
import {
  Check,
  Info,
  BarChart3,
  MessageSquare,
  ThumbsUp,
  CornerDownRight,
  Send,
  AlertCircle,
  Share2,
  Lock,
  Loader2,
  CheckCircle2,
  LogIn,
  Flag,
  X,
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  ExternalLink,
} from "lucide-react";
import { PollImage } from "@/components/polls/PollImage";
import { toast } from "sonner";

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
  initialComments,
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

  // --- Discussion State ---
  const [commentsState, setCommentsState] = useState<PollComment[]>(initialComments);
  const [commentDraft, setCommentDraft] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [isPostingReply, setIsPostingReply] = useState(false);

  // Report state
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<
    "spam" | "harassment" | "misinformation" | "inappropriate" | "other"
  >("misinformation");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Discussion feedback
  const [discussionFeedback, setDiscussionFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // LinkedIn-style persistent like/unlike state per comment ID
  const [likesState, setLikesState] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const c of initialComments) {
      initial[c.id] = c.likes ?? 0;
      if (c.replies) {
        for (const r of c.replies) {
          initial[r.id] = r.likes ?? 0;
        }
      }
    }
    return initial;
  });

  const [likedByMeState, setLikedByMeState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const c of initialComments) {
      initial[c.id] = Boolean(c.isLiked);
      if (c.replies) {
        for (const r of c.replies) {
          initial[r.id] = Boolean(r.isLiked);
        }
      }
    }
    return initial;
  });

  const [pendingLikes, setPendingLikes] = useState<Record<string, boolean>>({});
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

  // --- Comment Submission Handler ---
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentDraft.trim()) return;

    if (!isAuthenticated) {
      setDiscussionFeedback({
        type: "info",
        message: "Please sign in to join the civic debate and submit your perspective.",
      });
      return;
    }

    setIsPostingComment(true);
    setDiscussionFeedback(null);

    try {
      const response = await fetch(`/api/polls/${poll.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: commentDraft.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newComment: PollComment = {
          id: data.data.comment.id,
          pollId: poll.id,
          author: data.data.comment.author,
          authorRole: data.data.comment.authorRole,
          isVerified: true,
          content: data.data.comment.content,
          createdAt: data.data.comment.createdAt,
          likes: 0,
          isLiked: false,
          replies: [],
        };

        setCommentsState((prev) => [newComment, ...prev]);
        setLikesState((prev) => ({ ...prev, [newComment.id]: 0 }));
        setLikedByMeState((prev) => ({ ...prev, [newComment.id]: false }));
        setCommentDraft("");
        const successMsg = data.data.message || "Your perspective has been verified and posted!";
        setDiscussionFeedback({
          type: "success",
          message: successMsg,
        });
        toast.success(successMsg);
      } else if (response.status === 429) {
        const rateMsg = "Discussion rate limit reached. Please wait a moment before posting another argument.";
        setDiscussionFeedback({
          type: "error",
          message: rateMsg,
        });
        toast.error(rateMsg);
      } else {
        const failMsg = data.error || "Failed to publish comment.";
        setDiscussionFeedback({
          type: "error",
          message: failMsg,
        });
        toast.error(failMsg);
      }
    } catch {
      const netMsg = "Network error while submitting perspective.";
      setDiscussionFeedback({
        type: "error",
        message: netMsg,
      });
      toast.error(netMsg);
    } finally {
      setIsPostingComment(false);
    }
  };

  // --- Reply Submission Handler ---
  const handleReplySubmit = async (parentId: string) => {
    if (!replyDraft.trim()) return;

    if (!isAuthenticated) {
      const authMsg = "Please sign in to reply to this citizen perspective.";
      setDiscussionFeedback({
        type: "info",
        message: authMsg,
      });
      toast.error(authMsg);
      return;
    }

    setIsPostingReply(true);
    setDiscussionFeedback(null);

    try {
      const response = await fetch(`/api/polls/${poll.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: replyDraft.trim(),
          parentId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newReply: CommentReply = {
          id: data.data.comment.id,
          author: data.data.comment.author,
          authorRole: data.data.comment.authorRole,
          isVerified: true,
          content: data.data.comment.content,
          createdAt: data.data.comment.createdAt,
          likes: 0,
          isLiked: false,
        };

        setCommentsState((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), newReply] }
              : c
          )
        );
        setLikesState((prev) => ({ ...prev, [newReply.id]: 0 }));
        setLikedByMeState((prev) => ({ ...prev, [newReply.id]: false }));

        setReplyDraft("");
        setReplyingToId(null);
        setDiscussionFeedback({
          type: "success",
          message: "Your counter-argument or reply has been posted.",
        });
        toast.success("Your reply has been posted!");
      } else {
        const replyErr = data.error || "Failed to post reply.";
        setDiscussionFeedback({
          type: "error",
          message: replyErr,
        });
        toast.error(replyErr);
      }
    } catch {
      const netErr = "Network error while submitting reply.";
      setDiscussionFeedback({
        type: "error",
        message: netErr,
      });
      toast.error(netErr);
    } finally {
      setIsPostingReply(false);
    }
  };

  // --- Report Submission Handler ---
  const handleReportSubmit = async (commentId: string) => {
    if (!isAuthenticated) {
      const authReportMsg = "Please sign in to report a comment to the editorial board.";
      setDiscussionFeedback({
        type: "info",
        message: authReportMsg,
      });
      toast.error(authReportMsg);
      return;
    }

    setIsSubmittingReport(true);
    setDiscussionFeedback(null);

    try {
      const response = await fetch(`/api/comments/${commentId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReportingCommentId(null);
        setReportDetails("");
        const repSuccess = data.data.message || "Thank you. The perspective has been flagged for moderation review.";
        setDiscussionFeedback({
          type: "success",
          message: repSuccess,
        });
        toast.success(repSuccess);
      } else {
        const repErr = data.error || "Failed to submit report.";
        setDiscussionFeedback({
          type: "error",
          message: repErr,
        });
        toast.error(repErr);
      }
    } catch {
      const netRepErr = "Network error while submitting moderation report.";
      setDiscussionFeedback({
        type: "error",
        message: netRepErr,
      });
      toast.error(netRepErr);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleLike = async (
    id: string,
    initialLikes: number,
    initialIsLiked = false
  ) => {
    if (!isAuthenticated || !currentUser) {
      const likeAuthMsg = "Please sign in to like perspectives and take part in the discussion.";
      setDiscussionFeedback({
        type: "error",
        message: likeAuthMsg,
      });
      toast.error(likeAuthMsg);
      return;
    }

    if (pendingLikes[id]) {
      return;
    }

    const wasLiked =
      likedByMeState[id] !== undefined ? likedByMeState[id] : initialIsLiked;
    const currentCount =
      likesState[id] !== undefined ? likesState[id] : initialLikes;
    const nextLiked = !wasLiked;
    const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    // Optimistic UI update
    setLikedByMeState((prev) => ({ ...prev, [id]: nextLiked }));
    setLikesState((prev) => ({ ...prev, [id]: nextCount }));
    setPendingLikes((prev) => ({ ...prev, [id]: true }));

    if (nextLiked) {
      toast.success("Perspective liked");
    } else {
      toast.info("Like removed");
    }

    try {
      const response = await fetch(`/api/comments/${id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: nextLiked ? "like" : "unlike",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update like status");
      }

      // Reconcile with authoritative state from server
      const authoritativeLiked =
        typeof data.data?.liked === "boolean"
          ? data.data.liked
          : typeof data.data?.isLiked === "boolean"
          ? data.data.isLiked
          : nextLiked;

      const authoritativeCount =
        typeof data.data?.likesCount === "number"
          ? data.data.likesCount
          : typeof data.data?.likes === "number"
          ? data.data.likes
          : nextCount;

      setLikedByMeState((prev) => ({
        ...prev,
        [id]: authoritativeLiked,
      }));
      setLikesState((prev) => ({
        ...prev,
        [id]: authoritativeCount,
      }));
    } catch (err: unknown) {
      // Rollback on failure
      setLikedByMeState((prev) => ({ ...prev, [id]: wasLiked }));
      setLikesState((prev) => ({ ...prev, [id]: currentCount }));
      const likeErrMsg =
        err instanceof Error
          ? err.message
          : "Network error while updating like.";
      setDiscussionFeedback({
        type: "error",
        message: likeErrMsg,
      });
      toast.error(likeErrMsg);
    } finally {
      setPendingLikes((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
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
                    className="flex-1 text-center rounded bg-rose-600 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href={`/register?redirect=${encodeURIComponent(`/polls/${poll.id}`)}`}
                    className="flex-1 text-center rounded border border-white/15 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
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
          Discussion & Public Discourse Section (Placed Below Two-Column Layout)
         ========================================================================= */}
      <section
        id="discussion-section"
        aria-labelledby="discussion-heading"
        className="rounded-xl border border-white/10 bg-[#10121a] p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-rose-500" />
            <h2
              id="discussion-heading"
              className="text-lg font-bold tracking-tight text-white sm:text-xl"
            >
              Public Discourse & Arguments ({commentsState.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Civil Debate Rules Apply
          </span>
        </div>

        {/* Discussion Notice / Feedback Banner */}
        {discussionFeedback && (
          <div
            className={`flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed ${
              discussionFeedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                : discussionFeedback.type === "error"
                ? "border-rose-500/30 bg-rose-950/20 text-rose-300"
                : "border-blue-500/30 bg-blue-950/20 text-blue-300"
            }`}
          >
            {discussionFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <span>{discussionFeedback.message}</span>
          </div>
        )}

        {/* Comment Composition Box */}
        {isAuthenticated ? (
          <form onSubmit={handleCommentSubmit} className="space-y-3">
            <label
              htmlFor="comment-draft"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
            >
              Share your perspective or evidence-backed argument
            </label>
            <div className="relative">
              <textarea
                id="comment-draft"
                rows={3}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="State your viewpoint clearly and constructively..."
                maxLength={2000}
                className="w-full rounded-xl border border-white/10 bg-[#151824] p-3.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
              />
              <div className="absolute right-3 bottom-3 text-[10px] text-zinc-500 font-mono">
                {commentDraft.length}/2000
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">
                Logged in as <strong className="text-zinc-200">{currentUser?.name}</strong>
              </span>
              <button
                type="submit"
                disabled={isPostingComment || !commentDraft.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isPostingComment ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Post Perspective</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center text-xs space-y-2">
            <p className="text-zinc-300">
              Sign in to join this civic debate and post your perspective.
            </p>
            <div className="flex justify-center gap-3 pt-1">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/polls/${poll.id}`)}`}
                className="rounded-md bg-rose-600 px-4 py-1.5 font-semibold text-white hover:bg-rose-500 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href={`/register?redirect=${encodeURIComponent(`/polls/${poll.id}`)}`}
                className="rounded-md border border-white/15 px-4 py-1.5 font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        )}

        {/* Comments Feed */}
        <div className="mt-8 space-y-6">
          {commentsState.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-8 text-center text-xs text-zinc-400">
              No perspectives posted yet. Be the first citizen to contribute an argument!
            </div>
          ) : (
            commentsState.map((comment) => {
              const isLiked =
                likedByMeState[comment.id] !== undefined
                  ? likedByMeState[comment.id]
                  : Boolean(comment.isLiked);
              const currentLikes =
                likesState[comment.id] !== undefined
                  ? likesState[comment.id]
                  : (comment.likes ?? 0);
              const isLikePending = Boolean(pendingLikes[comment.id]);
              const isReplying = replyingToId === comment.id;
              const isReporting = reportingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="rounded-xl border border-white/10 bg-[#131522] p-5 sm:p-6 space-y-4"
                >
                  {/* Comment Author Header */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-950 font-bold text-[11px] text-rose-300 border border-rose-800/40">
                        {comment.author.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-semibold text-white text-xs sm:text-sm truncate">
                        {comment.author}
                      </span>
                      {comment.isVerified && (
                        <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title="Verified Citizen">
                          ✓ Verified
                        </span>
                      )}
                      {comment.authorRole && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400 shrink-0 border border-white/5">
                          {comment.authorRole}
                        </span>
                      )}
                      {comment.userVote && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider shrink-0 border ${
                            comment.userVote === "Yes"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          Voted {comment.userVote}
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-500 font-mono text-[11px] shrink-0 whitespace-nowrap">
                      {comment.createdAt}
                    </span>
                  </div>

                  {/* Comment Text */}
                  <div className="text-xs sm:text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">
                    {comment.content}
                  </div>

                  {/* Actions (Upvote, Reply, Report) */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/5 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        disabled={isLikePending}
                        onClick={() =>
                          handleLike(comment.id, comment.likes ?? 0, Boolean(comment.isLiked))
                        }
                        aria-pressed={isLiked}
                        title={isLiked ? "Unlike this perspective" : "Like this perspective"}
                        className={`inline-flex items-center gap-1.5 text-xs transition-all cursor-pointer rounded-md px-2.5 py-1.5 ${
                          isLiked
                            ? "text-rose-400 bg-rose-500/10 border border-rose-500/30 font-medium"
                            : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                        } ${isLikePending ? "opacity-70 cursor-wait" : ""}`}
                      >
                        <ThumbsUp
                          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                            isLiked ? "fill-rose-400 stroke-rose-400 scale-105" : ""
                          }`}
                        />
                        <span className={`tabular-nums ${isLiked ? "text-rose-300 font-semibold" : ""}`}>
                          {currentLikes}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(isReplying ? null : comment.id);
                          setReportingCommentId(null);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                          isReplying
                            ? "bg-white/10 text-white font-medium"
                            : "hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                        <span>Reply</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReportingCommentId(isReporting ? null : comment.id);
                        setReplyingToId(null);
                      }}
                      className="inline-flex items-center gap-1 hover:text-rose-400 hover:bg-rose-500/5 transition-colors cursor-pointer ml-auto text-[11px] rounded px-2 py-1"
                    >
                      <Flag className="h-3 w-3 shrink-0" />
                      <span>Report</span>
                    </button>
                  </div>

                  {/* Inline Reply Form */}
                  {isReplying && (
                    <div className="mt-3 pl-4 border-l-2 border-rose-500/40 space-y-2 pt-2">
                      <textarea
                        rows={2}
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder={`Reply to ${comment.author}...`}
                        maxLength={1000}
                        className="w-full rounded-lg border border-white/10 bg-[#161826] p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyDraft("");
                          }}
                          className="rounded px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isPostingReply || !replyDraft.trim()}
                          onClick={() => handleReplySubmit(comment.id)}
                          className="inline-flex items-center gap-1 rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                        >
                          {isPostingReply ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Report Form */}
                  {isReporting && (
                    <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-950/10 p-3.5 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-rose-300">
                          Report this comment to moderation
                        </span>
                        <button
                          type="button"
                          onClick={() => setReportingCommentId(null)}
                          className="text-zinc-400 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-zinc-400">
                          Reason for report:
                        </label>
                        <select
                          value={reportReason}
                          onChange={(e) =>
                            setReportReason(
                              e.target.value as
                                | "spam"
                                | "harassment"
                                | "misinformation"
                                | "inappropriate"
                                | "other"
                            )
                          }
                          className="w-full rounded border border-white/10 bg-[#151824] p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
                        >
                          <option value="misinformation">Misinformation / Unverified Claims</option>
                          <option value="harassment">Harassment / Abusive Language</option>
                          <option value="spam">Spam / Commercial Promotion</option>
                          <option value="inappropriate">Inappropriate Content</option>
                          <option value="other">Other Editorial Violation</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-zinc-400">
                          Optional details:
                        </label>
                        <textarea
                          rows={2}
                          value={reportDetails}
                          maxLength={500}
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder="Explain specifically how this argument violates debate standards..."
                          className="w-full rounded border border-white/10 bg-[#151824] p-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setReportingCommentId(null)}
                          className="rounded px-3 py-1 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingReport}
                          onClick={() => handleReportSubmit(comment.id)}
                          className="inline-flex items-center gap-1.5 rounded bg-rose-600 px-3.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmittingReport ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Flag className="h-3 w-3" />
                          )}
                          <span>Submit Report</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 pl-4 border-l border-white/10 space-y-3 pt-2">
                      {comment.replies.map((reply) => {
                        const isReplyLiked =
                          likedByMeState[reply.id] !== undefined
                            ? likedByMeState[reply.id]
                            : Boolean(reply.isLiked);
                        const replyLikes =
                          likesState[reply.id] !== undefined
                            ? likesState[reply.id]
                            : (reply.likes ?? 0);
                        const isReplyLikePending = Boolean(pendingLikes[reply.id]);

                        return (
                          <div
                            key={reply.id}
                            className="rounded-md bg-white/[0.02] p-3.5 space-y-2 text-xs"
                          >
                            {/* Reply Author Header */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                                <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-[9px] text-zinc-300 border border-white/5">
                                  {reply.author.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="font-semibold text-white text-xs truncate">
                                  {reply.author}
                                </span>
                                {reply.isVerified && (
                                  <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 shrink-0">
                                    ✓
                                  </span>
                                )}
                                {reply.authorRole && (
                                  <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded shrink-0 border border-white/5">
                                    {reply.authorRole}
                                  </span>
                                )}
                              </div>
                              <span className="text-zinc-500 font-mono text-[10px] shrink-0 whitespace-nowrap">
                                {reply.createdAt}
                              </span>
                            </div>

                            {/* Reply Text */}
                            <div className="leading-relaxed text-zinc-300 whitespace-pre-wrap break-words text-xs">
                              {reply.content}
                            </div>

                            {/* Reply Action Row */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                              <button
                                type="button"
                                disabled={isReplyLikePending}
                                onClick={() =>
                                  handleLike(reply.id, reply.likes ?? 0, Boolean(reply.isLiked))
                                }
                                aria-pressed={isReplyLiked}
                                title={isReplyLiked ? "Unlike this reply" : "Like this reply"}
                                className={`inline-flex items-center gap-1.5 text-[11px] transition-all cursor-pointer rounded px-2 py-1 ${
                                  isReplyLiked
                                    ? "text-rose-400 bg-rose-500/10 border border-rose-500/30 font-medium"
                                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                                } ${isReplyLikePending ? "opacity-70 cursor-wait" : ""}`}
                              >
                                <ThumbsUp
                                  className={`h-3 w-3 shrink-0 transition-transform ${
                                    isReplyLiked
                                      ? "fill-rose-400 stroke-rose-400 scale-105"
                                      : ""
                                  }`}
                                />
                                <span className={`tabular-nums ${isReplyLiked ? "text-rose-300 font-semibold" : ""}`}>
                                  {replyLikes}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReportingCommentId(reply.id);
                                  setReplyingToId(null);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 px-1.5 py-0.5 rounded transition-colors cursor-pointer ml-auto"
                              >
                                <Flag className="h-2.5 w-2.5 shrink-0" />
                                <span>Report</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
