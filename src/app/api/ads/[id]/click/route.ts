import { NextRequest, NextResponse } from "next/server";
import { recordAdClick } from "@/lib/ads";

/**
 * GET /api/ads/[id]/click
 * Tracks click counter and safely redirects user to target sponsor URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const targetUrl = await recordAdClick(id);

    if (!targetUrl) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Ensure valid URL
    try {
      const parsed = new URL(targetUrl);
      return NextResponse.redirect(parsed.toString(), { status: 302 });
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch (error) {
    console.error("[Ads] Error tracking click:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
