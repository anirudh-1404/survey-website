import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { VoteModel } from "@/models/Vote";
import { requireAdmin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { getPollVoteResults } from "@/lib/votes";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/polls/[id]/live-stats
 * Real-time lightweight polling endpoint for admin live vote telemetry.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { id } = await params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const filter: Record<string, unknown> = {
      $or: [{ slug: id }],
    };

    if (isObjectId) {
      (filter.$or as Array<Record<string, unknown>>).push({
        _id: new mongoose.Types.ObjectId(id),
      });
    }

    const poll = await PollModel.findOne(filter).select("_id title slug status views options").lean();

    if (!poll) {
      return createErrorResponse("Poll inquiry not found", 404);
    }

    const [voteResults, lastVote] = await Promise.all([
      getPollVoteResults(poll._id),
      VoteModel.findOne({ pollId: poll._id })
        .sort({ createdAt: -1 })
        .select("createdAt option")
        .lean(),
    ]);

    const enrichedOptions = (poll.options || []).map((opt) => {
      const key = opt.key.toLowerCase();
      const stats = voteResults.byOption[key] || { count: 0, percentage: 0 };
      return {
        key: opt.key,
        label: opt.label,
        votes: stats.count,
        percentage: stats.percentage,
      };
    });

    return createSuccessResponse({
      pollId: poll._id.toString(),
      slug: poll.slug,
      title: poll.title,
      status: poll.status,
      views: poll.views || 0,
      totalVotes: voteResults.total,
      yes: voteResults.yes,
      no: voteResults.no,
      yesPercent: voteResults.yesPercent,
      noPercent: voteResults.noPercent,
      byOption: voteResults.byOption,
      options: enrichedOptions,
      lastVoteAt: lastVote?.createdAt ? new Date(lastVote.createdAt).toISOString() : null,
      lastVoteOption: lastVote?.option || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to fetch live vote stats", 500);
  }
}
