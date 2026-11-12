import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteVisit } from "@/models/SiteVisit";
import { requireAdmin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { getSiteAnalytics } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search")?.trim() || "";

    const query: Record<string, unknown> = {};

    if (filter === "users") {
      query["user.name"] = { $exists: true, $ne: null };
    } else if (filter === "guests") {
      query.$or = [{ user: { $exists: false } }, { "user.name": null }];
    } else if (filter === "polls") {
      query.path = { $regex: "^/polls/" };
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { path: searchRegex },
        { pollTitle: searchRegex },
        { "user.name": searchRegex },
        { "user.email": searchRegex },
        { city: searchRegex },
        { source: searchRegex },
        { device: searchRegex },
        { browser: searchRegex },
      ];
    }

    const [totalCount, visits, stats] = await Promise.all([
      SiteVisit.countDocuments(query),
      SiteVisit.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      getSiteAnalytics(),
    ]);

    const formattedVisits = visits.map((v) => ({
      id: v._id.toString(),
      path: v.path,
      pollSlug: v.pollSlug,
      pollTitle: v.pollTitle,
      user: v.user
        ? {
            id: v.user.id?.toString(),
            name: v.user.name,
            email: v.user.email,
            role: v.user.role,
          }
        : null,
      visitorId: v.visitorId,
      device: v.device || "Desktop",
      browser: v.browser || "Browser",
      os: v.os || "Unknown",
      ip: v.ip,
      city: v.city,
      country: v.country,
      timezone: v.timezone,
      referrer: v.referrer,
      source: v.source || "Direct",
      createdAt: new Date(v.createdAt).toISOString(),
    }));

    return createSuccessResponse({
      visits: formattedVisits,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
      stats,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    return createErrorResponse(
      error.message || "Failed to fetch traffic logs",
      error.statusCode || 500
    );
  }
}
