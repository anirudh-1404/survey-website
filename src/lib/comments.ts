import { connectToDatabase } from "@/lib/mongodb";
import { CommentModel, IComment, CommentStatus } from "@/models/Comment";
import { ReportModel, ReportReason } from "@/models/Report";
import { PollModel } from "@/models/Poll";
import { UserModel } from "@/models/User";
import { VoteModel } from "@/models/Vote";
import { PollComment, CommentReply } from "@/types/poll";
import mongoose from "mongoose";

export class CommentError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "CommentError";
    this.statusCode = statusCode;
  }
}

/**
 * Format timestamp into human-readable relative or calendar text.
 */
function formatCommentDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Sanitize plain user text while preserving whitespace and punctuation.
 * Strips script tags, HTML tags, and control characters to prevent XSS.
 */
export function sanitizeCommentContent(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); // Strip non-printable ASCII
}

/**
 * Extract unique like count safely handling legacy numbers, arrays, or undefined.
 */
export function extractLikesCount(likes: unknown): number {
  if (Array.isArray(likes)) {
    return likes.length;
  }
  if (typeof likes === "number" && !Number.isNaN(likes) && likes >= 0) {
    return Math.floor(likes);
  }
  return 0;
}

/**
 * Check if a specific user has liked a comment.
 */
export function checkIsLiked(likes: unknown, userId?: string | mongoose.Types.ObjectId): boolean {
  if (!userId || !Array.isArray(likes)) {
    return false;
  }
  const idStr = userId.toString();
  return likes.some((item) => item && item.toString() === idStr);
}

/**
 * Retrieve public comments and replies for a published poll.
 * DRAFTS RETURN NULL (404).
 * Strips all private user fields (emails, password hashes, session tokens).
 */
