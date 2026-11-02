import { NextRequest } from "next/server";
import {
  requireAdmin,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import { getAllAds, createAd } from "@/lib/ads";
import { AdPlacement } from "@/types/ad";

/**
 * GET /api/admin/ads
 * List all ads with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const placement = searchParams.get("placement") as AdPlacement | null;
    const status = searchParams.get("status") || undefined;

    const ads = await getAllAds({
      placement: placement || undefined,
      status,
    });

    return createSuccessResponse({ ads }, 200);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve ads";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return createErrorResponse(message, status);
  }
}

/**
 * POST /api/admin/ads
 * Create a new advertisement campaign
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    const sessionWithUser = await requireAdmin();

    const rateCheck = checkRateLimit(
      `create_ad_${sessionWithUser.user.id}`,
      20,
      60 * 1000
    );
    if (!rateCheck.allowed) {
      return createErrorResponse(
        "Too many requests. Please wait before creating more ads.",
        429
      );
    }

    const body = await request.json();
    const {
      title,
      mediaType,
      mediaUrl,
      cloudinaryPublicId,
      targetUrl,
      placement,
      status,
      altText,
      sponsorName,
      startDate,
      endDate,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return createErrorResponse("Ad title is required (at least 2 chars).", 422);
    }

    if (!mediaUrl || typeof mediaUrl !== "string") {
      return createErrorResponse("Media URL is required.", 422);
    }

    if (!targetUrl || typeof targetUrl !== "string") {
      return createErrorResponse("Target click URL is required.", 422);
    }

    if (!["banner_top", "feed_inline", "sidebar", "poll_detail"].includes(placement)) {
      return createErrorResponse("Invalid placement slot selected.", 422);
    }

    if (!["image", "video"].includes(mediaType)) {
      return createErrorResponse("Invalid media type (must be image or video).", 422);
    }

    const newAd = await createAd(
      {
        title,
        mediaType,
        mediaUrl,
        cloudinaryPublicId,
        targetUrl,
        placement,
        status: status || "active",
        altText,
        sponsorName,
        startDate,
        endDate,
      },
      sessionWithUser.user.id
    );

    return createSuccessResponse({ ad: newAd }, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create ad";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return createErrorResponse(message, status);
  }
}
