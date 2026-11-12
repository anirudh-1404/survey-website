import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { requireAdmin, verifyCsrfOrigin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/polls";
import { PollCategory } from "@/types/poll";

/**
 * GET /api/admin/polls
 * Admin listing of all polls (drafts, published, closed) with search and filters.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Enforce admin role on the server
    await requireAdmin();
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "All";
    const status = searchParams.get("status")?.trim() || "All";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { summary: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (status && status !== "All") {
      filter.status = status.toLowerCase();
    }

    const [polls, totalCount] = await Promise.all([
      PollModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean(),
      PollModel.countDocuments(filter),
    ]);

    return createSuccessResponse({
      polls: polls.map((p) => ({
        id: p._id.toString(),
        slug: p.slug,
        title: p.title,
        category: p.category,
        summary: p.summary,
        status: p.status,
        featured: p.featured,
        views: p.views || 0,
        publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
        closesAt: p.closesAt ? new Date(p.closesAt).toISOString() : null,
        createdAt: new Date(p.createdAt).toISOString(),
        updatedAt: new Date(p.updatedAt).toISOString(),
        createdBy: p.createdBy ? { name: (p.createdBy as { name?: string }).name } : null,
        imageUrl: p.imageUrl,
        imageAlt: p.imageAlt,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("An error occurred while fetching administrative polls", 500);
  }
}

/**
 * POST /api/admin/polls
 * Create a new poll as draft or published.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Enforce admin role and CSRF validation
    const { user } = await requireAdmin();

    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed", 403);
    }

    // 2. Parse and validate payload
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON payload", 400);
    }

    const {
      title,
      category,
      summary,
      context,
      sourceReference,
      editorialNote,
      status: requestedStatus,
      closesAt,
      featured,
      options,
      imageUrl,
      cloudinaryPublicId,
      imageAlt,
    } = body;

    const errors: Record<string, string> = {};

    if (!title || typeof title !== "string" || title.trim().length < 10) {
      errors.title = "Question/title must be at least 10 characters long";
    }

    if (!category || typeof category !== "string" || category.trim().length < 2) {
      errors.category = "Please select or enter a valid category (at least 2 characters)";
    }

    if (!summary || typeof summary !== "string" || summary.trim().length < 20) {
      errors.summary = "Editorial summary must be at least 20 characters long";
    }

    // Validate image URL if provided
    let cleanImageUrl: string | undefined = undefined;
    if (typeof imageUrl === "string" && imageUrl.trim()) {
      cleanImageUrl = imageUrl.trim();
      try {
        const parsed = new URL(cleanImageUrl);
        if (parsed.protocol !== "https:") {
          errors.imageUrl = "Image URL must use secure HTTPS protocol (https://)";
        }
      } catch {
        errors.imageUrl = "Invalid image URL format";
      }
    }

    const status = requestedStatus === "published" ? "published" : "draft";

    if (Object.keys(errors).length > 0) {
      return createErrorResponse("Validation failed", 422, errors);
    }

    await connectToDatabase();

    // 3. Generate unique slug
    const cleanTitle = (title as string).trim();
    const slug = await generateUniqueSlug(cleanTitle);

    // 4. Build options
    const seenOptionKeys = new Set<string>();
    const parsedOptions = Array.isArray(options) && options.length >= 2
      ? options.map((opt: { key?: string; label?: string }, i: number) => {
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
        })
      : [
          { key: "yes", label: "Yes — In favor of the proposed measure" },
          { key: "no", label: "No — Opposed to the proposed measure" },
        ];

    // 5. Create poll
    const now = new Date();
    const poll = await PollModel.create({
      title: cleanTitle,
      slug,
      category: category as PollCategory,
      summary: (summary as string).trim(),
      context: typeof context === "string" ? context.trim() : undefined,
      sourceReference: typeof sourceReference === "string" ? sourceReference.trim() : undefined,
      editorialNote: typeof editorialNote === "string" ? editorialNote.trim() : undefined,
      createdBy: user.id, // Strictly derived from session, never from client body
      status,
      publishedAt: status === "published" ? now : undefined,
      closesAt: closesAt ? new Date(closesAt as string) : undefined,
      featured: Boolean(featured),
      options: parsedOptions,
      imageUrl: cleanImageUrl,
      cloudinaryPublicId: typeof cloudinaryPublicId === "string" && cloudinaryPublicId.trim() ? cloudinaryPublicId.trim() : undefined,
      imageAlt: typeof imageAlt === "string" && imageAlt.trim() ? imageAlt.trim() : undefined,
    });

    // If this poll is featured, ensure all other polls are unfeatured
    if (Boolean(featured)) {
      await PollModel.updateMany(
        { _id: { $ne: poll._id } },
        { $set: { featured: false } }
      );
    }

    return createSuccessResponse(
      {
        id: poll._id.toString(),
        slug: poll.slug,
        title: poll.title,
        status: poll.status,
      },
      201
    );
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to create poll inquiry", 500);
  }
}