export async function getPollDiscussion(
  pollIdentifier: string,
  options?: { page?: number; limit?: number },
  currentUserId?: string
): Promise<{
  comments: PollComment[];
  totalCount: number;
  page: number;
  totalPages: number;
} | null> {
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
    ],
  }).select("_id status slug").lean();

  if (!poll || poll.status === "draft") {
    return null;
  }

  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(Math.max(1, options?.limit || 20), 50);
  const skip = (page - 1) * limit;

  // 1. Fetch top-level comments (parentId: null) that are visible or have replies
  const topLevelFilter = {
    pollId: poll._id,
    parentId: null,
    status: { $in: ["visible", "hidden", "removed"] as CommentStatus[] },
  };

  const totalCount = await CommentModel.countDocuments({
    pollId: poll._id,
    parentId: null,
    status: "visible",
  });

  const topLevelDocs = (await CommentModel.find(topLevelFilter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()) as unknown as IComment[];

  if (topLevelDocs.length === 0) {
    return {
      comments: [],
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  const topLevelIds = topLevelDocs.map((doc) => doc._id);

  // 2. Fetch replies attached to these top-level comments
  const replyDocs = (await CommentModel.find({
    pollId: poll._id,
    parentId: { $in: topLevelIds },
    status: "visible", // Only visible replies are shown
  })
    .sort({ createdAt: 1 })
    .lean()) as unknown as IComment[];

  // 3. Collect author IDs and check voting badges
  const authorIds = new Set<string>();
  for (const doc of topLevelDocs) authorIds.add(doc.authorId.toString());
  for (const doc of replyDocs) authorIds.add(doc.authorId.toString());

  const authorObjectIds = Array.from(authorIds).map((id) => new mongoose.Types.ObjectId(id));

  // Query authors safely: ONLY name, role
  const authors = await UserModel.find({
    _id: { $in: authorObjectIds },
  })
    .select("_id name role")
    .lean();

  const authorMap = new Map<string, { name: string; role: string }>();
  for (const a of authors) {
    authorMap.set(a._id.toString(), {
      name: a.name || "Anonymous Citizen",
      role: a.role === "admin" ? "Editorial Lead" : "Verified Citizen",
    });
  }

  // Query author votes on this poll
  const votes = await VoteModel.find({
    pollId: poll._id,
    userId: { $in: authorObjectIds },
  })
    .select("userId option")
    .lean();

  const voteMap = new Map<string, "Yes" | "No">();
  for (const v of votes) {
    voteMap.set(
      v.userId.toString(),
      v.option.toLowerCase() === "yes" ? "Yes" : "No"
    );
  }

  // 4. Map replies grouped by parentId
  const replyMap = new Map<string, CommentReply[]>();
  for (const r of replyDocs) {
    const parentKey = r.parentId!.toString();
    const existing = replyMap.get(parentKey) || [];
    const authorInfo = authorMap.get(r.authorId.toString()) || {
      name: "Verified Citizen",
      role: "Verified Citizen",
    };

    const replyLikesCount = extractLikesCount(r.likes);
    const replyIsLiked = checkIsLiked(r.likes, currentUserId);

    existing.push({
      id: r._id.toString(),
      author: authorInfo.name,
      authorRole: authorInfo.role,
      isVerified: true,
      content: r.content,
      createdAt: formatCommentDate(new Date(r.createdAt)),
      likes: replyLikesCount,
      isLiked: replyIsLiked,
    });
    replyMap.set(parentKey, existing);
  }

  // 5. Build final comments structure
  const formattedComments: PollComment[] = [];

  for (const doc of topLevelDocs) {
    const replies = replyMap.get(doc._id.toString()) || [];

    // If top-level comment was removed or hidden and has no replies, omit
    if (doc.status === "removed" && replies.length === 0) continue;
    if (doc.status === "hidden" && replies.length === 0) continue;

    const authorInfo = authorMap.get(doc.authorId.toString()) || {
      name: "Verified Citizen",
      role: "Verified Citizen",
    };

    let displayContent = doc.content;
    if (doc.status === "removed") {
      displayContent = "[This perspective was removed by editorial moderation]";
    } else if (doc.status === "hidden") {
      displayContent = "[This perspective has been hidden pending moderation review]";
    }

    const docLikesCount = extractLikesCount(doc.likes);
    const docIsLiked = checkIsLiked(doc.likes, currentUserId);

    formattedComments.push({
      id: doc._id.toString(),
      pollId: poll.slug || poll._id.toString(),
      author: doc.status === "visible" ? authorInfo.name : "Citizen",
      authorRole: doc.status === "visible" ? authorInfo.role : undefined,
      isVerified: true,
      userVote: doc.status === "visible" ? voteMap.get(doc.authorId.toString()) : undefined,
      content: displayContent,
      createdAt: formatCommentDate(new Date(doc.createdAt)),
      likes: docLikesCount,
      isLiked: docIsLiked,
      replies: replies.length > 0 ? replies : undefined,
    });
  }

  return {
    comments: formattedComments,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

/**
 * Create a new comment or reply on a published poll.
 */
export async function createComment(params: {
  pollIdentifier: string;
  authorId: string;
  content: string;
  parentId?: string;
}): Promise<PollComment> {
  await connectToDatabase();

  const cleanContent = sanitizeCommentContent(params.content);
  if (!cleanContent || cleanContent.length < 1) {
    throw new CommentError("Comment cannot be empty", 422);
  }
  if (cleanContent.length > 2000) {
    throw new CommentError("Comment cannot exceed 2000 characters", 422);
  }

  if (!params.authorId || !mongoose.Types.ObjectId.isValid(params.authorId)) {
    throw new CommentError("Authentication required to post a perspective", 401);
  }

  // 1. Locate poll
  const isObjectId = mongoose.Types.ObjectId.isValid(params.pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: params.pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(params.pollIdentifier) }] : []),
    ],
  }).select("_id status slug");

  if (!poll) {
    throw new CommentError("Poll inquiry not found", 404);
  }

  if (poll.status === "draft") {
    throw new CommentError("Cannot comment on an unpublished draft inquiry", 403);
  }

  // 2. Validate parent comment if replying
  let parentObjectId: mongoose.Types.ObjectId | null = null;
  if (params.parentId) {
    if (!mongoose.Types.ObjectId.isValid(params.parentId)) {
      throw new CommentError("Invalid parent comment reference", 422);
    }

    const parent = await CommentModel.findById(params.parentId);
    if (!parent) {
      throw new CommentError("Parent comment could not be found", 404);
    }

    // Cross-poll reply prevention
    if (!parent.pollId.equals(poll._id)) {
      throw new CommentError("Replies cannot target a comment from another poll", 422);
    }

    // Cannot reply to removed or hidden comment
    if (parent.status !== "visible") {
      throw new CommentError("Cannot reply to a comment that has been removed or hidden", 403);
    }

    // Flatten nested reply to the root parent to maintain a clean 2-level discussion tree
    parentObjectId = parent.parentId ? parent.parentId : parent._id;
  }

  // 3. Save comment
  const authorObjectId = new mongoose.Types.ObjectId(params.authorId);
  const comment = await CommentModel.create({
    pollId: poll._id,
    authorId: authorObjectId,
    content: cleanContent,
    parentId: parentObjectId,
    status: "visible",
  });

  // 4. Fetch author safe details and user vote
  const author = await UserModel.findById(authorObjectId).select("name role").lean();
  const userVoteDoc = await VoteModel.findOne({
    pollId: poll._id,
    userId: authorObjectId,
  }).select("option").lean();

  const userVote = userVoteDoc
    ? userVoteDoc.option.toLowerCase() === "yes" ? "Yes" : "No"
    : undefined;

  return {
    id: comment._id.toString(),
    pollId: poll.slug || poll._id.toString(),
    author: author?.name || "Verified Citizen",
    authorRole: author?.role === "admin" ? "Editorial Lead" : "Verified Citizen",
    isVerified: true,
    userVote,
    content: comment.content,
    createdAt: "Just now",
    likes: 0,
    replies: [],
  };
}

