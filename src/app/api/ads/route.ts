import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { getActiveAdForPlacement } from "@/lib/ads";
import { AdPlacement } from "@/types/ad";

/**
 * GET /api/ads?placement=banner_top
 * Public endpoint to fetch active ad for a placement slot
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get("placement") as AdPlacement | null;

    if (!placement) {
      return createErrorResponse("Placement parameter is required", 400);
    }

    const validPlacements: AdPlacement[] = [
      "banner_top",
      "feed_inline",
      "sidebar",
      "poll_detail",
    ];

    if (!validPlacements.includes(placement)) {
      return createErrorResponse("Invalid placement requested", 400);
    }

    const ad = await getActiveAdForPlacement(placement);
    return createSuccessResponse({ ad }, 200);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load ad";
    return createErrorResponse(message, 500);
  }
}
