import { NextRequest } from "next/server";
import {
  requireAdmin,
  verifyCsrfOrigin,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import { moderateComment, CommentError } from "@/lib/comments";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/moderation/[id]
 * Moderate a comment (hide, restore, or remove).
 * Enforces admin authorization, CSRF check, and records moderator ID.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    const sessionWithUser = await requireAdmin();
    const { id } = await params;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action as "hide" | "restore" | "remove";
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    if (!action || !["hide", "restore", "remove"].includes(action)) {
      return createErrorResponse(
        "Invalid moderation action. Allowed actions: hide, restore, remove",
        422
      );
    }

    const outcome = await moderateComment({
      commentId: id,
      moderatorId: sessionWithUser.user.id,
      action,
      reason,
    });

    return createSuccessResponse(
      {
        message: `Comment status updated to '${outcome.status}'.`,
        ...outcome,
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

    return createErrorResponse("Failed to apply moderation action", 500);
  }
}
