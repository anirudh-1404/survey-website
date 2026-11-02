import { NextRequest } from "next/server";
import {
  requireAdmin,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import { getAdById, updateAd, deleteAd } from "@/lib/ads";
import { deleteImageFromCloudinary } from "@/lib/cloudinary";

/**
 * GET /api/admin/ads/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const ad = await getAdById(id);
    if (!ad) {
      return createErrorResponse("Ad campaign not found", 404);
    }

    return createSuccessResponse({ ad }, 200);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch ad";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return createErrorResponse(message, status);
  }
}

/**
 * PUT /api/admin/ads/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    const sessionWithUser = await requireAdmin();
    const { id } = await params;

    const rateCheck = checkRateLimit(
      `update_ad_${sessionWithUser.user.id}`,
      30,
      60 * 1000
    );
    if (!rateCheck.allowed) {
      return createErrorResponse("Rate limit reached. Please wait a moment.", 429);
    }

    const body = await request.json();
    const updated = await updateAd({
      id,
      ...body,
    });

    if (!updated) {
      return createErrorResponse("Ad campaign not found or failed to update", 404);
    }

    return createSuccessResponse({ ad: updated }, 200);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update ad";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return createErrorResponse(message, status);
  }
}

/**
 * DELETE /api/admin/ads/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    await requireAdmin();
    const { id } = await params;

    const existing = await getAdById(id);
    if (!existing) {
      return createErrorResponse("Ad campaign not found", 404);
    }

    // If ad had a cloudinary asset, clean it up safely
    if (existing.cloudinaryPublicId) {
      try {
        await deleteImageFromCloudinary(
          existing.cloudinaryPublicId,
          existing.mediaType === "video" ? "video" : "image"
        );
      } catch (err) {
        console.warn("[Cloudinary] Failed to delete ad media:", err);
      }
    }

    const success = await deleteAd(id);
    if (!success) {
      return createErrorResponse("Failed to delete ad campaign", 500);
    }

    return createSuccessResponse({ message: "Ad successfully deleted" }, 200);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete ad";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return createErrorResponse(message, status);
  }
}
