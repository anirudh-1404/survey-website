import { NextRequest } from "next/server";
import {
  requireAuth,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import { toggleCommentLike, CommentError } from "@/lib/comments";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/comments/[id]/like
 * Authenticated toggle/like/unlike of a perspective comment or reply.
 * Atomically updates MongoDB using $addToSet or $pull to enforce unique likes per user.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verify CSRF
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    // 2. Require authenticated session
    const sessionWithUser = await requireAuth();

    // 3. Rate limiting: max 60 like actions per minute per user
    const rateCheck = checkRateLimit(
      `comment_like_${sessionWithUser.user.id}`,
      60,
      60 * 1000
    );
    if (!rateCheck.allowed) {
      return createErrorResponse(
        "You are updating likes too quickly. Please pause a moment.",
        429
      );
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    let action: "like" | "unlike" | "toggle" = "toggle";
    if (body.action === "like" || body.action === "unlike" || body.action === "toggle") {
      action = body.action;
    }

    // 4. Perform atomic update in MongoDB
    const result = await toggleCommentLike({
      commentId: id,
      userId: sessionWithUser.user.id,
      action,
    });

    return createSuccessResponse(
      {
        ...result,
        isLiked: result.liked,
        likes: result.likesCount,
      },
      200
    );
  } catch (error: unknown) {
    if (error instanceof CommentError) {
      return createErrorResponse(error.message, error.statusCode);
    }

    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }

    return createErrorResponse(
      "Failed to update like status. Please try again.",
      500
    );
  }
}

/**
 * DELETE /api/comments/[id]/like
 * Explicitly unlikes a comment.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    const sessionWithUser = await requireAuth();
    const { id } = await params;

    const result = await toggleCommentLike({
      commentId: id,
      userId: sessionWithUser.user.id,
      action: "unlike",
    });

    return createSuccessResponse(
      {
        ...result,
        isLiked: result.liked,
        likes: result.likesCount,
      },
      200
    );
  } catch (error: unknown) {
    if (error instanceof CommentError) {
      return createErrorResponse(error.message, error.statusCode);
    }

    return createErrorResponse(
      "Failed to remove like status. Please try again.",
      500
    );
  }
}
