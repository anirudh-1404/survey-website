import { connectToDatabase } from "@/lib/mongodb";
import { ChatMessageModel, IChatMessage } from "@/models/ChatMessage";
import { PollModel } from "@/models/Poll";
import { UserModel } from "@/models/User";
import { ChatMessage, ChatHistoryResponse, ChatReactionSummary } from "@/types/chat";
import { checkRateLimit } from "@/lib/auth";
import { checkContentModeration } from "@/lib/moderation";
import mongoose from "mongoose";
import { EventEmitter } from "events";

export class ChatError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ChatError";
    this.statusCode = statusCode;
  }
}

export type ChatStreamPayload =
  | { type: "new_message"; message: ChatMessage }
  | { type: "reaction_update"; messageId: string; reactions: ChatReactionSummary[] }
  | { type: "message_deleted"; messageId: string };

// In-process event emitter for real-time room dispatch
class ChatRoomEmitter extends EventEmitter {}

// Global singleton to avoid multiple emitters across Next.js reloads
declare global {
  var __pulseChatEmitter: ChatRoomEmitter | undefined;
}

const chatEmitter = globalThis.__pulseChatEmitter || new ChatRoomEmitter();
if (process.env.NODE_ENV !== "production") {
  globalThis.__pulseChatEmitter = chatEmitter;
}
chatEmitter.setMaxListeners(500);

/**
 * Sanitize plain user text while preserving whitespace and punctuation.
 * Strips script tags, HTML tags, and control characters to prevent XSS.
 */
export function sanitizeChatMessage(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); // Strip non-printable ASCII
}

/**
 * Subscribe a connected client to real-time chat messages for a specific poll.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToPollChat(
  pollId: string,
  listener: (payload: ChatStreamPayload) => void
): () => void {
  const channel = `poll:${pollId}`;
  chatEmitter.on(channel, listener);
  return () => {
    chatEmitter.off(channel, listener);
  };
}

/**
 * Broadcast a new persisted chat message or reaction to all connected clients in the room.
 */
