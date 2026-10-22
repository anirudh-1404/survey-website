import { NextRequest } from "next/server";
import {
  requireAdmin,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import {
  validateImageFile,
  uploadImageToCloudinary,
} from "@/lib/cloudinary";

/**
 * POST /api/admin/uploads
 * Authenticated administrator upload endpoint for Cloudinary poll images.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify CSRF origin on mutation
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Invalid request origin or CSRF mismatch", 403);
    }

    // 2. Server-side admin authorization
    const sessionWithUser = await requireAdmin();

    // 3. Rate limiting (15 uploads per minute per admin)
    const rateCheck = checkRateLimit(
      `upload_${sessionWithUser.user.id}`,
      15,
      60 * 1000
    );
    if (!rateCheck.allowed) {
      return createErrorResponse(
        "Upload rate limit reached. Please wait a moment before trying again.",
        429
      );
    }

    // 4. Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return createErrorResponse("Malformed form-data payload", 400);
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return createErrorResponse("No image file was provided in the request", 422);
    }

    // 5. Server-side file validation (size, MIME type)
    const validation = validateImageFile({
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return createErrorResponse(validation.error || "Invalid image file", 422);
    }

    // 6. Convert to buffer and upload to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadImageToCloudinary(buffer, {
      folder: "pulse/polls",
    });

    return createSuccessResponse(
      {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        filename: file.name,
        size: file.size,
        type: file.type,
      },
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to process image upload";
    return createErrorResponse(message, 500);
  }
}
