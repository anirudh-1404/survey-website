import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import {
  requireAuth,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";

/**
 * GET /api/auth/profile
 * Returns authenticated user's profile information.
 */
export async function GET() {
  try {
    const sessionWithUser = await requireAuth();
    await connectToDatabase();

    const user = await User.findById(sessionWithUser.user.id).lean();
    if (!user || user.status !== "active") {
      return createErrorResponse("User account not found or inactive", 404);
    }

    return createSuccessResponse({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to fetch user profile", 500);
  }
}

/**
 * PATCH /api/auth/profile
 * Update the authenticated user's display name safely.
 * Role, email, and password cannot be changed through this endpoint.
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed", 403);
    }

    const sessionWithUser = await requireAuth();

    // Rate limiting: 10 profile updates per minute per user
    const rateCheck = checkRateLimit(`profile_patch_${sessionWithUser.user.id}`, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return createErrorResponse("Too many profile update requests. Please wait a moment.", 429);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Malformed JSON request payload", 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length < 2) {
      return createErrorResponse("Display name must be at least 2 characters long", 422);
    }

    if (name.length > 100) {
      return createErrorResponse("Display name cannot exceed 100 characters", 422);
    }

    await connectToDatabase();
    const user = await User.findById(sessionWithUser.user.id);
    if (!user || user.status !== "active") {
      return createErrorResponse("User account not found or inactive", 404);
    }

    // Only allow updating display name
    user.name = name;
    await user.save();

    return createSuccessResponse({
      message: "Profile display name updated successfully.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to update profile", 500);
  }
}
