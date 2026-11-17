import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { ChatMessageModel } from "@/models/ChatMessage";
import { requireAdmin, createErrorResponse, createSuccessResponse } from "@/lib/auth";
import { deleteChatMessage } from "@/lib/chat";
import mongoose from "mongoose";

/**
 * GET /api/admin/chats
 * List all polls with their chat message tallies and latest message,
 * or retrieve detailed chat history for a specific poll.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get("pollId")?.trim();

    // If specific pollId requested, return detailed message records
    if (pollId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(pollId);
      const pollFilter: Record<string, unknown> = {
        $or: [{ slug: pollId }],
      };
      if (isObjectId) {
        (pollFilter.$or as Array<Record<string, unknown>>).push({
          _id: new mongoose.Types.ObjectId(pollId),
        });
      }

      const poll = await PollModel.findOne(pollFilter).select("_id title slug status").lean();
      if (!poll) {
        return createErrorResponse("Poll not found", 404);
      }

      const messages = await ChatMessageModel.find({
        pollId: poll._id,
        status: { $ne: "removed" },
      })
        .sort({ createdAt: 1 })
        .limit(200)
        .populate("authorId", "name email role")
        .lean();

      return createSuccessResponse({
        poll: {
          id: poll._id.toString(),
          title: poll.title,
          slug: poll.slug,
          status: poll.status,
        },
        messages: messages.map((m) => {
          const authorUser = m.authorId as { _id?: unknown; name?: string; role?: string; email?: string } | null;
          return {
            id: m._id.toString(),
            pollId: m.pollId.toString(),
            author: {
              id: authorUser?._id ? String(authorUser._id) : "guest",
              name: authorUser?.name || m.guestName || "Anonymous Citizen",
              role: (authorUser?.role === "admin" ? "admin" : "user") as "user" | "admin",
            },
            content: m.content,
            status: m.status,
            reactions: m.reactions || [],
            isFlagged: m.isFlagged || false,
            flagReason: m.flagReason,
            createdAt: new Date(m.createdAt).toISOString(),
          };
        }),
      });
    }

    // Otherwise, return all polls with aggregated chat message counts
    const polls = await PollModel.find()
      .sort({ createdAt: -1 })
      .select("_id title slug category status createdAt views")
      .lean();

    const pollIds = polls.map((p) => p._id);

    // Aggregate message counts per poll
    const chatCounts = await ChatMessageModel.aggregate([
      { $match: { pollId: { $in: pollIds }, status: { $ne: "removed" } } },
      {
        $group: {
          _id: "$pollId",
          totalMessages: { $sum: 1 },
          lastMessageAt: { $max: "$createdAt" },
        },
      },
    ]);

    const chatStatsMap = new Map<string, { totalMessages: number; lastMessageAt: string | null }>();
    for (const c of chatCounts) {
      chatStatsMap.set(c._id.toString(), {
        totalMessages: c.totalMessages,
        lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : null,
      });
    }

    return createSuccessResponse({
      polls: polls.map((p) => {
        const pId = p._id.toString();
        const stat = chatStatsMap.get(pId) || { totalMessages: 0, lastMessageAt: null };
        return {
          id: pId,
          title: p.title,
          slug: p.slug,
          category: p.category,
          status: p.status,
          views: p.views || 0,
          messageCount: stat.totalMessages,
          lastMessageAt: stat.lastMessageAt,
          createdAt: new Date(p.createdAt).toISOString(),
        };
      }),
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to fetch administrative chat data", 500);
  }
}

/**
 * DELETE /api/admin/chats
 * Delete a specific chat message as an administrator.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const pollId = searchParams.get("pollId");

    if (!messageId || !pollId) {
      return createErrorResponse("messageId and pollId are required", 400);
    }

    const result = await deleteChatMessage(pollId, messageId, user.id, "admin");

    return createSuccessResponse(result);
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { message: string; statusCode: number };
      return createErrorResponse(err.message, err.statusCode);
    }
    return createErrorResponse("Failed to delete chat message", 500);
  }
}
