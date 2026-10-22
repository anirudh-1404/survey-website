import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { verifyPassword, hashPassword, validatePassword, PasswordValidationError } from "@/lib/password";
import {
  requireAuth,
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";

/**
 * POST /api/auth/change-password
 * Change password for the currently authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify CSRF
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed", 403);
    }

    // 2. Require authenticated session
    const sessionWithUser = await requireAuth();

    // 3. Rate limiting (5 password change attempts per minute per user)
    const rateCheck = checkRateLimit(
      `change_pwd_${sessionWithUser.user.id}`,
      5,
      60 * 1000
    );
    if (!rateCheck.allowed) {
      return createErrorResponse(
        "Too many password change attempts. Please wait one minute before trying again.",
        429
      );
    }

    // 4. Parse payload
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Malformed JSON request payload", 400);
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else {
      try {
        validatePassword(newPassword);
      } catch (err) {
        if (err instanceof PasswordValidationError) {
          errors.newPassword = err.message;
        } else {
          errors.newPassword = "Password validation failed";
        }
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm new password is required";
    } else if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = "New password and confirmation do not match";
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.newPassword = "New password cannot be identical to your current password";
    }

    if (Object.keys(errors).length > 0) {
      return createErrorResponse("Validation failed", 422, errors);
    }

    await connectToDatabase();
    const user = await User.findById(sessionWithUser.user.id);
    if (!user || user.status !== "active") {
      return createErrorResponse("User account not found or inactive", 404);
    }

    // 5. Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return createErrorResponse("Current password is incorrect", 401, {
        currentPassword: "The current password you entered is incorrect",
      });
    }

    // 6. Hash new password securely with bcrypt
    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    await user.save();

    // 7. Security: Invalidate all OTHER active sessions for this user, keeping current session active
    await Session.deleteMany({
      userId: user._id,
      _id: { $ne: sessionWithUser.session._id },
    });

    return createSuccessResponse({
      message: "Password updated successfully. Other active sessions have been invalidated.",
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to update password", 500);
  }
}
