import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import {
  getCurrentUser,
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
 * Retrieve current aggregated vote results and voting status (authenticated user or guest voterId).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const voterId = request.nextUrl.searchParams.get("voterId") || undefined;

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
      const check = await getUserVote(poll._id, { userId: sessionWithUser.user.id });
      if (check?.hasVoted) userVoteInfo = check;
    } else if (voterId) {
      const check = await getUserVote(poll._id, { voterId });
      if (check?.hasVoted) userVoteInfo = check;
    }

    return createSuccessResponse({
      pollId: poll.slug || poll._id.toString(),
      hasVoted: userVoteInfo.hasVoted,
      userVote: userVoteInfo.option,
      isClosed:
        poll.status === "closed" ||
        Boolean(poll.closesAt && new Date() > new Date(poll.closesAt)),
      results,
    });
  } catch {
    return createErrorResponse("Failed to retrieve survey results", 500);
  }
}

/**
 * POST /api/polls/[id]/vote
 * Public submission of a ballot (open to everyone without mandatory registration).
 * Supports both authenticated users and anonymous visitors via persistent voterId/IP.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const sessionWithUser = await getCurrentUser();

    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const option = typeof body.option === "string" ? body.option.trim() : "";
    const voterId =
      typeof body.voterId === "string" && body.voterId.trim()
        ? body.voterId.trim()
        : `anon_${rawIp.replace(/[^a-zA-Z0-9]/g, "_")}`;

    if (!option) {
      return createErrorResponse("Please select an option to cast your vote", 422);
    }

    // Rate limiting per user or voter ID (20 votes / minute)
    const rateKey = sessionWithUser ? `vote_${sessionWithUser.user.id}` : `vote_${voterId}`;
    const rateCheck = checkRateLimit(rateKey, 20, 60 * 1000);
    if (!rateCheck.allowed) {
      return createErrorResponse(
        "Too many voting requests. Please wait a moment before trying again.",
        429
      );
    }

    // Cast vote using session userId if available, or persistent guest voterId
    const voteOutcome = await castVote({
      pollIdentifier: id,
      userId: sessionWithUser?.user?.id,
      voterId: sessionWithUser ? undefined : voterId,
      ipAddress: rawIp,
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
