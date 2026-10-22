import { NextRequest } from "next/server";
import {
  getCurrentUser,
  requireAuth,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import {
  getPollDiscussion,
  createComment,
  CommentError,
} from "@/lib/comments";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/polls/[id]/comments
 * Publicly retrieve comments and threaded replies for a published poll.
 * Returns 404 if poll is a draft.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const currentUser = await getCurrentUser();
    const discussion = await getPollDiscussion(id, { page, limit }, currentUser?.user.id);
    if (!discussion) {
      return createErrorResponse("Poll inquiry not found", 404);
    }

    return createSuccessResponse(discussion);
  } catch {
    return createErrorResponse("Failed to load public discourse", 500);
  }
}

/**
 * POST /api/polls/[id]/comments
 * Authenticated submission of a comment or nested reply.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verify CSRF
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    // 2. Require authenticated session
    const sessionWithUser = await requireAuth();

    // 3. Sliding window rate limit per user (max 15 comments per minute)
    const rateCheck = checkRateLimit(`comment_${sessionWithUser.user.id}`, 15, 60 * 1000);
    if (!rateCheck.allowed) {
      return createErrorResponse("You are posting comments too quickly. Please pause a moment.", 429);
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const content = typeof body.content === "string" ? body.content : "";
    const parentId = typeof body.parentId === "string" && body.parentId.trim() ? body.parentId.trim() : undefined;

    const newComment = await createComment({
      pollIdentifier: id,
      authorId: sessionWithUser.user.id,
      content,
      parentId,
    });

    return createSuccessResponse(
      {
        message: parentId
          ? "Your perspective reply has been published."
          : "Your perspective has been contributed to the debate.",
        comment: newComment,
      },
      201
    );
  } catch (error: unknown) {
    if (error instanceof CommentError) {
      return createErrorResponse(error.message, error.statusCode);
    }

    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }

    return createErrorResponse("Failed to post comment. Please try again.", 500);
  }
}
