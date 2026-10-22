import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import {
  getCurrentUser,
  requireAuth,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import { castVote, getPollVoteResults, getUserVote, VoteError } from "@/lib/votes";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/polls/[id]/vote
 * Retrieve current aggregated vote results and the authenticated user's voting status (if signed in).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const poll = await PollModel.findOne({
      $or: [
        { slug: id },
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }] : []),
      ],
    }).lean();

    // Draft polls are not accessible publicly
    if (!poll || poll.status === "draft") {
      return createErrorResponse("Poll inquiry not found", 404);
    }

    const results = await getPollVoteResults(poll._id);
    const sessionWithUser = await getCurrentUser();

    let userVoteInfo: { hasVoted: boolean; option?: string } = { hasVoted: false };
    if (sessionWithUser) {
      const check = await getUserVote(poll._id, sessionWithUser.user.id);
      if (check) userVoteInfo = check;
    }

    return createSuccessResponse({
      pollId: poll.slug || poll._id.toString(),
      hasVoted: userVoteInfo.hasVoted,
      userVote: userVoteInfo.option,
      isClosed: poll.status === "closed" || Boolean(poll.closesAt && new Date() > new Date(poll.closesAt)),
      results,
    });
  } catch {
    return createErrorResponse("Failed to retrieve survey results", 500);
  }
}

/**
 * POST /api/polls/[id]/vote
 * Authenticated submission of a ballot.
 * Strictly derives userId from the authenticated session and prevents duplicate votes.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verify CSRF origin on mutation
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF token mismatch", 403);
    }

    // 2. Require authenticated user
    const sessionWithUser = await requireAuth();
    const { id } = await params;

    // 2b. Rate Limiting on voting mutations (20 votes / minute per user)
    const rateCheck = checkRateLimit(`vote_${sessionWithUser.user.id}`, 20, 60 * 1000);
    if (!rateCheck.allowed) {
      return createErrorResponse("Too many voting requests. Please wait a moment before trying again.", 429);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const option = typeof body.option === "string" ? body.option.trim() : "";

    if (!option) {
      return createErrorResponse("Please select an option to cast your vote", 422);
    }

    // 3. Cast vote using session's verified user ID
    const voteOutcome = await castVote({
      pollIdentifier: id,
      userId: sessionWithUser.user.id,
      option,
    });

    return createSuccessResponse(
      {
        message: "Your ballot has been securely cast and verified.",
        userVote: voteOutcome.userVote,
        results: voteOutcome.results,
      },
      201
    );
  } catch (error: unknown) {
    if (error instanceof VoteError) {
      return createErrorResponse(error.message, error.statusCode);
    }

    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }

    return createErrorResponse("Failed to record your ballot. Please try again.", 500);
  }
}