/**
 * Submit a report against an inappropriate comment.
 * Enforces one report per user per comment via unique index.
 */
export async function reportComment(params: {
  commentId: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
}): Promise<{
  success: boolean;
  duplicate: boolean;
  message: string;
}> {
  await connectToDatabase();
  await ReportModel.init();

  if (!params.reporterId || !mongoose.Types.ObjectId.isValid(params.reporterId)) {
    throw new CommentError("Authentication required to file a report", 401);
  }

  if (!params.commentId || !mongoose.Types.ObjectId.isValid(params.commentId)) {
    throw new CommentError("Invalid comment reference", 422);
  }

  const validReasons: ReportReason[] = [
    "spam",
    "harassment",
    "misinformation",
    "inappropriate",
    "other",
  ];
  if (!validReasons.includes(params.reason)) {
    throw new CommentError(
      `Invalid report category. Allowed: ${validReasons.join(", ")}`,
      422
    );
  }

  const comment = await CommentModel.findById(params.commentId);
  if (!comment) {
    throw new CommentError("The reported comment could not be found", 404);
  }

  const cleanDetails = params.details ? sanitizeCommentContent(params.details).slice(0, 500) : undefined;

  try {
    await ReportModel.create({
      commentId: comment._id,
      pollId: comment.pollId,
      reporterId: new mongoose.Types.ObjectId(params.reporterId),
      reason: params.reason,
      details: cleanDetails,
      status: "pending",
    });

    return {
      success: true,
      duplicate: false,
      message: "Thank you. Your report has been submitted to editors for review.",
    };
  } catch (err: unknown) {
    // Handle duplicate key error code 11000
    if (
      err &&
      typeof err === "object" &&
      ("code" in err && (err as { code: number }).code === 11000)
    ) {
      return {
        success: true,
        duplicate: true,
        message: "You have already filed a report for this perspective.",
      };
    }
    throw err;
  }
}

/**
 * Retrieve admin moderation queue with report counts and comment context.
 * Server-side Admin Only.
 */