export async function broadcastChatEvent(
  pollId: string,
  payload: ChatStreamPayload
): Promise<void> {
  const channel = `poll:${pollId}`;
  chatEmitter.emit(channel, payload);

  // Optional Pusher Managed Service broadcast if configured
  const pusherAppId = process.env.PUSHER_APP_ID;
  const pusherKey = process.env.PUSHER_KEY;
  const pusherSecret = process.env.PUSHER_SECRET;
  const pusherCluster = process.env.PUSHER_CLUSTER || "mt1";

  if (pusherAppId && pusherKey && pusherSecret) {
    try {
      const crypto = await import("crypto");
      const path = `/apps/${pusherAppId}/events`;
      const body = JSON.stringify({
        name: payload.type,
        channel: `poll-${pollId}`,
        data: JSON.stringify(payload),
      });

      const bodyMd5 = crypto.createHash("md5").update(body).digest("hex");
      const timestamp = Math.floor(Date.now() / 1000);
      const queryString = `auth_key=${pusherKey}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
      const signString = `POST\n${path}\n${queryString}`;
      const authSignature = crypto
        .createHmac("sha256", pusherSecret)
        .update(signString)
        .digest("hex");

      const pusherUrl = `https://api-${pusherCluster}.pusher.com${path}?${queryString}&auth_signature=${authSignature}`;
      await fetch(pusherUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch {
      // Pusher broadcast error should not fail message delivery
    }
  }
}

/**
 * Map Mongo reaction documents to client reaction summary
 */
function summarizeReactions(
  rawReactions: { emoji: string; users: (mongoose.Types.ObjectId | string)[] }[] | undefined,
  currentUserId?: string
): ChatReactionSummary[] {
  if (!rawReactions || !Array.isArray(rawReactions)) return [];

  return rawReactions
    .filter((r) => r.users && r.users.length > 0)
    .map((r) => {
      const userIds = r.users.map((u) => u.toString());
      return {
        emoji: r.emoji,
        count: userIds.length,
        reactedByMe: currentUserId ? userIds.includes(currentUserId) : false,
      };
    });
}

/**
 * Retrieve recent chat history for a published poll.
 */
export async function getPollChatHistory(
  pollIdentifier: string,
  options?: { limit?: number; before?: string; currentUserId?: string }
): Promise<ChatHistoryResponse | null> {
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
    ],
  })
    .select("_id status slug")
    .lean();

  if (!poll || poll.status === "draft") {
    return null;
  }

  const limit = Math.min(Math.max(1, options?.limit || 50), 100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    pollId: poll._id,
    status: "visible",
  };

  if (options?.before) {
    const beforeDate = new Date(options.before);
    if (!isNaN(beforeDate.getTime())) {
      query.createdAt = { $lt: beforeDate };
    }
  }

  const totalCount = await ChatMessageModel.countDocuments({
    pollId: poll._id,
    status: "visible",
  });

  const rawMessages = await ChatMessageModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate<{ authorId: { _id: mongoose.Types.ObjectId; name: string; role: "user" | "admin"; status: string } }>(
      "authorId",
      "name role status"
    )
    .lean();

  const hasMore = rawMessages.length > limit;
  const slicedMessages = hasMore ? rawMessages.slice(0, limit) : rawMessages;

  // Transform safely and return in chronological order (oldest to newest)
  const messages: ChatMessage[] = slicedMessages
    .reverse()
    .map((doc) => {
      const author = doc.authorId;
      // In case older doc doesn't have moderation saved, do dynamic fallback check
      const mod = doc.isFlagged !== undefined
        ? { isFlagged: Boolean(doc.isFlagged), reason: doc.flagReason }
        : checkContentModeration(doc.content);

      return {
        id: doc._id.toString(),
        pollId: doc.pollId.toString(),
        content: doc.content,
        createdAt: doc.createdAt.toISOString(),
        status: doc.status,
        author: {
          id: author?._id ? author._id.toString() : "unknown",
          name: author?.name || "Anonymous Citizen",
          role: author?.role || "user",
        },
        reactions: summarizeReactions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doc as any).reactions,
          options?.currentUserId
        ),
        isFlagged: mod.isFlagged,
        flagReason: mod.reason,
      };
    });

  return {
    messages,
    totalCount,
    hasMore,
  };
}

/**
 * Persist and broadcast a new chat message to a published poll room.
 * Enforces moderation checks for abusive/crime/adult language.
 */
export async function createChatMessage(
  pollIdentifier: string,
  authorId: string,
  rawContent: string
): Promise<ChatMessage> {
  await connectToDatabase();

  const content = sanitizeChatMessage(rawContent);

  if (!content || content.length === 0) {
    throw new ChatError("Chat message cannot be empty.", 400);
  }

  if (content.length > 1000) {
    throw new ChatError("Chat message cannot exceed 1000 characters.", 400);
  }

  // Rate limiting (max 15 messages/min per user)
  const rateLimitKey = `chat:${authorId}`;
  const rateLimit = checkRateLimit(rateLimitKey, 15, 60 * 1000);
  if (!rateLimit.allowed) {
    throw new ChatError(
      "You are sending messages too quickly. Please pause briefly before sending another message.",
      429
    );
  }

  // Find poll and ensure it is published
  const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
    ],
  })
    .select("_id status")
    .lean();

  if (!poll) {
    throw new ChatError("The requested survey does not exist.", 404);
  }

  if (poll.status === "draft") {
    throw new ChatError("Chat is not available for draft surveys.", 403);
  }

  // Verify author
  const author = await UserModel.findById(authorId).select("_id name role status").lean();
  if (!author) {
    throw new ChatError("Author account not found.", 401);
  }

  if (author.status === "suspended") {
    throw new ChatError("Account is suspended from public discourse.", 403);
  }

  // Content moderation analysis for abusive words, crime terms, or adult content
  const moderation = checkContentModeration(content);

  // Persist message in MongoDB
  const createdDoc: IChatMessage = await ChatMessageModel.create({
    pollId: poll._id,
    authorId: author._id,
    content,
    status: "visible",
    reactions: [],
    isFlagged: moderation.isFlagged,
    flagReason: moderation.reason,
    flaggedWords: moderation.flaggedWords,
  });

  const messagePayload: ChatMessage = {
    id: createdDoc._id.toString(),
    pollId: poll._id.toString(),
    content: createdDoc.content,
    createdAt: createdDoc.createdAt.toISOString(),
    status: "visible",
    author: {
      id: author._id.toString(),
      name: author.name,
      role: author.role,
    },
    reactions: [],
    isFlagged: moderation.isFlagged,
    flagReason: moderation.reason,
  };

  // Broadcast to all active room subscribers
  await broadcastChatEvent(poll._id.toString(), {
    type: "new_message",
    message: messagePayload,
  });

  return messagePayload;
}

