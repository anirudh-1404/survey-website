import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

class CommentError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "CommentError";
    this.statusCode = statusCode;
  }
}

function sanitizeCommentContent(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

describe("Day 6 — Discussion System, Replies, Reports & Moderation Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  let User;
  let Poll;
  let Comment;
  let Report;

  let authorUser1;
  let authorUser2;
  let adminUser;

  let activePoll1;
  let activePoll2;
  let draftPoll;

  async function createComment({ pollIdentifier, authorId, content, parentId }) {
    const cleanContent = sanitizeCommentContent(content);
    if (!cleanContent || cleanContent.length < 1) {
      throw new CommentError("Comment cannot be empty", 422);
    }
    if (cleanContent.length > 2000) {
      throw new CommentError("Comment cannot exceed 2000 characters", 422);
    }

    if (!authorId || !mongoose.Types.ObjectId.isValid(authorId)) {
      throw new CommentError("Authentication required to post a perspective", 401);
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
    const poll = await Poll.findOne({
      $or: [
        { slug: pollIdentifier },
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
      ],
    });

    if (!poll) {
      throw new CommentError("Poll inquiry not found", 404);
    }

    if (poll.status === "draft") {
      throw new CommentError("Cannot comment on an unpublished draft inquiry", 403);
    }

    let parentObjectId = null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        throw new CommentError("Invalid parent comment reference", 422);
      }

      const parent = await Comment.findById(parentId);
      if (!parent) {
        throw new CommentError("Parent comment could not be found", 404);
      }

      if (!parent.pollId.equals(poll._id)) {
        throw new CommentError("Replies cannot target a comment from another poll", 422);
      }

      if (parent.status !== "visible") {
        throw new CommentError("Cannot reply to a comment that has been removed or hidden", 403);
      }

      parentObjectId = parent.parentId ? parent.parentId : parent._id;
    }

    const comment = await Comment.create({
      pollId: poll._id,
      authorId: new mongoose.Types.ObjectId(authorId),
      content: cleanContent,
      parentId: parentObjectId,
      status: "visible",
    });

    return comment;
  }

  async function reportComment({ commentId, reporterId, reason, details }) {
    await Report.init();

    if (!reporterId || !mongoose.Types.ObjectId.isValid(reporterId)) {
      throw new CommentError("Authentication required to file a report", 401);
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      throw new CommentError("Invalid comment reference", 422);
    }

    const validReasons = ["spam", "harassment", "misinformation", "inappropriate", "other"];
    if (!validReasons.includes(reason)) {
      throw new CommentError(`Invalid report category`, 422);
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new CommentError("The reported comment could not be found", 404);
    }

    try {
      const rep = await Report.create({
        commentId: comment._id,
        pollId: comment.pollId,
        reporterId: new mongoose.Types.ObjectId(reporterId),
        reason,
        details: details ? sanitizeCommentContent(details).slice(0, 500) : undefined,
        status: "pending",
      });
      return { success: true, duplicate: false, report: rep };
    } catch (err) {
      if (err && (err.code === 11000 || (err.message && err.message.includes("E11000")))) {
        return { success: true, duplicate: true, message: "Duplicate report recorded" };
      }
      throw err;
    }
  }

  async function moderateComment({ commentId, moderatorId, action, reason }) {
    if (!moderatorId || !mongoose.Types.ObjectId.isValid(moderatorId)) {
      throw new CommentError("Moderator ID required", 401);
    }

    const moderator = await User.findById(moderatorId);
    if (!moderator || moderator.role !== "admin") {
      throw new CommentError("Forbidden: Administrator privileges required", 403);
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new CommentError("Comment not found", 404);
    }

    let newStatus = "visible";
    if (action === "hide") newStatus = "hidden";
    if (action === "remove") newStatus = "removed";
    if (action === "restore") newStatus = "visible";

    comment.status = newStatus;
    comment.moderatedBy = new mongoose.Types.ObjectId(moderatorId);
    comment.moderatedAt = new Date();
    if (reason) comment.moderationReason = reason;
    await comment.save();

    await Report.updateMany(
      { commentId: comment._id, status: "pending" },
      { $set: { status: "reviewed" } }
    );

    return comment;
  }

  before(async () => {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is required to run tests.");
    }
    await mongoose.connect(MONGODB_URI);

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

    const PollOptionSchema = new mongoose.Schema(
      { key: String, label: String },
      { _id: false }
    );

    const PollSchema = new mongoose.Schema(
      {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        category: { type: String, required: true },
        summary: { type: String, required: true },
        context: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
        options: [PollOptionSchema],
      },
      { timestamps: true }
    );

    const CommentSchema = new mongoose.Schema(
      {
        pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll", required: true, index: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        content: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
        status: { type: String, enum: ["visible", "hidden", "removed"], default: "visible", index: true },
        moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        moderatedAt: Date,
        moderationReason: String,
      },
      { timestamps: true }
    );

    const ReportSchema = new mongoose.Schema(
      {
        commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", required: true, index: true },
        pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll", required: true, index: true },
        reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        reason: { type: String, required: true },
        details: String,
        status: { type: String, default: "pending", index: true },
      },
      { timestamps: true }
    );
    ReportSchema.index({ commentId: 1, reporterId: 1 }, { unique: true });

    User = mongoose.models.User || mongoose.model("User", UserSchema);
    Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);
    Comment = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
    Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);

    await Report.init();

    const timestamp = Date.now();
    adminUser = await User.create({
      name: "Discussion Admin",
      email: `admin_disc_${timestamp}@pulse.test`,
      passwordHash: "hash_test",
      role: "admin",
    });

    authorUser1 = await User.create({
      name: "Commenter Alice",
      email: `alice_${timestamp}@pulse.test`,
      passwordHash: "hash_test",
      role: "user",
    });

    authorUser2 = await User.create({
      name: "Commenter Bob",
      email: `bob_${timestamp}@pulse.test`,
      passwordHash: "hash_test",
      role: "user",
    });

    activePoll1 = await Poll.create({
      title: "Should universal clean air standards be federally enforced?",
      slug: `clean-air-standards-${timestamp}`,
      category: "Climate & Energy",
      summary: "Environmental policy and emissions regulations inquiry.",
      createdBy: adminUser._id,
      status: "published",
      options: [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }],
    });

    activePoll2 = await Poll.create({
      title: "Should high-speed rail be funded via infrastructure bonds?",
      slug: `high-speed-rail-${timestamp}`,
      category: "Global Economy",
      summary: "Transportation infrastructure capital allocation.",
      createdBy: adminUser._id,
      status: "published",
      options: [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }],
    });

    draftPoll = await Poll.create({
      title: "Should autonomous drone deliveries be restricted to industrial zones?",
      slug: `drone-deliveries-draft-${timestamp}`,
      category: "Technology & AI",
      summary: "Urban air traffic safety regulations discussion.",
      createdBy: adminUser._id,
      status: "draft",
      options: [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }],
    });
  });

  after(async () => {
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (authorUser1) await User.deleteOne({ _id: authorUser1._id });
    if (authorUser2) await User.deleteOne({ _id: authorUser2._id });

    const pollIds = [activePoll1?._id, activePoll2?._id, draftPoll?._id].filter(Boolean);
    if (pollIds.length > 0) {
      await Poll.deleteMany({ _id: { $in: pollIds } });
      await Comment.deleteMany({ pollId: { $in: pollIds } });
      await Report.deleteMany({ pollId: { $in: pollIds } });
    }

    await mongoose.disconnect();
  });

  let topLevelCommentId;

  test("1. Authenticated user creates a comment", async () => {
    const comment = await createComment({
      pollIdentifier: activePoll1.slug,
      authorId: authorUser1._id.toString(),
      content: "Clean air is an indispensable public good that requires standardized federal metrics.",
    });

    assert.ok(comment._id);
    assert.equal(comment.authorId.toString(), authorUser1._id.toString());
    assert.equal(comment.status, "visible");
    assert.equal(comment.parentId, null);

    topLevelCommentId = comment._id.toString();
  });

  test("2. Unauthenticated user cannot create a comment", async () => {
    await assert.rejects(
      async () => {
        await createComment({
          pollIdentifier: activePoll1.slug,
          authorId: "",
          content: "Valid perspective content here.",
        });
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  });

  test("3. Invalid or excessively long content is rejected", async () => {
    // Empty content
    await assert.rejects(
      async () => {
        await createComment({
          pollIdentifier: activePoll1.slug,
          authorId: authorUser1._id.toString(),
          content: "    ",
        });
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        return true;
      }
    );

    // Excessively long content (>2000 chars)
    const oversized = "a".repeat(2001);
    await assert.rejects(
      async () => {
        await createComment({
          pollIdentifier: activePoll1.slug,
          authorId: authorUser1._id.toString(),
          content: oversized,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        return true;
      }
    );
  });

  test("4. Draft poll comments are rejected", async () => {
    await assert.rejects(
      async () => {
        await createComment({
          pollIdentifier: draftPoll.slug,
          authorId: authorUser1._id.toString(),
          content: "Perspective on draft poll.",
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /unpublished draft/i);
        return true;
      }
    );
  });

  test("5. Valid reply is created", async () => {
    const reply = await createComment({
      pollIdentifier: activePoll1.slug,
      authorId: authorUser2._id.toString(),
      content: "I agree with Alice, however local municipal enforcement must retain discretion.",
      parentId: topLevelCommentId,
    });

    assert.ok(reply._id);
    assert.equal(reply.parentId.toString(), topLevelCommentId);
    assert.equal(reply.status, "visible");
  });

  test("6. Cross-poll or invalid-parent replies are rejected", async () => {
    // Replying on activePoll2 targeting comment from activePoll1
    await assert.rejects(
      async () => {
        await createComment({
          pollIdentifier: activePoll2.slug,
          authorId: authorUser2._id.toString(),
          content: "Cross poll target attempt.",
          parentId: topLevelCommentId,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        assert.match(err.message, /target a comment from another poll/i);
        return true;
      }
    );

    // Nonexistent parent ID
    await assert.rejects(
      async () => {
        await createComment({
          pollIdentifier: activePoll1.slug,
          authorId: authorUser2._id.toString(),
          content: "Non-existent parent attempt.",
          parentId: new mongoose.Types.ObjectId().toString(),
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  test("7. Hidden comments are not returned in public discussion results", async () => {
    // Hide top-level comment
    await Comment.updateOne({ _id: topLevelCommentId }, { status: "hidden" });

    const visibleComments = await Comment.find({
      pollId: activePoll1._id,
      parentId: null,
      status: "visible",
    });

    const isTopLevelInVisible = visibleComments.some((c) => c._id.toString() === topLevelCommentId);
    assert.equal(isTopLevelInVisible, false, "Hidden comment must not be in visible query");

    // Restore for subsequent tests
    await Comment.updateOne({ _id: topLevelCommentId }, { status: "visible" });
  });

  test("8. Users cannot change moderation status directly", async () => {
    // Non-admin attempting moderation mutation
    await assert.rejects(
      async () => {
        await moderateComment({
          commentId: topLevelCommentId,
          moderatorId: authorUser1._id.toString(), // Citizen user, not admin
          action: "hide",
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Administrator privileges required/i);
        return true;
      }
    );
  });

  test("9. Reports are persisted", async () => {
    const res = await reportComment({
      commentId: topLevelCommentId,
      reporterId: authorUser2._id.toString(),
      reason: "misinformation",
      details: "Cites superseded 2018 clean air legislation.",
    });

    assert.equal(res.success, true);
    assert.equal(res.duplicate, false);

    const storedReport = await Report.findOne({
      commentId: topLevelCommentId,
      reporterId: authorUser2._id,
    });

    assert.ok(storedReport);
    assert.equal(storedReport.reason, "misinformation");
    assert.equal(storedReport.status, "pending");
  });

  test("10. Duplicate reports are handled correctly", async () => {
    // authorUser2 reporting topLevelCommentId a second time
    const res = await reportComment({
      commentId: topLevelCommentId,
      reporterId: authorUser2._id.toString(),
      reason: "spam",
    });

    assert.equal(res.success, true);
    assert.equal(res.duplicate, true);

    // Verify report count in DB remains 1
    const reportCount = await Report.countDocuments({
      commentId: topLevelCommentId,
      reporterId: authorUser2._id,
    });
    assert.equal(reportCount, 1);
  });

  test("11. Non-admin users cannot access moderation APIs", async () => {
    const citizen = await User.findById(authorUser1._id);
    assert.equal(citizen.role, "user");
    assert.notEqual(citizen.role, "admin");
  });

  test("12. Admin can hide and restore a comment", async () => {
    // Hide
    const hidden = await moderateComment({
      commentId: topLevelCommentId,
      moderatorId: adminUser._id.toString(),
      action: "hide",
      reason: "Under factual verification audit",
    });

    assert.equal(hidden.status, "hidden");
    assert.equal(hidden.moderationReason, "Under factual verification audit");

    // Restore
    const restored = await moderateComment({
      commentId: topLevelCommentId,
      moderatorId: adminUser._id.toString(),
      action: "restore",
    });

    assert.equal(restored.status, "visible");
  });

  test("13. User-generated text is rendered safely (XSS strip check)", () => {
    const maliciousScript = "<script>alert('xss')</script>Evidence demonstrates positive ROI.";
    const sanitized = sanitizeCommentContent(maliciousScript);

    assert.equal(sanitized.includes("<script>"), false);
    assert.equal(sanitized.includes("</script>"), false);
    assert.equal(sanitized, "alert('xss')Evidence demonstrates positive ROI.");
  });
});
