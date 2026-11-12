import { connectToDatabase } from "@/lib/mongodb";
import { PollModel, IPoll } from "@/models/Poll";
import { Poll, PollStatus } from "@/types/poll";
import {
  PollVoteResults,
  getPollVoteResults,
  getBatchPollVoteResults,
} from "@/lib/votes";
import mongoose from "mongoose";

/**
 * Generate a clean URL-friendly slug from title.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique slug by checking against existing polls.
 */
export async function generateUniqueSlug(
  title: string,
  currentPollId?: string
): Promise<string> {
  await connectToDatabase();
  const baseSlug = slugify(title) || "poll";
  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const query: Record<string, unknown> = { slug: candidateSlug };
    if (currentPollId) {
      query._id = { $ne: currentPollId };
    }

    const existing = await PollModel.findOne(query).select("_id").lean();
    if (!existing) {
      return candidateSlug;
    }

    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Transform a database Poll document into a UI-compatible public Poll object.
 * Integrates real database aggregated vote counts and balanced percentages.
 */
export function mapPollToUI(
  poll: IPoll | (Record<string, unknown> & { _id: mongoose.Types.ObjectId }),
  voteStats?: PollVoteResults
): Poll {
  const p = poll as unknown as IPoll;
  const dbStatus = p.status || "draft";

  // Map database lifecycle status to display status
  let displayStatus: PollStatus = "Open";
  if (dbStatus === "closed") {
    displayStatus = "Closed";
  } else if (dbStatus === "draft") {
    displayStatus = "Draft";
  } else if (p.featured) {
    displayStatus = "Live";
  }

  const totalVotes = voteStats ? voteStats.total : 0;

  const rawOptions =
    p.options && p.options.length > 0
      ? p.options
      : [
          { key: "yes", label: "Yes — In favor of the proposed measure" },
          { key: "no", label: "No — Opposed to the proposed measure" },
        ];

  const options = rawOptions.map((opt, index) => {
    const key = (opt.key || (index === 0 ? "yes" : "no")).toLowerCase();
    const stat = voteStats?.byOption?.[key];

    let votes = 0;
    let percentage = 0;

    if (voteStats) {
      if (stat) {
        votes = stat.count;
        percentage = stat.percentage;
      } else if (key === "yes") {
        votes = voteStats.yes;
        percentage = voteStats.yesPercent;
      } else if (key === "no") {
        votes = voteStats.no;
        percentage = voteStats.noPercent;
      }
    }

    return {
      id: `opt-${key}`,
      label: opt.label,
      votes,
      percentage,
    };
  });

  return {
    id: p.slug || p._id.toString(),
    title: p.title,
    category: p.category,
    summary: p.summary,
    context: p.context,
    status: displayStatus,
    totalVotes,
    publishedAt: p.publishedAt
      ? new Date(p.publishedAt).toISOString()
      : new Date(p.createdAt).toISOString(),
    closesAt: p.closesAt ? new Date(p.closesAt).toISOString() : undefined,
    featured: p.featured || false,
    views: p.views || 0,
    editorialNote: p.editorialNote,
    sourceReference: p.sourceReference,
    imageUrl: p.imageUrl || undefined,
    cloudinaryPublicId: p.cloudinaryPublicId || undefined,
    imageAlt: p.imageAlt || undefined,
    options,
  };
}

/**
 * Retrieve published polls for the public website feed.
 * DRAFTS ARE STRICTLY EXCLUDED.
 * Real vote counts are populated from MongoDB.
 */
export async function getPublishedPolls(options?: {
  category?: string;
  limit?: number;
}): Promise<Poll[]> {
  await connectToDatabase();

  const filter: Record<string, unknown> = {
    status: { $in: ["published", "closed"] },
  };

  if (options?.category && options.category !== "All") {
    filter.category = options.category;
  }

  const limit = Math.min(options?.limit || 20, 50);

  const docs = await PollModel.find(filter)
    .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const docIds = docs.map((d) => d._id);
  const voteStatsMap = await getBatchPollVoteResults(docIds);

  return docs.map((doc) =>
    mapPollToUI(doc as unknown as IPoll, voteStatsMap.get(doc._id.toString()))
  );
}

/**
 * Retrieve the primary featured poll for the homepage with live vote results.
 */
export async function getFeaturedPoll(): Promise<Poll | null> {
  await connectToDatabase();

  // Try finding an explicitly featured published poll first
  let doc = await PollModel.findOne({
    status: "published",
    featured: true,
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean();

  // Fallback to latest published eligible poll
  if (!doc) {
    doc = await PollModel.findOne({ status: "published" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();
  }

  if (!doc) return null;

  const voteStats = await getPollVoteResults(doc._id);
  return mapPollToUI(doc as unknown as IPoll, voteStats);
}

/**
 * Fetch a single poll by slug or ObjectId for public viewing.
 * DRAFT POLLS WILL RETURN NULL (404) FOR PUBLIC VISITORS.
 * Populates real vote results from MongoDB.
 */
export async function getPublicPollByIdOrSlug(
  identifier: string
): Promise<Poll | null> {
  if (!identifier) return null;
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  const filter: Record<string, unknown> = {
    status: { $in: ["published", "closed"] },
    $or: [{ slug: identifier }],
  };

  if (isObjectId) {
    (filter.$or as Array<Record<string, unknown>>).push({
      _id: new mongoose.Types.ObjectId(identifier),
    });
  }

  const doc = await PollModel.findOne(filter).lean();
  if (!doc) return null;

  const voteStats = await getPollVoteResults(doc._id);
  return mapPollToUI(doc as unknown as IPoll, voteStats);
}

/**
 * Fetch a poll by slug or ObjectId specifically for administrator editing.
 * Can return drafts, published, or closed polls.
 */
export async function getAdminPollById(
  identifier: string
): Promise<IPoll | null> {
  if (!identifier) return null;
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  const filter: Record<string, unknown> = {
    $or: [{ slug: identifier }],
  };

  if (isObjectId) {
    (filter.$or as Array<Record<string, unknown>>).push({
      _id: new mongoose.Types.ObjectId(identifier),
    });
  }

  return await PollModel.findOne(filter).populate("createdBy", "name email");
}

/**
 * Increment view count for a poll asynchronously.
 */
export async function incrementPollViews(
  identifier: string | mongoose.Types.ObjectId
): Promise<void> {
  if (!identifier) return;
  try {
    await connectToDatabase();
    const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
    const filter: Record<string, unknown> = isObjectId
      ? { _id: new mongoose.Types.ObjectId(identifier) }
      : { slug: identifier };

    await PollModel.updateOne(filter, { $inc: { views: 1 } });
  } catch (err) {
    console.error("[incrementPollViews] Failed to record poll view:", err);
  }
}