export async function getModerationQueue(options?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  await connectToDatabase();

  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(Math.max(1, options?.limit || 20), 50);
  const skip = (page - 1) * limit;

  const matchFilter: Record<string, unknown> = {};
  if (options?.status && ["visible", "hidden", "removed"].includes(options.status)) {
    matchFilter["comment.status"] = options.status;
  }

  // Aggregate reported comments with total report counts and reasons
  const agg = await ReportModel.aggregate([
    {
      $group: {
        _id: "$commentId",
        pollId: { $first: "$pollId" },
        reportCount: { $sum: 1 },
        reasons: { $addToSet: "$reason" },
        latestReportAt: { $max: "$createdAt" },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "_id",
        as: "comment",
      },
    },
    { $unwind: "$comment" },
    { $match: matchFilter },
    { $sort: { pendingCount: -1, reportCount: -1, latestReportAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "comment.authorId",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "polls",
        localField: "pollId",
        foreignField: "_id",
        as: "poll",
      },
    },
    { $unwind: { path: "$poll", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        commentId: "$_id",
        pollId: "$pollId",
        pollTitle: "$poll.title",
        pollSlug: "$poll.slug",
        content: "$comment.content",
        status: "$comment.status",
        authorName: "$author.name",
        createdAt: "$comment.createdAt",
        reportCount: 1,
        pendingCount: 1,
        reasons: 1,
        latestReportAt: 1,
        moderationReason: "$comment.moderationReason",
      },
    },
  ]);

  const totalCount = (await ReportModel.distinct("commentId")).length;

  return {
    queue: agg,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

/**
 * Moderate a comment (hide, restore, or remove).
 * Server-side Admin Only.
 */
export async function moderateComment(params: {
  commentId: string;
  moderatorId: string;
  action: "hide" | "restore" | "remove";
  reason?: string;
}): Promise<{
  success: boolean;
  status: CommentStatus;
  commentId: string;
}> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(params.commentId)) {
    throw new CommentError("Invalid comment ID", 422);
  }

  const comment = await CommentModel.findById(params.commentId);
  if (!comment) {
    throw new CommentError("Comment not found", 404);
  }

  let newStatus: CommentStatus = "visible";
  if (params.action === "hide") newStatus = "hidden";
  if (params.action === "remove") newStatus = "removed";
  if (params.action === "restore") newStatus = "visible";

  comment.status = newStatus;
  comment.moderatedBy = new mongoose.Types.ObjectId(params.moderatorId);
  comment.moderatedAt = new Date();
  if (params.reason) {
    comment.moderationReason = sanitizeCommentContent(params.reason).slice(0, 500);
  }
  await comment.save();

  // Mark pending reports on this comment as reviewed
  await ReportModel.updateMany(
    { commentId: comment._id, status: "pending" },
    {
      $set: {
        status: "reviewed",
        reviewedBy: new mongoose.Types.ObjectId(params.moderatorId),
        reviewedAt: new Date(),
      },
    }
  );

  return {
    success: true,
    status: newStatus,
    commentId: comment._id.toString(),
  };
}

/**
 * Toggle or set Like status for a comment or reply.
 * Atomically updates the comment using $addToSet or $pull.
 * Guarantees that a user cannot like a comment multiple times.
 */
export async function toggleCommentLike({
  commentId,
  userId,
  action = "toggle",
}: {
  commentId: string;
  userId: string;
  action?: "like" | "unlike" | "toggle";
}): Promise<{
  commentId: string;
  liked: boolean;
  likesCount: number;
}> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new CommentError("Invalid comment reference", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new CommentError("Invalid user identity", 401);
  }

  const commentObjectId = new mongoose.Types.ObjectId(commentId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const collection = CommentModel.collection;

  // Retrieve current comment state directly from database
  const comment = await collection.findOne({ _id: commentObjectId });
  if (!comment) {
    throw new CommentError("Perspective comment could not be found", 404);
  }

  if (comment.status === "removed") {
    throw new CommentError("Cannot like a removed perspective", 400);
  }

  // Normalize legacy data if likes is not an array (e.g. historical numbers or undefined)
  if (!Array.isArray(comment.likes)) {
    await collection.updateOne(
      { _id: commentObjectId },
      { $set: { likes: [] } }
    );
  }

  const isCurrentlyLiked = checkIsLiked(comment.likes, userId);

  let updatedDoc: { likes?: unknown[] } | null = null;

  if (action === "like" || (action === "toggle" && !isCurrentlyLiked)) {
    updatedDoc = (await collection.findOneAndUpdate(
      { _id: commentObjectId },
      { $addToSet: { likes: userObjectId } } as unknown as mongoose.mongo.UpdateFilter<mongoose.mongo.BSON.Document>,
      { returnDocument: "after" }
    )) as unknown as { likes?: unknown[] } | null;
  } else {
    updatedDoc = (await collection.findOneAndUpdate(
      { _id: commentObjectId },
      { $pull: { likes: userObjectId } } as unknown as mongoose.mongo.UpdateFilter<mongoose.mongo.BSON.Document>,
      { returnDocument: "after" }
    )) as unknown as { likes?: unknown[] } | null;
  }

  const finalLiked = checkIsLiked(updatedDoc?.likes, userId);
  const likesCount = extractLikesCount(updatedDoc?.likes);

  return {
    commentId: commentObjectId.toString(),
    liked: finalLiked,
    likesCount,
  };
}
