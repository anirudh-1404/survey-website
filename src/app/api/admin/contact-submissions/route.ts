import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactSubmissionModel, ContactStatus } from "@/models/ContactSubmission";
import { requireAdmin, createErrorResponse, createSuccessResponse } from "@/lib/auth";

/**
 * GET /api/admin/contact-submissions
 * Protected admin endpoint to fetch paginated contact submissions with status filtering.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authorize admin
    await requireAdmin();

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const statusParam = searchParams.get("status");

    const page = Math.max(1, pageParam ? parseInt(pageParam, 10) : 1);
    const limit = Math.min(Math.max(1, limitParam ? parseInt(limitParam, 10) : 15), 50);
    const skip = (page - 1) * limit;

    // Filter by status if provided and not "all"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (statusParam && ["unread", "read", "resolved"].includes(statusParam)) {
      filter.status = statusParam as ContactStatus;
    }

    const [totalMatching, rawDocs, totalAll, totalUnread, totalRead, totalResolved] =
      await Promise.all([
        ContactSubmissionModel.countDocuments(filter),
        ContactSubmissionModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ContactSubmissionModel.countDocuments({}),
        ContactSubmissionModel.countDocuments({ status: "unread" }),
        ContactSubmissionModel.countDocuments({ status: "read" }),
        ContactSubmissionModel.countDocuments({ status: "resolved" }),
      ]);

    const submissions = rawDocs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      subject: doc.subject,
      message: doc.message,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    const totalPages = Math.max(1, Math.ceil(totalMatching / limit));

    return createSuccessResponse({
      submissions,
      totalCount: totalMatching,
      page,
      totalPages,
      counts: {
        total: totalAll,
        unread: totalUnread,
        read: totalRead,
        resolved: totalResolved,
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
      error instanceof Error ? error.message : "Failed to retrieve submissions.";
    return createErrorResponse(errMessage, 500);
  }
}
