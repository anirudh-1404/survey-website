import { NextRequest } from "next/server";
import { recordPageView } from "@/lib/analytics";
import { createSuccessResponse, getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const path = typeof body.path === "string" ? body.path : "/";
    const referrer = typeof body.referrer === "string" ? body.referrer : undefined;
    const visitorId = typeof body.visitorId === "string" ? body.visitorId : undefined;
    const timezone = typeof body.timezone === "string" ? body.timezone : undefined;

    // Check if the visitor is currently signed in
    const sessionWithUser = await getCurrentUser();
    const user = sessionWithUser
      ? {
          id: sessionWithUser.user.id as unknown as undefined,
          name: sessionWithUser.user.name,
          email: sessionWithUser.user.email,
          role: sessionWithUser.user.role,
        }
      : undefined;

    const userAgent = request.headers.get("user-agent") || undefined;
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      undefined;

    const geoCity =
      request.headers.get("cf-ipcity") ||
      request.headers.get("x-vercel-ip-city") ||
      undefined;

    const geoCountry =
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      undefined;

    await recordPageView({
      path,
      referrer,
      visitorId,
      timezone,
      userAgent,
      ip: rawIp,
      geoCity,
      geoCountry,
      user,
    });

    return createSuccessResponse({ recorded: true });
  } catch {
    return createSuccessResponse({ recorded: false });
  }
}
