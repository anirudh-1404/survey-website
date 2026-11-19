import { NextRequest } from "next/server";
import { incrementPollViews } from "@/lib/polls";
import { createSuccessResponse, createErrorResponse } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const BOT_USER_AGENTS =
  /bot|spider|crawl|scraper|facebookexternalhit|whatsapp|telegrambot|twitterbot|slackbot|discordbot|applebot|linkedinbot|googlebot|bingbot|yandex|duckduckbot|baiduspider|skypeuripreview|embedly|quora link preview|outbrain|pinterest|yahoo|headless|lighthouse/i;

/**
 * POST /api/polls/[id]/view
 * Increments the view count for a poll only when visited by a real human browser.
 * Ignores automated preview crawlers (WhatsApp, Facebook, Twitter, Telegram) and prefetch headers.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return createErrorResponse("Poll identifier is required", 400);
    }

    const userAgent = request.headers.get("user-agent") || "";
    const purpose =
      request.headers.get("purpose") ||
      request.headers.get("sec-purpose") ||
      "";

    // 1. Ignore background prefetch requests
    if (purpose.toLowerCase() === "prefetch") {
      return createSuccessResponse({ recorded: false, reason: "prefetch" });
    }

    // 2. Ignore social media link preview bots & web crawlers
    if (BOT_USER_AGENTS.test(userAgent)) {
      return createSuccessResponse({ recorded: false, reason: "bot" });
    }

    // 3. Record valid human view
    await incrementPollViews(id);

    return createSuccessResponse({ recorded: true });
  } catch {
    return createSuccessResponse({ recorded: false });
  }
}
