import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { subscribeToPollChat } from "@/lib/chat";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/polls/[id]/chat/stream
 * Real-time Server-Sent Events (SSE) stream for public poll chat rooms.
 * Delivers messages to connected participants without page refresh.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // 1. Verify poll is published and accessible
  await connectToDatabase();
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const poll = await PollModel.findOne({
    $or: [
      { slug: id },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }] : []),
    ],
  })
    .select("_id status")
    .lean();

  if (!poll || poll.status === "draft") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Survey not found or live chat room is unavailable.",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const pollDbId = poll._id.toString();
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial handshake connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            status: "connected",
            pollId: pollDbId,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      // 2. Subscribe to new chat messages and reactions for this specific poll
      unsubscribe = subscribeToPollChat(pollDbId, (payload) => {
        try {
          if (payload.type === "new_message") {
            controller.enqueue(
              encoder.encode(`event: message\ndata: ${JSON.stringify(payload.message)}\n\n`)
            );
          } else if (payload.type === "reaction_update") {
            controller.enqueue(
              encoder.encode(`event: reaction\ndata: ${JSON.stringify(payload)}\n\n`)
            );
          } else if (payload.type === "message_deleted") {
            controller.enqueue(
              encoder.encode(`event: delete\ndata: ${JSON.stringify(payload)}\n\n`)
            );
          }
        } catch {
          // Controller might already be closed
        }
      });

      // 3. Keep-alive heartbeat every 20 seconds to avoid connection dropouts through proxies
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 20000);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  });

  // Handle client disconnect via request abort signal
  request.signal.addEventListener("abort", () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in Nginx / proxies
    },
  });
}
