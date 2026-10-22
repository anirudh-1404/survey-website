import { connectToDatabase } from "@/lib/mongodb";
import { VoteModel } from "@/models/Vote";
import { PollModel } from "@/models/Poll";
import mongoose from "mongoose";

export interface PollVoteResults {
  total: number;
  yes: number;
  no: number;
  yesPercent: number;
  noPercent: number;
  byOption: Record<string, { count: number; percentage: number }>;
}

export class VoteError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "VoteError";
    this.statusCode = statusCode;
  }
}

/**
 * Calculate aggregated vote results for a single poll.
 * Always returns sensible integers that sum to 100% when votes exist.
 */
export async function getPollVoteResults(
  pollId: string | mongoose.Types.ObjectId
): Promise<PollVoteResults> {
  await connectToDatabase();

  if (typeof pollId === "string" && !mongoose.Types.ObjectId.isValid(pollId)) {
    return {
      total: 0,
      yes: 0,
      no: 0,
      yesPercent: 0,
      noPercent: 0,
      byOption: {},
    };
  }

  const objectId =
    typeof pollId === "string" ? new mongoose.Types.ObjectId(pollId) : pollId;

  const agg = await VoteModel.aggregate([
    { $match: { pollId: objectId } },
    { $group: { _id: "$option", count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = {};
  let total = 0;

  for (const item of agg) {
    const key = (item._id as string).toLowerCase();
    const count = Number(item.count) || 0;
    counts[key] = count;
    total += count;
  }

  const yesCount = counts["yes"] || 0;
  const noCount = counts["no"] || 0;

  let yesPercent = 0;
  let noPercent = 0;

  if (total > 0) {
    yesPercent = Math.round((yesCount / total) * 100);
    // Guarantee percentages sum to exactly 100%
    noPercent = 100 - yesPercent;
  }

  const byOption: Record<string, { count: number; percentage: number }> = {};
  for (const [key, count] of Object.entries(counts)) {
    byOption[key] = {
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  }

  return {
    total,
    yes: yesCount,
    no: noCount,
    yesPercent,
    noPercent,
    byOption,
  };
}

/**
 * Batch calculate vote results for multiple polls (used in feeds and homepage).
 */
export async function getBatchPollVoteResults(
  pollIds: (string | mongoose.Types.ObjectId)[]
): Promise<Map<string, PollVoteResults>> {
  await connectToDatabase();

  const resultsMap = new Map<string, PollVoteResults>();
  if (!pollIds.length) return resultsMap;

  const objectIds = pollIds
    .filter((id) =>
      typeof id === "string" ? mongoose.Types.ObjectId.isValid(id) : Boolean(id)
    )
    .map((id) =>
      typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
    );

  if (!objectIds.length) return resultsMap;

  const agg = await VoteModel.aggregate([
    { $match: { pollId: { $in: objectIds } } },
    {
      $group: {
        _id: { pollId: "$pollId", option: "$option" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Intermediate accumulator: pollId -> option -> count
  const pollCounts = new Map<string, Record<string, number>>();
  for (const id of objectIds) {
    pollCounts.set(id.toString(), {});
  }

  for (const item of agg) {
    const pId = item._id.pollId.toString();
    const opt = (item._id.option as string).toLowerCase();
    const current = pollCounts.get(pId) || {};
    current[opt] = Number(item.count) || 0;
    pollCounts.set(pId, current);
  }

  for (const [pId, counts] of pollCounts.entries()) {
    let total = 0;
    for (const c of Object.values(counts)) {
      total += c;
    }

    const yesCount = counts["yes"] || 0;
    const noCount = counts["no"] || 0;
    let yesPercent = 0;
    let noPercent = 0;

    if (total > 0) {
      yesPercent = Math.round((yesCount / total) * 100);
      noPercent = 100 - yesPercent;
    }

    const byOption: Record<string, { count: number; percentage: number }> = {};
    for (const [key, count] of Object.entries(counts)) {
      byOption[key] = {
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }

    resultsMap.set(pId, {
      total,
      yes: yesCount,
      no: noCount,
      yesPercent,
      noPercent,
      byOption,
    });
  }

  return resultsMap;
}

/**
 * Check if a specific user has cast a ballot on a poll.
 */
export async function getUserVote(
  pollId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId
): Promise<{ hasVoted: boolean; option?: string } | null> {
  await connectToDatabase();

  const pollValid =
    typeof pollId === "string"
      ? mongoose.Types.ObjectId.isValid(pollId)
      : Boolean(pollId);
  const userValid =
    typeof userId === "string"
      ? mongoose.Types.ObjectId.isValid(userId)
      : Boolean(userId);

  if (!pollValid || !userValid) {
    return { hasVoted: false };
  }

  const pollObjectId =
    typeof pollId === "string" ? new mongoose.Types.ObjectId(pollId) : pollId;
  const userObjectId =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const vote = await VoteModel.findOne({
    pollId: pollObjectId,
    userId: userObjectId,
  })
    .select("option")
    .lean();

  if (!vote) {
    return { hasVoted: false };
  }

  return {
    hasVoted: true,
    option: vote.option,
  };
}

/**
 * Cast a vote on a poll.
 * Validates poll status, deadline, and option.
 * Relies on the unique compound database index to prevent duplicate votes under concurrency.
 */
export async function castVote(params: {
  pollIdentifier: string; // slug or ObjectId
  userId: string;
  option: string;
}): Promise<{
  success: boolean;
  userVote: string;
  results: PollVoteResults;
}> {
  await connectToDatabase();

  // Ensure database indexes are synchronized
  await VoteModel.init();

  const cleanOption = (params.option || "").trim().toLowerCase();
  if (!cleanOption) {
    throw new VoteError("A valid vote option must be specified", 422);
  }

  // 1. Locate the poll by slug or ObjectId
  const isObjectId = mongoose.Types.ObjectId.isValid(params.pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: params.pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(params.pollIdentifier) }] : []),
    ],
  });

  if (!poll) {
    throw new VoteError("The requested poll inquiry could not be found", 404);
  }

  // 2. Draft polls must never accept votes
  if (poll.status === "draft") {
    throw new VoteError("Cannot vote on an unpublished draft inquiry", 403);
  }

  // 3. Closed polls reject voting
  if (poll.status === "closed") {
    throw new VoteError("This public inquiry is closed for voting", 403);
  }

  // 4. Verify closing deadline if configured
  if (poll.closesAt && new Date() > new Date(poll.closesAt)) {
    throw new VoteError("Voting for this inquiry has concluded", 403);
  }

  // 5. Validate that option is one of the permitted options
  const validOptionKeys =
    poll.options && poll.options.length > 0
      ? poll.options.map((o) => o.key.toLowerCase())
      : ["yes", "no"];

  if (!validOptionKeys.includes(cleanOption)) {
    throw new VoteError(
      `Invalid voting option: '${params.option}'. Allowed options are: ${validOptionKeys.join(", ")}`,
      422
    );
  }

  // 6. Insert vote record using the session's verified user ID
  try {
    await VoteModel.create({
      pollId: poll._id,
      userId: new mongoose.Types.ObjectId(params.userId),
      option: cleanOption,
    });
  } catch (err: unknown) {
    // Catch MongoDB duplicate key error (code 11000)
    if (
      err &&
      typeof err === "object" &&
      ("code" in err && (err as { code: number }).code === 11000)
    ) {
      throw new VoteError("You have already cast your ballot on this inquiry.", 409);
    }
    throw err;
  }

  // 7. Calculate and return fresh live aggregated results
  const updatedResults = await getPollVoteResults(poll._id);

  return {
    success: true,
    userVote: cleanOption,
    results: updatedResults,
  };
}
