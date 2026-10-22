import { NextRequest } from "next/server";
import { requireAdmin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { getModerationQueue } from "@/lib/comments";

/**
 * GET /api/admin/moderation
 * Retrieve the flagged comments moderation queue.
 * Strictly enforced Server-Side Admin Only.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const queueData = await getModerationQueue({ status, page, limit });
    return createSuccessResponse(queueData);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to load moderation queue", 500);
  }
}
