import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { requireAdmin, verifyCsrfOrigin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/polls";
import { PollCategory } from "@/types/poll";
import { validateExternalImageUrl, deleteImageFromCloudinary } from "@/lib/cloudinary";
import { isCloudinaryAssetReferenced } from "@/lib/cloudinary-ref";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/polls/[id]
 * Fetch a single poll by ID or slug for administrator review/editing.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { id } = await params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const filter: Record<string, unknown> = {
      $or: [{ slug: id }],
    };

    if (isObjectId) {
      (filter.$or as Array<Record<string, unknown>>).push({
        _id: new mongoose.Types.ObjectId(id),
      });
    }

    const poll = await PollModel.findOne(filter).populate("createdBy", "name email").lean();

    if (!poll) {
      return createErrorResponse("Poll inquiry not found", 404);
    }

    return createSuccessResponse({
      poll: {
        id: poll._id.toString(),
        slug: poll.slug,
        title: poll.title,
        category: poll.category,
        summary: poll.summary,
        context: poll.context || "",
        sourceReference: poll.sourceReference || "",
        editorialNote: poll.editorialNote || "",
        status: poll.status,
        featured: Boolean(poll.featured),
        publishedAt: poll.publishedAt ? new Date(poll.publishedAt).toISOString() : null,
        closesAt: poll.closesAt ? new Date(poll.closesAt).toISOString().slice(0, 16) : "",
        options: poll.options || [],
        imageUrl: poll.imageUrl || "",
        cloudinaryPublicId: poll.cloudinaryPublicId || "",
        imageAlt: poll.imageAlt || "",
        createdBy: poll.createdBy ? { name: (poll.createdBy as { name?: string }).name } : null,
        createdAt: new Date(poll.createdAt).toISOString(),
        updatedAt: new Date(poll.updatedAt).toISOString(),
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to fetch poll details", 500);
  }
}

/**
 * PATCH /api/admin/polls/[id]
 * Update a poll or change its status (draft, published, closed).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed", 403);
    }

    const { id } = await params;
    await connectToDatabase();

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const filter: Record<string, unknown> = {
      $or: [{ slug: id }],
    };

    if (isObjectId) {
      (filter.$or as Array<Record<string, unknown>>).push({
        _id: new mongoose.Types.ObjectId(id),
      });
    }

    const poll = await PollModel.findOne(filter);
    if (!poll) {
      return createErrorResponse("Poll inquiry not found", 404);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON payload", 400);
    }

    // 1. Status Mutation (quick publish, close, reopen)
    if (body.status && typeof body.status === "string") {
      const targetStatus = body.status.toLowerCase();
      if (!["draft", "published", "closed"].includes(targetStatus)) {
        return createErrorResponse("Invalid status value", 422);
      }

      if (targetStatus === "published" && !poll.publishedAt) {
        poll.publishedAt = new Date();
      }
      poll.status = targetStatus as "draft" | "published" | "closed";
    }

    // 2. Content Updates
    if (typeof body.title === "string" && body.title.trim()) {
      const newTitle = body.title.trim();
      if (newTitle.length < 10) {
        return createErrorResponse("Title must be at least 10 characters long", 422);
      }
      if (newTitle !== poll.title) {
        poll.title = newTitle;
        poll.slug = await generateUniqueSlug(newTitle, poll._id.toString());
      }
    }

    if (typeof body.category === "string" && body.category.trim()) {
      const validCategories = [
        "Technology & AI",
        "Global Economy",
        "Geopolitics",
        "Climate & Energy",
        "Society & Culture",
        "Health & Science",
      ];
      if (validCategories.includes(body.category)) {
        poll.category = body.category as PollCategory;
      }
    }

    if (typeof body.summary === "string" && body.summary.trim()) {
      if (body.summary.trim().length < 20) {
        return createErrorResponse("Summary must be at least 20 characters long", 422);
      }
      poll.summary = body.summary.trim();
    }

    if (body.context !== undefined) {
      poll.context = typeof body.context === "string" ? body.context.trim() : "";
    }

    if (body.sourceReference !== undefined) {
      poll.sourceReference = typeof body.sourceReference === "string" ? body.sourceReference.trim() : "";
    }

    if (body.editorialNote !== undefined) {
      poll.editorialNote = typeof body.editorialNote === "string" ? body.editorialNote.trim() : "";
    }

    if (body.closesAt !== undefined) {
      poll.closesAt = body.closesAt ? new Date(body.closesAt as string) : undefined;
    }

    if (body.featured !== undefined) {
      poll.featured = Boolean(body.featured);
      if (poll.featured) {
        await PollModel.updateMany(
          { _id: { $ne: poll._id } },
          { $set: { featured: false } }
        );
      }
    }

    if (Array.isArray(body.options) && body.options.length >= 2) {
      const seenOptionKeys = new Set<string>();
      poll.options = body.options.map((opt: { key?: string; label?: string }, i: number) => {
        const label = typeof opt.label === "string" ? opt.label.trim() : "";
        let baseKey = typeof opt.key === "string" ? opt.key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : "";
        if (!baseKey) {
          baseKey = i === 0 ? "yes" : i === 1 ? "no" : `option_${i + 1}`;
        }
        let key = baseKey;
        let counter = 1;
        while (seenOptionKeys.has(key)) {
          key = `${baseKey}_${counter}`;
          counter++;
        }
        seenOptionKeys.add(key);
        return { key, label: label || `Option ${i + 1}` };
      });
    }

    // Image Mutation & Cloudinary Asset Cleanup
    if (body.imageUrl !== undefined) {
      const newImageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
      const newPublicId = typeof body.cloudinaryPublicId === "string" ? body.cloudinaryPublicId.trim() : "";
      const newImageAlt = typeof body.imageAlt === "string" ? body.imageAlt.trim() : "";

      if (newImageUrl) {
        const urlValidation = validateExternalImageUrl(newImageUrl);
        if (!urlValidation.valid) {
          return createErrorResponse(urlValidation.error || "Invalid image URL", 422);
        }
      }

      // Safe cleanup: If old Cloudinary asset exists and is being replaced or removed, verify no other document references it
      const oldPublicId = poll.cloudinaryPublicId;
      if (oldPublicId && oldPublicId !== newPublicId) {
        const inUse = await isCloudinaryAssetReferenced(oldPublicId, {
          excludePollId: poll._id.toString(),
        });
        if (!inUse) {
          await deleteImageFromCloudinary(oldPublicId);
        }
      }

      poll.imageUrl = newImageUrl || undefined;
      poll.cloudinaryPublicId = newPublicId || undefined;
      poll.imageAlt = newImageAlt || undefined;
    } else if (body.imageAlt !== undefined) {
      poll.imageAlt = typeof body.imageAlt === "string" ? body.imageAlt.trim() : undefined;
    }

    await poll.save();

    return createSuccessResponse({
      poll: {
        id: poll._id.toString(),
        slug: poll.slug,
        title: poll.title,
        status: poll.status,
        imageUrl: poll.imageUrl,
        cloudinaryPublicId: poll.cloudinaryPublicId,
        imageAlt: poll.imageAlt,
        updatedAt: poll.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to update poll inquiry", 500);
  }
}

/**
 * DELETE /api/admin/polls/[id]
 * Delete a poll and safely clean up any associated Cloudinary asset.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed", 403);
    }

    const { id } = await params;
    await connectToDatabase();

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const filter: Record<string, unknown> = {
      $or: [{ slug: id }],
    };

    if (isObjectId) {
      (filter.$or as Array<Record<string, unknown>>).push({
        _id: new mongoose.Types.ObjectId(id),
      });
    }

    const poll = await PollModel.findOne(filter);
    if (!poll) {
      return createErrorResponse("Poll inquiry not found", 404);
    }

    // Clean up uploaded Cloudinary image if present and not referenced elsewhere
    if (poll.cloudinaryPublicId) {
      const inUse = await isCloudinaryAssetReferenced(poll.cloudinaryPublicId, {
        excludePollId: poll._id.toString(),
      });
      if (!inUse) {
        await deleteImageFromCloudinary(poll.cloudinaryPublicId);
      }
    }

    await PollModel.deleteOne({ _id: poll._id });

    return createSuccessResponse({
      message: "Poll inquiry and associated media safely deleted",
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to delete poll inquiry", 500);
  }
}
