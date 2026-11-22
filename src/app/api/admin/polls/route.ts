import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { requireAdmin, verifyCsrfOrigin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { generateUniqueSlug, slugify } from "@/lib/polls";
import { PollCategory } from "@/types/poll";
import { submitUrlsForInstantIndexing } from "@/lib/indexing";
import { absoluteUrl } from "@/lib/site-url";
import { getBatchPollVoteResults } from "@/lib/votes";
import { sanitizeRichTextHtml } from "@/lib/blog-utils";

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

    const pollIds = polls.map((p) => p._id);
    const voteResultsMap = await getBatchPollVoteResults(pollIds);

    return createSuccessResponse({
      polls: polls.map((p) => {
        const pId = p._id.toString();
        const voteStats = voteResultsMap.get(pId);
        return {
          id: pId,
          slug: p.slug,
          title: p.title,
          category: p.category,
          summary: p.summary,
          status: p.status,
          featured: p.featured,
          views: p.views || 0,
          totalVotes: voteStats?.total || 0,
          voteResults: voteStats?.byOption || {},
          options: (p.options || []).map((opt) => ({
            key: opt.key,
            label: opt.label,
            votes: voteStats?.byOption?.[opt.key.toLowerCase()]?.count || 0,
            percentage: voteStats?.byOption?.[opt.key.toLowerCase()]?.percentage || 0,
          })),
          publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
          closesAt: p.closesAt ? new Date(p.closesAt).toISOString() : null,
          createdAt: new Date(p.createdAt).toISOString(),
          updatedAt: new Date(p.updatedAt).toISOString(),
          createdBy: p.createdBy ? { name: (p.createdBy as { name?: string }).name } : null,
          imageUrl: p.imageUrl,
          imageAlt: p.imageAlt,
        };
      }),
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
      slug: customSlug,
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
      seoKeywords,
      metaTitle,
      metaDescription,
    } = body;

    const errors: Record<string, string> = {};

    if (!title || typeof title !== "string" || title.trim().length < 10) {
      errors.title = "Question/title must be at least 10 characters long";
    }

    let cleanCustomSlug: string | undefined = undefined;
    if (customSlug && typeof customSlug === "string" && customSlug.trim()) {
      cleanCustomSlug = slugify(customSlug);
      if (cleanCustomSlug.length < 2) {
        errors.slug = "URL slug must be at least 2 characters long";
      }
    }

    if (!category || typeof category !== "string" || category.trim().length < 2) {
      errors.category = "Please select or enter a valid category (at least 2 characters)";
    }

    if (!summary || typeof summary !== "string" || summary.trim().length < 10) {
      errors.summary = "Editorial summary must be at least 10 characters long";
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

    // 3. Generate unique slug or validate custom slug
    const cleanTitle = (title as string).trim();
    let slug: string;

    if (cleanCustomSlug) {
      const existing = await PollModel.findOne({ slug: cleanCustomSlug }).lean();
      if (existing) {
        return createErrorResponse(
          `A poll with the URL slug "${cleanCustomSlug}" already exists. Please choose a unique slug.`,
          409
        );
      }
      slug = cleanCustomSlug;
    } else {
      slug = await generateUniqueSlug(cleanTitle);
    }

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
    let parsedSeoKeywords: string[] = [];
    if (Array.isArray(seoKeywords)) {
      parsedSeoKeywords = seoKeywords.map((k) => String(k).trim()).filter(Boolean);
    } else if (typeof seoKeywords === "string" && seoKeywords.trim()) {
      parsedSeoKeywords = seoKeywords
        .split(/[,;\n]+/)
        .map((k) => k.trim())
        .filter(Boolean);
    }

    const cleanContext =
      typeof context === "string" && context.trim()
        ? sanitizeRichTextHtml(context.trim()).slice(0, 25000)
        : undefined;

    const cleanSourceReference =
      typeof sourceReference === "string" && sourceReference.trim()
        ? sourceReference.trim().slice(0, 1000)
        : undefined;

    const cleanEditorialNote =
      typeof editorialNote === "string" && editorialNote.trim()
        ? editorialNote.trim().slice(0, 1000)
        : undefined;

    let parsedClosesAt: Date | undefined = undefined;
    if (closesAt && typeof closesAt === "string" && closesAt.trim()) {
      const parsedDate = new Date(closesAt.trim());
      if (!isNaN(parsedDate.getTime())) {
        parsedClosesAt = parsedDate;
      }
    }

    const cleanMetaTitle =
      typeof metaTitle === "string" && metaTitle.trim()
        ? metaTitle.trim().slice(0, 200)
        : undefined;

    const cleanMetaDescription =
      typeof metaDescription === "string" && metaDescription.trim()
        ? metaDescription.trim().slice(0, 1000)
        : undefined;

    const poll = await PollModel.create({
      title: cleanTitle,
      slug,
      category: category as PollCategory,
      summary: (summary as string).trim(),
      context: cleanContext,
      sourceReference: cleanSourceReference,
      editorialNote: cleanEditorialNote,
      createdBy: user.id, // Strictly derived from session, never from client body
      status,
      publishedAt: status === "published" ? now : undefined,
      closesAt: parsedClosesAt,
      featured: Boolean(featured),
      options: parsedOptions,
      imageUrl: cleanImageUrl,
      cloudinaryPublicId: typeof cloudinaryPublicId === "string" && cloudinaryPublicId.trim() ? cloudinaryPublicId.trim() : undefined,
      imageAlt: typeof imageAlt === "string" && imageAlt.trim() ? imageAlt.trim() : undefined,
      seoKeywords: parsedSeoKeywords,
      metaTitle: cleanMetaTitle,
      metaDescription: cleanMetaDescription,
    });

    // If this poll is featured, ensure all other polls are unfeatured
    if (Boolean(featured)) {
      await PollModel.updateMany(
        { _id: { $ne: poll._id } },
        { $set: { featured: false } }
      );
    }

    // Auto-trigger Instant Indexing for published polls in the background
    if (poll.status === "published" && poll.slug) {
      submitUrlsForInstantIndexing([
        absoluteUrl(`/polls/${poll.slug}`),
        absoluteUrl("/polls"),
        absoluteUrl("/"),
      ]).catch((err) => {
        console.error("Auto-indexing background error:", err);
      });
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
    console.error("[Poll Create Error]:", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }

    // Mongoose Validation Error
    if (
      error &&
      typeof error === "object" &&
      ((error as { name?: string }).name === "ValidationError" || "errors" in error)
    ) {
      const valErr = error as { errors?: Record<string, { message: string }> };
      const fieldErrors: Record<string, string> = {};
      if (valErr.errors) {
        for (const [key, item] of Object.entries(valErr.errors)) {
          fieldErrors[key] = item.message;
        }
      }
      const combined = Object.values(fieldErrors).join(". ");
      return createErrorResponse(combined || "Validation error saving poll", 422, fieldErrors);
    }

    // Duplicate Key Error
    if (error && typeof error === "object" && (error as { code?: number }).code === 11000) {
      return createErrorResponse(
        "A poll with this question title or slug already exists in the database.",
        409
      );
    }

    if (error instanceof Error) {
      return createErrorResponse(error.message, 500);
    }

    return createErrorResponse("Failed to create poll inquiry", 500);
  }
}
