import { NextRequest } from "next/server";
import { requireAdmin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { BlogModel } from "@/models/Blog";
import {
  submitUrlsForInstantIndexing,
  getIndexingEngineStatus,
} from "@/lib/indexing";
import { absoluteUrl } from "@/lib/site-url";

/**
 * GET /api/admin/indexing
 * Returns configuration status and recent content URLs for quick-indexing.
 */
export async function GET() {
  try {
    await requireAdmin();
    await connectToDatabase();

    const status = getIndexingEngineStatus();

    // Fetch recent 10 published polls
    const recentPolls = await PollModel.find({ status: "published" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(10)
      .select("title slug publishedAt")
      .lean();

    // Fetch recent 5 published blogs
    const recentBlogs = await BlogModel.find({ status: "published" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(5)
      .select("title slug publishedAt")
      .lean();

    const quickLinks = [
      {
        type: "homepage",
        title: "SayNow Homepage",
        url: absoluteUrl("/"),
      },
      {
        type: "polls_index",
        title: "Public Polls Directory",
        url: absoluteUrl("/polls"),
      },
      {
        type: "blogs_index",
        title: "Editorial & Analyses Directory",
        url: absoluteUrl("/blogs"),
      },
      ...recentPolls.map((p) => ({
        type: "poll",
        title: p.title,
        url: absoluteUrl(`/polls/${p.slug}`),
        publishedAt: p.publishedAt,
      })),
      ...recentBlogs.map((b) => ({
        type: "blog",
        title: b.title,
        url: absoluteUrl(`/blogs/${b.slug}`),
        publishedAt: b.publishedAt,
      })),
    ];

    return createSuccessResponse({
      status,
      quickLinks,
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to load indexing status", 500);
  }
}

/**
 * POST /api/admin/indexing
 * Submit one or more URLs for instant indexing via Google Indexing API & IndexNow.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    const urlsToSubmit: string[] = [];

    if (body.action === "all_published_polls") {
      const allPolls = await PollModel.find({ status: "published" })
        .select("slug")
        .lean();
      for (const p of allPolls) {
        if (p.slug) urlsToSubmit.push(absoluteUrl(`/polls/${p.slug}`));
      }
      urlsToSubmit.unshift(absoluteUrl("/"));
      urlsToSubmit.unshift(absoluteUrl("/polls"));
    } else if (Array.isArray(body.urls) && body.urls.length > 0) {
      for (const u of body.urls) {
        if (typeof u === "string" && u.trim()) {
          urlsToSubmit.push(u.trim());
        }
      }
    } else if (typeof body.url === "string" && body.url.trim()) {
      urlsToSubmit.push(body.url.trim());
    }

    if (urlsToSubmit.length === 0) {
      return createErrorResponse("Please provide at least one valid URL to index", 400);
    }

    // Limit batch submission to 100 per request
    const cappedUrls = urlsToSubmit.slice(0, 100);
    const results = await submitUrlsForInstantIndexing(cappedUrls);

    return createSuccessResponse({
      totalSubmitted: results.length,
      results,
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to submit URLs for instant indexing", 500);
  }
}
