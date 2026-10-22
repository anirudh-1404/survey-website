import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { EventEmitter } from "node:events";

class ChatError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ChatError";
    this.statusCode = statusCode;
  }
}

function sanitizeChatMessage(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

// In-process event emitter matching src/lib/chat.ts
const chatEmitter = new EventEmitter();

function subscribeToPollChat(pollId, listener) {
  const channel = `poll:${pollId}`;
  chatEmitter.on(channel, listener);
  return () => {
    chatEmitter.off(channel, listener);
  };
}

function broadcastChatMessage(pollId, message) {
  const channel = `poll:${pollId}`;
  chatEmitter.emit(channel, message);
}

// In-memory sliding window rate limiter matching src/lib/auth.ts
const rateLimitStore = new Map();
function checkRateLimit(key, limit = 15, windowMs = 60 * 1000) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    const record = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, record);
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

describe("PULSE — Phase 2: Persistent Real-Time Poll Chat Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  let User;
  let Poll;
  let ChatMessage;

  let testUser;
  let testAdmin;
  let publishedPoll;
  let secondPoll;
  let draftPoll;

  async function createChatMessage({ pollIdentifier, authorId, rawContent }) {
    const content = sanitizeChatMessage(rawContent);

    if (!content || content.length === 0) {
      throw new ChatError("Chat message cannot be empty.", 400);
    }

    if (content.length > 1000) {
      throw new ChatError("Chat message cannot exceed 1000 characters.", 400);
    }

    if (!authorId || !mongoose.Types.ObjectId.isValid(authorId)) {
      throw new ChatError("Authentication required to post to chat room.", 401);
    }

    // Rate limiting check
    const rateLimit = checkRateLimit(`chat:${authorId}`, 15, 60 * 1000);
    if (!rateLimit.allowed) {
      throw new ChatError(
        "You are sending messages too quickly. Please pause briefly.",
        429
      );
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
    const poll = await Poll.findOne({
      $or: [
        { slug: pollIdentifier },
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
      ],
    });

    if (!poll) {
      throw new ChatError("The requested survey does not exist.", 404);
    }

    if (poll.status === "draft") {
      throw new ChatError("Chat is not available for draft surveys.", 403);
    }

    const author = await User.findById(authorId);
    if (!author) {
      throw new ChatError("Author account not found.", 401);
    }

    if (author.status === "suspended") {
      throw new ChatError("Account is suspended from public discourse.", 403);
    }

    const created = await ChatMessage.create({
      pollId: poll._id,
      authorId: author._id,
      content,
      status: "visible",
    });

    const safeMessage = {
      id: created._id.toString(),
      pollId: poll._id.toString(),
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      status: created.status,
      author: {
        id: author._id.toString(),
        name: author.name,
        role: author.role,
      },
    };

    broadcastChatMessage(poll._id.toString(), safeMessage);

    return safeMessage;
  }

  async function getPollChatHistory({ pollIdentifier, limit = 50, before }) {
    const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
    const poll = await Poll.findOne({
      $or: [
        { slug: pollIdentifier },
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
      ],
    });

    if (!poll || poll.status === "draft") {
      return null;
    }

    const boundedLimit = Math.min(Math.max(1, limit), 100);
    const query = {
      pollId: poll._id,
      status: "visible",
    };

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    const totalCount = await ChatMessage.countDocuments({
      pollId: poll._id,
      status: "visible",
    });

    const rawDocs = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(boundedLimit + 1)
      .populate("authorId", "name role status");

    const hasMore = rawDocs.length > boundedLimit;
    const sliced = hasMore ? rawDocs.slice(0, boundedLimit) : rawDocs;

    const messages = sliced.reverse().map((doc) => ({
      id: doc._id.toString(),
      pollId: doc.pollId.toString(),
      content: doc.content,
      createdAt: doc.createdAt.toISOString(),
      status: doc.status,
      author: {
        id: doc.authorId?._id ? doc.authorId._id.toString() : "unknown",
        name: doc.authorId?.name || "Anonymous Citizen",
        role: doc.authorId?.role || "user",
      },
    }));

    return { messages, totalCount, hasMore };
  }

  before(async () => {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is required to run tests.");
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    const UserSchema = new mongoose.Schema(
      {
        name: String,
        email: { type: String, unique: true },
        passwordHash: String,
        role: { type: String, enum: ["user", "admin"], default: "user" },
        status: { type: String, default: "active" },
      },
      { timestamps: true }
    );

    const PollSchema = new mongoose.Schema(
      {
        title: String,
        slug: { type: String, unique: true },
        category: String,
        summary: String,
        createdBy: mongoose.Schema.Types.ObjectId,
        status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
      },
      { timestamps: true }
    );

    const ChatMessageSchema = new mongoose.Schema(
      {
        pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll", required: true, index: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        content: { type: String, required: true, minlength: 1, maxlength: 1000 },
        status: { type: String, enum: ["visible", "hidden", "removed"], default: "visible", index: true },
      },
      { timestamps: true }
    );

    ChatMessageSchema.index({ pollId: 1, status: 1, createdAt: -1 });

    User = mongoose.models.User || mongoose.model("User", UserSchema);
    Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);
    ChatMessage = mongoose.models.ChatMessage || mongoose.model("ChatMessage", ChatMessageSchema);

    const timestamp = Date.now();
    testUser = await User.create({
      name: "Civic Chat Citizen",
      email: `citizen.chat.${timestamp}@pulse.test`,
      passwordHash: "test_hashed_secret",
      role: "user",
      status: "active",
    });

    testAdmin = await User.create({
      name: "Chat Moderator Admin",
      email: `admin.chat.${timestamp}@pulse.test`,
      passwordHash: "test_hashed_secret",
      role: "admin",
      status: "active",
    });

    publishedPoll = await Poll.create({
      title: `Global Real-Time Chat Inquiry ${timestamp}`,
      slug: `global-chat-inquiry-${timestamp}`,
      summary: "Testing persistent real-time chat rooms for civic inquiries.",
      category: "Technology",
      status: "published",
      createdBy: testAdmin._id,
    });

    secondPoll = await Poll.create({
      title: `Secondary Isolated Inquiry ${timestamp}`,
      slug: `secondary-inquiry-${timestamp}`,
      summary: "Testing poll room isolation.",
      category: "Economy",
      status: "published",
      createdBy: testAdmin._id,
    });

    draftPoll = await Poll.create({
      title: `Draft Unreleased Inquiry ${timestamp}`,
      slug: `draft-inquiry-${timestamp}`,
      summary: "Should not be accessible for chat.",
      category: "Politics",
      status: "draft",
      createdBy: testAdmin._id,
    });
  });

  after(async () => {
    if (testUser) await User.deleteOne({ _id: testUser._id });
    if (testAdmin) await User.deleteOne({ _id: testAdmin._id });
    if (publishedPoll) {
      await Poll.deleteOne({ _id: publishedPoll._id });
      await ChatMessage.deleteMany({ pollId: publishedPoll._id });
    }
    if (secondPoll) {
      await Poll.deleteOne({ _id: secondPoll._id });
      await ChatMessage.deleteMany({ pollId: secondPoll._id });
    }
    if (draftPoll) {
      await Poll.deleteOne({ _id: draftPoll._id });
      await ChatMessage.deleteMany({ pollId: draftPoll._id });
    }
    await mongoose.disconnect();
  });

  test("1. Text Sanitization: Safely strips script, HTML tags, and control characters", () => {
    const malicious = "<script>alert('xss')</script>Hello <b>Civic</b> Room!\u0000";
    const cleaned = sanitizeChatMessage(malicious);
    assert.strictEqual(cleaned, "alert('xss')Hello Civic Room!");

    const empty = sanitizeChatMessage("   ");
    assert.strictEqual(empty, "");
  });

  test("2. Message Validation: Rejects empty or oversized messages (>1000 chars)", async () => {
    await assert.rejects(
      async () => {
        await createChatMessage({
          pollIdentifier: publishedPoll._id.toString(),
          authorId: testUser._id.toString(),
          rawContent: "   ",
        });
      },
      (err) => {
        assert(err instanceof ChatError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    const oversized = "a".repeat(1001);
    await assert.rejects(
      async () => {
        await createChatMessage({
          pollIdentifier: publishedPoll._id.toString(),
          authorId: testUser._id.toString(),
          rawContent: oversized,
        });
      },
      (err) => {
        assert(err instanceof ChatError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  test("3. Draft Poll Isolation: Rejects message submission and hides history for draft polls", async () => {
    await assert.rejects(
      async () => {
        await createChatMessage({
          pollIdentifier: draftPoll._id.toString(),
          authorId: testUser._id.toString(),
          rawContent: "Draft comment attempt",
        });
      },
      (err) => {
        assert(err instanceof ChatError);
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );

    const draftHistory = await getPollChatHistory({ pollIdentifier: draftPoll._id.toString() });
    assert.strictEqual(draftHistory, null);
  });

  test("4. Message Persistence: Saves message in MongoDB with authoritative author from session", async () => {
    const content = "This is a verified perspective on the real-time polling data.";
    const created = await createChatMessage({
      pollIdentifier: publishedPoll._id.toString(),
      authorId: testUser._id.toString(),
      rawContent: content,
    });

    assert.ok(created.id);
    assert.strictEqual(created.content, content);
    assert.strictEqual(created.author.id, testUser._id.toString());
    assert.strictEqual(created.author.name, "Civic Chat Citizen");
    assert.strictEqual(created.author.role, "user");
    assert.strictEqual(created.status, "visible");

    // Verify persisted in MongoDB
    const doc = await ChatMessage.findById(created.id);
    assert.ok(doc);
    assert.strictEqual(doc.content, content);
    assert.strictEqual(doc.status, "visible");
  });

  test("5. Room Isolation: Messages from Poll A never appear in Poll B", async () => {
    const historyA = await getPollChatHistory({ pollIdentifier: publishedPoll._id.toString() });
    const historyB = await getPollChatHistory({ pollIdentifier: secondPoll._id.toString() });

    assert.ok(historyA);
    assert.ok(historyB);

    assert(historyA.messages.length >= 1);
    assert.strictEqual(historyB.messages.length, 0);

    const existsInB = historyB.messages.some((m) => m.pollId === publishedPoll._id.toString());
    assert.strictEqual(existsInB, false);
  });

  test("6. Real-Time Pub-Sub Delivery: Subscribers receive live event upon message creation", async () => {
    let receivedMessage = null;

    const unsubscribe = subscribeToPollChat(publishedPoll._id.toString(), (msg) => {
      receivedMessage = msg;
    });

    const testContent = "Real-time dispatch test message.";
    await createChatMessage({
      pollIdentifier: publishedPoll._id.toString(),
      authorId: testUser._id.toString(),
      rawContent: testContent,
    });

    assert.ok(receivedMessage);
    assert.strictEqual(receivedMessage.content, testContent);
    assert.strictEqual(receivedMessage.author.id, testUser._id.toString());

    unsubscribe();
  });

  test("7. Bounded History & Privacy: Does not expose emails, password hashes, or session tokens", async () => {
    const history = await getPollChatHistory({
      pollIdentifier: publishedPoll._id.toString(),
      limit: 10,
    });
    assert.ok(history);
    assert(history.messages.length > 0);

    for (const msg of history.messages) {
      assert.strictEqual(typeof msg.content, "string");
      assert.strictEqual(typeof msg.author.name, "string");
      assert.strictEqual(typeof msg.author.role, "string");
      assert.strictEqual(msg.author.email, undefined);
      assert.strictEqual(msg.author.passwordHash, undefined);
      assert.strictEqual(msg.author.sessionToken, undefined);
    }
  });

  test("8. Rate Limiting: Rejects rapid flood of messages from the same author", async () => {
    let rejectedWith429 = false;

    // Send messages until rate limit triggers (limit is 15 per minute)
    for (let i = 0; i < 20; i++) {
      try {
        await createChatMessage({
          pollIdentifier: publishedPoll._id.toString(),
          authorId: testAdmin._id.toString(),
          rawContent: `Flood message ${i}`,
        });
      } catch (err) {
        if (err instanceof ChatError && err.statusCode === 429) {
          rejectedWith429 = true;
          break;
        }
      }
    }

    assert.strictEqual(rejectedWith429, true);
  });
});
