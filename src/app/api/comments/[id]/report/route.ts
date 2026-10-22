import { NextRequest } from "next/server";
import {
  requireAuth,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import { reportComment, CommentError } from "@/lib/comments";
import { ReportReason } from "@/models/Report";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/comments/[id]/report
 * Authenticated submission of a moderation report against a comment.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    const sessionWithUser = await requireAuth();

    // Rate limit: max 10 reports per minute per user
    const rateCheck = checkRateLimit(`report_${sessionWithUser.user.id}`, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return createErrorResponse("Too many reports submitted. Please wait a moment.", 429);
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const reason = (body.reason as ReportReason) || "other";
    const details = typeof body.details === "string" ? body.details : undefined;

    const outcome = await reportComment({
      commentId: id,
      reporterId: sessionWithUser.user.id,
      reason,
      details,
    });

    return createSuccessResponse(outcome, 201);
  } catch (error: unknown) {
    if (error instanceof CommentError) {
      return createErrorResponse(error.message, error.statusCode);
    }

    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }

    return createErrorResponse("Failed to submit report. Please try again.", 500);
  }
}
