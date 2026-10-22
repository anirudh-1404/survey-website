import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactSubmissionModel, ContactStatus } from "@/models/ContactSubmission";
import { requireAdmin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/contact-submissions/[id]
 * Retrieve full details of a specific contact submission.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid submission ID format.", 400);
    }

    await connectToDatabase();
    const doc = await ContactSubmissionModel.findById(id).lean();

    if (!doc) {
      return createErrorResponse("Contact submission not found.", 404);
    }

    return createSuccessResponse({
      submission: {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        subject: doc.subject,
        message: doc.message,
        status: doc.status,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
    ) {
      return createErrorResponse(
        error instanceof Error ? error.message : "Unauthorized",
        error.statusCode
      );
    }

    const errMessage =
      error instanceof Error ? error.message : "Failed to load submission.";
    return createErrorResponse(errMessage, 500);
  }
}

/**
 * PATCH /api/admin/contact-submissions/[id]
 * Update submission status (unread, read, resolved).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid submission ID format.", 400);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.status !== "string") {
      return createErrorResponse("Status is required.", 400);
    }

    const allowedStatuses: ContactStatus[] = ["unread", "read", "resolved"];
    if (!allowedStatuses.includes(body.status as ContactStatus)) {
      return createErrorResponse(
        "Invalid status. Must be unread, read, or resolved.",
        400
      );
    }

    await connectToDatabase();
    const updated = await ContactSubmissionModel.findByIdAndUpdate(
      id,
      { status: body.status as ContactStatus },
      { returnDocument: "after", runValidators: true }
    ).lean();

    if (!updated) {
      return createErrorResponse("Contact submission not found.", 404);
    }

    return createSuccessResponse({
      submission: {
        id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        subject: updated.subject,
        message: updated.message,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
    ) {
      return createErrorResponse(
        error instanceof Error ? error.message : "Unauthorized",
        error.statusCode
      );
    }

    const errMessage =
      error instanceof Error ? error.message : "Failed to update submission.";
    return createErrorResponse(errMessage, 500);
  }
}

/**
 * DELETE /api/admin/contact-submissions/[id]
 * Delete a submission from the inbox.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid submission ID format.", 400);
    }

    await connectToDatabase();
    const deleted = await ContactSubmissionModel.findByIdAndDelete(id).lean();

    if (!deleted) {
      return createErrorResponse("Contact submission not found.", 404);
    }

    return createSuccessResponse({
      success: true,
      message: "Submission permanently removed from inbox.",
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
    ) {
      return createErrorResponse(
        error instanceof Error ? error.message : "Unauthorized",
        error.statusCode
      );
    }

    const errMessage =
      error instanceof Error ? error.message : "Failed to delete submission.";
    return createErrorResponse(errMessage, 500);
  }
}