/**
 * Toggle a WhatsApp-style emoji reaction on a chat message.
 */
export async function toggleChatMessageReaction(
  pollIdentifier: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<{ messageId: string; reactions: ChatReactionSummary[] }> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new ChatError("Invalid message ID.", 400);
  }

  if (!emoji || emoji.trim().length === 0) {
    throw new ChatError("Emoji reaction is required.", 400);
  }

  const cleanEmoji = emoji.trim();

  // Find poll
  const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
    ],
  })
    .select("_id")
    .lean();

  if (!poll) {
    throw new ChatError("Survey not found.", 404);
  }

  const message = await ChatMessageModel.findById(messageId);
  if (!message || message.status !== "visible") {
    throw new ChatError("Chat message not found.", 404);
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const reactions = message.reactions || [];

  const existingEmojiIndex = reactions.findIndex((r) => r.emoji === cleanEmoji);

  if (existingEmojiIndex > -1) {
    const existing = reactions[existingEmojiIndex];
    const userIndex = existing.users.findIndex((u) => u.toString() === userId);

    if (userIndex > -1) {
      // User already reacted -> remove reaction (toggle off)
      existing.users.splice(userIndex, 1);
      if (existing.users.length === 0) {
        reactions.splice(existingEmojiIndex, 1);
      }
    } else {
      // User reacts with this emoji
      existing.users.push(userObjectId);
    }
  } else {
    // New emoji reaction
    reactions.push({
      emoji: cleanEmoji,
      users: [userObjectId],
    });
  }

  message.reactions = reactions;
  await message.save();

  const reactionSummary = summarizeReactions(message.reactions, userId);

  // Broadcast updated reactions to the room
  await broadcastChatEvent(poll._id.toString(), {
    type: "reaction_update",
    messageId,
    reactions: reactionSummary,
  });

  return {
    messageId,
    reactions: reactionSummary,
  };
}

/**
 * Delete a chat message from a poll room.
 * Author can delete their own message; Admin can delete any message.
 */
export async function deleteChatMessage(
  pollIdentifier: string,
  messageId: string,
  userId: string,
  userRole: string
): Promise<{ messageId: string; deleted: boolean }> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new ChatError("Invalid message ID.", 400);
  }

  const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
    ],
  })
    .select("_id")
    .lean();

  if (!poll) {
    throw new ChatError("Survey not found.", 404);
  }

  const message = await ChatMessageModel.findById(messageId);
  if (!message || message.status === "removed") {
    throw new ChatError("Chat message not found.", 404);
  }

  // Permission check: Owner or Admin
  const isOwner = message.authorId.toString() === userId;
  const isAdmin = userRole === "admin";

  if (!isOwner && !isAdmin) {
    throw new ChatError("You do not have permission to delete this message.", 403);
  }

  message.status = "removed";
  await message.save();

  // Broadcast deletion event to all connected clients in the room
  await broadcastChatEvent(poll._id.toString(), {
    type: "message_deleted",
    messageId,
  });

  return { messageId, deleted: true };
}
