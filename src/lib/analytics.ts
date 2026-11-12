import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteVisit, ISiteVisitUser, ISiteVisit } from "@/models/SiteVisit";
import { PollModel } from "@/models/Poll";

export interface RecordPageViewParams {
  path: string;
  referrer?: string;
  visitorId?: string;
  timezone?: string;
  userAgent?: string;
  ip?: string;
  geoCity?: string;
  geoCountry?: string;
  user?: ISiteVisitUser;
}

export function parseUserAgent(ua?: string): {
  device: string;
  browser: string;
  os: string;
} {
  if (!ua) {
    return { device: "Unknown", browser: "Unknown", os: "Unknown" };
  }

  let os = "Other";
  let device = "Desktop";

  if (/iPhone/i.test(ua)) {
    os = "iOS";
    device = "iPhone";
  } else if (/iPad/i.test(ua)) {
    os = "iPadOS";
    device = "iPad";
  } else if (/Android/i.test(ua)) {
    os = "Android";
    device = /Mobile/i.test(ua) ? "Android Phone" : "Android Tablet";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
    device = "Mac";
  } else if (/Windows NT/i.test(ua)) {
    os = "Windows";
    device = "Windows PC";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
    device = "Linux PC";
  }

  let browser = "Browser";
  if (/Edg/i.test(ua)) {
    browser = "Edge";
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = "Firefox";
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = "Safari";
  } else if (/Opera|OPR/i.test(ua)) {
    browser = "Opera";
  }

  return { device, browser, os };
}

export function parseTrafficSource(referrer?: string): string {
  if (!referrer || referrer.trim() === "") return "Direct";
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();
    if (host.includes("whatsapp")) return "WhatsApp";
    if (host.includes("google")) return "Google";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("facebook") || host.includes("fb.me")) return "Facebook";
    if (host.includes("twitter") || host.includes("t.co") || host.includes("x.com")) return "Twitter / X";
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("reddit")) return "Reddit";
    return host.replace(/^www\./, "");
  } catch {
    return "Referral";
  }
}

/**
 * Record a public page view in MongoDB with full citizen identity & device analytics.
 * Excludes internal administration routes and static framework assets.
 */
export async function recordPageView(params: RecordPageViewParams): Promise<void> {
  const { path, referrer, visitorId, timezone, userAgent, ip, geoCity, geoCountry, user } = params;

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

    const { device, browser, os } = parseUserAgent(userAgent);
    const source = parseTrafficSource(referrer);

    let pollSlug: string | undefined;
    let pollTitle: string | undefined;

    // Detect if the visit is for a specific poll
    if (path.startsWith("/polls/")) {
      const slugCandidate = path.replace(/^\/polls\//, "").split("/")[0]?.trim();
      if (slugCandidate) {
        pollSlug = slugCandidate;
        try {
          const isObjectId = mongoose.Types.ObjectId.isValid(slugCandidate);
          const filter = isObjectId
            ? { _id: new mongoose.Types.ObjectId(slugCandidate) }
            : { slug: slugCandidate };
          const poll = await PollModel.findOne(filter).select("title slug").lean();
          if (poll) {
            pollTitle = poll.title;
            pollSlug = poll.slug;
          }
        } catch {
          // Ignore lookup failure
        }
      }
    }

    await SiteVisit.create({
      path: path.slice(0, 500),
      pollSlug,
      pollTitle,
      user: user
        ? {
            id: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        : undefined,
      visitorId: visitorId ? visitorId.slice(0, 100) : undefined,
      device,
      browser,
      os,
      ip: ip ? ip.slice(0, 100) : undefined,
      city: geoCity ? geoCity.slice(0, 100) : undefined,
      country: geoCountry ? geoCountry.slice(0, 100) : undefined,
      timezone: timezone ? timezone.slice(0, 100) : undefined,
      referrer: referrer ? referrer.slice(0, 500) : undefined,
      source,
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
  userVisits: number;
  guestVisits: number;
}> {
  await connectToDatabase();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalVisits, todayVisits, userVisits, guestVisits] = await Promise.all([
    SiteVisit.countDocuments(),
    SiteVisit.countDocuments({ createdAt: { $gte: startOfToday } }),
    SiteVisit.countDocuments({ "user.name": { $exists: true, $ne: null } }),
    SiteVisit.countDocuments({
      $or: [{ user: { $exists: false } }, { "user.name": null }],
    }),
  ]);

  return {
    totalVisits,
    todayVisits,
    userVisits,
    guestVisits,
  };
}

/**
 * Retrieve recent visitor activity stream with citizen identity & visitor metadata.
 */
export async function getRecentVisits(limit = 20): Promise<ISiteVisit[]> {
  await connectToDatabase();
  return await SiteVisit.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<ISiteVisit[]>();
}
