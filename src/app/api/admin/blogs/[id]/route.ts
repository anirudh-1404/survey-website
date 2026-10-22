import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogModel } from "@/models/Blog";
import {
  requireAdmin,
  verifyCsrfOrigin,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import { generateSlug, sanitizeRichTextHtml, mapBlogToUI } from "@/lib/blogs";
import { deleteImageFromCloudinary } from "@/lib/cloudinary";
import { isCloudinaryAssetReferenced } from "@/lib/cloudinary-ref";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/blogs/[id]
 * Fetch a single blog document for admin editing.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid blog ID format.", 400);
    }

    await connectToDatabase();
    const doc = await BlogModel.findById(id)
      .populate("authorId", "name role")
      .lean();

    if (!doc) {
      return createErrorResponse("Blog post not found.", 404);
    }

    return createSuccessResponse({ blog: mapBlogToUI(doc) });
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
      error instanceof Error ? error.message : "Failed to retrieve blog.";
    return createErrorResponse(errMessage, 500);
  }
}

/**
 * PATCH /api/admin/blogs/[id]
 * Update a blog post, publish/unpublish, and clean up superseded Cloudinary assets.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed.", 403);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid blog ID format.", 400);
    }

    await connectToDatabase();
    const existing = await BlogModel.findById(id);
    if (!existing) {
      return createErrorResponse("Blog post not found.", 404);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return createErrorResponse("Invalid update payload.", 400);
    }

    // 1. Update text fields if provided
    if (typeof body.title === "string" && body.title.trim().length >= 3) {
      existing.title = body.title.trim();
    }

    if (typeof body.slug === "string" && body.slug.trim().length >= 2) {
      const sanitizedSlug = generateSlug(body.slug);
      if (sanitizedSlug !== existing.slug) {
        const conflict = await BlogModel.findOne({
          slug: sanitizedSlug,
          _id: { $ne: existing._id },
        }).lean();
        if (conflict) {
          return createErrorResponse("URL slug already in use by another article.", 409);
        }
        existing.slug = sanitizedSlug;
      }
    }

    if (typeof body.excerpt === "string" && body.excerpt.trim().length >= 10) {
      existing.excerpt = body.excerpt.trim();
    }

    if (typeof body.content === "string" && body.content.trim().length >= 20) {
      existing.content = sanitizeRichTextHtml(body.content);
    }

    if (typeof body.category === "string" && body.category.trim()) {
      existing.category = body.category.trim();
    }

    if (Array.isArray(body.tags)) {
      existing.tags = body.tags.map((t: unknown) => String(t).trim()).filter(Boolean);
    }

    if (typeof body.seoTitle === "string") {
      existing.seoTitle = body.seoTitle.trim() || undefined;
    }

    if (typeof body.seoDescription === "string") {
      existing.seoDescription = body.seoDescription.trim() || undefined;
    }

    // 2. Publication state transition
    if (body.status === "published" || body.status === "draft") {
      if (body.status === "published" && existing.status !== "published") {
        existing.status = "published";
        existing.publishedAt = existing.publishedAt || new Date();
      } else if (body.status === "draft" && existing.status === "published") {
        existing.status = "draft";
      }
    }

    // 3. Featured Image handling & Cloudinary asset cleanup
    const oldPublicId = existing.cloudinaryPublicId;
    let imageWasReplaced = false;

    if (body.imageUrl !== undefined) {
      existing.imageUrl = body.imageUrl && typeof body.imageUrl === "string" ? body.imageUrl.trim() : undefined;
    }

    if (body.imageAlt !== undefined) {
      existing.imageAlt = body.imageAlt && typeof body.imageAlt === "string" ? body.imageAlt.trim() : undefined;
    }

    if (body.cloudinaryPublicId !== undefined) {
      const newPublicId =
        body.cloudinaryPublicId && typeof body.cloudinaryPublicId === "string"
          ? body.cloudinaryPublicId.trim()
          : undefined;

      if (oldPublicId && oldPublicId !== newPublicId) {
        imageWasReplaced = true;
      }
      existing.cloudinaryPublicId = newPublicId;
    } else if (body.imageUrl === "" || body.imageUrl === null) {
      // Image removed
      if (oldPublicId) {
        imageWasReplaced = true;
      }
      existing.imageUrl = undefined;
      existing.cloudinaryPublicId = undefined;
      existing.imageAlt = undefined;
    }

    await existing.save();

    // Safely delete superseded Cloudinary asset in background if replaced and not referenced elsewhere
    if (imageWasReplaced && oldPublicId) {
      try {
        const inUse = await isCloudinaryAssetReferenced(oldPublicId, {
          excludeBlogId: existing._id.toString(),
        });
        if (!inUse) {
          await deleteImageFromCloudinary(oldPublicId);
        }
      } catch {
        // Log silently; database update has already succeeded
      }
    }

    const updatedDoc = await BlogModel.findById(existing._id)
      .populate("authorId", "name role")
      .lean();

    return createSuccessResponse({ blog: mapBlogToUI(updatedDoc) });
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
      error instanceof Error ? error.message : "Failed to update blog post.";
    return createErrorResponse(errMessage, 500);
  }
}

/**
 * DELETE /api/admin/blogs/[id]
 * Delete blog post and cleanup Cloudinary image asset.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed.", 403);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return createErrorResponse("Invalid blog ID format.", 400);
    }

    await connectToDatabase();
    const existing = await BlogModel.findById(id);

    if (!existing) {
      return createErrorResponse("Blog post not found.", 404);
    }

    const publicIdToDelete = existing.cloudinaryPublicId;
    await BlogModel.findByIdAndDelete(id);

    // Safely delete Cloudinary asset if present and not referenced elsewhere
    if (publicIdToDelete) {
      try {
        const inUse = await isCloudinaryAssetReferenced(publicIdToDelete, {
          excludeBlogId: id,
        });
        if (!inUse) {
          await deleteImageFromCloudinary(publicIdToDelete);
        }
      } catch {
        // Silently catch Cloudinary cleanup error
      }
    }

    return createSuccessResponse({
      success: true,
      message: "Blog post and associated assets permanently deleted.",
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
      error instanceof Error ? error.message : "Failed to delete blog post.";
    return createErrorResponse(errMessage, 500);
  }
}
