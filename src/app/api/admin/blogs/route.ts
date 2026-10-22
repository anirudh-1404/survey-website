import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogModel, type IBlog, type BlogStatus } from "@/models/Blog";
import {
  requireAdmin,
  verifyCsrfOrigin,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";
import { generateSlug, sanitizeRichTextHtml, mapBlogToUI } from "@/lib/blogs";

/**
 * GET /api/admin/blogs
 * Admin-only endpoint to list all blogs with pagination and status filters.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");

    const page = Math.max(1, pageParam ? parseInt(pageParam, 10) : 1);
    const limit = Math.min(Math.max(1, limitParam ? parseInt(limitParam, 10) : 10), 50);
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (statusParam && ["published", "draft"].includes(statusParam)) {
      filter.status = statusParam as BlogStatus;
    }

    if (searchParam && searchParam.trim().length > 0) {
      const escaped = searchParam.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { excerpt: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
      ];
    }

    const [totalMatching, rawDocs, totalAll, totalPublished, totalDraft] =
      await Promise.all([
        BlogModel.countDocuments(filter),
        BlogModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("authorId", "name role")
          .lean(),
        BlogModel.countDocuments({}),
        BlogModel.countDocuments({ status: "published" }),
        BlogModel.countDocuments({ status: "draft" }),
      ]);

    const blogs = rawDocs.map(mapBlogToUI);
    const totalPages = Math.max(1, Math.ceil(totalMatching / limit));

    return createSuccessResponse({
      blogs,
      totalCount: totalMatching,
      page,
      totalPages,
      counts: {
        total: totalAll,
        published: totalPublished,
        draft: totalDraft,
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
      error instanceof Error ? error.message : "Failed to load blogs.";
    return createErrorResponse(errMessage, 500);
  }
}

/**
 * POST /api/admin/blogs
 * Create a new blog post. Defaults to draft unless explicitly published.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed.", 403);
    }

    await connectToDatabase();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return createErrorResponse("Invalid request body.", 400);
    }

    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      category,
      tags,
      status,
      imageUrl,
      cloudinaryPublicId,
      imageAlt,
      seoTitle,
      seoDescription,
    } = body;

    // 1. Validation
    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return createErrorResponse(
        "Blog title must be at least 3 characters long.",
        400
      );
    }

    if (!excerpt || typeof excerpt !== "string" || excerpt.trim().length < 10) {
      return createErrorResponse(
        "Excerpt summary must be at least 10 characters long.",
        400
      );
    }

    if (!content || typeof content !== "string" || content.trim().length < 20) {
      return createErrorResponse(
        "Content must be at least 20 characters long.",
        400
      );
    }

    // 2. Slug handling
    let finalSlug = customSlug && typeof customSlug === "string"
      ? generateSlug(customSlug)
      : generateSlug(title);

    if (!finalSlug) {
      finalSlug = `post-${Date.now()}`;
    }

    // Check slug uniqueness
    const existing = await BlogModel.findOne({ slug: finalSlug }).lean();
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    // 3. Status & Publication timestamp
    const targetStatus: BlogStatus =
      status === "published" ? "published" : "draft";
    const publishedAt = targetStatus === "published" ? new Date() : null;

    // 4. Content sanitization
    const cleanContent = sanitizeRichTextHtml(content);

    // 5. Create blog document
    const createdDoc: IBlog = await BlogModel.create({
      title: title.trim(),
      slug: finalSlug,
      excerpt: excerpt.trim(),
      content: cleanContent,
      category: (category && typeof category === "string" ? category.trim() : "Analysis"),
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
      status: targetStatus,
      publishedAt,
      authorId: session.user.id,
      imageUrl: imageUrl && typeof imageUrl === "string" ? imageUrl.trim() : undefined,
      cloudinaryPublicId:
        cloudinaryPublicId && typeof cloudinaryPublicId === "string"
          ? cloudinaryPublicId.trim()
          : undefined,
      imageAlt: imageAlt && typeof imageAlt === "string" ? imageAlt.trim() : undefined,
      seoTitle: seoTitle && typeof seoTitle === "string" ? seoTitle.trim() : undefined,
      seoDescription:
        seoDescription && typeof seoDescription === "string"
          ? seoDescription.trim()
          : undefined,
    });

    const populated = await BlogModel.findById(createdDoc._id)
      .populate("authorId", "name role")
      .lean();

    return createSuccessResponse(
      { blog: mapBlogToUI(populated) },
      201
    );
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
      error instanceof Error ? error.message : "Failed to create blog post.";
    return createErrorResponse(errMessage, 500);
  }
}
