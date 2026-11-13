import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAdmin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { invalidateAllUserSessions } from "@/lib/session";
import { hashPassword, validatePassword } from "@/lib/password";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/admins/[id]
 * Update administrator status (active/suspended) or reset credentials.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionWithUser = await requireAdmin();
    await connectToDatabase();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid administrator ID format", 400);
    }

    const currentUserId = sessionWithUser.user.id;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const targetAdmin = await User.findOne({ _id: id, role: "admin" });
    if (!targetAdmin) {
      return createErrorResponse("Administrator not found", 404);
    }

    // Status change
    if (body.status !== undefined) {
      const newStatus = body.status === "suspended" ? "suspended" : "active";
      if (id === currentUserId && newStatus === "suspended") {
        return createErrorResponse("You cannot suspend your own active administrator session.", 400);
      }
      targetAdmin.status = newStatus;

      // If suspended, kick out existing sessions
      if (newStatus === "suspended") {
        await invalidateAllUserSessions(targetAdmin._id);
      }
    }

    // Name update
    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      targetAdmin.name = body.name.trim();
    }

    // Password reset
    if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
      validatePassword(body.newPassword);
      targetAdmin.passwordHash = await hashPassword(body.newPassword);
      // Invalidate sessions so new password is required
      await invalidateAllUserSessions(targetAdmin._id);
    }

    await targetAdmin.save();

    return createSuccessResponse({
      admin: {
        id: targetAdmin._id.toString(),
        name: targetAdmin.name,
        email: targetAdmin.email,
        role: targetAdmin.role,
        status: targetAdmin.status,
        createdAt: new Date(targetAdmin.createdAt).toISOString(),
      },
      message: "Administrator updated successfully",
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    return createErrorResponse(
      error.message || "Failed to update administrator",
      error.statusCode || 500
    );
  }
}

/**
 * DELETE /api/admin/admins/[id]
 * Remove an administrator account permanently.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const sessionWithUser = await requireAdmin();
    await connectToDatabase();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid administrator ID format", 400);
    }

    const currentUserId = sessionWithUser.user.id;

    if (id === currentUserId) {
      return createErrorResponse("You cannot delete your own active administrator account.", 400);
    }

    const targetAdmin = await User.findOne({ _id: id, role: "admin" });
    if (!targetAdmin) {
      return createErrorResponse("Administrator not found", 404);
    }

    // Ensure at least one administrator remains
    const totalAdmins = await User.countDocuments({ role: "admin" });
    if (totalAdmins <= 1) {
      return createErrorResponse("Operation aborted: System must maintain at least one active administrator.", 400);
    }

    // Invalidate sessions first
    await invalidateAllUserSessions(targetAdmin._id);

    // Delete user
    await User.deleteOne({ _id: targetAdmin._id });

    return createSuccessResponse({
      deleted: true,
      id,
      message: "Administrator removed successfully",
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    return createErrorResponse(
      error.message || "Failed to delete administrator",
      error.statusCode || 500
    );
  }
}
