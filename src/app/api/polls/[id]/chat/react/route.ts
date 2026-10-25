import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyCsrfOrigin, checkRateLimit } from "@/lib/auth";
import { toggleChatMessageReaction, ChatError } from "@/lib/chat";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/polls/[id]/chat/react
 * Toggle an emoji reaction or like on a specific chat message.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Verify CSRF
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, error: "Cross-site request rejected." },
        { status: 403 }
      );
    }

    // 2. Authenticate citizen
    const session = await requireAuth();

    // 3. Rate limiting for reactions (max 60 per minute per citizen)
    const rateLimit = checkRateLimit(`react:${session.user.id}`, 60, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "You are reacting too quickly." },
        { status: 429 }
      );
    }

    // 4. Parse request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body.messageId !== "string" || typeof body.emoji !== "string") {
      return NextResponse.json(
        { success: false, error: "Message ID and emoji are required." },
        { status: 400 }
      );
    }

    // 5. Toggle reaction
    const result = await toggleChatMessageReaction(
      id,
      body.messageId,
      session.user.id,
      body.emoji
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Authentication required.",
        },
        { status: error.statusCode }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to record reaction.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
