import { connectToDatabase } from "@/lib/mongodb";
import { SiteVisit } from "@/models/SiteVisit";

/**
 * Record a public page view in MongoDB.
 * Excludes internal administration routes and static framework assets.
 */
export async function recordPageView(path: string, referrer?: string): Promise<void> {
  if (
    !path ||
    path.startsWith("/admin") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.includes(".")
  ) {
    return;
  }

  try {
    await connectToDatabase();
    await SiteVisit.create({
      path: path.slice(0, 500),
      referrer: referrer ? referrer.slice(0, 500) : undefined,
    });
  } catch (err) {
    // Non-blocking telemetry
    console.error("[Analytics] Failed to record page view:", err);
  }
}

/**
 * Retrieve high-level site visit metrics for the admin dashboard.
 */
export async function getSiteAnalytics(): Promise<{
  totalVisits: number;
  todayVisits: number;
}> {
  await connectToDatabase();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalVisits, todayVisits] = await Promise.all([
    SiteVisit.countDocuments(),
    SiteVisit.countDocuments({ createdAt: { $gte: startOfToday } }),
  ]);

  return {
    totalVisits,
    todayVisits,
  };
}
