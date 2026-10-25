import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUser, verifyCsrfOrigin, checkRateLimit } from "@/lib/auth";
import {
  getPollChatHistory,
  createChatMessage,
  deleteChatMessage,
  ChatError,
} from "@/lib/chat";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/polls/[id]/chat
 * Retrieve bounded chat history for a published poll.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");
    const beforeParam = searchParams.get("before");
    const session = await getCurrentUser();

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const history = await getPollChatHistory(id, {
      limit: isNaN(limit) ? 50 : limit,
      before: beforeParam || undefined,
      currentUserId: session?.user?.id,
    });

    if (!history) {
      return NextResponse.json(
        { success: false, error: "Survey not found or chat is unavailable." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load chat history.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/polls/[id]/chat
 * Post a new chat message to a published poll room.
 * Requires verified session and CSRF verification.
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

    // 2. Authenticate user
    const session = await requireAuth();

    // 3. IP-based rate limiting as an additional defense-in-depth layer
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";
    const ipRateLimit = checkRateLimit(`ip_chat:${ip}`, 30, 60 * 1000);
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please wait a moment before sending more messages.",
        },
        { status: 429 }
      );
    }

    // 4. Parse payload
    const body = await request.json().catch(() => null);
    if (!body || typeof body.content !== "string") {
      return NextResponse.json(
        { success: false, error: "Message content is required." },
        { status: 400 }
      );
    }

    // 5. Create, persist, and broadcast message
    const message = await createChatMessage(
      id,
      session.user.id,
      body.content
    );

    return NextResponse.json(
      {
        success: true,
        data: { message },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    // Authentication error check
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
            error instanceof Error
              ? error.message
              : "Authentication required.",
        },
        { status: error.statusCode }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to post message.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/polls/[id]/chat
 * Delete a chat message.
 * Users can delete their own message; Admin can delete any message.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Verify CSRF
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, error: "Cross-site request rejected." },
        { status: 403 }
      );
    }

    // 2. Authenticate user
    const session = await requireAuth();

    // 3. Extract message ID from query params or body
    const { searchParams } = new URL(request.url);
    let messageId = searchParams.get("messageId");

    if (!messageId) {
      const body = await request.json().catch(() => null);
      if (body && typeof body.messageId === "string") {
        messageId = body.messageId;
      }
    }

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: "Message ID is required." },
        { status: 400 }
      );
    }

    // 4. Delete message with role-based checks
    const result = await deleteChatMessage(
      id,
      messageId,
      session.user.id,
      session.user.role
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
            error instanceof Error
              ? error.message
              : "Authentication required.",
        },
        { status: error.statusCode }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to delete message.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
